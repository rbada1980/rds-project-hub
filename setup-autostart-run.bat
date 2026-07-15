@echo off
cd /d "C:\Users\HP\rds-project-hub"

echo Saving PM2 process list...
pm2 save

echo.
echo Registering RDS-Hub-Server...
schtasks /delete /tn "RDS-Hub-Server" /f >nul 2>&1
schtasks /create /tn "RDS-Hub-Server" /tr "\"C:\Users\HP\rds-project-hub\start-rds-server.bat\"" /sc ONLOGON /delay 0000:30 /f

echo.
echo Registering RDS-Hub-Sync-Boot...
schtasks /delete /tn "RDS-Hub-Sync-Boot" /f >nul 2>&1
schtasks /create /tn "RDS-Hub-Sync-Boot" /tr "\"C:\Users\HP\rds-project-hub\sync-scheduled.bat\"" /sc ONLOGON /delay 0001:00 /f

echo.
echo Registering RDS-Hub-Sync-5min...
schtasks /delete /tn "RDS-Hub-Sync-5min" /f >nul 2>&1
schtasks /create /tn "RDS-Hub-Sync-5min" /tr "\"C:\Users\HP\rds-project-hub\sync-scheduled.bat\"" /sc MINUTE /mo 5 /f

echo.
echo =============================================
echo  Done! Tasks created:
echo    RDS-Hub-Server
echo    RDS-Hub-Sync-Boot
echo    RDS-Hub-Sync-5min
echo =============================================
pause
