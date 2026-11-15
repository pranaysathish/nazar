@echo off
rem ============================================================================
rem  One-time setup for the nazar / Objectification Detector demo (Windows 10/11).
rem  Needs INTERNET and about 6 GB of free disk space. Takes 15-40 minutes.
rem  Before running: install Python 3.13 (64-bit, python.org) and Node.js LTS (nodejs.org).
rem ============================================================================
cd /d "%~dp0"
title Objectification Detector - setup

echo.
echo [1/5] Checking Python 3.13 ...
py -3.13 --version
if errorlevel 1 (
  echo.
  echo Python 3.13 was not found. Install "Python 3.13 (64-bit)" from https://www.python.org/downloads/
  echo and tick "Add python.exe to PATH" during the install. Then run SETUP.bat again.
  pause
  exit /b 1
)

echo.
echo [2/5] Checking Node.js ...
where npm >nul 2>nul
if errorlevel 1 (
  echo.
  echo Node.js was not found. Install the "LTS" version from https://nodejs.org/ and run SETUP.bat again.
  pause
  exit /b 1
)
call node --version

echo.
echo [3/5] Installing Python packages (TensorFlow, PyTorch, Transformers ...). This takes 5-20 minutes.
py -3.13 -m pip install --disable-pip-version-check -r backend\requirements.txt
if errorlevel 1 (
  echo.
  echo Python package install failed. Check the internet connection and run SETUP.bat again.
  pause
  exit /b 1
)

echo.
echo [4/5] Installing and building the website (2-5 minutes) ...
pushd dashboard
call npm install --no-audit --no-fund
if errorlevel 1 (
  popd
  echo.
  echo Website package install failed. Check the internet connection and run SETUP.bat again.
  pause
  exit /b 1
)
call npm run build
if errorlevel 1 (
  popd
  echo.
  echo Website build failed. Run SETUP.bat again. If it fails again, send a photo of this window.
  pause
  exit /b 1
)
popd

echo.
echo [5/5] Downloading the BLIP captioning model (about 1 GB, one time only) ...
py -3.13 -c "from transformers import BlipProcessor, BlipForConditionalGeneration as B; n='Salesforce/blip-image-captioning-base'; BlipProcessor.from_pretrained(n); B.from_pretrained(n); print('BLIP model ready')"
if errorlevel 1 (
  echo.
  echo Could not download the BLIP model. Check the internet connection and run SETUP.bat again.
  pause
  exit /b 1
)

echo.
echo ============================================================================
echo  Setup finished. From now on just double-click START_DEMO.bat (no internet needed).
echo ============================================================================
pause
