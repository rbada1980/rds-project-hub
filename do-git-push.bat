@echo off
cd /d C:\Users\HP\rds-project-hub
echo Pushing to origin main... > git-push-log.txt 2>&1
git push origin main >> git-push-log.txt 2>&1
echo ExitCode: %ERRORLEVEL% >> git-push-log.txt
