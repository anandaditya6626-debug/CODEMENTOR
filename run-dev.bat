@echo off
title CodeMentor Development Launcher
color 0A
cls
echo ================================================================
echo           CodeMentor - Full-Stack Development Server             
echo ================================================================
echo.

set SCRIPT_DIR=%~dp0
cd /d "%SCRIPT_DIR%"

echo [1/3] Checking Backend Python Virtual Environment...
if not exist "backend\venv\Scripts\python.exe" (
    echo [ERROR] Virtual environment not found at backend\venv!
    echo Creating virtual environment...
    python -m venv backend\venv
    call backend\venv\Scripts\activate.bat
    pip install -r backend\requirements.txt
) else (
    echo [OK] Backend virtual environment found.
)

echo.
echo [2/3] Starting FastAPI Backend on http://127.0.0.1:8000 ...
start "CodeMentor - Backend (FastAPI)" cmd /k "cd /d "%SCRIPT_DIR%backend" && "%SCRIPT_DIR%backend\venv\Scripts\python.exe" -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

echo.
echo [3/3] Starting Next.js Frontend on http://localhost:3000 ...
start "CodeMentor - Frontend (Next.js)" cmd /k "cd /d "%SCRIPT_DIR%frontend" && npm run dev"

echo.
echo ================================================================
echo   Servers are starting in separate console windows!
echo   - Backend:  http://127.0.0.1:8000/api/v1/health
echo   - Frontend: http://localhost:3000
echo ================================================================
echo.
echo Waiting 5 seconds for servers to initialize before opening browser...
timeout /t 5 /nobreak >nul

echo Opening browser...
start http://localhost:3000

echo Done! Keep the backend and frontend terminal windows open.
echo Press any key to close this launcher window.
pause >nul
