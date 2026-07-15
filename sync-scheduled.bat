@echo off
:: Silent sync for Task Scheduler — no pause, logs to file
cd /d "C:\Users\HP\rds-project-hub"
node sync.cjs >> "C:\Users\HP\rds-project-hub\sync-auto.log" 2>&1
