@echo off
cd /d C:\Users\HP\rds-project-hub
echo Pushing Excel analytics fix (SpreadsheetML - no CDN)...
git push origin main
echo.
echo Done! Vercel deploys in ~1 min. Then hard-refresh browser (Ctrl+Shift+R).
pause
