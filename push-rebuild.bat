@echo off
cd /d C:\Users\HP\rds-project-hub
echo === Push + Rebuild ===
git push origin main
echo.
echo Building frontend...
npm run build
echo.
echo Restarting PM2...
pm2 restart rds-hub
pm2 save
echo.
echo === Done! ===
pause
