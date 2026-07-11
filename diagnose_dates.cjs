const XLSX = require('xlsx');
const path = require('path');

console.log('TZ offset (minutes):', new Date().getTimezoneOffset());
console.log('Local timezone:', Intl.DateTimeFormat().resolvedOptions().timeZone);
console.log('Test date getDate():', new Date('2026-01-05T18:29:50.000Z').getDate());
console.log('Test date getUTCDate():', new Date('2026-01-05T18:29:50.000Z').getUTCDate());
console.log('Test date toISOString():', new Date('2026-01-05T18:29:50.000Z').toISOString());
console.log('Test date toString():', new Date('2026-01-05T18:29:50.000Z').toString());

const EXCEL_FILE = path.join(__dirname, 'White Cap Projects Tracker2_2026.xlsx');
const wb = XLSX.readFile(EXCEL_FILE, { cellDates: true, dateNF: 'yyyy-mm-dd' });
const ws = wb.Sheets['White Cap Work Schedule'];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, dateNF: 'yyyy-mm-dd' });

function parseDate(val) {
  if (!val) return null;
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return null;
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const s = String(val).trim().replace(/(\d+)\.-/, '$1-');
  let m;
  m = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/); if (m) return `${m[3]}-${m[1].padStart(2,'0')}-${m[2].padStart(2,'0')}`;
  m = s.match(/^(\d{1,2})-(\d{1,2})-(\d{2})$/); if (m) return `20${m[3]}-${m[1].padStart(2,'0')}-${m[2].padStart(2,'0')}`;
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); if (m) return `${m[3]}-${m[1].padStart(2,'0')}-${m[2].padStart(2,'0')}`;
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/); if (m) return `20${m[3]}-${m[1].padStart(2,'0')}-${m[2].padStart(2,'0')}`;
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})/); if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  return null;
}

let proj = null;
const bad = [];
for (let i = 4; i < rows.length; i++) {
  const r = rows[i];
  const colA = r[0] ? String(r[0]).trim() : null;
  const colB = r[1] ? String(r[1]).trim() : null;
  if (colA) proj = colA;
  if (!colB || !proj) continue;
  const rawVal = r[3];
  const parsed = parseDate(rawVal);
  if (parsed && parsed < '2026-01-01') {
    bad.push({
      proj: proj.slice(0, 30),
      title: colB.slice(0, 40),
      parsed,
      rawType: typeof rawVal,
      rawVal: rawVal instanceof Date ? rawVal.toISOString() : rawVal,
      getDate: rawVal instanceof Date ? rawVal.getDate() : 'N/A',
      getUTCDate: rawVal instanceof Date ? rawVal.getUTCDate() : 'N/A',
    });
  }
}
console.log('\nBAD DATES COUNT:', bad.length);
bad.forEach(b => console.log(JSON.stringify(b)));
