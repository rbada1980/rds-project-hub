// Run with: node push_fix.js
const fs = require('fs');
const { execSync } = require('child_process');

const file = 'src/App.jsx';
let content = fs.readFileSync(file, 'utf8');

// Normalize to LF for consistent processing
content = content.replace(/\r\n/g, '\n');

// Write back with CRLF (Windows) so git detects the change
fs.writeFileSync(file, content.replace(/\n/g, '\r\n'), 'utf8');
console.log('✓ File written');

try {
  execSync('git add src/App.jsx', { stdio: 'inherit' });
  execSync('git commit -m "fix: mobile v4 - hide sidebar, add logo to topbar, compact project cards, fix ME modal stacking, kanban column tabs"', { stdio: 'inherit' });
  execSync('git push origin main', { stdio: 'inherit' });
  console.log('\n✅ Pushed! Vercel deploys in ~1 min — check hub-rdsprojects.com');
} catch (e) {
  console.log('\n⚠ Git error:', e.message);
}
