Set objShell = CreateObject("WScript.Shell")
objShell.Run "cmd.exe /k ""cd /d C:\Users\HP\rds-project-hub && npm run build && pm2 restart all""", 1, False
