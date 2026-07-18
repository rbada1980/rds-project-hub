const fs = require('fs');
const path = require('path');
const distIndex = path.join(__dirname, 'dist', 'index.html');
const content = fs.readFileSync(distIndex, 'utf8');
const match = content.match(/index-[A-Za-z0-9_]+\.js/);
fs.writeFileSync(path.join(__dirname, 'dist_check.txt'),
  'Bundle: ' + (match ? match[0] : 'NOT FOUND') + '\nPath: ' + distIndex + '\nContent: ' + content);
