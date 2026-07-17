Dim oShell
Set oShell = CreateObject("WScript.Shell")
oShell.Run "cmd /c pm2 status > C:\Users\HP\rds-project-hub\status_now.txt 2>&1 && pm2 logs rds-hub --lines 5 --nostream >> C:\Users\HP\rds-project-hub\status_now.txt 2>&1", 0, True
