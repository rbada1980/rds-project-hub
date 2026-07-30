Dim sh : Set sh = CreateObject("WScript.Shell")
sh.Run "cmd /c cd /d C:\Users\HP\rds-project-hub && node fix-ksp-checking.cjs > fix-ksp-checking-result.txt 2>&1", 0, True
MsgBox "Done! Check fix-ksp-checking-result.txt", 64, "KSP Fix"
