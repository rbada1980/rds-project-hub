Dim sh : Set sh = CreateObject("WScript.Shell")
sh.Run "cmd /c cd /d C:\Users\HP\rds-project-hub && node check-birthday-matches.cjs > check-birthday-matches-result.txt 2>&1", 0, True
MsgBox "Done! Check check-birthday-matches-result.txt", 64, "Birthday Match Check"
