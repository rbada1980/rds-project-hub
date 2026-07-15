@echo off
:: ═══════════════════════════════════════════════════════════════
::  RDS Hub — Windows Auto-Start Setup
::  Run this ONCE as Administrator to register all scheduled tasks
:: ═══════════════════════════════════════════════════════════════

echo.
echo ╔═══════════════════════════════════════════════════╗
echo ║        RDS Hub Auto-Start Setup                   ║
echo ╚═══════════════════════════════════════════════════╝
echo.

:: ── Step 1: Save current PM2 process list ────────────────────
echo [1/4] Saving PM2 process list...
cd /d "C:\Users\HP\rds-project-hub"
pm2 save
echo.

:: ── Step 2: Task — Start PM2 server on login ─────────────────
echo [2/4] Registering: RDS-Hub-Server (starts on login)...
schtasks /delete /tn "RDS-Hub-Server" /f >nul 2>&1
schtasks /create ^
  /tn "RDS-Hub-Server" ^
  /tr "\"C:\Users\HP\rds-project-hub\start-rds-server.bat\"" ^
  /sc ONLOGON ^
  /delay 0000:30 ^
  /rl HIGHEST ^
  /f
echo.

:: ── Step 3: Task — One sync on login (after server starts) ───
echo [3/4] Registering: RDS-Hub-Sync-Boot (sync once on login)...
schtasks /delete /tn "RDS-Hub-Sync-Boot" /f >nul 2>&1
schtasks /create ^
  /tn "RDS-Hub-Sync-Boot" ^
  /tr "\"C:\Users\HP\rds-project-hub\sync-scheduled.bat\"" ^
  /sc ONLOGON ^
  /delay 0001:00 ^
  /rl HIGHEST ^
  /f
echo.

:: ── Step 4: Task — Sync every 5 minutes ──────────────────────
echo [4/4] Registering: RDS-Hub-Sync-5min (every 5 minutes)...
schtasks /delete /tn "RDS-Hub-Sync-5min" /f >nul 2>&1
schtasks /create ^
  /tn "RDS-Hub-Sync-5min" ^
  /tr "\"C:\Users\HP\rds-project-hub\sync-scheduled.bat\"" ^
  /sc MINUTE ^
  /mo 5 ^
  /rl HIGHEST ^
  /f
echo.

:: ── Done ─────────────────────────────────────────────────────
echo ═══════════════════════════════════════════════════
echo  All tasks registered successfully!
echo.
echo  Tasks created:
echo    RDS-Hub-Server      → starts PM2 on login (30s delay)
echo    RDS-Hub-Sync-Boot   → one sync on login (60s delay)
echo    RDS-Hub-Sync-5min   → sync every 5 minutes
echo.
echo  Log files:
echo    pm2-startup.log     → server start log
echo    sync-auto.log       → sync output log
echo ═══════════════════════════════════════════════════
echo.
pause
