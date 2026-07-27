Dim sh : Set sh = CreateObject("WScript.Shell")
sh.Run "cmd /c cd /d C:\Users\HP\rds-project-hub && pm2 resurrect && pm2 restart rds-hub && pm2 save >> restart-log.txt 2>&1", 0, True
MsgBox "Server restarted! See restart-log.txt for details.", 64, "RDS Restart"
