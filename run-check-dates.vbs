Dim sh : Set sh = CreateObject("WScript.Shell")
sh.Run "cmd /c cd /d C:\Users\HP\rds-project-hub && node check-dates.cjs > check-dates-result.txt 2>&1", 0, True
MsgBox "Done! Check check-dates-result.txt", 64, "Date Check"
