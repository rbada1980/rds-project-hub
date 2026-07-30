Dim sh : Set sh = CreateObject("WScript.Shell")
sh.Run "cmd /c cd /d C:\Users\HP\rds-project-hub && node check-ksp.cjs > check-ksp-result.txt 2>&1", 0, True
MsgBox "Done! Check check-ksp-result.txt", 64, "KS&P Check"
