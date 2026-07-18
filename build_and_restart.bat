@echo off
cd /d C:\Users\HP\rds-project-hub
echo Building...
npm run build
echo Restarting pm2...
pm2 restart all
echo Done!
pause
