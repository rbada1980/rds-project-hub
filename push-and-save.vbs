Dim sh : Set sh = CreateObject("WScript.Shell")
sh.Run "cmd /c cd /d C:\Users\HP\rds-project-hub && git add -A && git commit -m ""feat: realtime sync daemon + HR_MIGRATIONS update (Jul 27)"" && git push origin main && pm2 restart rds-hub && pm2 save >> push-log.txt 2>&1", 0, True
MsgBox "Git push + PM2 restart done! See push-log.txt for details.", 64, "RDS Push"
