@echo off
:: Run as Administrator
cd /d C:\Users\HP\rds-project-hub
echo.
echo ============================================================
echo   Deleting LOCAL email sender tasks from Task Scheduler
echo ============================================================
echo.

schtasks /delete /tn "RDS_DailySubmissionDigest"          /f >nul 2>&1 && echo Deleted: RDS_DailySubmissionDigest          || echo Not found: RDS_DailySubmissionDigest
schtasks /delete /tn "RDS_DailySubmtaskschd.mscissionDigest" /f >nul 2>&1 && echo Deleted: RDS_DailySubmtaskschd.mscissionDigest || echo Not found: RDS_DailySubmtaskschd.mscissionDigest
schtasks /delete /tn "RDS Server"                          /f >nul 2>&1 && echo Deleted: RDS Server                         || echo Not found: RDS Server

echo.
echo Verifying - remaining RDS tasks:
schtasks /query /fo LIST | findstr /i "TaskName.*RDS"
echo.
echo ============================================================
echo   DONE. Local mailer tasks removed.
echo   Emails now ONLY from Vercel cron at 1 AM IST.
echo ============================================================
echo.
pause
