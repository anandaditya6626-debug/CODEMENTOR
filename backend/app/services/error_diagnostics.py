"""
Intelligent Python Error Diagnostics & Logical Bug Detection Engine.

Provides deep, beginner-friendly root cause analysis, variable typo matching,
context-aware explanations, safe automated fixes, and logical error detection.
Works 100% offline without requiring external AI keys.
"""

import ast
import difflib
import logging
import re
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)

# Standard library modules commonly imported in Python
COMMON_STDLIB_MODULES = {
    'math', 'random', 'sys', 'os', 'json', 're', 'datetime', 'time',
    'collections', 'itertools', 'functools', 'urllib', 'pathlib',
    'string', 'copy', 'heapq', 'bisect', 'shutil', 'sqlite3', 'csv'
}

# Common third-party modules with their pip package names
COMMON_PACKAGES = {
    'numpy': 'numpy', 'np': 'numpy',
    'pandas': 'pandas', 'pd': 'pandas',
    'matplotlib': 'matplotlib', 'plt': 'matplotlib',
    'requests': 'requests',
    'scipy': 'scipy',
    'sklearn': 'scikit-learn',
    'torch': 'torch',
    'cv2': 'opencv-python',
    'bs4': 'beautifulsoup4',
    'flask': 'flask',
    'fastapi': 'fastapi',
    'pydantic': 'pydantic',
}

# Common Python method misnomers
ATTRIBUTE_CORRECTIONS = {
    'list': {
        'add': 'append',
        'push': 'append',
        'put': 'append',
        'insert_last': 'append',
        'length': 'len(list)',
        'size': 'len(list)',
        'contains': 'in operator (e.g. item in list)',
    },
    'set': {
        'append': 'add',
        'push': 'add',
    },
    'dict': {
        'add': "dict[key] = value",
        'append': "dict[key] = value",
        'push': "dict[key] = value",
        'has_key': "in operator (e.g. key in dict)",
        'length': 'len(dict)',
        'size': 'len(dict)',
    },
    'str': {
        'append': "string concatenation (+) or format strings",
        'add': "string concatenation (+)",
        'push': "string concatenation (+)",
        'contains': "in operator (e.g. sub in text)",
        'length': 'len(string)',
        'size': 'len(string)',
    }
}


class PythonIdentifierCollector(ast.NodeVisitor):
    """Collects all defined variable names, parameters, functions, and classes with scopes."""

    def __init__(self):
        self.defined_names: set[str] = set()
        self.scope_names: Dict[str, set[str]] = {'global': set()}
        self.current_scope = 'global'
        self.name_lines: Dict[str, List[int]] = {}

    def _record_name(self, name: str, line: int):
        self.defined_names.add(name)
        if self.current_scope not in self.scope_names:
            self.scope_names[self.current_scope] = set()
        self.scope_names[self.current_scope].add(name)
        if name not in self.name_lines:
            self.name_lines[name] = []
        self.name_lines[name].append(line)

    def visit_FunctionDef(self, node: ast.FunctionDef):
        self._record_name(node.name, node.lineno)
        old_scope = self.current_scope
        self.current_scope = node.name
        self.scope_names[self.current_scope] = set()
        for arg in node.args.args:
            self._record_name(arg.arg, node.lineno)
        self.generic_visit(node)
        self.current_scope = old_scope

    def visit_AsyncFunctionDef(self, node: ast.AsyncFunctionDef):
        self._record_name(node.name, node.lineno)
        old_scope = self.current_scope
        self.current_scope = node.name
        self.scope_names[self.current_scope] = set()
        for arg in node.args.args:
            self._record_name(arg.arg, node.lineno)
        self.generic_visit(node)
        self.current_scope = old_scope

    def visit_ClassDef(self, node: ast.ClassDef):
        self._record_name(node.name, node.lineno)
        old_scope = self.current_scope
        self.current_scope = node.name
        self.scope_names[self.current_scope] = set()
        self.generic_visit(node)
        self.current_scope = old_scope

    def visit_Name(self, node: ast.Name):
        if isinstance(node.ctx, (ast.Store, ast.Del)):
            self._record_name(node.id, node.lineno)
        self.generic_visit(node)

    def visit_For(self, node: ast.For):
        if isinstance(node.target, ast.Name):
            self._record_name(node.target.id, node.lineno)
        self.generic_visit(node)


