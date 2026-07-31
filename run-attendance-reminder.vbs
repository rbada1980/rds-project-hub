Dim sh : Set sh = CreateObject("WScript.Shell")
sh.Run "cmd /c cd /d C:\Users\HP\rds-project-hub && node attendance-reminder.cjs >> attendance-reminder-log.txt 2>&1", 0, False
