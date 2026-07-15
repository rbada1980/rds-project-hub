@echo off
:: Restore PM2 processes on Windows login
cd /d "C:\Users\HP\rds-project-hub"
pm2 resurrect >> "C:\Users\HP\rds-project-hub\pm2-startup.log" 2>&1