def extract_traceback_info(raw_trace: str) -> Dict[str, Any]:
    """Parse a Python traceback into structured fields."""
    lines = raw_trace.strip().split('\n')
    error_type = 'RuntimeError'
    error_msg = ''
    target_line = 0
    target_col: Optional[int] = None
    target_file = 'main.py'
    trace_frames: List[Dict[str, Any]] = []

    # Parse traceback frames: File "...", line X, in ...
    for i, line in enumerate(lines):
        m = re.match(r'^\s*File\s+["\']([^"\']+)["\'],\s+line\s+(\d+)(?:,\s+in\s+(.+))?', line)
        if m:
            fn = m.group(1)
            ln = int(m.group(2))
            fn_scope = m.group(3) or '<module>'
            code_line = lines[i + 1].strip() if i + 1 < len(lines) and not lines[i + 1].startswith('  File') else ''
            trace_frames.append({
                'file': fn,
                'line': ln,
                'scope': fn_scope,
                'code': code_line
            })
            # Always update target line to the innermost frame of user's code
            target_file = fn
            target_line = ln

    # Parse caret markers (e.g. ^^^ or ^) for column positioning
    for i, line in enumerate(lines):
        if '^' in line and not line.strip().startswith('File'):
            col = line.find('^') + 1
            target_col = col

    # Parse final error line: e.g. NameError: name 'grades' is not defined. Did you mean: 'grade'?
    for line in reversed(lines):
        stripped = line.strip()
        type_match = re.match(r'^([A-Za-z0-9_]+Error|[A-Za-z0-9_]+Exception):\s*(.*)$', stripped)
        if type_match:
            error_type = type_match.group(1)
            error_msg = type_match.group(2)
            break

    # If no File frame matched, try matching "line X" anywhere
    if not target_line:
        line_match = re.search(r'\bline\s+(\d+)\b', raw_trace, re.IGNORECASE)
        if line_match:
            target_line = int(line_match.group(1))

    return {
        'error_type': error_type,
        'error_msg': error_msg,
        'line': target_line or 1,
        'column': target_col,
        'file': target_file,
        'frames': trace_frames,
    }


