@echo off
echo === Process owning port 8443 ===
netstat -anob | findstr /C:"8443" /C:"[node"
echo.
echo === curl test HTTPS localhost:8443 ===
curl.exe -k -s -o nul -w "HTTP Status: %%{http_code}\n" https://127.0.0.1:8443 --max-time 5
echo.
echo === curl test HTTPS 192.168.0.159:8443 ===
curl.exe -k -s -o nul -w "HTTP Status: %%{http_code}\n" https://192.168.0.159:8443 --max-time 5
echo.
echo === curl verbose (first 20 lines) ===
curl.exe -k -v https://127.0.0.1:8443 --max-time 5 2>&1 | more /E +0
echo.
pause
