@echo off
cd /d C:\Users\HP\rds-project-hub
echo === Running White Cap Import v3 === > import_output.txt
node import_whitecap_v3.cjs >> import_output.txt 2>&1
echo. >> import_output.txt
echo === Running Formcrete Date Update === >> import_output.txt
node update_formcrete_dates.cjs >> import_output.txt 2>&1
echo === DONE === >> import_output.txt
