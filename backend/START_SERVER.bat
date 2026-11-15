@echo off
rem Start the AdEthics AI backend (Windows). Needs Python 3.13 from python.org.
cd /d "%~dp0"
echo ===============================================
echo   AdEthics AI - Starting Backend Server
echo ===============================================
echo.
echo Installing Python packages (only slow the first time)...
py -3.13 -m pip install -r requirements.txt --quiet
if errorlevel 1 (
  echo.
  echo Package install failed. Is Python 3.13 installed from python.org?
  pause
  exit /b 1
)
echo.
echo Starting server at http://127.0.0.1:5000
echo Wait for "Running on http://127.0.0.1:5000", then keep this window OPEN.
echo.
py -3.13 app.py
pause