def analyze_python_error(code: str, raw_trace: str, error_line: Optional[int] = None) -> Dict[str, Any]:
    """Perform in-depth root cause analysis on a Python runtime or syntax error."""
    tb = extract_traceback_info(raw_trace)
    err_type = tb['error_type']
    err_msg = tb['error_msg']
    line_no = error_line or tb['line']
    code_lines = code.split('\n')
    line_idx = max(0, min(line_no - 1, len(code_lines) - 1))
    current_line = code_lines[line_idx] if code_lines else ''

    # Default fallback container
    diag: Dict[str, Any] = {
        'error_type': err_type,
        'line': line_no,
        'column': tb.get('column'),
        'symbol': None,
        'problem': f"{err_type}: {err_msg}" if err_msg else f"A {err_type} occurred during execution.",
        'why_it_happened': f"Python encountered a {err_type} on line {line_no}.",
        'how_to_fix': "Review the indicated line and check variable names and types.",
        'code_snippet': current_line,
        'diff_preview': None,
        'fixed_code': '',
        'suggestions': [],
        'is_logical': False,
        'confidence': 'high',
    }

    # Parse AST to gather user-defined identifiers & scope symbols
    collector = PythonIdentifierCollector()
    try:
        tree = ast.parse(code)
        collector.visit(tree)
    except SyntaxError:
        # Fallback regex identifier extraction if code has syntax errors
        found = set(re.findall(r'\b[a-zA-Z_][a-zA-Z0-9_]*\b', code))
        collector.defined_names = found

    # -------------------------------------------------------------------------
    # 1. NameError (Undefined variable or function)
    # -------------------------------------------------------------------------
    if err_type == 'NameError':
        name_match = re.search(r"name '(\w+)' is not defined", err_msg)
        undefined_name = name_match.group(1) if name_match else None
        diag['symbol'] = undefined_name

        if undefined_name:
            diag['problem'] = f"'{undefined_name}' is not defined."

            # Case A: Python 3.10+ "Did you mean: '...'" suggestion
            dym_match = re.search(r"Did you mean: '(\w+)'", err_msg)
            suggested_name = dym_match.group(1) if dym_match else None

            # Case B: Similarity match against user's defined variables
            if not suggested_name:
                candidates = [n for n in collector.defined_names if n != undefined_name]
                matches = difflib.get_close_matches(undefined_name, candidates, n=1, cutoff=0.6)
                if matches:
                    suggested_name = matches[0]

            # Case C: Common booleans / None literals (true -> True, null -> None)
            literal_corrections = {
                'true': 'True', 'false': 'False', 'null': 'None',
                'nil': 'None', 'undefined': 'None', 'none': 'None'
            }
            if undefined_name.lower() in literal_corrections:
                correct_lit = literal_corrections[undefined_name.lower()]
                diag['why_it_happened'] = (
                    f"In Python, boolean and null literals are capitalized: '{correct_lit}', not '{undefined_name}'."
                )
                diag['how_to_fix'] = f"Replace '{undefined_name}' with '{correct_lit}'."
                fixed_lines = list(code_lines)
                pattern = r'\b' + re.escape(undefined_name) + r'\b'
                fixed_lines[line_idx] = re.sub(pattern, correct_lit, current_line)
                diag['fixed_code'] = '\n'.join(fixed_lines)
                diag['diff_preview'] = {
                    'original_line': current_line,
                    'fixed_line': fixed_lines[line_idx],
                }
                return diag

            # Case D: Standard library module missing import (e.g. math.sqrt without import math)
            if undefined_name in COMMON_STDLIB_MODULES:
                diag['why_it_happened'] = (
                    f"'{undefined_name}' is a standard Python library module, but it hasn't been imported in this file."
                )
                diag['how_to_fix'] = f"Add 'import {undefined_name}' at the top of the file."
                diag['fixed_code'] = f"import {undefined_name}\n" + code
                diag['diff_preview'] = {
                    'original_line': "# Line 1 (missing import)",
                    'fixed_line': f"import {undefined_name}",
                }
                return diag

            # Case E: Package name (e.g. np without import numpy as np)
            if undefined_name in ('np', 'pd', 'plt'):
                target_imp = {
                    'np': 'import numpy as np',
                    'pd': 'import pandas as pd',
                    'plt': 'import matplotlib.pyplot as plt',
                }[undefined_name]
                diag['why_it_happened'] = f"'{undefined_name}' is an alias for a library that has not been imported."
                diag['how_to_fix'] = f"Add '{target_imp}' at the top of your program."
                diag['fixed_code'] = f"{target_imp}\n" + code
                return diag

            # Case F: Closely matching variable name found
            if suggested_name:
                diag['why_it_happened'] = (
                    f"Your code defines or uses a variable called '{suggested_name}', but line {line_no} "
                    f"references '{undefined_name}'. Python variable names are case-sensitive and must match exactly."
                )
                diag['how_to_fix'] = f"Replace '{undefined_name}' with '{suggested_name}' on line {line_no}."
                fixed_lines = list(code_lines)
                pattern = r'\b' + re.escape(undefined_name) + r'\b'
                fixed_lines[line_idx] = re.sub(pattern, suggested_name, current_line)
                diag['fixed_code'] = '\n'.join(fixed_lines)
                diag['diff_preview'] = {
                    'original_line': current_line,
                    'fixed_line': fixed_lines[line_idx],
                }
                diag['suggestions'] = [
                    f"Replace '{undefined_name}' with '{suggested_name}'",
                    f"Define '{undefined_name} = ...' before line {line_no}"
                ]
                return diag

            # Generic NameError
            diag['why_it_happened'] = (
                f"Python tried to access the name '{undefined_name}', but it has not been declared or assigned a value."
            )
            diag['how_to_fix'] = (
                f"Make sure to define '{undefined_name}' with an assignment (e.g. {undefined_name} = ...) "
                f"before line {line_no}, or verify spelling."
            )

    # -------------------------------------------------------------------------
    # 2. ZeroDivisionError
    # -------------------------------------------------------------------------
    elif err_type == 'ZeroDivisionError':
        diag['problem'] = "Attempted to divide by zero."
        denom = None
        # Extract denominator expression from current line: e.g. total / len(numbers) or a / b
        denom_match = re.search(r'/\s*([a-zA-Z0-9_\(\)\.]+)', current_line)
        if denom_match:
            denom = denom_match.group(1).strip()
            diag['symbol'] = denom
            diag['why_it_happened'] = (
                f"The denominator expression '{denom}' evaluated to 0 on line {line_no}. "
                f"In mathematics and Python, division by zero is undefined."
            )
            diag['how_to_fix'] = (
                f"Add a guard check before dividing to ensure '{denom}' is non-zero: "
                f"`if {denom} != 0: ...` or provide a default fallback value."
            )
        else:
            diag['why_it_happened'] = f"A division (/) or modulo (%) operation on line {line_no} had a divisor of zero."
            diag['how_to_fix'] = "Verify that the divisor is not zero before performing the division."

    # -------------------------------------------------------------------------
    # 3. IndexError (List or sequence out of range)
    # -------------------------------------------------------------------------
    elif err_type == 'IndexError':
        diag['problem'] = "List or sequence index is out of range."
        idx_match = re.search(r'\[([^\]]+)\]', current_line)
        seq_idx = idx_match.group(1).strip() if idx_match else None
        diag['symbol'] = seq_idx

        # Check for range(len(arr) + 1) off-by-one bug
        if re.search(r'range\s*\(\s*len\s*\([^\)]+\)\s*\+\s*1\s*\)', code):
            diag['why_it_happened'] = (
                "Python lists are 0-indexed (indices go from 0 to len - 1). "
                "Using `range(len(...) + 1)` iterates one step beyond the end of the list."
            )
            diag['how_to_fix'] = "Change `range(len(...) + 1)` to `range(len(...))`."
            fixed_code = re.sub(
                r'range\s*\(\s*len\s*\(([^\)]+)\)\s*\+\s*1\s*\)',
                r'range(len(\1))',
                code
            )
            diag['fixed_code'] = fixed_code
            return diag

        diag['why_it_happened'] = (
            f"Python sequences (lists, strings, tuples) are 0-indexed. For a sequence of length N, "
            f"the valid indices are 0 to N-1. Indexing '{seq_idx or 'an item'}' exceeded the available length."
        )
        diag['how_to_fix'] = (
            "Verify the list has elements before accessing it, or use `len()` to check the boundary: "
            "`if index < len(my_list): ...`."
        )

    # -------------------------------------------------------------------------
    # 4. TypeError (Incompatible types or uncallable object)
    # -------------------------------------------------------------------------
    elif err_type == 'TypeError':
        if 'unsupported operand type' in err_msg:
            type_match = re.search(r"for ([^:]+):\s*'(\w+)'\s+and\s+'(\w+)'", err_msg)
            op = type_match.group(1) if type_match else 'an operation'
            t1 = type_match.group(2) if type_match else 'type1'
            t2 = type_match.group(3) if type_match else 'type2'

            diag['problem'] = f"Cannot perform '{op}' between '{t1}' and '{t2}'."
            diag['why_it_happened'] = (
                f"Python does not automatically convert '{t1}' to '{t2}' (or vice-versa). "
                f"For example, you cannot add a number and text directly without conversion."
            )
            diag['how_to_fix'] = (
                f"Explicitly convert the values using `{t1}()` or `{t2}()`, or use f-strings for text formatting: "
                f"`f'Value: {{variable}}'`."
            )
            # Auto-fix: if adding string and int like "age: " + 25 -> "age: " + str(25)
            if '+' in current_line and ('str' in (t1, t2)) and ('int' in (t1, t2)):
                fixed_lines = list(code_lines)
                fixed_lines[line_idx] = re.sub(r'\+\s*([a-zA-Z0-9_]+)', r'+ str(\1)', current_line)
                if fixed_lines[line_idx] != current_line:
                    diag['fixed_code'] = '\n'.join(fixed_lines)
                    diag['diff_preview'] = {
                        'original_line': current_line,
                        'fixed_line': fixed_lines[line_idx],
                    }

        elif 'not callable' in err_msg:
            target = re.search(r"'(\w+)' object is not callable", err_msg)
            obj_type = target.group(1) if target else 'Object'
            diag['problem'] = f"'{obj_type}' object cannot be called like a function."
            diag['why_it_happened'] = (
                f"You used parentheses `(...)` on an object of type '{obj_type}'. "
                f"This often happens if you shadowed a built-in function (e.g. `list = [1, 2]` followed by `list(...)`), "
                f"or omitted a multiplication operator like `5(x + 1)`."
            )
            diag['how_to_fix'] = (
                "Ensure you are not reusing built-in function names (like list, dict, str, sum) as variable names, "
                "or add an explicit `*` operator for multiplication."
            )
        else:
            diag['problem'] = f"TypeError: {err_msg}"
            diag['why_it_happened'] = "An operation or function received an argument with an inappropriate data type."
            diag['how_to_fix'] = "Check the types of arguments being passed and convert them if necessary."

    # -------------------------------------------------------------------------
    # 5. KeyError (Dictionary key missing)
    # -------------------------------------------------------------------------
    elif err_type == 'KeyError':
        key_name = err_msg.strip("'\"")
        diag['symbol'] = key_name
        diag['problem'] = f"Key '{key_name}' not found in dictionary."
        diag['why_it_happened'] = (
            f"Your code tried to look up the key '{key_name}' in a dictionary, but that key does not exist."
        )
        diag['how_to_fix'] = (
            f"Use `dict.get('{key_name}', default_value)` to safely retrieve a value without crashing, "
            f"or check `if '{key_name}' in dict:` before accessing."
        )
        # Auto-fix: replace dict['key'] with dict.get('key')
        pattern = r"\[['\"]" + re.escape(key_name) + r"['\"]\]"
        if re.search(pattern, current_line):
            fixed_lines = list(code_lines)
            fixed_lines[line_idx] = re.sub(pattern, f".get('{key_name}')", current_line)
            diag['fixed_code'] = '\n'.join(fixed_lines)
            diag['diff_preview'] = {
                'original_line': current_line,
                'fixed_line': fixed_lines[line_idx],
            }

    # -------------------------------------------------------------------------
    # 6. AttributeError (Object has no attribute/method)
    # -------------------------------------------------------------------------
    elif err_type == 'AttributeError':
        attr_match = re.search(r"'(\w+)' object has no attribute '(\w+)'", err_msg)
        if attr_match:
            obj_type = attr_match.group(1)
            bad_attr = attr_match.group(2)
            diag['symbol'] = bad_attr
            diag['problem'] = f"'{obj_type}' has no method or attribute '{bad_attr}'."

            # Check known misnomers
            correction = ATTRIBUTE_CORRECTIONS.get(obj_type, {}).get(bad_attr)
            if correction:
                diag['why_it_happened'] = (
                    f"In Python, '{obj_type}' objects do not have a '{bad_attr}' method. "
                    f"Did you mean to use `{correction}`?"
                )
                diag['how_to_fix'] = f"Replace `.{bad_attr}()` with `.{correction}()`."
                # Auto-fix for list.add -> list.append
                if correction.isidentifier():
                    fixed_lines = list(code_lines)
                    fixed_lines[line_idx] = current_line.replace(f".{bad_attr}(", f".{correction}(")
                    diag['fixed_code'] = '\n'.join(fixed_lines)
                    diag['diff_preview'] = {
                        'original_line': current_line,
                        'fixed_line': fixed_lines[line_idx],
                    }
            elif obj_type == 'NoneType':
                diag['why_it_happened'] = (
                    f"You called `.{bad_attr}` on `None`. This usually happens when a function that doesn't return anything "
                    f"(like `list.sort()` or `list.append()`) is assigned to a variable."
                )
                diag['how_to_fix'] = (
                    "Remember that methods like `list.sort()` modify in-place and return None. "
                    "Use `sorted(list)` if you want a new sorted list."
                )
            else:
                diag['why_it_happened'] = f"The '{obj_type}' object does not possess the attribute or method '{bad_attr}'."
                diag['how_to_fix'] = f"Check the spelling of '.{bad_attr}' or verify the type of the object."

    # -------------------------------------------------------------------------
    # 7. ValueError
    # -------------------------------------------------------------------------
    elif err_type == 'ValueError':
        if 'invalid literal for int()' in err_msg:
            val_match = re.search(r"with base 10:\s*'([^']+)'", err_msg)
            bad_val = val_match.group(1) if val_match else ''
            diag['problem'] = f"Cannot convert text '{bad_val}' to an integer."
            diag['why_it_happened'] = (
                f"`int()` expects a valid numerical string (like '42'), but received '{bad_val}'."
            )
            diag['how_to_fix'] = "Wrap the input parsing in a try-except block to handle non-numeric inputs gracefully."
        elif 'not enough values to unpack' in err_msg or 'too many values to unpack' in err_msg:
            diag['problem'] = "Mismatch in variable unpacking."
            diag['why_it_happened'] = "The number of variables on the left does not match the items provided on the right."
            diag['how_to_fix'] = "Ensure the variable count matches the length of the tuple or list being unpacked."

    # -------------------------------------------------------------------------
    # 8. RecursionError
    # -------------------------------------------------------------------------
    elif err_type == 'RecursionError':
        diag['problem'] = "Maximum recursion depth exceeded."
        diag['why_it_happened'] = (
            "Your function called itself repeatedly without reaching a base case (stopping condition). "
            "Python limits recursion depth to prevent stack overflow crashes."
        )
        diag['how_to_fix'] = (
            "1. Add or verify a base condition (e.g. `if n <= 1: return 1`).\n"
            "2. Ensure each recursive call changes its parameters toward the base condition (e.g. `func(n - 1)`)."
        )

    # -------------------------------------------------------------------------
    # 9. SyntaxError / IndentationError
    # -------------------------------------------------------------------------
    elif err_type in ('SyntaxError', 'IndentationError'):
        if "expected 'except' or 'finally' block" in err_msg.lower() or ('try' in err_msg.lower() and 'except' in err_msg.lower()):
            diag['problem'] = "Missing 'except' or 'finally' block after 'try:'."
            diag['why_it_happened'] = "In Python, every 'try' statement must be paired with at least one 'except' or 'finally' block."
            diag['how_to_fix'] = "Add an `except Exception as e:` block below the indented code."
            # Find try line and attach except
            try_idx = -1
            for i in range(line_idx, -1, -1):
                if re.match(r'^\s*try\s*:', code_lines[i]):
                    try_idx = i
                    break
            if try_idx != -1:
                t_indent = re.match(r'^(\s*)', code_lines[try_idx]).group(1)
                fixed_lines = list(code_lines)
                fixed_lines.append(f"{t_indent}except Exception as e:")
                fixed_lines.append(f"{t_indent}    print(f\"Error: {{e}}\")")
                diag['fixed_code'] = '\n'.join(fixed_lines)

        elif 'expected an indented block' in err_msg.lower():
            diag['problem'] = "Expected an indented block of code after a colon (:)."
            diag['why_it_happened'] = "Python requires 4 spaces of indentation for code blocks following statements like if/def/for/while/try."
            diag['how_to_fix'] = "Indent the statements inside this block by 4 spaces, or add 'pass' if you want an empty placeholder."
            cur_indent = re.match(r'^(\s*)', current_line).group(1)
            fixed_lines = list(code_lines)
            fixed_lines.insert(line_idx + 1, f"{cur_indent}    pass")
            diag['fixed_code'] = '\n'.join(fixed_lines)

        elif "expected ':'" in err_msg.lower() or "missing colon" in err_msg.lower():
            diag['problem'] = "Missing colon (:) at end of statement."
            diag['why_it_happened'] = "Compound statements (if, for, while, def, class, etc.) must end with a colon (:)."
            diag['how_to_fix'] = "Add ':' at the end of the line."
            fixed_lines = list(code_lines)
            fixed_lines[line_idx] = current_line.rstrip() + ':'
            diag['fixed_code'] = '\n'.join(fixed_lines)
            diag['diff_preview'] = {
                'original_line': current_line,
                'fixed_line': fixed_lines[line_idx],
            }

        elif 'missing parentheses in call to' in err_msg.lower():
            diag['problem'] = "Missing parentheses in call to 'print'."
            diag['why_it_happened'] = "In Python 3, `print` is a function and requires parentheses: `print(...)`."
            diag['how_to_fix'] = "Wrap the arguments to print in parentheses."
            m = re.match(r'^(\s*)print\s+([^(].*)$', current_line)
            if m:
                fixed_lines = list(code_lines)
                fixed_lines[line_idx] = f"{m.group(1)}print({m.group(2)})"
                diag['fixed_code'] = '\n'.join(fixed_lines)
                diag['diff_preview'] = {
                    'original_line': current_line,
                    'fixed_line': fixed_lines[line_idx],
                }

    # -------------------------------------------------------------------------
    # 10. ModuleNotFoundError / ImportError
    # -------------------------------------------------------------------------
    elif err_type in ('ModuleNotFoundError', 'ImportError'):
        mod_match = re.search(r"No module named '([^']+)'", err_msg)
        mod_name = mod_match.group(1) if mod_match else ''
        diag['symbol'] = mod_name
        diag['problem'] = f"Module '{mod_name}' is not installed."
        pip_pkg = COMMON_PACKAGES.get(mod_name, mod_name)
        diag['why_it_happened'] = f"Python cannot find the library '{mod_name}' in your current environment."
        diag['how_to_fix'] = f"Install the library in your terminal using: `pip install {pip_pkg}`."

    return diag


