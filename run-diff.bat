@echo off
cd /d C:\Users\HP\rds-project-hub
echo Running Formcrete diff (Excel vs DB)...
node formcrete-diff.cjs
echo.
echo Done! Check formcrete-diff-report.json
pause
