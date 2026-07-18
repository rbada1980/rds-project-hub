Set objShell = CreateObject("WScript.Shell")
objShell.Run "cmd.exe /k ""cd /d C:\Users\HP\rds-project-hub && node patch_outsource_tasks.cjs""", 1, False
