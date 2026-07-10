@echo off
cd /d C:\Users\HP\rds-project-hub
echo === Running import_client.cjs ===
node import_client.cjs > import_client_output.txt 2>&1
echo Exit code: %ERRORLEVEL% >> import_client_output.txt
echo Done. Check import_client_output.txt
pause
