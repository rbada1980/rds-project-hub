Set objShell = CreateObject("WScript.Shell")
objShell.Run "cmd.exe /c ""type C:\Users\HP\rds-project-hub\dist\index.html > C:\Users\HP\rds-project-hub\dist_check.txt 2>&1""", 0, True
