@echo off
rem ============================================================================
rem  Start the nazar / Objectification Detector demo: backend (port 5000) + website
rem  (port 3000), then open the browser. Run SETUP.bat once before the first use.
rem  Keep the two black windows open during the demo; close them to stop.
rem ============================================================================
cd /d "%~dp0"
title Objectification Detector - launcher

if not exist "%~dp0dashboard\.next\BUILD_ID" (
  echo The website has not been built yet. Building it now, about 1-2 minutes ...
  pushd "%~dp0dashboard"
  call npm run build
  popd
)

start "Backend (keep open)" /D "%~dp0backend" cmd /k py -3.13 app.py
start "Website (keep open)" /D "%~dp0dashboard" cmd /k npm run start

echo Starting the backend (loads the models, about 20-60 seconds) and the website ...
set /a tries=0
:wait
timeout /t 3 /nobreak >nul
set /a tries+=1
powershell -NoProfile -Command "try { Invoke-WebRequest -UseBasicParsing http://127.0.0.1:5000/ -TimeoutSec 2 | Out-Null; exit 0 } catch { exit 1 }"
if not errorlevel 1 goto ready
if %tries% GEQ 60 (
  echo The backend did not start within 3 minutes. Look at the "Backend" window for the error.
  pause
  exit /b 1
)
goto wait

:ready
echo Backend is ready. Opening the website ...
timeout /t 2 /nobreak >nul
start "" http://localhost:3000
echo.
echo The demo is running at http://localhost:3000
echo To stop it, close the "Backend" and "Website" windows.
timeout /t 10 >nul
