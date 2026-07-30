Dim sh : Set sh = CreateObject("WScript.Shell")
sh.Run "cmd /c cd /d C:\Users\HP\rds-project-hub && node check-pg-tasks.cjs > check-pg-tasks-result.txt 2>&1", 0, True
MsgBox "Done! Check check-pg-tasks-result.txt", 64, "PG vs Supabase Check"
