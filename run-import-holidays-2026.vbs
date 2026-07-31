Dim sh : Set sh = CreateObject("WScript.Shell")
sh.Run "cmd /c cd /d C:\Users\HP\rds-project-hub && node import-holidays-2026.cjs > import-holidays-2026-result.txt 2>&1", 0, True
MsgBox "Done! Check import-holidays-2026-result.txt", 64, "2026 Holidays Import"
