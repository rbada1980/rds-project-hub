@echo off
cd /d C:\Users\HP\rds-project-hub
echo === Pushing email fix ===
git add src/App.jsx
git commit -m "fix: send email directly via Supabase (no server endpoint needed)"
git push origin main
echo.
echo === Done! Vercel will redeploy in ~1 min ===
pause
