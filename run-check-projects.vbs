Dim sh : Set sh = CreateObject("WScript.Shell")
sh.Run "cmd /c cd /d C:\Users\HP\rds-project-hub && node check-projects.cjs", 0, True
MsgBox "Done! Check projects-result.json", 64, "Check Projects"
