Dim sh : Set sh = CreateObject("WScript.Shell")
sh.Run "cmd /c cd /d C:\Users\HP\rds-project-hub && node import-birthdays.cjs > import-birthdays-result.txt 2>&1", 0, True
MsgBox "Done! Check import-birthdays-result.txt", 64, "Birthday Import"
