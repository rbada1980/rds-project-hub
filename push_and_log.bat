@echo off
cd /d C:\Users\HP\rds-project-hub
echo Checking git status... > C:\Users\HP\rds-project-hub\push_output.txt
git status >> C:\Users\HP\rds-project-hub\push_output.txt 2>&1
echo. >> C:\Users\HP\rds-project-hub\push_output.txt
echo Running git push... >> C:\Users\HP\rds-project-hub\push_output.txt
git push origin main >> C:\Users\HP\rds-project-hub\push_output.txt 2>&1
echo Exit code: %ERRORLEVEL% >> C:\Users\HP\rds-project-hub\push_output.txt
echo Done.
pause
