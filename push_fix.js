// Run with: node push_fix.js
const fs = require('fs');
const { execSync } = require('child_process');

const file = 'src/App.jsx';
let content = fs.readFileSync(file, 'utf8');

// Normalize to LF for consistent processing
content = content.replace(/\r\n/g, '\n');

// Fix: JSX ternary brace error (Vercel build fix)
const broken = '          )}\n        )}';
const fixed  = '          )\n        )}';
if (content.includes(broken)) {
  content = content.replace(broken, fixed);
  console.log('✓ JSX brace fix applied');
} else {
  console.log('✓ JSX brace already correct');
}

// Write back with CRLF (Windows) so git detects the change
fs.writeFileSync(file, content.replace(/\n/g, '\r\n'), 'utf8');
console.log('✓ File written');

try {
  execSync('git add src/App.jsx', { stdio: 'inherit' });
  execSync('git commit -m "fix: complete mobile UI overhaul v3 - ME tab, topbar, stat grid, kanban cards, task edit, client portfolio"', { stdio: 'inherit' });
  execSync('git push origin main', { stdio: 'inherit' });
  console.log('\n✅ Pushed! Vercel deploys in ~1 min — check hub-rdsprojects.com');
} catch (e) {
  console.log('\n⚠ Git error:', e.message);
}
