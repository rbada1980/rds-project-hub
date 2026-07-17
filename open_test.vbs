Dim oShell
Set oShell = CreateObject("WScript.Shell")
' Navigate the active Chrome tab to the test page
oShell.AppActivate "RDS Project Hub"
WScript.Sleep 600
oShell.SendKeys "^l"
WScript.Sleep 400
oShell.SendKeys "hub.rdsprojects.com/billing-test.html"
WScript.Sleep 200
oShell.SendKeys "{ENTER}"
WScript.Sleep 2000
MsgBox "Test page opened. Please click '3. Full Save Test' button and tell me the result.", 64, "Test"
