# Run as Administrator — permanently sets static IP 192.168.0.159

$ip      = "192.168.0.159"
$mask    = "255.255.255.0"
$gateway = "192.168.0.1"
$dns1    = "8.8.8.8"
$dns2    = "8.8.4.4"

# Find the active LAN adapter name
$adapter = Get-NetAdapter | Where-Object { $_.Status -eq "Up" -and $_.HardwareInterface -eq $true } | Select-Object -First 1
$name = $adapter.Name
Write-Host "Adapter: $name" -ForegroundColor Cyan

# Use netsh — most reliable method for permanent static IP
netsh interface ipv4 set address name="$name" static $ip $mask $gateway
netsh interface ipv4 set dns    name="$name" static $dns1
netsh interface ipv4 add dns    name="$name" $dns2 index=2

# Verify
Start-Sleep -Seconds 2
$current = (Get-NetIPAddress -InterfaceAlias $name -AddressFamily IPv4).IPAddress
Write-Host "`nCurrent IP: $current" -ForegroundColor $(if ($current -eq $ip) { "Green" } else { "Red" })

if ($current -eq $ip) {
    Write-Host "SUCCESS — Static IP $ip set permanently. DHCP will never override this." -ForegroundColor Green
} else {
    Write-Host "WARNING — IP is $current, not $ip. Check adapter settings manually." -ForegroundColor Red
}

# Final curl test
Write-Host "`nTesting https://${ip}:8443..." -ForegroundColor Cyan
$r = & curl.exe -k -s -o nul -w "%{http_code}" "https://${ip}:8443" --max-time 5
Write-Host "Result: $r" -ForegroundColor $(if ($r -eq "200") { "Green" } else { "Red" })

Read-Host "`nPress Enter to exit"
