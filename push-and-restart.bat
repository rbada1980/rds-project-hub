@echo off
cd /d C:\Users\HP\rds-project-hub
echo === Git Push + PM2 Restart ===
echo.
git add -A
git commit -m "fix: silent startup task, formcrete import v2, run-formcrete-import helper"
echo.
echo Pushing to origin main...
git push origin main
echo.
echo Restarting PM2...
pm2 restart all
pm2 save
echo.
echo === Done! ===
pause
