@echo off
cd /d C:\Users\HP\rds-project-hub
echo Pushing syntax fix (build error on line 6871)...
git push origin main
echo.
echo Done! Vercel deploys in ~1 min.
echo Then: Run project_grouping_migration.sql in Supabase SQL Editor.
pause
