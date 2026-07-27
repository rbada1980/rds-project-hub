Dim sh : Set sh = CreateObject("WScript.Shell")
sh.Run "cmd /c cd /d C:\Users\HP\rds-project-hub && git add -A && git commit -m ""fix: paginate task fetch to bypass Supabase 1000-row cap"" && git push origin main >> deploy-log.txt 2>&1", 0, True
MsgBox "Deploy done! Check deploy-log.txt", 64, "Deploy"
