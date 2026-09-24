/**
 * Traceback & Compiler Error Parser.
 *
 * Extracts file, line number, column, error type, plain-English explanation,
 * and actionable suggestions from execution stderr/stdout across languages.
 */

export interface ParsedError {
  file?: string;
  line: number;
  column?: number;
  symbol?: string;
  errorType: string;
  message: string;
  problem?: string;
  why_it_happened?: string;
  how_to_fix?: string;
  code_snippet?: string;
  diff_preview?: {
    original_line: string;
    fixed_line: string;
  };
  explanation: string;
  suggestion: string;
  suggestedFix?: string;
  suggestions?: string[];
  is_logical?: boolean;
}

/**
 * Common intelligent explanations & suggestions for standard Python runtime and syntax errors.
 */
const PYTHON_ERROR_KNOWLEDGE: Record<
  string,
  { explanation: string; suggestion: string }
> = {
  SyntaxError: {
    explanation: 'Python encountered code that does not follow the language grammar rules.',
    suggestion: 'Check for missing colons (:), unclosed brackets/parentheses, or incomplete statements.',
  },
  IndentationError: {
    explanation: 'Python requires precise, consistent indentation to define blocks of code.',
    suggestion: 'Use 4 spaces for each indent level. Check that the block after if/for/while/def/try is indented.',
  },
  NameError: {
    explanation: "You're trying to use a variable or function that hasn't been defined yet.",
    suggestion: 'Check for typos in the variable name, or define it with an assignment before using it.',
  },
  TypeError: {
    explanation: 'An operation was applied to an object of inappropriate type.',
    suggestion: 'Verify data types before operating on them. Convert strings to integers with int() if calculating.',
  },
  ValueError: {
    explanation: 'A function received an argument of the right type but inappropriate value.',
    suggestion: 'Verify the input value. E.g., int("abc") fails because "abc" is not a valid decimal number.',
  },
  ZeroDivisionError: {
    explanation: 'Your code attempted to divide a number or compute a modulo with zero as the divisor.',
    suggestion: 'Add a guard check before division: if divisor != 0: ...',
  },
  IndexError: {
    explanation: 'A sequence subscript is out of range.',
    suggestion: 'Check that the index is >= 0 and < len(sequence).',
  },
  KeyError: {
    explanation: 'A dictionary key was not found in the dictionary.',
    suggestion: 'Use dict.get(key, default) or check if key in dict before accessing.',
  },
  AttributeError: {
    explanation: 'An attribute reference or assignment failed on this object.',
    suggestion: 'Check for typos in the method/property name, or check the object type.',
  },
  FileNotFoundError: {
    explanation: 'A file operation was requested on a file path that does not exist.',
    suggestion: 'Verify the file path and ensure the file exists before opening.',
  },
  ModuleNotFoundError: {
    explanation: 'An import statement failed to find the specified module.',
    suggestion: 'Check the module name spelling, or verify it is installed.',
  },
  UnboundLocalError: {
    explanation: 'A local variable was referenced before it was assigned a value inside a function.',
    suggestion: 'Assign a value to the variable before reading it, or declare it "global" if modifying a global.',
  },
};

/**
 * Parse an execution error string to extract location, error type, and actionable suggestions.
 */
