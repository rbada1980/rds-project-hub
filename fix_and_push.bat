@echo off
cd /d C:\Users\HP\rds-project-hub
echo Pushing command palette + project grouping...
git push origin main
echo.
echo Done! Vercel deploys in ~1 min.
echo Then: Run project_grouping_migration.sql in Supabase SQL Editor.
pause
