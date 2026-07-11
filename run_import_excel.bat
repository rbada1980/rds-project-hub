@echo off
cd /d C:\Users\HP\rds-project-hub
echo === Importing White Cap from Excel (direct) ===
node import_from_excel.cjs > import_excel_output.txt 2>&1
echo Exit code: %ERRORLEVEL% >> import_excel_output.txt
type import_excel_output.txt
echo.
echo Done. Output saved to import_excel_output.txt
pause
