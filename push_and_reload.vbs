Dim oShell
Set oShell = CreateObject("WScript.Shell")
oShell.Run "cmd /c cd /d C:\Users\HP\rds-project-hub && git push origin main > push_out.txt 2>&1", 1, True
' Now reload Chrome tab
oShell.AppActivate "RDS Project Hub"
WScript.Sleep 800
oShell.SendKeys "^{F5}"
MsgBox "Done! Git pushed and browser refreshed. The billing page will now load correctly.", 64, "Complete"
