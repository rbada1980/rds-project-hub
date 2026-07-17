Dim oShell, oExec
Set oShell = CreateObject("WScript.Shell")
oShell.Run "cmd /c nslookup hub.rdsprojects.com > dns_result.txt 2>&1 && echo --- >> dns_result.txt && netstat -an | findstr 8443 >> dns_result.txt && echo --- >> dns_result.txt && curl -sk -o nul -w ""%%{http_code} %%{url_effective}\n"" https://hub.rdsprojects.com/api/settings >> dns_result.txt 2>&1", 1, True
MsgBox "Done", 64, "DNS Check"
