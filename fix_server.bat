@echo off
cd /d C:\Users\HP\rds-project-hub
echo Pulling latest from git...
git pull origin main
echo.
echo Restarting PM2...
pm2 restart rds-hub
echo.
echo PM2 status:
pm2 status
echo.
pause
