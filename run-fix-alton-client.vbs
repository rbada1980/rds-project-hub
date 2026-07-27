Dim sh : Set sh = CreateObject("WScript.Shell")
sh.Run "cmd /c cd /d C:\Users\HP\rds-project-hub && node fix-alton-client.cjs > alton-client-result.txt 2>&1", 0, True
MsgBox "Done! Check alton-client-result.txt", 64, "Alton Client Fix"
