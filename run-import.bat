@echo off
cd /d "%~dp0"
echo Running White Cap import...
node import-whitecap.cjs
echo.
echo Done! Press any key to close.
pause
