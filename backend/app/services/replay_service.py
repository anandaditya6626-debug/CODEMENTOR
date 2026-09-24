"""
Code Replay Execution Tracer Service.

Runs Python code under sys.settrace in an isolated subprocess,
recording line-by-line variable state, execution path, and stdout.
"""

import sys
import json
import asyncio
import tempfile
import os
from typing import Dict, Any, List, Optional
import logging

logger = logging.getLogger(__name__)

# Tracer harness script that runs inside the isolated subprocess
TRACER_HARNESS = r'''
import sys
import json
import io

MAX_STEPS = 500
MAX_VAR_REPR_LEN = 120

steps = []
stdout_buffer = io.StringIO()
old_stdout = sys.stdout

def safe_repr(val):
    try:
        r = repr(val)
        if len(r) > MAX_VAR_REPR_LEN:
            return r[:MAX_VAR_REPR_LEN - 3] + '...'
        return r
    except Exception:
        return '<unprintable>'

def is_user_var(name, val):
    if name.startswith('__') and name.endswith('__'):
        return False
    if name in ('_tracer_harness', 'safe_repr', 'is_user_var', 'steps', 'MAX_STEPS', 'MAX_VAR_REPR_LEN'):
        return False
    # Filter out modules and types unless helpful
    type_name = type(val).__name__
    if type_name in ('module', 'function', 'builtin_function_or_method'):
        return False
    return True

def tracer(frame, event, arg):
    if len(steps) >= MAX_STEPS:
        sys.settrace(None)
        return None

    # Only trace code from user script (which has filename <string> or the target temp file)
    co_filename = frame.f_code.co_filename
    if not (co_filename.endswith('user_code.py') or co_filename == '<string>'):
        return tracer

    line_no = frame.f_lineno
    func_name = frame.f_code.co_name

    # Snapshot locals
    vars_snapshot = {}
    for k, v in frame.f_locals.items():
        if is_user_var(k, v):
            vars_snapshot[k] = safe_repr(v)

    steps.append({
        "step": len(steps) + 1,
        "line": line_no,
        "event": event,
        "func": func_name,
        "variables": vars_snapshot,
        "stdout": stdout_buffer.getvalue(),
    })

    return tracer

if __name__ == '__main__':
    target_file = sys.argv[1]
    with open(target_file, 'r', encoding='utf-8') as f:
        code_str = f.read()

    # Redirect stdout to buffer
    sys.stdout = stdout_buffer

    compiled = compile(code_str, target_file, 'exec')
    user_globals = {'__name__': '__main__'}

    sys.settrace(tracer)
    execution_error = None
    try:
        exec(compiled, user_globals)
    except Exception as e:
        import traceback
        execution_error = traceback.format_exc()
    finally:
        sys.settrace(None)
        sys.stdout = old_stdout

    result = {
        "status": "step_limit" if len(steps) >= MAX_STEPS else ("error" if execution_error else "success"),
        "steps": steps,
        "total_steps": len(steps),
        "error": execution_error,
        "stdout": stdout_buffer.getvalue(),
    }

    # Write output to stdout as JSON
    print(json.dumps(result))
'''


class ReplayService:
    async def trace_python(self, code: str, timeout_seconds: float = 5.0) -> Dict[str, Any]:
        """
        Executes Python code in an isolated subprocess and traces line-by-line execution.
        """
        temp_dir = tempfile.mkdtemp(prefix='codementor_replay_')
        harness_path = os.path.join(temp_dir, 'harness.py')
        user_code_path = os.path.join(temp_dir, 'user_code.py')

        try:
            with open(harness_path, 'w', encoding='utf-8') as f:
                f.write(TRACER_HARNESS)
            with open(user_code_path, 'w', encoding='utf-8') as f:
                f.write(code)

            python_executable = sys.executable

            process = await asyncio.create_subprocess_exec(
                python_executable,
                harness_path,
                user_code_path,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=temp_dir,
            )

            try:
                stdout_data, stderr_data = await asyncio.wait_for(
                    process.communicate(),
                    timeout=timeout_seconds,
                )
            except asyncio.TimeoutError:
                try:
                    process.kill()
                except Exception:
                    pass
                return {
                    "status": "timeout",
                    "steps": [],
                    "total_steps": 0,
                    "error": f"Execution timed out after {timeout_seconds} seconds.",
                    "stdout": "",
                }

            stdout_str = stdout_data.decode('utf-8', errors='replace').strip()
            stderr_str = stderr_data.decode('utf-8', errors='replace').strip()

            if not stdout_str and stderr_str:
                return {
                    "status": "error",
                    "steps": [],
                    "total_steps": 0,
                    "error": stderr_str,
                    "stdout": "",
                }

            # Parse tracer result
            try:
                return json.loads(stdout_str)
            except json.JSONDecodeError:
                return {
                    "status": "error",
                    "steps": [],
                    "total_steps": 0,
                    "error": stderr_str or stdout_str,
                    "stdout": stdout_str,
                }

        finally:
            # Clean up temp files
            for p in (user_code_path, harness_path):
                if os.path.exists(p):
                    try:
                        os.remove(p)
                    except Exception:
                        pass
            if os.path.exists(temp_dir):
                try:
                    os.rmdir(temp_dir)
                except Exception:
                    pass


replay_service = ReplayService()
