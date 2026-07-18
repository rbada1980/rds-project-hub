Set objShell = CreateObject("WScript.Shell")
objShell.Run "cmd.exe /c ""cd /d C:\Users\HP\rds-project-hub && pm2 describe 0 > pm2info.txt 2>&1""", 0, True
