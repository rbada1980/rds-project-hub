@echo off
cd /d C:\Users\HP\rds-project-hub
echo === Staging all changes ===
git add -A
echo.
echo === Committing ===
git commit -m "fix: remove type:module, rename ESM configs to .mjs, add Node.js cert generator"
echo.
echo === Pushing ===
git push origin main
echo.
echo === Done! ===
echo Now run on this machine:
echo   node generate-cert.cjs    (generates SSL cert)
echo   node server.js            (starts server with HTTPS)
pause
