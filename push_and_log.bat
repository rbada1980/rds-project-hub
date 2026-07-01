@echo off
cd /d C:\Users\HP\rds-project-hub
git push origin main > C:\Users\HP\rds-project-hub\push_output.txt 2>&1
echo Exit code: %ERRORLEVEL% >> C:\Users\HP\rds-project-hub\push_output.txt
pause
