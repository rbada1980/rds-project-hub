@echo off
cd /d C:\Users\HP\rds-project-hub
echo === Staging all changes ===
git add -A
echo.
echo === Committing ===
git commit -m "fix: Express 5 wildcard route + node-forge cert generator"
echo.
echo === Pushing ===
git push origin main
echo.
echo === Done! ===
echo Now run:
echo   node generate-cert.cjs    (generates SSL cert, uses node-forge)
echo   node server.js            (starts server - both errors now fixed)
pause
