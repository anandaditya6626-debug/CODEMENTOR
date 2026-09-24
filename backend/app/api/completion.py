"""
AI-Powered Code Completion & Error Explanation API.

Provides two endpoints:
  - POST /api/v1/completion/inline  — AI inline completion (ghost text)
  - POST /api/v1/completion/error-explain — Error Detective analysis

These endpoints gracefully degrade when no AI provider is configured.
"""

import logging
from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.ai_service import ai_service, AIServiceError

router = APIRouter()
logger = logging.getLogger(__name__)


# --- Request/Response Schemas ---

class InlineCompletionRequest(BaseModel):
    code: str
    language: str
    cursor_line: int
    cursor_col: int
    file_context: str = ''
    request_id: str = ''


class InlineCompletionResponse(BaseModel):
    suggestion: str
    type: str = 'line'  # "line" | "block"
    request_id: str = ''


class DiffPreview(BaseModel):
    original_line: str
    fixed_line: str


class ErrorExplainRequest(BaseModel):
    code: str
    language: str
    error: str
    line: Optional[int] = None


class ErrorExplainResponse(BaseModel):
    error_type: Optional[str] = None
    line: Optional[int] = None
    column: Optional[int] = None
    symbol: Optional[str] = None
    problem: Optional[str] = None
    why_it_happened: Optional[str] = None
    how_to_fix: Optional[str] = None
    code_snippet: Optional[str] = None
    diff_preview: Optional[DiffPreview] = None
    explanation: str
    cause: str
    fix: str
    fixed_code: str = ''
    confidence: str = 'medium'
    suggestions: list[str] = []
    is_logical: bool = False


class LogicalLintRequest(BaseModel):
    code: str
    language: str = 'python'


class LogicalLintResponse(BaseModel):
    has_issues: bool
    issues: list[ErrorExplainResponse] = []


class LintDiagnostic(BaseModel):
    line: int
    column: int
    end_line: Optional[int] = None
    end_column: Optional[int] = None
    message: str
    severity: str = 'error'  # 'error' | 'warning'
    code: Optional[str] = None
    suggestion: Optional[str] = None
    fix_code: Optional[str] = None


class LintRequest(BaseModel):
    code: str
    language: str


class LintResponse(BaseModel):
    valid: bool
    diagnostics: list[LintDiagnostic] = []


# --- Routes ---

@router.get('/status')
async def completion_status():
    """Check if AI completion is available."""
    return {
        'available': ai_service.is_available,
        'provider': getattr(ai_service.provider, '__class__', type(None)).__name__ if ai_service.provider else None,
    }


@router.post('/inline', response_model=InlineCompletionResponse)
async def inline_completion(req: InlineCompletionRequest):
    """Generate AI inline code completion (ghost text)."""
    if not ai_service.is_available:
        raise HTTPException(status_code=503, detail='AI provider not configured. Set AI_PROVIDER and API key in backend/.env')

    # Extract context window: ±30 lines around cursor
    lines = req.code.split('\n')
    start = max(0, req.cursor_line - 31)
    end = min(len(lines), req.cursor_line + 30)
    context_window = '\n'.join(lines[start:end])
    current_line = lines[req.cursor_line - 1] if req.cursor_line <= len(lines) else ''
    text_before_cursor = current_line[:req.cursor_col - 1] if req.cursor_col > 0 else ''

    system_prompt = f"""You are an expert code completion engine for {req.language}.
Your task is to predict the NEXT code the developer is about to type.

Rules:
1. Return ONLY the completion text — no explanations, no markdown, no backticks.
2. Complete the CURRENT LINE first. If the line is complete, suggest the next logical line.
3. Keep completions short and useful (1-3 lines max).
4. Match the existing code style (indentation, naming conventions).
5. If you cannot confidently predict the next code, return an empty string.
6. Do NOT repeat code that already exists before the cursor.
7. Do NOT include the text that comes before the cursor position — only the continuation."""

    user_prompt = f"""Language: {req.language}
File context (lines {start + 1}-{end}):
```{req.language}
{context_window}
```

Cursor is at line {req.cursor_line}, column {req.cursor_col}.
Text before cursor on current line: `{text_before_cursor}`

Provide the completion (next code after the cursor):"""

    try:
        suggestion = await ai_service.provider.generate(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            temperature=0.2,
            max_tokens=150,
        )

        # Clean up the response
        suggestion = suggestion.strip()
        # Remove markdown code fences if the model added them
        if suggestion.startswith('```'):
            lines_s = suggestion.split('\n')
            if len(lines_s) > 2:
                suggestion = '\n'.join(lines_s[1:-1])
            else:
                suggestion = ''
        # Remove leading/trailing backticks
        suggestion = suggestion.strip('`').strip()

        completion_type = 'block' if '\n' in suggestion else 'line'

        return InlineCompletionResponse(
            suggestion=suggestion,
            type=completion_type,
            request_id=req.request_id,
        )
    except AIServiceError as e:
        logger.error(f'AI inline completion error: {e}')
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        logger.error(f'Unexpected completion error: {e}')
        return InlineCompletionResponse(suggestion='', type='line', request_id=req.request_id)


