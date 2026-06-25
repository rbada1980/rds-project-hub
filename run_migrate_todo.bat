@echo off
cd /d C:\Users\HP\rds-project-hub
echo Migrating status "To Do" to "Not Yet Started"...
node migrate_todo_to_notstarted.cjs
echo.
pause
