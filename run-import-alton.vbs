Dim sh : Set sh = CreateObject("WScript.Shell")
sh.Run "cmd /c cd /d C:\Users\HP\rds-project-hub && node import-alton-delray.cjs > alton-delray-import-log.txt 2>&1", 0, True
MsgBox "Done! Check alton-delray-import-log.txt", 64, "ALTON DELRAY Import"
