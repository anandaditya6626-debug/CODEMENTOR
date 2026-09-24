import asyncio
import os
import sys
import time
import uuid
import shutil
import logging
from typing import Optional
import httpx
from app.config import settings

logger = logging.getLogger(__name__)

# Build directory for compiled artifacts
BUILD_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'scratch', 'bin'))
os.makedirs(BUILD_DIR, exist_ok=True)

SQL_RUNNER_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), 'sql_runner.py'))
JDK_BIN = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'runtimes', 'jdk21', 'bin'))

# 14 Supported Languages with metadata, Judge0 IDs, and starter code
LANGUAGES_CATALOG = {
    'python': {
        'id': 'python',
        'name': 'Python 3',
        'ext': 'py',
        'filename': 'main.py',
        'judge0_id': 71,
        'badge_color': 'text-[#e5c07b]',
        'default_code': '# Python 3\ndef main():\n    name = input("Enter your name: ")\n    print(f"Hello, {name}! Welcome to CodeMentor.")\n\nif __name__ == "__main__":\n    main()\n',
    },
    'cpp': {
        'id': 'cpp',
        'name': 'C++ (GCC)',
        'ext': 'cpp',
        'filename': 'main.cpp',
        'judge0_id': 54,
        'badge_color': 'text-[#61afef]',
        'default_code': '// C++ (GCC)\n#include <iostream>\n#include <string>\n\nint main() {\n    std::string name;\n    std::cout << "Enter your name: ";\n    if (std::cin >> name) {\n        std::cout << "Hello, " << name << "! Welcome to CodeMentor." << std::endl;\n    }\n    return 0;\n}\n',
    },
    'c': {
        'id': 'c',
        'name': 'C (GCC)',
        'ext': 'c',
        'filename': 'main.c',
        'judge0_id': 50,
        'badge_color': 'text-[#56b6c2]',
        'default_code': '// C (GCC)\n#include <stdio.h>\n\nint main() {\n    setvbuf(stdout, NULL, _IONBF, 0);\n    char name[64];\n    printf("Enter your name: ");\n    if (scanf("%63s", name) == 1) {\n        printf("Hello, %s! Welcome to CodeMentor.\\n", name);\n    }\n    return 0;\n}\n',
    },
    'java': {
        'id': 'java',
        'name': 'Java (OpenJDK)',
        'ext': 'java',
        'filename': 'Main.java',
        'judge0_id': 62,
        'badge_color': 'text-[#e06c75]',
        'default_code': '// Java (OpenJDK)\nimport java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner scanner = new Scanner(System.in);\n        System.out.print("Enter your name: ");\n        if (scanner.hasNext()) {\n            String name = scanner.next();\n            System.out.println("Hello, " + name + "! Welcome to CodeMentor.");\n        }\n    }\n}\n',
    },
    'javascript': {
        'id': 'javascript',
        'name': 'JavaScript (Node.js)',
        'ext': 'js',
        'filename': 'index.js',
        'judge0_id': 63,
        'badge_color': 'text-[#f5d76e]',
        'default_code': '// JavaScript (Node.js)\nconst readline = require("readline");\n\nconst rl = readline.createInterface({\n    input: process.stdin,\n    output: process.stdout\n});\n\nrl.question("Enter your name: ", (name) => {\n    console.log(`Hello, ${name}! Welcome to CodeMentor.`);\n    rl.close();\n});\n',
    },
    'typescript': {
        'id': 'typescript',
        'name': 'TypeScript',
        'ext': 'ts',
        'filename': 'index.ts',
        'judge0_id': 74,
        'badge_color': 'text-[#3178c6]',
        'default_code': '// TypeScript\nconst greeting: string = "Hello, World! Welcome to CodeMentor TypeScript.";\nconsole.log(greeting);\n',
    },
    'sql': {
        'id': 'sql',
        'name': 'SQL (SQLite)',
        'ext': 'sql',
        'filename': 'query.sql',
        'judge0_id': 82,
        'badge_color': 'text-[#98c379]',
        'default_code': '-- SQL Online Workspace\nCREATE TABLE students (\n    id INTEGER PRIMARY KEY,\n    name TEXT NOT NULL,\n    grade TEXT NOT NULL\n);\n\nINSERT INTO students (name, grade) VALUES\n    (\'Alice\', \'A\'),\n    (\'Bob\', \'B+\'),\n    (\'Charlie\', \'A-\');\n\nSELECT * FROM students;\n',
    },
    'csharp': {
        'id': 'csharp',
        'name': 'C# (.NET)',
        'ext': 'cs',
        'filename': 'Program.cs',
        'judge0_id': 51,
        'badge_color': 'text-[#9b59b6]',
        'default_code': '// C# (.NET)\nusing System;\n\nclass Program {\n    static void Main() {\n        Console.Write("Enter your name: ");\n        string name = Console.ReadLine();\n        Console.WriteLine($"Hello, {name}! Welcome to CodeMentor.");\n    }\n}\n',
    },
    'go': {
        'id': 'go',
        'name': 'Go',
        'ext': 'go',
        'filename': 'main.go',
        'judge0_id': 60,
        'badge_color': 'text-[#00add8]',
        'default_code': '// Go\npackage main\n\nimport (\n    "bufio"\n    "fmt"\n    "os"\n)\n\nfunc main() {\n    fmt.Print("Enter your name: ")\n    scanner := bufio.NewScanner(os.Stdin)\n    if scanner.Scan() {\n        name := scanner.Text()\n        fmt.Printf("Hello, %s! Welcome to CodeMentor.\\n", name)\n    }\n}\n',
    },
    'rust': {
        'id': 'rust',
        'name': 'Rust',
        'ext': 'rs',
        'filename': 'main.rs',
        'judge0_id': 73,
        'badge_color': 'text-[#d19a66]',
        'default_code': '// Rust\nuse std::io::{self, Write};\n\nfn main() {\n    print!("Enter your name: ");\n    io::stdout().flush().unwrap();\n    let mut name = String::new();\n    io::stdin().read_line(&mut name).unwrap();\n    println!("Hello, {}! Welcome to CodeMentor.", name.trim());\n}\n',
    },
    'php': {
        'id': 'php',
        'name': 'PHP',
        'ext': 'php',
        'filename': 'index.php',
        'judge0_id': 68,
        'badge_color': 'text-[#8892be]',
        'default_code': '<?php\n// PHP\necho "Hello from PHP! Welcome to CodeMentor.\\n";\n',
    },
    'ruby': {
        'id': 'ruby',
        'name': 'Ruby',
        'ext': 'rb',
        'filename': 'main.rb',
        'judge0_id': 72,
        'badge_color': 'text-[#cc342d]',
        'default_code': '# Ruby\nprint "Enter your name: "\nname = gets.chomp rescue "Guest"\nputs "Hello, #{name}! Welcome to CodeMentor."\n',
    },
    'kotlin': {
        'id': 'kotlin',
        'name': 'Kotlin',
        'ext': 'kt',
        'filename': 'Main.kt',
        'judge0_id': 78,
        'badge_color': 'text-[#f18e33]',
        'default_code': '// Kotlin\nfun main() {\n    print("Enter your name: ")\n    val name = readLine()\n    println("Hello, $name! Welcome to CodeMentor.")\n}\n',
    },
    'swift': {
        'id': 'swift',
        'name': 'Swift',
        'ext': 'swift',
        'filename': 'main.swift',
        'judge0_id': 83,
        'badge_color': 'text-[#fa7343]',
        'default_code': '// Swift\nprint("Enter your name: ", terminator: "")\nif let name = readLine() {\n    print("Hello, \\(name)! Welcome to CodeMentor.")\n}\n',
    },
    'html': {
        'id': 'html',
        'name': 'HTML5',
        'ext': 'html',
        'filename': 'index.html',
        'judge0_id': None,
        'badge_color': 'text-[#e34f26]',
        'default_code': '<!DOCTYPE html>\n<html lang="en">\n<head>\n    <meta charset="UTF-8">\n    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n    <title>CodeMentor Web</title>\n    <style>\n        body {\n            font-family: system-ui, sans-serif;\n            background: #0f172a;\n            color: #f8fafc;\n            display: flex;\n            flex-direction: column;\n            align-items: center;\n            justify-content: center;\n            min-height: 80vh;\n            margin: 0;\n        }\n        .card {\n            background: #1e293b;\n            padding: 2rem;\n            border-radius: 12px;\n            border: 1px solid #334155;\n            box-shadow: 0 10px 25px -5px rgba(0,0,0,0.3);\n            text-align: center;\n        }\n        h1 {\n            color: #a3e635;\n            margin-bottom: 0.5rem;\n        }\n        p {\n            color: #94a3b8;\n        }\n    </style>\n</head>\n<body>\n    <div class="card">\n        <h1>Hello from HTML5 & CSS!</h1>\n        <p>Built with CodeMentor Midnight Studio.</p>\n    </div>\n</body>\n</html>\n',
    },
    'css': {
        'id': 'css',
        'name': 'CSS3',
        'ext': 'css',
        'filename': 'style.css',
        'judge0_id': None,
        'badge_color': 'text-[#1572b6]',
        'default_code': '/* CodeMentor CSS3 Stylesheet */\n:root {\n    --primary: #a3e635;\n    --bg: #0b0c0f;\n    --surface: #181b22;\n    --text: #f3f4f6;\n}\n\nbody {\n    font-family: system-ui, -apple-system, sans-serif;\n    background-color: var(--bg);\n    color: var(--text);\n    margin: 0;\n    padding: 2rem;\n}\n\n.hero {\n    background: var(--surface);\n    border: 1px solid #242833;\n    border-radius: 8px;\n    padding: 2rem;\n    text-align: center;\n}\n\n.hero h1 {\n    color: var(--primary);\n}\n',
    },
}

