Dim oShell
Set oShell = CreateObject("WScript.Shell")
' Build the app then restart PM2
oShell.Run "cmd /c cd /d C:\Users\HP\rds-project-hub && npm run build > build_output.txt 2>&1 && pm2 restart rds-hub >> build_output.txt 2>&1", 1, True
MsgBox "Build & restart done! Check build_output.txt", 64, "Build Complete"
