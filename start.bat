@echo off
setlocal

set ROOT=%~dp0

echo Starting Washly backend (FastAPI)...
start "Washly Backend" cmd /k "cd /d "%ROOT%backend" && venv\Scripts\activate && uvicorn main:app --reload --host 127.0.0.1 --port 8000"

echo Starting Washly frontend (Next.js)...
start "Washly Frontend" cmd /k "cd /d "%ROOT%frontend" && npm run dev"

echo.
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:3000
echo (closing this window will not stop the two servers — close their own windows to stop them)
