@echo off
cd /d C:\Users\HP\rds-project-hub
echo Pushing to GitHub...
git push origin main
echo Building...
npm run build
echo Restarting PM2...
pm2 restart rds-hub
echo Done! Press any key to close.
pause
