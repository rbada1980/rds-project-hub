Write-Host "=== Current Config ===" -ForegroundColor Cyan
ipconfig | findstr /i "IPv4 Gateway DNS"

Write-Host ""
Write-Host "=== Internet Test ===" -ForegroundColor Cyan
$r = (& curl.exe -s -o NUL -w "%{http_code}" https://google.com --max-time 5 2>&1)
Write-Host "Google HTTP status: $r"

Write-Host ""
Write-Host "=== Pinging common gateways ===" -ForegroundColor Cyan
ping -n 1 192.168.0.1   | findstr "Reply\|Request"
ping -n 1 192.168.0.254 | findstr "Reply\|Request"
ping -n 1 192.168.1.1   | findstr "Reply\|Request"

Write-Host ""
Write-Host "=== Route table (default routes) ===" -ForegroundColor Cyan
route print 0.0.0.0 | findstr "0.0.0.0"

Read-Host "Press Enter to exit"
