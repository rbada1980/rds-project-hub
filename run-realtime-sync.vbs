Dim sh : Set sh = CreateObject("WScript.Shell")
sh.Run "cmd /c cd /d C:\Users\HP\rds-project-hub && pm2 stop rds-realtime-sync 2>nul & pm2 delete rds-realtime-sync 2>nul & pm2 start realtime-sync.cjs --name rds-realtime-sync && pm2 save >> realtime-sync-start.log 2>&1", 0, True
MsgBox "Realtime sync daemon started! Check realtime-sync-start.log for details.", 64, "RDS Sync"
