Write-Host "=== Current machine IPs ===" -ForegroundColor Cyan
ipconfig | Select-String "IPv4"

Write-Host "`n=== Testing HTTPS on each LAN IP ===" -ForegroundColor Yellow
$ips = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notmatch "^127\." -and $_.IPAddress -notmatch "^169\." }).IPAddress
foreach ($ip in $ips) {
    $r = & curl.exe -k -s -o nul -w "%{http_code}" "https://${ip}:8443" --max-time 5 2>&1
    Write-Host "  https://${ip}:8443  →  $r"
}
Read-Host "`nPress Enter to exit"
