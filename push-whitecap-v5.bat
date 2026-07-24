@echo off
cd /d C:\Users\HP\rds-project-hub
echo === Git Push ===
git add import_whitecap_v5.cjs run-whitecap-import.bat
git commit -m "feat: whitecap import v5 — 62 projects, 313 tasks (Jul 24 2026)"
git push origin main
echo.
echo === Done! ===
pause
