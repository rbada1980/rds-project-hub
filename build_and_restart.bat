@echo off
cd /d C:\Users\HP\rds-project-hub

echo === Stripping null bytes from App.jsx ===
python -c "f=open('src/App.jsx','rb');d=f.read();f.close();d=d.replace(b'\x00',b'');f=open('src/App.jsx','wb');f.write(d);f.close();print('cleaned')" 2>nul
if errorlevel 1 (
  node -e "const fs=require('fs');let d=fs.readFileSync('src/App.jsx');d=Buffer.from(d.toString().replace(/\0/g,''));fs.writeFileSync('src/App.jsx',d);console.log('cleaned via node')"
)

echo.
echo === Building frontend ===
call npm run build
if errorlevel 1 (
  echo BUILD FAILED!
  pause
  exit /b 1
)

echo.
echo === Restarting PM2 server ===
pm2 restart rds-hub

echo.
echo === Done! Notifications fix deployed. ===
echo Tell employees: open https://192.168.0.159:8443 and press Ctrl+Shift+R
pause
