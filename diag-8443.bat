@echo off
echo === Port 8443 status ===
netstat -an | findstr "8443"
echo.
echo === HTTPS test on 127.0.0.1:8443 ===
powershell -Command "try { $r = Invoke-WebRequest -Uri 'https://127.0.0.1:8443' -SkipCertificateCheck -TimeoutSec 5; Write-Host 'HTTPS 8443 OK:' $r.StatusCode } catch { Write-Host 'HTTPS 8443 FAIL:' $_.Exception.Message }"
echo.
echo === HTTP test on 127.0.0.1:3000 ===
powershell -Command "try { $r = Invoke-WebRequest -Uri 'http://127.0.0.1:3000' -TimeoutSec 3; Write-Host 'HTTP 3000 OK:' $r.StatusCode } catch { Write-Host 'HTTP 3000 FAIL:' $_.Exception.Message }"
echo.
echo === Firewall rule details ===
netsh advfirewall firewall show rule name="RDS HTTPS 8443" verbose
echo.
pause
