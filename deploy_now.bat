@echo off
cd /d C:\Users\HP\rds-project-hub

echo === Building frontend ===
call npm run build
if %ERRORLEVEL% NEQ 0 (echo BUILD FAILED & pause & exit /b 1)

echo.
echo === Pushing to GitHub ===
git push origin main
if %ERRORLEVEL% NEQ 0 (echo PUSH FAILED - check credentials & pause & exit /b 1)

echo.
echo === Restarting server ===
pm2 restart rds-hub

echo.
echo === Done! Vercel will redeploy automatically. ===
echo === Refresh the offline site: Ctrl+Shift+R on 192.168.0.159:8443 ===
pause
