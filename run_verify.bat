@echo off
cd /d C:\Users\HP\rds-project-hub
node verify_whitecap.cjs > verify_output.txt 2>&1
type verify_output.txt
pause
