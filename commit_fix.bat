@echo off
cd /d C:\Users\HP\rds-project-hub

echo === Stripping null bytes from App.jsx ===
python -c "
f=open('src/App.jsx','rb'); d=f.read(); f.close()
d=d.replace(b'\x00',b'')
f=open('src/App.jsx','wb'); f.write(d); f.close()
print('  App.jsx cleaned')
"

echo.
echo === Staging all changes ===
git add src/App.jsx
git add server.js
git add public/sw.js
git add package.json
git add generate-cert.bat generate-cert.cjs
git add commit_fix.bat
git add create_push_table.sql
git add api/push-subscribe.js
git add api/push/vapid-public-key.js api/push/subscribe.js api/push/send.js
echo.
echo === Committing ===
git commit -m "feat: Web Push notifications — offline + online (VAPID, service worker, Vercel API routes)"
echo.
echo === Pushing ===
git push origin main
echo.
echo === Done! Vercel will auto-deploy. ===
echo.
echo NEXT STEPS:
echo   1. Run in Supabase SQL Editor: create_push_table.sql
echo   2. Run locally: npm install web-push
echo   3. Restart local server: node server.js
echo   4. Open https://192.168.0.159:8443 — Chrome will ask for notification permission
pause
