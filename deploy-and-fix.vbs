Dim sh : Set sh = CreateObject("WScript.Shell")

' Step 1: Deploy
sh.Run "cmd /c cd /d C:\Users\HP\rds-project-hub && git add -A && git commit -m ""fix: lock all dates/times to IST (Asia/Kolkata) — company is India-based"" && git push origin main >> deploy-log.txt 2>&1", 0, True

' Step 2: Fix existing wrong dates in DB
sh.Run "cmd /c cd /d C:\Users\HP\rds-project-hub && node fix-dates2.cjs > fix-dates2-log.txt 2>&1", 0, True

MsgBox "Done! App deployed + DB dates fixed. Check fix-dates2-log.txt for results.", 64, "Deploy & Fix"
