@echo off
REM ══════════════════════════════════════════════════════════
REM  RDS Universal Client Sync
REM  Usage: run_sync.bat "ClientName" "ExcelFile.xlsx" [SheetName]
REM
REM  Examples:
REM    run_sync.bat "White Cap" "White Cap Projects Tracker2_2026.xlsx"
REM    run_sync.bat "Octavia" "Octavia_Jul2026.xlsx" "Work Schedule"
REM ══════════════════════════════════════════════════════════
cd /d "C:\Users\HP\rds-project-hub"
node import_sync.cjs %1 %2 %3
pause