export function parseExecutionError(
  rawError: string,
  language: string = 'python',
  currentCode: string = ''
): ParsedError | null {
  if (!rawError || !rawError.trim()) return null;

  const text = rawError.trim();

  // 1. Python Tracebacks & Syntax Errors
  if (language === 'python') {
    return parsePythonError(text, currentCode);
  }

  // 2. C / C++ GCC/Clang Errors (e.g. main.cpp:14:5: error: ...)
  if (language === 'c' || language === 'cpp') {
    return parseCError(text);
  }

  // 3. Java javac / JVM Errors (e.g. Main.java:8: error: ...)
  if (language === 'java') {
    return parseJavaError(text);
  }

  // 4. JavaScript / Node.js Errors (e.g. /path/to/file.js:12 ReferenceError: ...)
  if (language === 'javascript' || language === 'typescript') {
    return parseJsError(text);
  }

  // Generic fallback: look for "line X" anywhere in the error
  const genericLineMatch = text.match(/\bline\s+(\d+)\b/i) || text.match(/:(\d+):/);
  if (genericLineMatch) {
    const line = parseInt(genericLineMatch[1], 10);
    return {
      line,
      errorType: 'Runtime Error',
      message: text.split('\n')[0].slice(0, 150),
      explanation: 'An error occurred during execution at this line.',
      suggestion: 'Review the line of code and inspect the output in the terminal above.',
    };
  }

  return null;
}

/**
 * Specialized Python traceback parser.
 */
