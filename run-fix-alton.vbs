Dim sh : Set sh = CreateObject("WScript.Shell")
sh.Run "cmd /c cd /d C:\Users\HP\rds-project-hub && node fix-alton-dates.cjs > alton-dates-fix-result.txt 2>&1", 0, True
MsgBox "Done! Check alton-dates-fix-result.txt", 64, "Alton Delray Date Fix"
