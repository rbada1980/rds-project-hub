@echo off
cd /d C:\Users\HP\rds-project-hub
echo Migrating status "Done" to "Completed"...
node migrate_done_to_completed.cjs
echo.
pause