function parsePythonError(text: string, currentCode: string): ParsedError | null {
  // Check for SyntaxError / IndentationError with file and line:
  // File "main.py", line 17
  //   try:
  //      ^
  // SyntaxError: expected 'except' or 'finally' block
  const lines = text.split('\n');
  let targetLine = 0;
  let targetCol: number | undefined;
  let targetFile = 'main.py';
  let errorType = 'Error';
  let errorMessage = '';

  // Look for: File "...", line X
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    const fileLineMatch = l.match(/File\s+["']?([^"',]+)["']?,\s+line\s+(\d+)/i);
    if (fileLineMatch) {
      targetFile = fileLineMatch[1];
      targetLine = parseInt(fileLineMatch[2], 10);
    }
  }

  // Look for the final error line (e.g. SyntaxError: ...)
  for (let i = lines.length - 1; i >= 0; i--) {
    const l = lines[i].trim();
    const typeMatch = l.match(/^([A-Za-z0-9_]+Error|[A-Za-z0-9_]+Exception):\s*(.*)$/);
    if (typeMatch) {
      errorType = typeMatch[1];
      errorMessage = typeMatch[2];
      break;
    }
  }

  // If no File line was found, try line in errorMessage
  if (!targetLine) {
    const lineMatch = text.match(/\bline\s+(\d+)\b/i) || text.match(/:(\d+):/);
    if (lineMatch) {
      targetLine = parseInt(lineMatch[1], 10);
    }
  }

  if (!targetLine && !errorMessage) return null;

  // Derive specialized explanation and suggestion
  let explanation = PYTHON_ERROR_KNOWLEDGE[errorType]?.explanation || `A ${errorType} occurred during execution.`;
  let suggestion = PYTHON_ERROR_KNOWLEDGE[errorType]?.suggestion || 'Review the line indicated and verify syntax and variable types.';
  let suggestedFix: string | undefined = undefined;

  const msgLower = (errorMessage || text).toLowerCase();

  if (errorType === 'SyntaxError') {
    if (msgLower.includes("expected 'except' or 'finally' block") || (msgLower.includes('try') && msgLower.includes('except'))) {
      explanation = "In Python, every 'try' statement must be paired with at least one 'except' or 'finally' block.";
      suggestion = "Add an 'except Exception as e:' block below the indented code to catch errors, or add 'finally:'.";
      if (currentCode) {
        suggestedFix = generateTryExceptFix(currentCode, targetLine);
      }
    } else if (msgLower.includes('expected an indented block')) {
      explanation = 'Python expects an indented block of code after a colon (:).';
      suggestion = "Indent the statements inside this block by 4 spaces, or add 'pass' if you want a temporary placeholder.";
      if (currentCode) {
        suggestedFix = generateIndentedBlockFix(currentCode, targetLine);
      }
    } else if (msgLower.includes('unterminated string') || msgLower.includes('eol while scanning')) {
      explanation = 'A string literal was started with a quote but never closed before the line ended.';
      suggestion = 'Add the closing quotation mark at the end of the string.';
      if (currentCode) {
        suggestedFix = generateUnterminatedStringFix(currentCode, targetLine);
      }
    } else if (msgLower.includes('missing parentheses in call to')) {
      explanation = "In Python 3, 'print' is a function, not a statement.";
      suggestion = 'Wrap the items to print in parentheses: print(...)';
      if (currentCode) {
        suggestedFix = generatePrintParenFix(currentCode, targetLine);
      }
    } else if (msgLower.includes("expected ':'") || msgLower.includes('missing colon')) {
      explanation = 'Python requires a colon (:) at the end of compound statements (if, for, while, def, class, etc.).';
      suggestion = 'Add a colon (:) to the end of the line.';
      if (currentCode) {
        suggestedFix = generateMissingColonFix(currentCode, targetLine);
      }
    } else if (msgLower.includes('invalid syntax')) {
      explanation = 'Python found unexpected or invalid syntax at or right before this line.';
      suggestion = 'Check the previous line and this line for missing colons (:), unclosed brackets, or typos.';
      if (currentCode) {
        suggestedFix = generateMissingColonFix(currentCode, targetLine);
      }
    }
  } else if (errorType === 'IndentationError') {
    explanation = 'Indentation is incorrect or inconsistent at this line.';
    suggestion = 'Ensure each indented block uses 4 spaces. Do not mix Tab keys with Space keys.';
    if (currentCode) {
      suggestedFix = generateIndentedBlockFix(currentCode, targetLine);
    }
  }

  let symbol: string | undefined = undefined;
  let problem = `${errorType}: ${errorMessage || 'Execution failed'}`;
  let why_it_happened = explanation;
  let how_to_fix = suggestion;
  let diff_preview: { original_line: string; fixed_line: string } | undefined = undefined;

  const codeLines = currentCode ? currentCode.split('\n') : [];
  const lineIdx = Math.max(0, Math.min((targetLine || 1) - 1, codeLines.length - 1));
  const code_snippet = codeLines[lineIdx] || '';

  if (errorType === 'NameError') {
    const varMatch = (errorMessage || text).match(/name '(\w+)' is not defined/);
    if (varMatch) {
      const varName = varMatch[1];
      symbol = varName;
      problem = `'${varName}' is not defined.`;

      // Check if Python included "Did you mean: '...'?"
      const dymMatch = (errorMessage || text).match(/Did you mean: '(\w+)'/);
      let suggestedName = dymMatch ? dymMatch[1] : undefined;

      // If not in message, search currentCode for closest identifier
      if (!suggestedName && currentCode) {
        const words = Array.from(new Set(currentCode.match(/\b[a-zA-Z_][a-zA-Z0-9_]*\b/g) || []))
          .filter((w) => w !== varName && w.length >= 2);
        let bestDist = 3;
        for (const w of words) {
          // Simple edit distance
          const d = simpleEditDistance(varName, w);
          if (d < bestDist) {
            bestDist = d;
            suggestedName = w;
          }
        }
      }

      if (['true', 'false', 'null', 'nil', 'undefined'].includes(varName.toLowerCase())) {
        const correct = { true: 'True', false: 'False', null: 'None', nil: 'None', undefined: 'None' }[varName.toLowerCase()];
        why_it_happened = `In Python, boolean and null literals are capitalized: use '${correct}' instead of '${varName}'.`;
        how_to_fix = `Replace '${varName}' with '${correct}'.`;
        if (currentCode) {
          suggestedFix = generateNameFix(currentCode, targetLine, varName, correct!);
          if (code_snippet) {
            diff_preview = {
              original_line: code_snippet,
              fixed_line: code_snippet.replace(new RegExp(`\\b${varName}\\b`), correct!),
            };
          }
        }
      } else if (suggestedName) {
        why_it_happened = `Your function/code defines or uses a variable called '${suggestedName}', but this line references '${varName}'. Python variable names are case-sensitive and must match exactly.`;
        how_to_fix = `Replace '${varName}' with '${suggestedName}' on line ${targetLine}.`;
        if (currentCode) {
          suggestedFix = generateNameFix(currentCode, targetLine, varName, suggestedName);
          if (code_snippet) {
            diff_preview = {
              original_line: code_snippet,
              fixed_line: code_snippet.replace(new RegExp(`\\b${varName}\\b`), suggestedName),
            };
          }
        }
      } else {
        why_it_happened = `The variable or function '${varName}' has not been defined yet in this scope.`;
        how_to_fix = `Define '${varName} = ...' before line ${targetLine}, or verify the spelling.`;
      }
      explanation = why_it_happened;
      suggestion = how_to_fix;
    }
  } else if (errorType === 'ZeroDivisionError') {
    problem = 'Attempted to divide by zero.';
    why_it_happened = `The denominator expression on line ${targetLine} evaluated to zero at runtime. Division by zero is undefined.`;
    how_to_fix = 'Add a validation check before dividing (e.g. `if denominator != 0:`) or provide a default fallback.';
    explanation = why_it_happened;
    suggestion = how_to_fix;
  } else if (errorType === 'IndexError') {
    problem = 'List or sequence index is out of range.';
    why_it_happened = `Python lists are 0-indexed (indices go from 0 to len - 1). Accessing this index exceeded the bounds of the list.`;
    how_to_fix = 'Check that the index is >= 0 and < len(sequence), or use `range(len(items))` for looping.';
    explanation = why_it_happened;
    suggestion = how_to_fix;
  } else if (errorType === 'TypeError') {
    if (msgLower.includes('unsupported operand type')) {
      problem = `Incompatible types for operation.`;
      why_it_happened = 'Python does not automatically convert between numbers and text during operations.';
      how_to_fix = 'Use `str()` to convert numbers to text, or `int()`/`float()` to convert text to numbers.';
      explanation = why_it_happened;
      suggestion = how_to_fix;
    }
  }

  // Populate diff_preview for try/except or colons if not set
  if (!diff_preview && suggestedFix && code_snippet) {
    const fixedLines = suggestedFix.split('\n');
    const fixedSnippet = fixedLines[lineIdx] || '';
    if (fixedSnippet && fixedSnippet !== code_snippet) {
      diff_preview = {
        original_line: code_snippet,
        fixed_line: fixedSnippet,
      };
    }
  }

  return {
    file: targetFile,
    line: targetLine || 1,
    column: targetCol,
    symbol,
    errorType,
    message: errorMessage || errorType,
    problem,
    why_it_happened,
    how_to_fix,
    code_snippet,
    diff_preview,
    explanation,
    suggestion,
    suggestedFix,
  };
}

function simpleEditDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

/**
 * Generate quick fix for Python try without except.
 */
function generateTryExceptFix(code: string, errorLine: number): string | undefined {
  if (!code || !code.trim()) return undefined;
  const lines = code.split('\n');
  const maxSearch = Math.min(lines.length, errorLine > 0 ? errorLine : lines.length);
  let tryIdx = -1;
  for (let i = maxSearch - 1; i >= 0; i--) {
    if (/^\s*try\s*:/.test(lines[i])) {
      tryIdx = i;
      break;
    }
  }
  if (tryIdx === -1) {
    // Search anywhere
    for (let i = lines.length - 1; i >= 0; i--) {
      if (/^\s*try\s*:/.test(lines[i])) {
        tryIdx = i;
        break;
      }
    }
  }
  if (tryIdx === -1) return undefined;

  const tryLine = lines[tryIdx];
  const tryIndent = tryLine.match(/^(\s*)/)?.[1] || '';
  const inlineAfterColon = tryLine.replace(/^\s*try\s*:\s*/, '').trim();

  // If there was code inline on the same line as try:, like `try: x = 1` or `try:andx = 1`
  if (inlineAfterColon && !inlineAfterColon.startsWith('#')) {
    const copy = [...lines];
    copy[tryIdx] = `${tryIndent}try:`;
    copy.splice(
      tryIdx + 1,
      0,
      `${tryIndent}    ${inlineAfterColon}`,
      `${tryIndent}except Exception as e:`,
      `${tryIndent}    print(f"Error: {e}")`
    );
    return copy.join('\n');
  }

  let insertIdx = tryIdx + 1;
  while (insertIdx < lines.length) {
    const l = lines[insertIdx];
    if (!l.trim()) {
      insertIdx++;
      continue;
    }
    const lIndent = l.match(/^(\s*)/)?.[1] || '';
    if (lIndent.length <= tryIndent.length) {
      break;
    }
    insertIdx++;
  }

  const copy = [...lines];
  if (insertIdx === tryIdx + 1) {
    copy.splice(
      tryIdx + 1,
      0,
      `${tryIndent}    pass`,
      `${tryIndent}except Exception as e:`,
      `${tryIndent}    print(f"Error: {e}")`
    );
  } else {
    copy.splice(
      insertIdx,
      0,
      `${tryIndent}except Exception as e:`,
      `${tryIndent}    print(f"Error: {e}")`
    );
  }
  return copy.join('\n');
}

