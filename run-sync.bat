@echo off
cd /d "%~dp0"
echo Running WhiteCap Sync...
node sync-whitecap.js
pause
