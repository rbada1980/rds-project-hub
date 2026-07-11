@echo off
cd /d C:\Users\HP\rds-project-hub
node check_local_db.cjs > check_local_output.txt 2>&1
notepad check_local_output.txt
