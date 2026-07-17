Dim oShell
Set oShell = CreateObject("WScript.Shell")
oShell.Run "cmd /c cd /d C:\Users\HP\rds-project-hub && git pull origin main && pm2 restart rds-hub && pm2 status > C:\Users\HP\rds-project-hub\pm2_result.txt 2>&1", 1, True
MsgBox "Done! Check pm2_result.txt for status.", 64, "PM2 Restart"