# -----------------------------------------------------------------------------
# Logical Bug Detector (Suspicious AST Patterns)
# -----------------------------------------------------------------------------

class LogicalErrorDetector(ast.NodeVisitor):
    """AST analyzer that identifies suspicious logic patterns that execute without crashing."""

    def __init__(self, code: str):
        self.code = code
        self.lines = code.split('\n')
        self.diagnostics: List[Dict[str, Any]] = []

    def visit_For(self, node: ast.For):
        self._check_loop_accumulator_overwrite(node)
        self._check_premature_loop_return(node)
        self.generic_visit(node)

    def visit_While(self, node: ast.While):
        self._check_infinite_loop(node)
        self._check_premature_loop_return(node)
        self.generic_visit(node)

    def _check_loop_accumulator_overwrite(self, node: ast.For):
        """Detect: total = 0 ... for num in numbers: total = num (instead of total += num)."""
        target_name = node.target.id if isinstance(node.target, ast.Name) else None
        if not target_name:
            return

        for stmt in node.body:
            if isinstance(stmt, ast.Assign):
                for target in stmt.targets:
                    if isinstance(target, ast.Name):
                        var_name = target.id
                        # If assigning var = target_name, where var was initialized before
                        if isinstance(stmt.value, ast.Name) and stmt.value.id == target_name:
                            line_no = stmt.lineno
                            orig_line = self.lines[line_no - 1] if line_no <= len(self.lines) else ''
                            fixed_line = orig_line.replace(f"{var_name} = {target_name}", f"{var_name} += {target_name}")

                            fixed_lines = list(self.lines)
                            fixed_lines[line_no - 1] = fixed_line

                            self.diagnostics.append({
                                'error_type': 'LogicalWarning',
                                'line': line_no,
                                'symbol': var_name,
                                'problem': f"Suspicious accumulator overwrite: '{var_name} = {target_name}'",
                                'why_it_happened': (
                                    f"Inside the loop on line {line_no}, `{var_name} = {target_name}` overwrites "
                                    f"the variable on every iteration with only the current element, "
                                    f"discarding previous values."
                                ),
                                'how_to_fix': f"Use `+=` to accumulate values: `{var_name} += {target_name}`.",
                                'code_snippet': orig_line,
                                'diff_preview': {
                                    'original_line': orig_line,
                                    'fixed_line': fixed_line,
                                },
                                'fixed_code': '\n'.join(fixed_lines),
                                'is_logical': True,
                                'confidence': 'high',
                            })

    def _check_premature_loop_return(self, node: Any):
        """Detect: for/while loop whose first statement is an unconditional return."""
        if node.body and isinstance(node.body[0], ast.Return):
            ret_node = node.body[0]
            line_no = ret_node.lineno
            orig_line = self.lines[line_no - 1] if line_no <= len(self.lines) else ''
            self.diagnostics.append({
                'error_type': 'LogicalWarning',
                'line': line_no,
                'symbol': 'return',
                'problem': "Unconditional return inside loop.",
                'why_it_happened': (
                    f"The `return` statement on line {line_no} runs immediately during the very first iteration, "
                    f"causing the loop to terminate prematurely before inspecting other elements."
                ),
                'how_to_fix': "Check whether this `return` statement should be indented outside the loop or placed under an `if` condition.",
                'code_snippet': orig_line,
                'is_logical': True,
                'confidence': 'medium',
            })

    def _check_infinite_loop(self, node: ast.While):
        """Detect: while True: without any break, return, or exit call."""
        is_always_true = False
        if isinstance(node.test, ast.Constant) and node.test.value is True:
            is_always_true = True
        elif isinstance(node.test, ast.Constant) and node.test.value == 1:
            is_always_true = True

        if is_always_true:
            has_exit = False
            for child in ast.walk(node):
                if isinstance(child, (ast.Break, ast.Return, ast.Raise)):
                    has_exit = True
                    break
            if not has_exit:
                line_no = node.lineno
                orig_line = self.lines[line_no - 1] if line_no <= len(self.lines) else ''
                self.diagnostics.append({
                    'error_type': 'LogicalWarning',
                    'line': line_no,
                    'symbol': 'while',
                    'problem': "Potential infinite loop detected.",
                    'why_it_happened': (
                        f"The `while True:` loop on line {line_no} does not contain any `break` or `return` statements. "
                        f"This loop will run forever until timed out or terminated."
                    ),
                    'how_to_fix': "Add a termination condition with `break` inside the loop, or update loop variables to terminate.",
                    'code_snippet': orig_line,
                    'is_logical': True,
                    'confidence': 'high',
                })


def detect_logical_errors(code: str) -> List[Dict[str, Any]]:
    """Scan Python code for logical bugs that execute without raising runtime exceptions."""
    if not code or not code.strip():
        return []
    try:
        tree = ast.parse(code)
        detector = LogicalErrorDetector(code)
        detector.visit(tree)
        return detector.diagnostics
    except Exception as e:
        logger.debug(f"Logical error detection skipped: {e}")
        return []
