@echo off
:: ============================================================
::  FIX-STARTUP-EMAILS.BAT
::  Removes ALL startup triggers that could send emails.
::  Run this ONCE as Administrator.
:: ============================================================
echo.
echo ============================================================
echo   RDS Startup Email Fix
echo   This removes ALL RDS tasks from Task Scheduler AND
echo   Windows Startup folder, then creates ONE silent task.
echo ============================================================
echo.

:: ---------- STEP 1: Dump current tasks for reference ----------
echo [1/4] Saving current task list to all-tasks.txt ...
schtasks /query /fo LIST /v > "C:\Users\HP\rds-project-hub\all-tasks.txt" 2>&1
echo       Done. (Check all-tasks.txt to see what existed)

:: ---------- STEP 2: Remove Windows Startup folder entries -----
echo.
echo [2/4] Clearing Windows Startup folder ...
set "STARTUP=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
del /f /q "%STARTUP%\RDS-Hub-Server.bat"    2>nul && echo       Deleted: RDS-Hub-Server.bat
del /f /q "%STARTUP%\RDS-Hub-Sync-Boot.bat" 2>nul && echo       Deleted: RDS-Hub-Sync-Boot.bat
del /f /q "%STARTUP%\start-rds-server.bat"  2>nul && echo       Deleted: start-rds-server.bat
del /f /q "%STARTUP%\start-rds.bat"         2>nul && echo       Deleted: start-rds.bat
del /f /q "%STARTUP%\sync-scheduled.bat"    2>nul && echo       Deleted: sync-scheduled.bat
echo       Startup folder cleared.

:: ---------- STEP 3: Delete ALL RDS Task Scheduler tasks -------
echo.
echo [3/4] Removing all RDS-Hub-* tasks from Task Scheduler ...
schtasks /delete /tn "RDS-Hub-Server"      /f >nul 2>&1 && echo       Deleted: RDS-Hub-Server
schtasks /delete /tn "RDS-Hub-Sync-Boot"   /f >nul 2>&1 && echo       Deleted: RDS-Hub-Sync-Boot
schtasks /delete /tn "RDS-Hub-Sync-5min"   /f >nul 2>&1 && echo       Deleted: RDS-Hub-Sync-5min
schtasks /delete /tn "RDS-Hub-Email"        /f >nul 2>&1 && echo       Deleted: RDS-Hub-Email
schtasks /delete /tn "RDS-Hub-Cron"         /f >nul 2>&1 && echo       Deleted: RDS-Hub-Cron
schtasks /delete /tn "RDS-Hub-Digest"       /f >nul 2>&1 && echo       Deleted: RDS-Hub-Digest
schtasks /delete /tn "RDS-Daily-Email"      /f >nul 2>&1 && echo       Deleted: RDS-Daily-Email
schtasks /delete /tn "RDS-Digest"           /f >nul 2>&1 && echo       Deleted: RDS-Digest
schtasks /delete /tn "RDS-Submission"       /f >nul 2>&1 && echo       Deleted: RDS-Submission
schtasks /delete /tn "RDS-Cron"             /f >nul 2>&1 && echo       Deleted: RDS-Cron

:: ---------- STEP 4: Create ONE silent startup task ------------
echo.
echo [4/4] Creating silent RDS-Hub-Server task (no CMD window) ...
schtasks /create ^
  /tn "RDS-Hub-Server" ^
  /tr "wscript.exe \"C:\Users\HP\rds-project-hub\silent-pm2.vbs\"" ^
  /sc ONLOGON ^
  /delay 0000:30 ^
  /rl HIGHEST ^
  /f
echo       Done.

:: ---------- DONE ---------------------------------------------
echo.
echo ============================================================
echo   DONE!
echo.
echo   What changed:
echo   - All RDS startup tasks DELETED
echo   - Windows Startup folder cleared
echo   - ONE silent task created: RDS-Hub-Server
echo     (starts PM2 on login, NO visible CMD window)
echo.
echo   Emails now ONLY come from Vercel cron at 1 AM IST.
echo   No local machine will trigger emails anymore.
echo.
echo   Next: Restart laptop to confirm no CMD windows open.
echo ============================================================
echo.
pause
