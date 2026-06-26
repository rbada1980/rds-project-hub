// Run with: node push_fix.js
const fs = require('fs');
const { execSync } = require('child_process');

const file = 'src/App.jsx';
let content = fs.readFileSync(file, 'utf8');

// Normalize to LF
content = content.replace(/\r\n/g, '\n');

// Fix 1: JSX ternary brace error (Vercel build fix)
const broken = '          )}\n        )}';
const fixed  = '          )\n        )}';
if (content.includes(broken)) {
  content = content.replace(broken, fixed);
  console.log('✓ JSX brace fix applied');
} else if (content.includes(fixed)) {
  console.log('✓ JSX brace already correct');
} else {
  console.log('⚠ JSX fix pattern not found - check manually');
}

// Write back with CRLF (Windows standard, ensures git detects change)
fs.writeFileSync(file, content.replace(/\n/g, '\r\n'), 'utf8');
console.log('✓ File written with CRLF');

// Git add, commit, push
try {
  execSync('git add src/App.jsx', { stdio: 'inherit' });
  execSync('git commit -m "fix: mobile UI overhaul v2 - Analytics, Kanban, Submissions, Client Portfolio"', { stdio: 'inherit' });
  execSync('git push origin main', { stdio: 'inherit' });
  console.log('\n✅ Pushed to GitHub! Vercel will deploy in ~1 minute.');
} catch (e) {
  console.log('\n⚠ Git error:', e.message);
}
