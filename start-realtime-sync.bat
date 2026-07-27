@echo off
cd /d C:\Users\HP\rds-project-hub
echo === Starting RDS Realtime Sync Daemon ===
echo.

rem Stop old instance if running
pm2 stop rds-realtime-sync 2>nul
pm2 delete rds-realtime-sync 2>nul

rem Start fresh
pm2 start realtime-sync.cjs --name rds-realtime-sync
pm2 save

echo.
echo === Done! Run this to watch logs: ===
echo    pm2 logs rds-realtime-sync
echo.
pause
