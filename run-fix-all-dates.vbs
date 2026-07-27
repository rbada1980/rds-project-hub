Dim sh : Set sh = CreateObject("WScript.Shell")
sh.Run "cmd /c cd /d C:\Users\HP\rds-project-hub && node fix-all-dates.cjs > fix-all-dates-log.txt 2>&1", 0, True
MsgBox "Done! Check fix-all-dates-log.txt", 64, "Fix All Dates"
