Dim oShell
Set oShell = CreateObject("WScript.Shell")
oShell.Run "cmd /c cd /d C:\Users\HP\rds-project-hub && pm2 restart all >> pm2-restart.log 2>&1", 0, True
MsgBox "PM2 restarted! Check pm2-restart.log for details.", vbInformation, "PM2 Restart"
