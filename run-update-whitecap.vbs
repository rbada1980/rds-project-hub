Dim sh : Set sh = CreateObject("WScript.Shell")
sh.Run "cmd /c cd /d C:\Users\HP\rds-project-hub && node update-whitecap.cjs > whitecap-update-result.txt 2>&1", 0, True
MsgBox "Done! Check whitecap-update-result.txt", 64, "White Cap Update"
