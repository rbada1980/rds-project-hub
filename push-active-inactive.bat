@echo off
cd /d C:\Users\HP\rds-project-hub
git push origin main
echo.
echo Restarting PM2...
pm2 restart rds-hub
pm2 save
echo.
echo === Done! ===
pause
