$log = "C:\Users\HP\rds-project-hub\register-tasks-log.txt"
"Startup folder approach at $(Get-Date)" | Out-File $log -Encoding UTF8

$startupPath = [Environment]::GetFolderPath('Startup')
"Startup: $startupPath" | Out-File $log -Append -Encoding UTF8

# RDS-Hub-Server.bat: wait 30s then run start-rds-server.bat
$s1 = "@echo off`r`ntimeout /t 30 /nobreak >nul`r`nstart `"`" `"C:\Users\HP\rds-project-hub\start-rds-server.bat`""
[System.IO.File]::WriteAllText("$startupPath\RDS-Hub-Server.bat", $s1, [System.Text.Encoding]::ASCII)
"Server bat: $((Test-Path "$startupPath\RDS-Hub-Server.bat"))" | Out-File $log -Append -Encoding UTF8

# RDS-Hub-Sync-Boot.bat: wait 60s then run sync-scheduled.bat
$s2 = "@echo off`r`ntimeout /t 60 /nobreak >nul`r`nstart `"`" `"C:\Users\HP\rds-project-hub\sync-scheduled.bat`""
[System.IO.File]::WriteAllText("$startupPath\RDS-Hub-Sync-Boot.bat", $s2, [System.Text.Encoding]::ASCII)
"Sync-Boot bat: $((Test-Path "$startupPath\RDS-Hub-Sync-Boot.bat"))" | Out-File $log -Append -Encoding UTF8

# pm2 restart: triggered via schtasks (already works for non-logon triggers)
# Note: RDS-Hub-Sync-5min is already in Task Scheduler

"ALL DONE" | Out-File $log -Append -Encoding UTF8
