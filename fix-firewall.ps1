# Run as Administrator
Write-Host "=== All firewall rules mentioning 8443 or node ===" -ForegroundColor Cyan
Get-NetFirewallRule | Where-Object {
    $_.DisplayName -match "8443|node|rds" -or $_.Description -match "8443|node"
} | Format-Table DisplayName, Direction, Action, Enabled, Profile -AutoSize

Write-Host "`n=== Port filter for 8443 ===" -ForegroundColor Cyan
Get-NetFirewallPortFilter | Where-Object { $_.LocalPort -eq 8443 } | Format-Table -AutoSize

Write-Host "`n=== Adding program-based Allow rule for node.exe ===" -ForegroundColor Yellow
$nodePath = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $nodePath) { $nodePath = "C:\Program Files\nodejs\node.exe" }
Write-Host "node.exe path: $nodePath"

# Remove any existing BLOCK rules for node on 8443
Get-NetFirewallRule | Where-Object { $_.Action -eq "Block" -and $_.DisplayName -match "node" } | ForEach-Object {
    Write-Host "Removing BLOCK rule: $($_.DisplayName)" -ForegroundColor Red
    Remove-NetFirewallRule -Name $_.Name
}

# Add program-based allow rule
New-NetFirewallRule -DisplayName "RDS Node HTTPS Allow" `
    -Direction Inbound -Action Allow -Program $nodePath `
    -Protocol TCP -LocalPort 8443 -Profile Any -Enabled True `
    -ErrorAction SilentlyContinue | Out-Null
Write-Host "Program rule added for: $nodePath" -ForegroundColor Green

Write-Host "`n=== Testing curl to 127.0.0.1:8443 ===" -ForegroundColor Cyan
$result = & curl.exe -k -s -o nul -w "%{http_code}" https://127.0.0.1:8443 --max-time 8 2>&1
Write-Host "Result: $result"

Write-Host "`n=== Testing curl to 192.168.0.159:8443 ===" -ForegroundColor Cyan
$result2 = & curl.exe -k -s -o nul -w "%{http_code}" https://192.168.0.159:8443 --max-time 8 2>&1
Write-Host "Result: $result2"

Write-Host "`nDone. Press Enter to exit." -ForegroundColor Green
Read-Host
