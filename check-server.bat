@echo off
echo === PM2 logs (last 30 lines) ===
pm2 logs rds-hub --lines 30 --nostream
echo.
echo === Ports 3000, 8080, 8443 ===
netstat -an | findstr " 3000 \| 8080 \| 8443 "
echo.
echo === PowerShell HTTPS test ===
powershell -Command "try { $r = Invoke-WebRequest -Uri 'https://127.0.0.1:8443' -SkipCertificateCheck -TimeoutSec 5; Write-Host 'HTTPS 8443 OK:' $r.StatusCode } catch { Write-Host 'HTTPS 8443 FAIL:' $_.Exception.Message }"
powershell -Command "try { $r = Invoke-WebRequest -Uri 'http://127.0.0.1:3000' -TimeoutSec 3; Write-Host 'HTTP 3000 OK:' $r.StatusCode } catch { Write-Host 'HTTP 3000 FAIL:' $_.Exception.Message }"
echo.
pause
