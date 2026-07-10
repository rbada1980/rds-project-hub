@echo off
cd /d C:\Users\HP\rds-project-hub
echo === Clearing overdue tasks in Supabase === > clear_output.txt
node clear_overdue.cjs >> clear_output.txt 2>&1
echo. >> clear_output.txt
echo === Git commit and push === >> clear_output.txt
git add src/App.jsx >> clear_output.txt 2>&1
git commit -m "fix: restore submission page default to this_week (dates now correct)" >> clear_output.txt 2>&1
git push origin main >> clear_output.txt 2>&1
echo === DONE === >> clear_output.txt
