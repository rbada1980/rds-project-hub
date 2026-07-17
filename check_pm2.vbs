Dim oShell
Set oShell = CreateObject("WScript.Shell")
oShell.Run "cmd /c pm2 logs rds-hub --lines 20 --nostream > C:\Users\HP\rds-project-hub\pm2_logs.txt 2>&1", 0, True
