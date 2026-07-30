Dim sh : Set sh = CreateObject("WScript.Shell")
sh.Run "cmd /c cd /d C:\Users\HP\rds-project-hub && node dedup-tasks.cjs > dedup-result.txt 2>&1", 0, True
MsgBox "Done! Check dedup-result.txt", 64, "Dedup Tasks"