@router.post('/error-explain', response_model=ErrorExplainResponse)
async def error_explain(req: ErrorExplainRequest):
    """Error Detective: Analyze runtime/compilation errors and suggest fixes."""
    if not ai_service.is_available:
        # Fall back to pattern-matched explanations
        return _pattern_match_error(req.code, req.language, req.error, req.line)

    system_prompt = f"""You are an expert {req.language} debugging assistant called "Error Detective".
Analyze the error and provide a clear, actionable explanation.

You MUST respond in this exact JSON format (no markdown, no backticks):
{{
  "explanation": "A clear 1-2 sentence explanation of what went wrong",
  "cause": "The root cause of the error",
  "fix": "Step-by-step instructions to fix the error",
  "fixed_code": "The corrected code (complete, ready to run)",
  "confidence": "high" | "medium" | "low"
}}"""

    error_context = f"Error occurred on line {req.line}" if req.line else "Error location unknown"
    user_prompt = f"""{req.language} code:
```{req.language}
{req.code}
```

Error output:
```
{req.error}
```

{error_context}

Analyze this error and provide the fix in the required JSON format."""

    try:
        import json as json_mod
        raw = await ai_service.provider.generate(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            temperature=0.3,
            max_tokens=1500,
        )

        # Try to parse JSON from the response
        raw = raw.strip()
        if raw.startswith('```'):
            lines_r = raw.split('\n')
            raw = '\n'.join(lines_r[1:-1])
        raw = raw.strip('`').strip()

        try:
            parsed = json_mod.loads(raw)
            return ErrorExplainResponse(
                explanation=parsed.get('explanation', 'Unable to determine the error.'),
                cause=parsed.get('cause', 'Unknown cause.'),
                fix=parsed.get('fix', 'Review the error output and code carefully.'),
                fixed_code=parsed.get('fixed_code', ''),
                confidence=parsed.get('confidence', 'medium'),
            )
        except json_mod.JSONDecodeError:
            # If JSON parsing fails, return the raw text as explanation
            return ErrorExplainResponse(
                explanation=raw[:500],
                cause='See explanation above.',
                fix='Review the error output and code.',
                fixed_code='',
                confidence='low',
            )
    except AIServiceError as e:
        logger.error(f'AI error-explain error: {e}')
        return _pattern_match_error(req.code, req.language, req.error, req.line)
    except Exception as e:
        logger.error(f'Unexpected error-explain error: {e}')
        return _pattern_match_error(req.code, req.language, req.error, req.line)


@router.post('/lint', response_model=LintResponse)
async def lint_code(req: LintRequest):
    """Instant offline syntax and lint checking using language AST."""
    import ast

    if req.language == 'python':
        try:
            ast.parse(req.code)
            return LintResponse(valid=True, diagnostics=[])
        except SyntaxError as e:
            line = e.lineno or 1
            col = e.offset or 1
            end_line = getattr(e, 'end_lineno', line)
            end_col = getattr(e, 'end_offset', col + 1)
            msg = e.msg or 'Syntax error'

            # Generate friendly suggestion and auto-fix
            suggestion = None
            fix = _try_fix_python_syntax(req.code, msg, line)

            if "expected 'except' or 'finally' block" in msg:
                suggestion = "Every 'try:' statement requires at least one 'except' or 'finally' block. Add 'except Exception as e:'."
            elif "expected an indented block" in msg:
                suggestion = "Add an indented block (4 spaces) or 'pass' statement after this colon (:)."
            elif "was never closed" in msg or "unmatched" in msg:
                suggestion = "Check matching brackets, parentheses, or quotation marks."
            elif "unterminated string literal" in msg or "eol while scanning" in msg.lower():
                suggestion = "Close the quotation mark at the end of the string."
            elif "invalid syntax" in msg:
                suggestion = "Check for missing colons, mismatched brackets, or invalid operators."
            else:
                suggestion = f"Fix the syntax issue around line {line}."

            return LintResponse(
                valid=False,
                diagnostics=[
                    LintDiagnostic(
                        line=line,
                        column=col,
                        end_line=end_line,
                        end_column=end_col,
                        message=f"SyntaxError: {msg}",
                        severity='error',
                        code='syntax-error',
                        suggestion=suggestion,
                        fix_code=fix if fix and fix.strip() != req.code.strip() else None,
                    )
                ]
            )
        except Exception as e:
            logger.debug(f"Linting error: {e}")
            return LintResponse(valid=True, diagnostics=[])

    return LintResponse(valid=True, diagnostics=[])


