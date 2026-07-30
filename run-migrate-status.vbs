Dim sh : Set sh = CreateObject("WScript.Shell")
sh.Run "cmd /c cd /d C:\Users\HP\rds-project-hub && node migrate-add-inprocess-status.cjs > migrate-status-result.txt 2>&1", 0, True
MsgBox "Done! Check migrate-status-result.txt", 64, "Status Migration"
