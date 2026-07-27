Dim sh : Set sh = CreateObject("WScript.Shell")
sh.Run "cmd /c cd /d C:\Users\HP\rds-project-hub && node fix-dates2.cjs > fix-dates2-log.txt 2>&1", 0, True
MsgBox "Done! Check fix-dates2-log.txt", 64, "Fix Dates"
