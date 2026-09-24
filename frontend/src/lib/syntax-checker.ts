/**
 * Lightweight Syntax Checker — per-language structural validation.
 *
 * Returns Monaco-compatible diagnostic markers for syntax issues.
 * This runs entirely in the browser, no LSP or AST parser required.
 * Designed to catch ~80% of common structural errors (bracket matching,
 * missing colons, unclosed strings, etc.) without false positives during typing.
 */

export type DiagnosticSeverity = 'error' | 'warning' | 'info' | 'hint';

export interface SyntaxDiagnostic {
  line: number;       // 1-indexed
  startCol: number;   // 1-indexed
  endCol: number;     // 1-indexed
  message: string;
  severity: DiagnosticSeverity;
  source: string;     // e.g. "CodeMentor"
  code?: string;      // e.g. "missing-colon"
  suggestion?: string; // Actionable suggestion for the user
  fixTitle?: string;   // Quick-fix title for lightbulb menu
  fixCode?: string;    // Auto-fix replacement snippet or new text
  isFullReplacement?: boolean; // Whether fixCode replaces the entire document
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export function checkSyntax(code: string, language: string): SyntaxDiagnostic[] {
  const lines = code.split('\n');
  const diagnostics: SyntaxDiagnostic[] = [];

  // Universal checks
  diagnostics.push(...checkBrackets(code, lines));

  // Language-specific checks
  switch (language) {
    case 'python':
      diagnostics.push(...checkPython(lines));
      break;
    case 'c':
    case 'cpp':
      diagnostics.push(...checkCFamily(lines, language));
      break;
    case 'java':
      diagnostics.push(...checkJava(lines));
      break;
    case 'javascript':
    case 'typescript':
      diagnostics.push(...checkJavaScript(lines));
      break;
    case 'go':
      diagnostics.push(...checkGo(lines));
      break;
    case 'rust':
      diagnostics.push(...checkRust(lines));
      break;
  }

  return diagnostics;
}

// ---------------------------------------------------------------------------
// Bracket matching (universal)
// ---------------------------------------------------------------------------

interface BracketInfo {
  char: string;
  line: number;
  col: number;
}

function checkBrackets(code: string, lines: string[]): SyntaxDiagnostic[] {
  const diagnostics: SyntaxDiagnostic[] = [];
  const stack: BracketInfo[] = [];
  const pairs: Record<string, string> = { '(': ')', '[': ']', '{': '}' };
  const closers: Record<string, string> = { ')': '(', ']': '[', '}': '{' };

  let inString = false;
  let stringChar = '';
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    inLineComment = false;

    for (let j = 0; j < line.length; j++) {
      const ch = line[j];
      const next = line[j + 1] || '';
      const prev = j > 0 ? line[j - 1] : '';

      // Skip escaped characters
      if (prev === '\\' && inString) continue;

      // Block comment handling
      if (inBlockComment) {
        if (ch === '*' && next === '/') { inBlockComment = false; j++; }
        continue;
      }

      // Line comment handling
      if (inLineComment) continue;

      // String handling
      if (inString) {
        if (ch === stringChar) inString = false;
        continue;
      }

      // Detect comment start
      if (ch === '/' && next === '/') { inLineComment = true; continue; }
      if (ch === '/' && next === '*') { inBlockComment = true; j++; continue; }
      if (ch === '#') { inLineComment = true; continue; } // Python comments

      // Detect string start
      if (ch === '"' || ch === '\'' || ch === '`') {
        // Python triple quotes — simplified: just skip them
        if (ch !== '`' && line.substring(j, j + 3) === ch + ch + ch) {
          // Skip triple-quoted strings entirely on this line
          const endIdx = line.indexOf(ch + ch + ch, j + 3);
          if (endIdx !== -1) { j = endIdx + 2; continue; }
          // Multi-line triple quote — just skip rest of this line
          inString = true;
          stringChar = ch;
          continue;
        }
        inString = true;
        stringChar = ch;
        continue;
      }

      // Bracket matching
      if (pairs[ch]) {
        stack.push({ char: ch, line: i + 1, col: j + 1 });
      } else if (closers[ch]) {
        if (stack.length === 0) {
          diagnostics.push({
            line: i + 1,
            startCol: j + 1,
            endCol: j + 2,
            message: `Unexpected closing '${ch}' with no matching opener`,
            severity: 'error',
            source: 'CodeMentor',
            code: 'unmatched-bracket',
          });
        } else {
          const top = stack[stack.length - 1];
          if (top.char === closers[ch]) {
            stack.pop();
          } else {
            diagnostics.push({
              line: i + 1,
              startCol: j + 1,
              endCol: j + 2,
              message: `Mismatched bracket: expected '${pairs[top.char]}' but found '${ch}'`,
              severity: 'error',
              source: 'CodeMentor',
              code: 'mismatched-bracket',
            });
            stack.pop(); // pop anyway to avoid cascading errors
          }
        }
      }
    }
  }

