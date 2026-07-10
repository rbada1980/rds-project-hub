@echo off
cd /d C:\Users\HP\rds-project-hub
echo === Fixing dates in both Supabase + Local PostgreSQL === > fix_both_output.txt
node fix_dates_both.cjs >> fix_both_output.txt 2>&1
echo === DONE === >> fix_both_output.txt