def _try_fix_python_syntax(code: str, error: str, error_line: Optional[int]) -> str:
    """Attempt to automatically fix common Python syntax errors.
    
    Returns the fixed code string, or empty string if no fix could be determined.
    """
    import re
    lines = code.split('\n')

    # Fix 1: print statement without parentheses — e.g. `print "hello"` or `print {hello world}`
    # Handles: print VALUE  →  print(VALUE)
    fixed_lines = []
    changed = False
    for i, raw_line in enumerate(lines):
        stripped = raw_line.strip()
        # Match `print` followed by something that isn't `(` — Python 2-style print statement
        m = re.match(r'^(\s*)(print)\s+(?!\()(.+)$', raw_line)
        if m:
            indent, _, rest = m.groups()
            # If the rest uses curly braces like `{hello world}`, convert to parentheses with string
            inner = rest.strip()
            if inner.startswith('{') and inner.endswith('}'):
                # `print {hello world}` → `print("hello world")`
                content = inner[1:-1].strip()
                fixed_lines.append(f'{indent}print("{content}")')
            else:
                # `print "hello"` → `print("hello")`, `print 42` → `print(42)`
                fixed_lines.append(f'{indent}print({inner})')
            changed = True
        else:
            fixed_lines.append(raw_line)
    if changed:
        return '\n'.join(fixed_lines)

    # Fix 2: Missing colon after if/for/while/def/class/elif/else/try/except/finally/with
    fixed_lines = []
    changed = False
    for raw_line in lines:
        stripped = raw_line.strip()
        colon_match = re.match(
            r'^(\s*)(if\s+.+|elif\s+.+|else|for\s+.+|while\s+.+|def\s+.+|class\s+.+|try|except.*|finally|with\s+.+)\s*$',
            raw_line,
        )
        if colon_match and not stripped.endswith(':') and not stripped.endswith(','):
            fixed_lines.append(raw_line.rstrip() + ':')
            changed = True
        else:
            fixed_lines.append(raw_line)
    if changed:
        return '\n'.join(fixed_lines)

    # Fix 3: Mismatched quotes — attempt to close an unclosed string on the error line
    if error_line and 1 <= error_line <= len(lines):
        target = lines[error_line - 1]
        single_count = target.count("'") - target.count("\\'")
        double_count = target.count('"') - target.count('\\"')
        if single_count % 2 != 0:
            lines[error_line - 1] = target.rstrip() + "'"
            return '\n'.join(lines)
        if double_count % 2 != 0:
            lines[error_line - 1] = target.rstrip() + '"'
            return '\n'.join(lines)

    # Fix 4: 'try:' statement without an 'except' or 'finally' block
    err_lower = error.lower()
    if 'except' in err_lower or 'finally' in err_lower or 'try' in err_lower:
        max_search = min(len(lines), (error_line or len(lines)))
        try_line_idx = -1
        for idx in range(max_search - 1, -1, -1):
            if re.match(r'^\s*try\s*:', lines[idx]):
                try_line_idx = idx
                break
        if try_line_idx == -1:
            for idx in range(len(lines) - 1, -1, -1):
                if re.match(r'^\s*try\s*:', lines[idx]):
                    try_line_idx = idx
                    break
        if try_line_idx != -1:
            try_line = lines[try_line_idx]
            try_indent = re.match(r'^(\s*)', try_line).group(1)
            inline_stmt = re.sub(r'^\s*try\s*:\s*', '', try_line).strip()
            new_lines = list(lines)

            # If there was code on the same line: `try: x = 1`
            if inline_stmt and not inline_stmt.startswith('#'):
                new_lines[try_line_idx] = f"{try_indent}try:"
                new_lines.insert(try_line_idx + 1, f"{try_indent}    {inline_stmt}")
                new_lines.insert(try_line_idx + 2, f"{try_indent}except Exception as e:")
                new_lines.insert(try_line_idx + 3, f"{try_indent}    print(f\"Error: {{e}}\")")
                return '\n'.join(new_lines)

            # Find the end of this try block
            insert_idx = try_line_idx + 1
            while insert_idx < len(lines):
                line_str = lines[insert_idx]
                if not line_str.strip():
                    insert_idx += 1
                    continue
                line_indent = re.match(r'^(\s*)', line_str).group(1)
                if len(line_indent) <= len(try_indent):
                    break
                insert_idx += 1

            if insert_idx == try_line_idx + 1:
                except_block = [
                    f"{try_indent}    pass",
                    f"{try_indent}except Exception as e:",
                    f"{try_indent}    print(f\"Error: {{e}}\")"
                ]
            else:
                except_block = [
                    f"{try_indent}except Exception as e:",
                    f"{try_indent}    print(f\"Error: {{e}}\")"
                ]
            new_lines[insert_idx:insert_idx] = except_block
            return '\n'.join(new_lines)

    # Fix 5: Expected an indented block
    if 'indented block' in err_lower:
        target_idx = (error_line - 1) if error_line and 1 <= error_line <= len(lines) else -1
        check_indices = [target_idx - 1, target_idx] if target_idx >= 0 else range(len(lines) - 1, -1, -1)
        for idx in check_indices:
            if 0 <= idx < len(lines):
                s = lines[idx].rstrip()
                if s.endswith(':'):
                    base_indent = re.match(r'^(\s*)', lines[idx]).group(1)
                    new_lines = list(lines)
                    new_lines.insert(idx + 1, f"{base_indent}    pass")
                    return '\n'.join(new_lines)

    return ''


