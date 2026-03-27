@echo off
echo ===============================================
echo   AdEthics AI - Starting Backend Server
echo ===============================================
echo.
echo Installing dependencies (first time only)...
pip install -r requirements.txt --quiet
echo.
echo Starting server at http://127.0.0.1:5000
echo Keep this window OPEN while using the dashboard.
echo.
python app.py
pause
