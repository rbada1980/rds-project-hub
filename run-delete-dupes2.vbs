Dim sh : Set sh = CreateObject("WScript.Shell")
sh.Run "cmd /c cd /d C:\Users\HP\rds-project-hub && node delete-dupes2.cjs > delete-dupes2-log.txt 2>&1", 0, True
MsgBox "Done! Check delete-dupes2-log.txt for details.", 64, "Delete Remaining Dupes"
