@echo off
echo === PM2 Process Info ===
pm2 show rds-hub
echo.
echo === Port 8443 listening? ===
netstat -an | findstr 8443
echo.
echo === Test HTTPS local connection ===
powershell -Command "try { $r = Invoke-WebRequest -Uri 'https://localhost:8443' -SkipCertificateCheck -TimeoutSec 5; Write-Host 'SUCCESS:' $r.StatusCode } catch { Write-Host 'ERROR:' $_.Exception.Message }"
echo.
echo === Firewall rules for 8443 ===
netsh advfirewall firewall show rule name="RDS HTTPS 8443"
echo.
pause
