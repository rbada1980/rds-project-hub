Set oShell = CreateObject("WScript.Shell")
' Bring Chrome to front and force refresh
oShell.AppActivate "RDS Project Hub"
WScript.Sleep 500
oShell.SendKeys "^{F5}"
WScript.Sleep 1000
MsgBox "Browser refreshed! Billing settings will now load correctly.", 64, "Done"