class InteractiveExecutionSession:
    """Manages an active interactive subprocess session with bidirectional stdin/stdout streaming."""

    def __init__(self, code: str, language: str, initial_stdin: str = '', time_limit: float = 60.0):
        self.code = code
        self.language = language
        self.initial_stdin = initial_stdin
        self.time_limit = time_limit
        self.proc: Optional[asyncio.subprocess.Process] = None
        self.uid = uuid.uuid4().hex[:8]
        self.src_file: Optional[str] = None
        self.exe_file: Optional[str] = None
        self.java_dir: Optional[str] = None
        self.is_running = False
        self.start_time: Optional[float] = None
        self.stopped_by_user = False
        self.compile_output: str = ""

    async def prepare(self) -> Optional[dict]:
        """Validate language, create files, and compile if C/C++/Java. Returns error dict if failed, else None."""
        config = LANGUAGES_CATALOG.get(self.language)
        if not config:
            return {'status': 'error', 'error': f'Unsupported language: {self.language}'}

        ext = '.' + config['ext']
        self.src_file = os.path.join(BUILD_DIR, f'run_int_{self.uid}{ext}')
        self.exe_file = os.path.join(BUILD_DIR, f'run_int_{self.uid}.exe')

        with open(self.src_file, 'w', encoding='utf-8') as f:
            f.write(self.code)

        if self.language in ('c', 'cpp'):
            compiler = 'gcc' if self.language == 'c' else 'g++'
            compiler_path = shutil.which(compiler)
            if not compiler_path:
                return {'status': 'error', 'error': f'{compiler.upper()} compiler not found locally on this system'}

            compile_args = [compiler, '-static', '-O2', self.src_file, '-o', self.exe_file]
            if self.language == 'c':
                compile_args.append('-lm')

            try:
                comp_proc = await asyncio.create_subprocess_exec(
                    *compile_args,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE
                )
                comp_out, comp_err = await asyncio.wait_for(comp_proc.communicate(), timeout=30.0)
                if comp_proc.returncode != 0:
                    self.compile_output = comp_err.decode('utf-8', errors='replace')
                    return {
                        'status': 'compilation_error',
                        'compile_output': self.compile_output,
                        'error': 'Compilation failed',
                        'exit_code': comp_proc.returncode,
                    }
            except asyncio.TimeoutError:
                return {
                    'status': 'compilation_error',
                    'compile_output': 'Compilation timed out',
                    'error': 'Compilation timed out',
                    'exit_code': -1,
                }
            except Exception as e:
                return {'status': 'error', 'error': str(e), 'exit_code': -1}

        elif self.language == 'java':
            javac_path = getattr(execution_service, 'javac_path', None) or shutil.which('javac')
            if not javac_path:
                return {'status': 'error', 'error': 'Java compiler (javac) not found locally on this system'}

            self.java_dir = os.path.join(BUILD_DIR, f'java_{self.uid}')
            os.makedirs(self.java_dir, exist_ok=True)
            self.src_file = os.path.join(self.java_dir, 'Main.java')
            with open(self.src_file, 'w', encoding='utf-8') as f:
                f.write(self.code)

            try:
                comp_proc = await asyncio.create_subprocess_exec(
                    javac_path, '-encoding', 'UTF-8', self.src_file,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE
                )
                comp_out, comp_err = await asyncio.wait_for(comp_proc.communicate(), timeout=30.0)
                if comp_proc.returncode != 0:
                    self.compile_output = comp_err.decode('utf-8', errors='replace')
                    return {
                        'status': 'compilation_error',
                        'compile_output': self.compile_output,
                        'error': 'Java compilation failed',
                        'exit_code': comp_proc.returncode,
                    }
            except asyncio.TimeoutError:
                return {
                    'status': 'compilation_error',
                    'compile_output': 'Compilation timed out',
                    'error': 'Compilation timed out',
                    'exit_code': -1,
                }
            except Exception as e:
                return {'status': 'error', 'error': str(e), 'exit_code': -1}

        return None

    async def start(self) -> None:
        """Spawn the process and send initial stdin if provided, keeping stdin open."""
        if self.language == 'python':
            cmd = [sys.executable, '-u', self.src_file]
        elif self.language == 'javascript':
            node_path = shutil.which('node')
            if not node_path:
                raise RuntimeError('Node.js not found on this system')
            cmd = [node_path, self.src_file]
        elif self.language == 'typescript':
            node_path = shutil.which('node')
            if not node_path:
                raise RuntimeError('Node.js not found on this system')
            cmd = [node_path, '--experimental-strip-types', self.src_file]
        elif self.language in ('c', 'cpp'):
            cmd = ['cmd.exe', '/c', self.exe_file]
        elif self.language == 'java':
            java_path = getattr(execution_service, 'java_path', None) or shutil.which('java')
            if not java_path:
                raise RuntimeError('Java runtime (java) not found on this system')
            cmd = [java_path, '-Dfile.encoding=UTF-8', '-cp', self.java_dir, 'Main']
        elif self.language == 'sql':
            cmd = [sys.executable, '-u', SQL_RUNNER_PATH, self.src_file]
        elif self.language in ('html', 'css'):
            num_lines = len(self.code.splitlines())
            num_bytes = len(self.code.encode('utf-8'))
            runner_script = f"print('[{self.language.upper()} Document Loaded]'); print('Lines: {num_lines}, Bytes: {num_bytes}'); print('Live preview active in Preview tab.')"
            cmd = [sys.executable, '-c', runner_script]
        else:
            raise ValueError(f'Language {self.language} does not have an active local interactive runner. Please configure Judge0.')

        proc_env = dict(os.environ, PYTHONIOENCODING='utf-8', PYTHONUTF8='1')
        self.proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            env=proc_env
        )
        self.is_running = True
        self.start_time = time.perf_counter()

        if self.initial_stdin and self.proc.stdin:
            self.proc.stdin.write(self.initial_stdin.encode('utf-8'))
            await self.proc.stdin.drain()

    async def write_stdin(self, text: str) -> bool:
        """Write input text into running process stdin."""
        if not self.proc or not self.proc.stdin or not self.is_running:
            return False
        try:
            self.proc.stdin.write(text.encode('utf-8'))
            await self.proc.stdin.drain()
            return True
        except (BrokenPipeError, ConnectionResetError, ValueError):
            return False
        except Exception as e:
            logger.error(f'Error writing to stdin: {e}')
            return False

    async def stop(self) -> None:
        """Terminate process tree and mark session stopped."""
        if self.proc and self.is_running:
            self.stopped_by_user = True
            self.is_running = False
            try:
                self.proc.kill()
            except Exception:
                pass
            if sys.platform == 'win32':
                try:
                    kill_proc = await asyncio.create_subprocess_exec(
                        'taskkill', '/F', '/T', '/PID', str(self.proc.pid),
                        stdout=asyncio.subprocess.DEVNULL,
                        stderr=asyncio.subprocess.DEVNULL
                    )
                    await kill_proc.wait()
                except Exception:
                    pass

    def cleanup(self) -> None:
        """Remove temporary source and binary files."""
        for f in [self.src_file, self.exe_file]:
            if f and os.path.exists(f):
                try:
                    os.remove(f)
                except Exception:
                    pass
        if self.java_dir and os.path.exists(self.java_dir):
            try:
                shutil.rmtree(self.java_dir, ignore_errors=True)
            except Exception:
                pass


