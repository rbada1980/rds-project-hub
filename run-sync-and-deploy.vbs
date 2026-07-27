Dim sh : Set sh = CreateObject("WScript.Shell")

' Step 1: Sync local PG dates from Supabase
sh.Run "cmd /c cd /d C:\Users\HP\rds-project-hub && node sync-local-pg-dates.cjs > sync-local-pg-result.txt 2>&1", 0, True

' Step 2: Deploy latest code to Vercel
sh.Run "cmd /c cd /d C:\Users\HP\rds-project-hub && git add -A && git commit -m ""fix: White Cap MM-DD-YYYY date parser + date correction scripts"" && git push origin main >> deploy-log.txt 2>&1", 0, True

MsgBox "Done! Local PG synced + deployed. Check sync-local-pg-result.txt", 64, "Sync & Deploy"