  // Report unclosed brackets
  for (const unclosed of stack) {
    diagnostics.push({
      line: unclosed.line,
      startCol: unclosed.col,
      endCol: unclosed.col + 1,
      message: `Unclosed '${unclosed.char}' — missing '${pairs[unclosed.char]}'`,
      severity: 'error',
      source: 'CodeMentor',
      code: 'unclosed-bracket',
    });
  }

  return diagnostics;
}

// ---------------------------------------------------------------------------
// Python-specific checks
// ---------------------------------------------------------------------------

function checkPython(lines: string[]): SyntaxDiagnostic[] {
  const diagnostics: SyntaxDiagnostic[] = [];
  const blockKeywords = /^\s*(if|elif|else|for|while|def|class|try|except|finally|with|async\s+def|async\s+for|async\s+with)\b/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip empty, comment, and string-only lines
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('"""') || trimmed.startsWith("'''")) continue;

    // 1. Python 2 style print statement: print "hello"
    const print2Match = trimmed.match(/^print\s+([^(].*)$/);
    if (print2Match) {
      diagnostics.push({
        line: i + 1,
        startCol: line.indexOf('print') + 1,
        endCol: line.length + 1,
        message: "SyntaxError: Missing parentheses in call to 'print'. Did you mean print(...) ?",
        severity: 'error',
        source: 'CodeMentor',
        code: 'print-parentheses',
        suggestion: `In Python 3, 'print' is a function. Wrap arguments in parentheses: print(${print2Match[1]})`,
        fixTitle: `Change to print(...)`,
        fixCode: `print(${print2Match[1]})`,
      });
    }

    // 2. Check for missing colon after block keywords
    const blockMatch = trimmed.match(blockKeywords);
    if (blockMatch) {
      const codeOnly = trimmed.replace(/#.*$/, '').trimEnd();
      if (!codeOnly.endsWith(':') && !codeOnly.endsWith('\\')) {
        if (!codeOnly.includes(':')) {
          diagnostics.push({
            line: i + 1,
            startCol: 1,
            endCol: line.length + 1,
            message: `SyntaxError: Missing colon (:) after '${blockMatch[1]}' statement`,
            severity: 'error',
            source: 'CodeMentor',
            code: 'missing-colon',
            suggestion: `Add a colon (:) at the end of the line: '${trimmed}:'`,
            fixTitle: "Add ':'",
            fixCode: `${line.trimEnd()}:`,
          });
        }
      }
    }

    // 3. Check for 'try:' block without matching 'except' or 'finally'
    if (/^try\s*:/.test(trimmed)) {
      const tryIndent = line.match(/^(\s*)/)?.[1] || '';
      let hasHandler = false;
      let j = i + 1;
      while (j < lines.length) {
        const nextLine = lines[j];
        const nextTrimmed = nextLine.trim();
        if (!nextTrimmed || nextTrimmed.startsWith('#')) {
          j++;
          continue;
        }
        const nextIndent = nextLine.match(/^(\s*)/)?.[1] || '';
        if (nextIndent.length <= tryIndent.length) {
          if (nextIndent.length === tryIndent.length && (/^(except\b|finally\b)/.test(nextTrimmed))) {
            hasHandler = true;
          }
          break;
        }
        j++;
      }
      if (!hasHandler) {
        const fixedLines = [...lines];
        const inlineCode = trimmed.replace(/^try\s*:\s*/, '').trim();
        if (inlineCode && !inlineCode.startsWith('#')) {
          fixedLines[i] = `${tryIndent}try:`;
          fixedLines.splice(
            i + 1,
            0,
            `${tryIndent}    ${inlineCode}`,
            `${tryIndent}except Exception as e:`,
            `${tryIndent}    print(f"Error: {e}")`
          );
        } else if (j === i + 1) {
          // Empty try block without body
          fixedLines.splice(
            i + 1,
            0,
            `${tryIndent}    pass`,
            `${tryIndent}except Exception as e:`,
            `${tryIndent}    print(f"Error: {e}")`
          );
        } else {
          fixedLines.splice(
            j,
            0,
            `${tryIndent}except Exception as e:`,
            `${tryIndent}    print(f"Error: {e}")`
          );
        }
        diagnostics.push({
          line: i + 1,
          startCol: line.indexOf('try') + 1,
          endCol: line.indexOf('try') + 5,
          message: "SyntaxError: 'try' block must have at least one 'except' or 'finally' block",
          severity: 'error',
          source: 'CodeMentor',
          code: 'unhandled-try',
          suggestion: "In Python, every 'try' must be followed by an 'except' or 'finally' clause to handle errors.",
          fixTitle: "Add 'except Exception as e:'",
          fixCode: fixedLines.join('\n'),
          isFullReplacement: true,
        });
      }
    }

    // 4. Check for empty block after colon (missing indentation or pass)
    if (trimmed.endsWith(':') && blockMatch && trimmed !== 'try:') {
      let j = i + 1;
      let nextLineTrimmed = '';
      let nextLineIndent = '';
      while (j < lines.length) {
        const nextLine = lines[j];
        const nextTrim = nextLine.trim();
        if (nextTrim && !nextTrim.startsWith('#')) {
          nextLineTrimmed = nextTrim;
          nextLineIndent = nextLine.match(/^(\s*)/)?.[1] || '';
          break;
        }
        j++;
      }
      const curIndent = line.match(/^(\s*)/)?.[1] || '';
      if (!nextLineTrimmed || nextLineIndent.length <= curIndent.length) {
        const fixedLines = [...lines];
        fixedLines.splice(i + 1, 0, `${curIndent}    pass`);
        diagnostics.push({
          line: i + 1,
          startCol: 1,
          endCol: line.length + 1,
          message: `IndentationError: expected an indented block after '${blockMatch[1]}' statement`,
          severity: 'error',
          source: 'CodeMentor',
          code: 'expected-indented-block',
          suggestion: `Indent the block statements by 4 spaces, or add 'pass' if you want an empty block.`,
          fixTitle: "Add 'pass'",
          fixCode: fixedLines.join('\n'),
          isFullReplacement: true,
        });
      }
    }

    // 5. Check for unterminated single-line string literal
    if (!trimmed.startsWith('"""') && !trimmed.startsWith("'''")) {
      const lineWithoutComments = line.replace(/#.*$/, '');
      const singleQuotes = (lineWithoutComments.match(/(?<!\\)'/g) || []).length;
      const doubleQuotes = (lineWithoutComments.match(/(?<!\\)"/g) || []).length;
      if (singleQuotes % 2 !== 0 && !lineWithoutComments.includes('"""') && !lineWithoutComments.includes("'''")) {
        diagnostics.push({
          line: i + 1,
          startCol: 1,
          endCol: line.length + 1,
          message: "SyntaxError: unterminated string literal (missing closing quote ')",
          severity: 'error',
          source: 'CodeMentor',
          code: 'unterminated-string',
          suggestion: "Add a closing quotation mark (') before the end of the line.",
          fixTitle: "Add closing '",
          fixCode: line + "'",
        });
      } else if (doubleQuotes % 2 !== 0 && !lineWithoutComments.includes('"""') && !lineWithoutComments.includes("'''")) {
        diagnostics.push({
          line: i + 1,
          startCol: 1,
          endCol: line.length + 1,
          message: 'SyntaxError: unterminated string literal (missing closing quote ")',
          severity: 'error',
          source: 'CodeMentor',
          code: 'unterminated-string',
          suggestion: 'Add a closing quotation mark (") before the end of the line.',
          fixTitle: 'Add closing "',
          fixCode: line + '"',
        });
      }
    }

    // 6. Assignment in condition (= instead of ==)
    const ifMatch = trimmed.match(/^(if|elif|while)\s+(.+):$/);
    if (ifMatch) {
      const condition = ifMatch[2];
      if (/[^=!<>:]=[^=]/.test(condition) && !/:=/.test(condition)) {
        diagnostics.push({
          line: i + 1,
          startCol: line.indexOf('=') + 1,
          endCol: line.indexOf('=') + 2,
          message: `Possible mistake: '=' is assignment, did you mean '==' for comparison?`,
          severity: 'warning',
          source: 'CodeMentor',
          code: 'assignment-in-condition',
          suggestion: "In conditional statements, use '==' to compare values. A single '=' assigns a value.",
          fixTitle: "Change '=' to '=='",
          fixCode: '==',
        });
      }
    }

    // 7. Check for tab/space mixing
    if (line.length > 0 && !trimmed.startsWith('#')) {
      const indent = line.match(/^(\s*)/)?.[1] || '';
      if (indent.includes('\t') && indent.includes(' ')) {
        diagnostics.push({
          line: i + 1,
          startCol: 1,
          endCol: indent.length + 1,
          message: 'IndentationError: mixed tabs and spaces in indentation',
          severity: 'warning',
          source: 'CodeMentor',
          code: 'mixed-indent',
          suggestion: 'Use consistent indentation (4 spaces per indent level). Avoid mixing Tab and Space keys.',
        });
      }
    }
  }

  return diagnostics;
}

// ---------------------------------------------------------------------------
// C/C++ specific checks
// ---------------------------------------------------------------------------

function checkCFamily(lines: string[], language: string): SyntaxDiagnostic[] {
  const diagnostics: SyntaxDiagnostic[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*') || trimmed.startsWith('#')) continue;

    // Check for missing semicolons after statements (simplified heuristic)
    const isStatement = /^(?:(?:int|char|float|double|void|long|short|unsigned|bool|auto|string|return|break|continue)\b|.*[)\]"'\d]\s*)$/.test(trimmed);
    if (isStatement && !trimmed.endsWith(';') && !trimmed.endsWith('{') && !trimmed.endsWith('}') && !trimmed.endsWith(',') && !trimmed.endsWith('\\') && !trimmed.endsWith(':')) {
      // Exclude function declarations, if/for/while, preprocessor
      if (!/^(if|else|for|while|do|switch|case|default)\b/.test(trimmed) && !trimmed.includes('{')) {
        // Only flag if it looks like a complete statement
        const nextLine = (i + 1 < lines.length) ? lines[i + 1].trim() : '';
        if (nextLine && !nextLine.startsWith('{') && !nextLine.startsWith('//') && !nextLine.startsWith('/*') && !nextLine.startsWith('.')) {
          diagnostics.push({
            line: i + 1,
            startCol: line.length,
            endCol: line.length + 1,
            message: 'Possible missing semicolon',
            severity: 'hint',
            source: 'CodeMentor',
            code: 'missing-semicolon',
          });
        }
      }
    }

    // Check for common C/C++ mistakes
    // Single = in if condition
    if (/^(if|while)\s*\(/.test(trimmed)) {
      const parenContent = extractParenContent(trimmed);
      if (parenContent && /[^=!<>]=[^=]/.test(parenContent)) {
        diagnostics.push({
          line: i + 1,
          startCol: line.indexOf('=') + 1,
          endCol: line.indexOf('=') + 2,
          message: `Possible mistake: '=' is assignment, did you mean '==' for comparison?`,
          severity: 'warning',
          source: 'CodeMentor',
          code: 'assignment-in-condition',
        });
      }
    }
  }

  return diagnostics;
}

// ---------------------------------------------------------------------------
// Java specific checks
// ---------------------------------------------------------------------------

function checkJava(lines: string[]): SyntaxDiagnostic[] {
  const diagnostics: SyntaxDiagnostic[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*') || trimmed.startsWith('@')) continue;

    // Check for missing semicolons on import/package statements
    if (/^(import|package)\s/.test(trimmed) && !trimmed.endsWith(';')) {
      diagnostics.push({
        line: i + 1,
        startCol: line.length,
        endCol: line.length + 1,
        message: `Missing semicolon after '${trimmed.split(' ')[0]}' statement`,
        severity: 'error',
        source: 'CodeMentor',
        code: 'missing-semicolon',
      });
    }

    // Check for "main" method signature issues
    if (trimmed.includes('static') && trimmed.includes('main') && trimmed.includes('void')) {
      if (!trimmed.includes('String[] args') && !trimmed.includes('String args[]') && !trimmed.includes('String...')) {
        if (trimmed.includes('main(') && !trimmed.includes('main()')) {
          diagnostics.push({
            line: i + 1,
            startCol: line.indexOf('main') + 1,
            endCol: line.indexOf('main') + 5,
            message: 'Main method should have parameter "String[] args"',
            severity: 'hint',
            source: 'CodeMentor',
            code: 'main-signature',
          });
        }
      }
    }
  }

  return diagnostics;
}

// ---------------------------------------------------------------------------
// JavaScript/TypeScript specific checks
// ---------------------------------------------------------------------------

function checkJavaScript(lines: string[]): SyntaxDiagnostic[] {
  const diagnostics: SyntaxDiagnostic[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) continue;

    // Check for var usage (suggest let/const)
    if (/^\s*var\s+/.test(line)) {
      diagnostics.push({
        line: i + 1,
        startCol: line.indexOf('var') + 1,
        endCol: line.indexOf('var') + 4,
        message: "Consider using 'let' or 'const' instead of 'var'",
        severity: 'hint',
        source: 'CodeMentor',
        code: 'prefer-const-let',
      });
    }

    // Check for == instead of === (loose equality)
    const eqMatch = trimmed.match(/[^=!]==[^=]/);
    if (eqMatch) {
      const idx = line.indexOf('==');
      if (idx !== -1 && line[idx + 2] !== '=') {
        diagnostics.push({
          line: i + 1,
          startCol: idx + 1,
          endCol: idx + 3,
          message: "Use '===' for strict equality comparison instead of '=='",
          severity: 'hint',
          source: 'CodeMentor',
          code: 'prefer-strict-equality',
        });
      }
    }
  }

  return diagnostics;
}

// ---------------------------------------------------------------------------
// Go specific checks
// ---------------------------------------------------------------------------

function checkGo(lines: string[]): SyntaxDiagnostic[] {
  const diagnostics: SyntaxDiagnostic[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('/*')) continue;

    // Check for opening brace on wrong line (Go style requires { on same line)
    if (trimmed === '{' && i > 0) {
      const prevLine = lines[i - 1].trim();
      if (prevLine.match(/^(func|if|else|for|switch|select|type|struct)\b/)) {
        diagnostics.push({
          line: i + 1,
          startCol: 1,
          endCol: 2,
          message: 'In Go, opening brace must be on the same line as the statement',
          severity: 'error',
          source: 'CodeMentor',
          code: 'brace-style',
        });
      }
    }

    // Check for unused := declaration (simplified: if declared but line has no usage after)
    // This is just a lint hint
    if (/:=/.test(trimmed)) {
      const varName = trimmed.match(/(\w+)\s*:=/)?.[1];
      if (varName === '_') continue; // blank identifier is fine
    }
  }

  return diagnostics;
}

// ---------------------------------------------------------------------------
// Rust specific checks
// ---------------------------------------------------------------------------

function checkRust(lines: string[]): SyntaxDiagnostic[] {
  const diagnostics: SyntaxDiagnostic[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) continue;

    // Check for missing semicolons on let/use statements
    if (/^(let|use)\s/.test(trimmed) && !trimmed.endsWith(';') && !trimmed.endsWith('{')) {
      diagnostics.push({
        line: i + 1,
        startCol: line.length,
        endCol: line.length + 1,
        message: `Missing semicolon after '${trimmed.split(' ')[0]}' statement`,
        severity: 'error',
        source: 'CodeMentor',
        code: 'missing-semicolon',
      });
    }
  }

  return diagnostics;
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function extractParenContent(line: string): string | null {
  const start = line.indexOf('(');
  if (start === -1) return null;
  let depth = 0;
  for (let i = start; i < line.length; i++) {
    if (line[i] === '(') depth++;
    if (line[i] === ')') depth--;
    if (depth === 0) return line.substring(start + 1, i);
  }
  return line.substring(start + 1);
}
