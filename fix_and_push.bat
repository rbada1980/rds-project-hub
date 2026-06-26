@echo off
cd /d C:\Users\HP\rds-project-hub

python -c "
import re
with open('src/App.jsx', 'r', encoding='utf-8') as f:
    content = f.read()
old = '          )}\n        )}'
new = '          )\n        )}'
if old in content:
    content = content.replace(old, new, 1)
    with open('src/App.jsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print('Fix applied')
else:
    print('Already fixed or pattern not found')
"

git add src/App.jsx
git commit -m "fix: correct JSX ternary brace in SubmissionsPage (Vercel build error)"
git push origin main
pause
