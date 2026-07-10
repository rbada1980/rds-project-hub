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
echo === Creating push_subscriptions table in local PostgreSQL ===
psql -U postgres -d rds_local -c "CREATE TABLE IF NOT EXISTS push_subscriptions (id SERIAL PRIMARY KEY, username TEXT NOT NULL, endpoint TEXT NOT NULL, p256dh TEXT NOT NULL, auth TEXT NOT NULL, origin TEXT NOT NULL DEFAULT 'offline', created_at TIMESTAMPTZ DEFAULT NOW(), UNIQUE(username, endpoint)); CREATE INDEX IF NOT EXISTS idx_push_subs_username ON push_subscriptions(username);" 2>nul
if %ERRORLEVEL% EQU 0 (echo   push_subscriptions table ready) else (echo   WARNING: psql not in PATH — run create_push_table.sql manually in pgAdmin)

echo.
echo === Building frontend ===
call npm run build

echo.
echo === Staging all changes ===
git add src/App.jsx
git add server.js
git add public/sw.js
git add public/manifest.json
git add index.html
git add package.json
git add generate-cert.bat generate-cert.cjs
git add commit_fix.bat
git add create_push_table.sql
git add api/push-subscribe.js
git add api/push/vapid-public-key.js api/push/subscribe.js api/push/send.js

echo.
echo === Committing ===
git commit -m "fix: notifications requireInteraction=true, push_subscriptions local table"

echo.
echo === Pushing ===
git push origin main

echo.
echo === Restarting server ===
pm2 restart rds-hub

echo.
echo === Done! ===
echo.
echo Tell employees: Ctrl+Shift+R on https://192.168.0.159:8443, then click Allow
pause
