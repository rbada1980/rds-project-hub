Dim sh : Set sh = CreateObject("WScript.Shell")
sh.Run "cmd /c cd /d C:\Users\HP\rds-project-hub && node update-formcrete-tasks.cjs > formcrete-update-log.txt 2>&1", 0, True
MsgBox "Done! Check formcrete-update-log.txt for results.", 64, "Formcrete Update"
