@echo off
setlocal

:: ── Self-elevate to Administrator if not already ──────────────────
NET SESSION >nul 2>&1
if %errorlevel% NEQ 0 (
  echo Requesting administrator access...
  PowerShell -Command "Start-Process -FilePath '%~f0' -Verb RunAs -Wait"
  exit /b
)

echo ============================================
echo  RDS Project Hub - SSL Certificate Setup
echo ============================================
echo.
echo This will install the RDS Local CA certificate
echo so Chrome trusts the offline RDS site at:
echo   https://192.168.0.159:8443
echo.

:: Look for cert in same folder as this bat file
set CERT_FILE=%~dp0RDS-Local-CA.crt

if not exist "%CERT_FILE%" (
  echo ERROR: RDS-Local-CA.crt not found next to this script.
  echo Make sure both files are in the same folder.
  pause
  exit /b 1
)

echo Installing to Local Machine Trusted Root store...
echo (Required for Chrome 131+)
echo.
certutil -addstore "Root" "%CERT_FILE%"

if %errorlevel% == 0 (
  echo.
  echo ============================================
  echo  SUCCESS! Certificate installed.
  echo  Open Chrome and go to:
  echo    https://192.168.0.159:8443
  echo  No more security warnings!
  echo ============================================
) else (
  echo.
  echo  ERROR: Certificate install failed.
  echo  Error code: %errorlevel%
)
echo.
pause
