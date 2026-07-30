Dim sh : Set sh = CreateObject("WScript.Shell")
sh.Run "cmd /c cd /d C:\Users\HP\rds-project-hub && node check-overdue.cjs > check-overdue-result.txt 2>&1", 0, True
MsgBox "Done! Check check-overdue-result.txt", 64, "Overdue Check"