def _try_fix_c_cpp_syntax(code: str, error: str, error_line: Optional[int]) -> str:
    """Attempt to automatically fix common C/C++ syntax errors."""
    import re
    lines = code.split('\n')

    # Fix: missing semicolons at end of statements
    if error_line and 1 <= error_line <= len(lines):
        prev_idx = error_line - 2  # line before the error (0-indexed)
        if 0 <= prev_idx < len(lines):
            prev = lines[prev_idx].rstrip()
            if prev and not prev.endswith(';') and not prev.endswith('{') and not prev.endswith('}') and not prev.endswith(':') and not prev.lstrip().startswith('#') and not prev.lstrip().startswith('//'):
                lines[prev_idx] = prev + ';'
                return '\n'.join(lines)

    return ''


def _try_fix_javascript_syntax(code: str, error: str, error_line: Optional[int]) -> str:
    """Attempt to automatically fix common JavaScript/TypeScript syntax errors."""
    import re
    lines = code.split('\n')

    # Fix: console.log without parentheses
    fixed_lines = []
    changed = False
    for raw_line in lines:
        m = re.match(r'^(\s*)(console\.log)\s+(?!\()(.+);?\s*$', raw_line)
        if m:
            indent, func, rest = m.groups()
            rest = rest.rstrip(';').strip()
            fixed_lines.append(f'{indent}{func}({rest});')
            changed = True
        else:
            fixed_lines.append(raw_line)
    if changed:
        return '\n'.join(fixed_lines)

    return ''


