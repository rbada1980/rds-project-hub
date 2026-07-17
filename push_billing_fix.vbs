Dim oShell
Set oShell = CreateObject("WScript.Shell")
oShell.Run "cmd /c cd C:\Users\HP\rds-project-hub && git add src/App.jsx && git commit -m ""fix: billing settings use Supabase directly (works from Vercel & local)"" && git push origin main > push_billing_result.txt 2>&1", 1, True
MsgBox "Done! Check push_billing_result.txt", 64, "Push Complete"
