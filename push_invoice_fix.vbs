Dim oShell
Set oShell = CreateObject("WScript.Shell")
' Build the app and restart PM2
oShell.Run "cmd /c cd /d C:\Users\HP\rds-project-hub && npm run build > build_invoice_result.txt 2>&1 && pm2 restart rds-hub >> build_invoice_result.txt 2>&1", 1, True
' Git push (commit already made by Claude sandbox)
oShell.Run "cmd /c cd /d C:\Users\HP\rds-project-hub && git push origin main >> build_invoice_result.txt 2>&1", 1, True
MsgBox "Done! Check build_invoice_result.txt", 64, "Build & Push Complete"
