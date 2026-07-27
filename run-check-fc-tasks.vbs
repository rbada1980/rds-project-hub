Dim sh : Set sh = CreateObject("WScript.Shell")
sh.Run "cmd /c cd /d C:\Users\HP\rds-project-hub && node check-formcrete-tasks.cjs > fc-tasks-log.txt 2>&1", 0, True
MsgBox "Done! Check formcrete-tasks.json", 64, "Check Tasks"
