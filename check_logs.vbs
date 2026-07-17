Dim oShell
Set oShell = CreateObject("WScript.Shell")
oShell.Run "cmd /c pm2 logs rds-hub --lines 50 --nostream > pm2_recent_logs.txt 2>&1", 1, True
oShell.Run "cmd /c pm2 status >> pm2_recent_logs.txt 2>&1", 1, True
MsgBox "Done", 64, "Logs"
