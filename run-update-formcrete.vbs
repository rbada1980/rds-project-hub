Dim sh : Set sh = CreateObject("WScript.Shell")
sh.Run "cmd /c cd /d C:\Users\HP\rds-project-hub && node sync-formcrete-final.cjs > sync-stdout.txt 2>&1", 0, True
MsgBox "Sync complete! Check sync-formcrete-result.txt", 64, "Formcrete Sync"