/**
 * Generate quick fix for IndentationError (expected an indented block).
 */
function generateIndentedBlockFix(code: string, errorLine: number): string | undefined {
  const lines = code.split('\n');
  const idx = Math.max(0, (errorLine || 1) - 1);
  if (idx >= lines.length) return undefined;

  // The colon usually is on the preceding non-empty line or current line
  let targetIdx = idx;
  if (!lines[targetIdx].trim().endsWith(':') && idx > 0 && lines[idx - 1].trim().endsWith(':')) {
    targetIdx = idx - 1;
  }
  const baseIndent = lines[targetIdx].match(/^(\s*)/)?.[1] || '';
  const copy = [...lines];
  copy.splice(targetIdx + 1, 0, `${baseIndent}    pass`);
  return copy.join('\n');
}

/**
 * Generate quick fix for missing colon.
 */
function generateMissingColonFix(code: string, errorLine: number): string | undefined {
  const lines = code.split('\n');
  const checkIndices = [errorLine - 1, errorLine - 2];
  for (const idx of checkIndices) {
    if (idx >= 0 && idx < lines.length) {
      const line = lines[idx];
      const trimmed = line.trim();
      if (/^(if\b|elif\b|else|for\b|while\b|def\b|class\b|try|except|finally|with\b)/.test(trimmed) && !trimmed.endsWith(':')) {
        const copy = [...lines];
        copy[idx] = line.trimEnd() + ':';
        return copy.join('\n');
      }
    }
  }
  return undefined;
}

/**
 * Generate quick fix for unterminated string.
 */
