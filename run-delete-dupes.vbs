Dim sh : Set sh = CreateObject("WScript.Shell")
sh.Run "cmd /c cd /d C:\Users\HP\rds-project-hub && node delete-dupes.cjs >> delete-dupes-log.txt 2>&1", 0, True
MsgBox "Done! Check delete-dupes-log.txt for details.", 64, "Delete Duplicates"
