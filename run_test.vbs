Dim oShell
Set oShell = CreateObject("WScript.Shell")
oShell.Run "cmd /c cd /d C:\Users\HP\rds-project-hub && node test_api.js > api_out.txt 2>&1", 1, True
MsgBox "Done!", 64, "API Test"
