@echo off
cd /d C:\Users\HP\rds-project-hub
echo === Replicating White Cap from Supabase to Local ===
node replicate_wc_to_local.cjs > replicate_wc_output.txt 2>&1
echo Exit code: %ERRORLEVEL% >> replicate_wc_output.txt
echo Done. Check replicate_wc_output.txt
pause
