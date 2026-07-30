Dim sh : Set sh = CreateObject("WScript.Shell")
sh.Run "cmd /c cd /d C:\Users\HP\rds-project-hub && node check-duplicates.cjs > check-duplicates-result.txt 2>&1", 0, True
MsgBox "Done! Check check-duplicates-result.txt", 64, "Duplicate Check"
