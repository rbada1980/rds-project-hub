Set objShell = CreateObject("WScript.Shell")
objShell.Run "cmd.exe /k ""cd /d C:\Users\HP\rds-project-hub && node sync_whitecap_20260718.cjs""", 1, False
