@echo off
cd /d C:\Users\HP\rds-project-hub

echo Staging fix...
git add src/App.jsx

echo Committing...
git commit -m "fix: correct JSX ternary brace in SubmissionsPage (Vercel build error)"

echo Pushing...
git push origin main

pause
