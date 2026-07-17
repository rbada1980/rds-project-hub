Dim oShell
Set oShell = CreateObject("WScript.Shell")
oShell.Run "cmd /c cd /d C:\Users\HP\rds-project-hub && git push origin main > push_result.txt 2>&1", 1, True
MsgBox "Push done! Check push_result.txt", 64, "Git Push"