class ExecutionService:
    def __init__(self):
        self.api_url = settings.JUDGE0_API_URL
        self.api_key = settings.JUDGE0_API_KEY
        self.use_judge0 = bool(self.api_key and self.api_key != 'placeholder' and 'rapidapi' in self.api_url.lower())
        self.headers = {'Content-Type': 'application/json'}
        if self.use_judge0:
            self.headers['X-RapidAPI-Key'] = self.api_key
            self.headers['X-RapidAPI-Host'] = 'judge0-ce.p.rapidapi.com'

        self.refresh_local_runtimes()
        logger.info(f"ExecutionService initialized: judge0={self.use_judge0}, python={self.python_path}, gcc={self.gcc_path}, node={self.node_path}, java={self.java_path}")

    def refresh_local_runtimes(self):
        """Scan and detect installed compilers and runtimes dynamically."""
        self.python_path = sys.executable
        self.node_path = shutil.which('node')
        self.gcc_path = shutil.which('gcc')
        self.gpp_path = shutil.which('g++')

        # Check local portable JDK in backend/runtimes/jdk21 or system PATH
        javac_cand = os.path.join(JDK_BIN, 'javac.exe')
        java_cand = os.path.join(JDK_BIN, 'java.exe')
        if os.path.exists(javac_cand):
            self.javac_path = javac_cand
        else:
            self.javac_path = shutil.which('javac')

        if os.path.exists(java_cand):
            self.java_path = java_cand
        else:
            self.java_path = shutil.which('java')

    def get_languages_metadata(self) -> list[dict]:
        """Return list of all 14 languages with live availability and runtime status."""
        self.refresh_local_runtimes()
        results = []
        for lang_id, cfg in LANGUAGES_CATALOG.items():
            item = {
                'id': lang_id,
                'name': cfg['name'],
                'ext': cfg['ext'],
                'filename': cfg['filename'],
                'badge_color': cfg['badge_color'],
                'default_code': cfg['default_code'],
                'available': False,
                'provider': 'none',
                'version': '',
                'reason': '',
            }

            if self.use_judge0:
                item['available'] = True
                item['provider'] = 'judge0'
                item['version'] = 'Judge0 Sandbox'
            else:
                # Check local engines
                if lang_id == 'python':
                    item['available'] = True
                    item['provider'] = 'local'
                    item['version'] = f'Python {sys.version.split()[0]}'
                elif lang_id == 'cpp':
                    item['available'] = bool(self.gpp_path)
                    item['provider'] = 'local' if self.gpp_path else 'none'
                    item['version'] = 'G++ (GCC)' if self.gpp_path else ''
                    if not self.gpp_path:
                        item['reason'] = 'G++ compiler not found in system PATH.'
                elif lang_id == 'c':
                    item['available'] = bool(self.gcc_path)
                    item['provider'] = 'local' if self.gcc_path else 'none'
                    item['version'] = 'GCC' if self.gcc_path else ''
                    if not self.gcc_path:
                        item['reason'] = 'GCC compiler not found in system PATH.'
                elif lang_id == 'javascript':
                    item['available'] = bool(self.node_path)
                    item['provider'] = 'local' if self.node_path else 'none'
                    item['version'] = 'Node.js' if self.node_path else ''
                    if not self.node_path:
                        item['reason'] = 'Node.js runtime not found in system PATH.'
                elif lang_id == 'typescript':
                    item['available'] = bool(self.node_path)
                    item['provider'] = 'local' if self.node_path else 'none'
                    item['version'] = 'TypeScript (Node.js)' if self.node_path else ''
                    if not self.node_path:
                        item['reason'] = 'Node.js runtime not found in system PATH.'
                elif lang_id == 'java':
                    item['available'] = bool(self.javac_path and self.java_path)
                    item['provider'] = 'local' if (self.javac_path and self.java_path) else 'none'
                    item['version'] = 'OpenJDK 21' if (self.javac_path and self.java_path) else ''
                    if not (self.javac_path and self.java_path):
                        item['reason'] = 'Java compiler (javac) / runtime (java) not installed.'
                elif lang_id == 'sql':
                    item['available'] = True
                    item['provider'] = 'local'
                    item['version'] = 'SQLite 3'
                elif lang_id in ('html', 'css'):
                    item['available'] = True
                    item['provider'] = 'local'
                    item['version'] = 'W3C Standard'
                else:
                    # Remote-only languages without Judge0 key
                    item['available'] = False
                    item['provider'] = 'none'
                    item['reason'] = f'Requires Judge0 API key to execute {cfg["name"]} in cloud sandbox. Configure JUDGE0_API_KEY in backend/.env.'

            results.append(item)
        return results

    def create_interactive_session(self, code: str, language: str, initial_stdin: str = '', time_limit: float = 60.0) -> InteractiveExecutionSession:
        return InteractiveExecutionSession(code=code, language=language, initial_stdin=initial_stdin, time_limit=time_limit)

    async def execute_code(self, code: str, language: str, stdin: str = '', time_limit: float = 5.0, memory_limit: int = 262144) -> dict:
        """Execute code using local engine or Judge0 fallback (non-interactive batch)."""
        if self.use_judge0:
            return await self._execute_judge0(code, language, stdin, time_limit, memory_limit)
        return await self._execute_local(code, language, stdin, time_limit)

    async def _execute_local(self, code: str, language: str, stdin: str = '', time_limit: float = 5.0) -> dict:
        """Execute code using local compilers/interpreters."""
        self.refresh_local_runtimes()
        uid = uuid.uuid4().hex[:8]
        cfg = LANGUAGES_CATALOG.get(language)
        if not cfg:
            return {'status': 'error', 'stdout': '', 'stderr': '', 'compile_output': '', 'time': None, 'memory': None, 'error': f'Unsupported language: {language}'}

        ext = '.' + cfg['ext']
        src_file = os.path.join(BUILD_DIR, f'run_{uid}{ext}')
        exe_file = os.path.join(BUILD_DIR, f'run_{uid}.exe')

        try:
            with open(src_file, 'w', encoding='utf-8') as f:
                f.write(code)

            if language == 'python':
                return await self._run_interpreted(self.python_path, ['-u', src_file], stdin, time_limit)
            elif language == 'javascript':
                if not self.node_path:
                    return {'status': 'error', 'stdout': '', 'stderr': '', 'compile_output': '', 'time': None, 'memory': None, 'error': 'Node.js not found on this system'}
                return await self._run_interpreted(self.node_path, [src_file], stdin, time_limit)
            elif language == 'typescript':
                if not self.node_path:
                    return {'status': 'error', 'stdout': '', 'stderr': '', 'compile_output': '', 'time': None, 'memory': None, 'error': 'Node.js not found on this system'}
                return await self._run_interpreted(self.node_path, ['--experimental-strip-types', src_file], stdin, time_limit)
            elif language == 'c':
                if not self.gcc_path:
                    return {'status': 'error', 'stdout': '', 'stderr': '', 'compile_output': '', 'time': None, 'memory': None, 'error': 'GCC not found on this system'}
                return await self._compile_and_run('gcc', ['-static', '-O2', src_file, '-o', exe_file, '-lm'], exe_file, stdin, time_limit)
            elif language == 'cpp':
                if not self.gpp_path:
                    return {'status': 'error', 'stdout': '', 'stderr': '', 'compile_output': '', 'time': None, 'memory': None, 'error': 'G++ not found on this system'}
                return await self._compile_and_run('g++', ['-static', '-O2', src_file, '-o', exe_file], exe_file, stdin, time_limit)
            elif language == 'java':
                if not self.javac_path or not self.java_path:
                    return {'status': 'error', 'stdout': '', 'stderr': '', 'compile_output': '', 'time': None, 'memory': None, 'error': 'Java (javac/java) is not available on this system'}
                java_dir = os.path.join(BUILD_DIR, f'java_{uid}')
                os.makedirs(java_dir, exist_ok=True)
                java_src = os.path.join(java_dir, 'Main.java')
                with open(java_src, 'w', encoding='utf-8') as f:
                    f.write(code)

                try:
                    comp_proc = await asyncio.create_subprocess_exec(
                        self.javac_path, '-encoding', 'UTF-8', java_src,
                        stdout=asyncio.subprocess.PIPE,
                        stderr=asyncio.subprocess.PIPE
                    )
                    comp_out, comp_err = await asyncio.wait_for(comp_proc.communicate(), timeout=30.0)
                    if comp_proc.returncode != 0:
                        return {
                            'status': 'compilation_error',
                            'stdout': '',
                            'stderr': '',
                            'compile_output': comp_err.decode('utf-8', errors='replace'),
                            'time': None,
                            'memory': None,
                            'error': 'Compilation failed',
                            'exit_code': comp_proc.returncode,
                        }
                    return await self._run_interpreted(self.java_path, ['-Dfile.encoding=UTF-8', '-cp', java_dir, 'Main'], stdin, time_limit)
                finally:
                    asyncio.get_event_loop().call_later(15, shutil.rmtree, java_dir, True)
            elif language == 'sql':
                return await self._run_interpreted(self.python_path, ['-u', SQL_RUNNER_PATH, src_file], stdin, time_limit)
            elif language in ('html', 'css'):
                lines_count = len(code.splitlines())
                bytes_count = len(code.encode('utf-8'))
                stdout_text = f"[{language.upper()} Document Loaded]\nLines: {lines_count}\nBytes: {bytes_count}\nDocument is ready for web rendering."
                return {
                    'status': 'success',
                    'stdout': stdout_text,
                    'stderr': '',
                    'compile_output': '',
                    'time': '0.001',
                    'memory': None,
                    'error': '',
                    'exit_code': 0,
                }
            else:
                return {'status': 'error', 'stdout': '', 'stderr': '', 'compile_output': '', 'time': None, 'memory': None, 'error': f'Runtime for {language} is not available locally. Configure JUDGE0_API_KEY in backend/.env.'}
        finally:
            asyncio.get_event_loop().call_later(10, self._cleanup_files, [src_file, exe_file])

    async def _run_interpreted(self, runtime: str, args: list, stdin: str, time_limit: float) -> dict:
        t0 = time.perf_counter()
        try:
            proc_env = dict(os.environ, PYTHONIOENCODING='utf-8', PYTHONUTF8='1')
            proc = await asyncio.create_subprocess_exec(
                runtime, *args,
                stdin=asyncio.subprocess.PIPE,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                env=proc_env
            )
            stdout, stderr = await asyncio.wait_for(
                proc.communicate(input=stdin.encode('utf-8') if stdin else b''),
                timeout=time_limit
            )
            elapsed = time.perf_counter() - t0
            status = 'success' if proc.returncode == 0 else 'runtime_error'
            return {
                'status': status,
                'stdout': stdout.decode('utf-8', errors='replace'),
                'stderr': stderr.decode('utf-8', errors='replace'),
                'compile_output': '',
                'time': f'{elapsed:.3f}',
                'memory': None,
                'error': '',
                'exit_code': proc.returncode,
            }
        except asyncio.TimeoutError:
            try:
                proc.kill()
            except Exception:
                pass
            elapsed = time.perf_counter() - t0
            return {
                'status': 'time_limit_exceeded',
                'stdout': '', 'stderr': f'Time Limit Exceeded ({time_limit}s)',
                'compile_output': '', 'time': f'{elapsed:.3f}', 'memory': None,
                'error': f'Execution timed out after {time_limit} seconds', 'exit_code': -1,
            }
        except Exception as e:
            return {
                'status': 'error', 'stdout': '', 'stderr': str(e),
                'compile_output': '', 'time': None, 'memory': None,
                'error': str(e), 'exit_code': -1,
            }

    async def _compile_and_run(self, compiler: str, compile_args: list, exe_file: str, stdin: str, time_limit: float) -> dict:
        try:
            comp_proc = await asyncio.create_subprocess_exec(
                compiler, *compile_args,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            comp_out, comp_err = await asyncio.wait_for(comp_proc.communicate(), timeout=30.0)
        except asyncio.TimeoutError:
            return {
                'status': 'compilation_error', 'stdout': '', 'stderr': '',
                'compile_output': 'Compilation timed out',
                'time': None, 'memory': None, 'error': 'Compilation timed out', 'exit_code': -1,
            }
        except Exception as e:
            return {
                'status': 'error', 'stdout': '', 'stderr': str(e),
                'compile_output': '', 'time': None, 'memory': None, 'error': str(e), 'exit_code': -1,
            }

        if comp_proc.returncode != 0:
            return {
                'status': 'compilation_error',
                'stdout': comp_out.decode('utf-8', errors='replace'),
                'stderr': '',
                'compile_output': comp_err.decode('utf-8', errors='replace'),
                'time': None, 'memory': None, 'error': '', 'exit_code': comp_proc.returncode,
            }

        t0 = time.perf_counter()
        try:
            run_proc = await asyncio.create_subprocess_exec(
                'cmd.exe', '/c', exe_file,
                stdin=asyncio.subprocess.PIPE,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout, stderr = await asyncio.wait_for(
                run_proc.communicate(input=stdin.encode('utf-8') if stdin else b''),
                timeout=time_limit
            )
            elapsed = time.perf_counter() - t0
            status = 'success' if run_proc.returncode == 0 else 'runtime_error'
            return {
                'status': status,
                'stdout': stdout.decode('utf-8', errors='replace'),
                'stderr': stderr.decode('utf-8', errors='replace'),
                'compile_output': comp_err.decode('utf-8', errors='replace') if comp_err else '',
                'time': f'{elapsed:.3f}',
                'memory': None, 'error': '', 'exit_code': run_proc.returncode,
            }
        except asyncio.TimeoutError:
            try:
                run_proc.kill()
            except Exception:
                pass
            elapsed = time.perf_counter() - t0
            return {
                'status': 'time_limit_exceeded',
                'stdout': '', 'stderr': f'Time Limit Exceeded ({time_limit}s)',
                'compile_output': '', 'time': f'{elapsed:.3f}', 'memory': None,
                'error': f'Execution timed out after {time_limit} seconds', 'exit_code': -1,
            }
        except Exception as e:
            return {
                'status': 'error', 'stdout': '', 'stderr': str(e),
                'compile_output': '', 'time': None, 'memory': None,
                'error': str(e), 'exit_code': -1,
            }

    async def _execute_judge0(self, code: str, language: str, stdin: str = '', time_limit: float = 5.0, memory_limit: int = 262144) -> dict:
        cfg = LANGUAGES_CATALOG.get(language)
        lang_id = cfg['judge0_id'] if cfg else None
        if not lang_id:
            return {'status': 'error', 'stdout': '', 'stderr': '', 'compile_output': '', 'time': None, 'memory': None, 'error': f'Unsupported language: {language}'}
        payload = {'source_code': code, 'language_id': lang_id, 'stdin': stdin, 'cpu_time_limit': time_limit, 'memory_limit': memory_limit}
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(f'{self.api_url}/submissions?base64_encoded=false&wait=true', json=payload, headers=self.headers)
                if response.status_code not in (200, 201):
                    return await self._execute_local(code, language, stdin, time_limit)
                result = response.json()
                return self._parse_judge0_result(result)
        except Exception:
            return await self._execute_local(code, language, stdin, time_limit)

    def _parse_judge0_result(self, result: dict) -> dict:
        status_id = result.get('status', {}).get('id', 0)
        status_map = {1: 'in_queue', 2: 'processing', 3: 'accepted', 4: 'wrong_answer', 5: 'time_limit_exceeded', 6: 'compilation_error', 7: 'runtime_error', 8: 'runtime_error', 9: 'runtime_error', 10: 'runtime_error', 11: 'runtime_error', 12: 'runtime_error', 13: 'internal_error', 14: 'exec_format_error'}
        parsed_status = status_map.get(status_id, 'unknown')
        if parsed_status == 'accepted':
            parsed_status = 'success'
        elif 'runtime_error' in parsed_status:
            parsed_status = 'runtime_error'
        return {'status': parsed_status, 'stdout': result.get('stdout', ''), 'stderr': result.get('stderr', ''), 'compile_output': result.get('compile_output', ''), 'time': result.get('time'), 'memory': result.get('memory'), 'error': result.get('message', '')}

    async def run_test_cases(self, code: str, language: str, test_cases: list[dict], time_limit: float = 5.0) -> list[dict]:
        results = []
        for tc in test_cases:
            tc_id = tc.get('id', '')
            input_data = tc.get('input_data', '')
            expected_output = str(tc.get('expected_output', '')).strip()

            exec_res = await self.execute_code(code, language, stdin=input_data, time_limit=time_limit)
            actual_output = (exec_res.get('stdout') or '').strip()

            if exec_res.get('status') == 'compilation_error':
                passed = False
                status = 'compilation_error'
            elif exec_res.get('status') == 'time_limit_exceeded':
                passed = False
                status = 'time_limit_exceeded'
            elif exec_res.get('status') == 'runtime_error':
                passed = False
                status = 'runtime_error'
            else:
                # Normalize outputs for resilient comparison
                norm_act = actual_output.replace(' ', '').replace('\r', '').lower()
                norm_exp = expected_output.replace(' ', '').replace('\r', '').lower()
                passed = (
                    actual_output == expected_output
                    or norm_act == norm_exp
                    or actual_output.replace('"', "'") == expected_output.replace('"', "'")
                )
                status = 'passed' if passed else 'wrong_answer'

            results.append({
                'test_case_id': tc_id,
                'passed': passed,
                'status': status,
                'stdout': actual_output,
                'input_data': input_data,
                'expected_output': expected_output,
                'compile_output': exec_res.get('compile_output', ''),
                'stderr': exec_res.get('stderr', ''),
                'time': exec_res.get('time'),
                'memory': exec_res.get('memory'),
                'error': exec_res.get('error', ''),
            })
        return results

    def _cleanup_files(self, files: list[str]):
        for f in files:
            try:
                if os.path.exists(f):
                    os.remove(f)
            except Exception:
                pass

execution_service = ExecutionService()

