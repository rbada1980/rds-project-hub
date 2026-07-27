Dim sh : Set sh = CreateObject("WScript.Shell")
sh.Run "cmd /c cd /d C:\Users\HP\rds-project-hub && git add -A && git commit -m ""fix: lock all dates/times to IST (Asia/Kolkata) — company is India-based"" && git push origin main >> deploy-log.txt 2>&1", 0, True
MsgBox "Deploy done!", 64, "Deploy"
