@echo off
echo Restarting PM2 servers...
cd /d C:\Users\HP\rds-project-hub
pm2 restart all
echo.
echo Done! Press any key to close.
pause
