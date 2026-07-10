@echo off
cd /d C:\Users\HP\rds-project-hub

echo === Stripping null bytes from source files ===
python -c "
for p in ['src/App.jsx','public/sw.js']:
    try:
        f=open(p,'rb'); d=f.read(); f.close()
        c=d.replace(b'\x00',b'')
        if c!=d:
            f=open(p,'wb'); f.write(c); f.close()
            print('  cleaned: '+p+' ('+str(len(d)-len(c))+' null bytes removed)')
        else:
            print('  clean:   '+p)
    except Exception as e:
        print('  skip: '+p+' ('+str(e)+')')
"

echo.
echo === Creating push_subscriptions table in local PostgreSQL ===
psql -U postgres -d rds_local -c "CREATE TABLE IF NOT EXISTS push_subscriptions (id SERIAL PRIMARY KEY, username TEXT NOT NULL, endpoint TEXT NOT NULL, p256dh TEXT NOT NULL, auth TEXT NOT NULL, origin TEXT NOT NULL DEFAULT 'offline', created_at TIMESTAMPTZ DEFAULT NOW(), UNIQUE(username, endpoint)); CREATE INDEX IF NOT EXISTS idx_push_subs_username ON push_subscriptions(username);" 2>nul
if %ERRORLEVEL% EQU 0 (echo   push_subscriptions table ready) else (echo   WARNING: psql not in PATH — run creat