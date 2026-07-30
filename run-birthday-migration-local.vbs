Dim sh : Set sh = CreateObject("WScript.Shell")
sh.Run "cmd /c cd /d C:\Users\HP\rds-project-hub && node birthday-migration-local.cjs > birthday-migration-result.txt 2>&1", 0, True
MsgBox "Done! Check birthday-migration-result.txt", 64, "Birthday Migration"
