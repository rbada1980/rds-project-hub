@echo off
cd /d C:\Users\HP\rds-project-hub
echo ========================================
echo   RDS Project Hub - Network Dev Server
echo ========================================
echo.
echo Your local IP addresses:
ipconfig | findstr /i "IPv4"
echo.
echo Starting server on all interfaces...
echo Open the URL shown above (192.168.x.x:5173) on your phone
echo.
npm run dev -- --host
pause