function generateUnterminatedStringFix(code: string, errorLine: number): string | undefined {
  const lines = code.split('\n');
  const idx = (errorLine || 1) - 1;
  if (idx < 0 || idx >= lines.length) return undefined;
  const line = lines[idx];
  const singleQuotes = (line.match(/'/g) || []).length;
  const doubleQuotes = (line.match(/"/g) || []).length;
  const copy = [...lines];
  if (singleQuotes % 2 !== 0) {
    copy[idx] = line + "'";
    return copy.join('\n');
  } else if (doubleQuotes % 2 !== 0) {
    copy[idx] = line + '"';
    return copy.join('\n');
  }
  return undefined;
}

/**
 * Generate quick fix for print without parentheses.
 */
function generatePrintParenFix(code: string, errorLine: number): string | undefined {
  const lines = code.split('\n');
  const idx = (errorLine || 1) - 1;
  if (idx < 0 || idx >= lines.length) return undefined;
  const line = lines[idx];
  const match = line.match(/^(\s*)print\s+([^(].*)$/);
  if (match) {
    const copy = [...lines];
    copy[idx] = `${match[1]}print(${match[2]})`;
    return copy.join('\n');
  }
  return undefined;
}

/**
 * Generate quick fix for NameError (e.g. true -> True).
 */
function generateNameFix(code: string, errorLine: number, wrongName: string, correctName: string): string | undefined {
  const lines = code.split('\n');
  const idx = (errorLine || 1) - 1;
  if (idx >= 0 && idx < lines.length) {
    const copy = [...lines];
    const re = new RegExp(`\\b${wrongName}\\b`, 'g');
    copy[idx] = copy[idx].replace(re, correctName);
    return copy.join('\n');
  }
  return undefined;
}

/**
 * Parser for C/C++ compiler errors (GCC/Clang format).
 */
function parseCError(text: string): ParsedError | null {
  const match = text.match(/(?:^|\n)([\w./\\-]+):(\d+):(?:(\d+):)?\s+(?:fatal\s+)?error:\s*(.*)/i);
  if (!match) return null;

  const file = match[1];
  const line = parseInt(match[2], 10);
  const column = match[3] ? parseInt(match[3], 10) : undefined;
  const message = match[4];

  let explanation = 'A C/C++ compilation error occurred.';
  let suggestion = 'Check syntax and types around this line.';

  if (/expected\s+[';']\s+before/i.test(message)) {
    explanation = 'A semicolon (;) is missing before this token.';
    suggestion = 'Add a semicolon (;) at the end of the previous statement.';
  } else if (/undeclared/i.test(message) || /was not declared/i.test(message)) {
    explanation = 'A variable or function is referenced before being declared or included.';
    suggestion = 'Declare the variable before use, or add the required #include header.';
  }

  return {
    file,
    line,
    column,
    errorType: 'Compilation Error',
    message,
    explanation,
    suggestion,
  };
}

/**
 * Parser for Java compiler errors.
 */
function parseJavaError(text: string): ParsedError | null {
  const match = text.match(/(?:^|\n)([\w./\\-]+):(\d+):\s+error:\s*(.*)/i);
  if (!match) return null;

  const file = match[1];
  const line = parseInt(match[2], 10);
  const message = match[3];

  let explanation = 'A Java compilation error occurred.';
  let suggestion = 'Check types, syntax, and method signatures.';

  if (/cannot find symbol/i.test(message)) {
    explanation = 'Java cannot find the specified variable, method, or class.';
    suggestion = 'Verify spelling, import statements, or variable declaration.';
  } else if (/';'\s+expected/i.test(message)) {
    explanation = 'A semicolon (;) is missing.';
    suggestion = 'Add a semicolon (;) at the end of the statement.';
  }

  return {
    file,
    line,
    errorType: 'Compilation Error',
    message,
    explanation,
    suggestion,
  };
}

/**
 * Parser for JavaScript/Node.js runtime errors.
 */
function parseJsError(text: string): ParsedError | null {
  // e.g. ReferenceError: x is not defined \n at ...
  const typeMatch = text.match(/^([A-Za-z0-9_]+Error):\s*(.*)/);
  const lineMatch = text.match(/:(\d+):(\d+)/);

  if (!lineMatch) return null;

  const line = parseInt(lineMatch[1], 10);
  const column = parseInt(lineMatch[2], 10);
  const errorType = typeMatch ? typeMatch[1] : 'JavaScript Error';
  const message = typeMatch ? typeMatch[2] : text.split('\n')[0];

  let explanation = `A ${errorType} occurred during JavaScript execution.`;
  let suggestion = 'Review the line indicated for undefined variables or incorrect properties.';

  if (errorType === 'ReferenceError') {
    explanation = 'A variable was referenced that does not exist in the current scope.';
    suggestion = 'Declare the variable with let, const, or var before using it.';
  } else if (errorType === 'TypeError') {
    explanation = 'An operation was attempted on an inappropriate value (e.g. calling a non-function).';
    suggestion = 'Check if the variable is null or undefined before accessing properties or calling it.';
  }

  return {
    line,
    column,
    errorType,
    message,
    explanation,
    suggestion,
  };
}
