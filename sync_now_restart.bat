@echo off
cd /d C:\Users\HP\rds-project-hub
echo === Running immediate sync (Supabase ^<-^> Local) ===
node sync.cjs
echo.
echo === Restarting PM2 server (picks up server.js changes) ===
pm2 restart rds-hub
echo.
echo === Done! ===
echo Sync complete. Server restarted with 15-min auto-sync enabled.
pause