def _pattern_match_error(code: str, language: str, error: str, line: Optional[int]) -> ErrorExplainResponse:
    """Fallback pattern-matched error explanations when AI is unavailable.
    
    Includes intelligent fixed_code generation for common error patterns.
    """
    error_lower = error.lower()

    # Python errors
    if language == 'python':
        from app.services.error_diagnostics import analyze_python_error
        diag = analyze_python_error(code, error, line)
        diff_prev = None
        if diag.get('diff_preview'):
            diff_prev = DiffPreview(
                original_line=diag['diff_preview']['original_line'],
                fixed_line=diag['diff_preview']['fixed_line'],
            )
        return ErrorExplainResponse(
            error_type=diag.get('error_type'),
            line=diag.get('line'),
            column=diag.get('column'),
            symbol=diag.get('symbol'),
            problem=diag.get('problem'),
            why_it_happened=diag.get('why_it_happened'),
            how_to_fix=diag.get('how_to_fix'),
            code_snippet=diag.get('code_snippet'),
            diff_preview=diff_prev,
            explanation=diag.get('problem', ''),
            cause=diag.get('why_it_happened', ''),
            fix=diag.get('how_to_fix', ''),
            fixed_code=diag.get('fixed_code', ''),
            confidence=diag.get('confidence', 'high'),
            suggestions=diag.get('suggestions', []),
            is_logical=diag.get('is_logical', False),
        )

    # C/C++ errors
    if language in ('c', 'cpp'):
        fixed = _try_fix_c_cpp_syntax(code, error, line)

        if 'undeclared' in error_lower or 'was not declared' in error_lower:
            return ErrorExplainResponse(explanation='A variable or function is used without being declared first.', cause='The identifier is used before declaration, or the required header is not included.', fix='Declare the variable before using it, or add the correct #include for library functions.', fixed_code=fixed, confidence='high')
        if 'expected' in error_lower and 'before' in error_lower:
            return ErrorExplainResponse(explanation='The compiler expected different syntax at this position.', cause='Usually caused by a missing semicolon, bracket, or incorrect statement order.', fix='Check the previous line for missing semicolons or brackets.', fixed_code=fixed, confidence='medium')
        if 'segmentation fault' in error_lower or 'sigsegv' in error_lower:
            return ErrorExplainResponse(explanation='Your program tried to access invalid memory (Segmentation Fault).', cause='Common causes: dereferencing NULL or dangling pointers, array out-of-bounds access, stack overflow.', fix='Check all pointer operations and array accesses. Use bounds checking and initialize pointers before use.', confidence='medium')

    # Java errors
    if language == 'java':
        if 'cannot find symbol' in error_lower:
            return ErrorExplainResponse(explanation='Java cannot find a variable, method, or class you referenced.', cause='The symbol is misspelled, not imported, or not in scope.', fix='Check spelling, add the correct import statement, or declare the variable.', confidence='high')
        if 'nullpointerexception' in error_lower:
            return ErrorExplainResponse(explanation='A null reference was used where an object is required.', cause='An object variable is null when you try to call a method or access a field on it.', fix='Add null checks before using objects, or ensure objects are properly initialized.', confidence='high')

    # JavaScript errors
    if language in ('javascript', 'typescript'):
        fixed = _try_fix_javascript_syntax(code, error, line)

        if 'is not defined' in error_lower or 'referenceerror' in error_lower:
            return ErrorExplainResponse(explanation='A variable or function is used but not defined.', cause='The identifier is misspelled, not declared, or out of scope.', fix='Declare the variable with let/const/var before use, or check for typos.', fixed_code=fixed, confidence='high')
        if 'is not a function' in error_lower:
            return ErrorExplainResponse(explanation='You tried to call something as a function that is not callable.', cause='The variable is not a function, or it is undefined/null at the point of call.', fix='Verify the variable is a function before calling it. Check for typos in the function name.', fixed_code=fixed, confidence='high')
        if 'cannot read prop' in error_lower or 'of undefined' in error_lower or 'of null' in error_lower:
            return ErrorExplainResponse(explanation='You tried to access a property on undefined or null.', cause='The object is undefined or null when you try to access its properties.', fix='Add null/undefined checks or use optional chaining (?.) before accessing properties.', confidence='high')

    # Generic fallback
    return ErrorExplainResponse(
        explanation=f'An error occurred during {language} execution.',
        cause=error[:200] if error else 'Unknown error.',
        fix='Review the error message carefully and check the code around the indicated line.',
        confidence='low',
    )


@router.post('/logical-lint', response_model=LogicalLintResponse)
async def check_logical_errors(req: LogicalLintRequest):
    """Detect suspicious logic patterns (like loop accumulator overwrite or premature returns) in Python."""
    if req.language != 'python':
        return LogicalLintResponse(has_issues=False, issues=[])

    from app.services.error_diagnostics import detect_logical_errors
    raw_issues = detect_logical_errors(req.code)
    issues = []
    for item in raw_issues:
        diff_prev = None
        if item.get('diff_preview'):
            diff_prev = DiffPreview(
                original_line=item['diff_preview']['original_line'],
                fixed_line=item['diff_preview']['fixed_line'],
            )
        issues.append(ErrorExplainResponse(
            error_type=item.get('error_type', 'LogicalWarning'),
            line=item.get('line'),
            column=None,
            symbol=item.get('symbol'),
            problem=item.get('problem'),
            why_it_happened=item.get('why_it_happened'),
            how_to_fix=item.get('how_to_fix'),
            code_snippet=item.get('code_snippet'),
            diff_preview=diff_prev,
            explanation=item.get('problem', ''),
            cause=item.get('why_it_happened', ''),
            fix=item.get('how_to_fix', ''),
            fixed_code=item.get('fixed_code', ''),
            confidence=item.get('confidence', 'medium'),
            is_logical=True,
        ))
    return LogicalLintResponse(has_issues=len(issues) > 0, issues=issues)
