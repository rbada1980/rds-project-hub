@echo off
cd /d C:\Users\HP\rds-project-hub

echo [1] Running fresh import with UTC timezone fix...
node import_from_excel.cjs > import_excel_output.txt 2>&1
echo Import done. Check import_excel_output.txt

echo [2] Restarting server via PM2...
pm2 restart all > restart_output.txt 2>&1
if %ERRORLEVEL% neq 0 (
  echo PM2 not found, trying direct restart...
  taskkill /f /fi "WINDOWTITLE eq server*" > nul 2>&1
  start /b node server.cjs > server_output.txt 2>&1
)
echo Server restart attempted. Check restart_output.txt

echo Done!
