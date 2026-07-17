Dim oShell
Set oShell = CreateObject("WScript.Shell")
' Build the app and restart PM2
oShell.Run "cmd /c cd /d C:\Users\HP\rds-project-hub && npm run build > build_invoice_result.txt 2>&1 && pm2 restart rds-hub >> build_invoice_result.txt 2>&1", 1, True
' Strip null bytes just in case
oShell.Run "cmd /c python -c ""path='C:/Users/HP/rds-project-hub/src/App.jsx'; f=open(path,'rb'); d=f.read(); f.close(); d2=d.replace(b'\x00',b''); f=open(path,'wb'); f.write(d2); f.close(); print(str(d.count(b'\x00'))+' null bytes stripped')"" >> build_invoice_result.txt 2>&1", 1, True
' Git commit and push
oShell.Run "cmd /c cd /d C:\Users\HP\rds-project-hub && git add src/App.jsx && git commit -m ""feat: invoice - RDS Techserv Inc, BILL TO right, company details left, remove Assignee, add tagline/address"" && git push origin main >> build_invoice_result.txt 2>&1", 1, True
MsgBox "Done! Check build_invoice_result.txt", 64, "Build & Push Complete"
