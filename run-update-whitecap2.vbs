Dim sh : Set sh = CreateObject("WScript.Shell")
sh.Run "cmd /c cd /d C:\Users\HP\rds-project-hub && node write-whitecap2-excel.cjs > whitecap2-update-result.txt 2>&1", 0, True
sh.Run "cmd /c cd /d C:\Users\HP\rds-project-hub && node update-whitecap2.cjs >> whitecap2-update-result.txt 2>&1", 0, True
MsgBox "Done! Check whitecap2-update-result.txt", 64, "White Cap Import"
