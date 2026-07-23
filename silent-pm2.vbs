CreateObject("WScript.Shell").Run "cmd /c cd /d C:\Users\HP\rds-project-hub && pm2 resurrect >> pm2-startup.log 2>&1", 0, True
