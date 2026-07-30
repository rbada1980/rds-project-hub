Dim sh : Set sh = CreateObject("WScript.Shell")
' Step 1: write the correct Excel from embedded base64
sh.Run "cmd /c cd /d C:\Users\HP\rds-project-hub && node write-ksp-excel.cjs >> ksp-update-result.txt 2>&1", 0, True
' Step 2: run the upsert
sh.Run "cmd /c cd /d C:\Users\HP\rds-project-hub && node update-ksp.cjs >> ksp-update-result.txt 2>&1", 0, True
MsgBox "Done! Check ksp-update-result.txt", 64, "KS&P Update"
