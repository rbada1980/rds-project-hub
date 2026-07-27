Dim sh : Set sh = CreateObject("WScript.Shell")
sh.Run "cmd /c cd /d C:\Users\HP\rds-project-hub && node check-alton-client.cjs > alton-client-check.txt 2>&1", 0, True
MsgBox "Done! Check alton-client-check.txt", 64, "Alton Client Check"
