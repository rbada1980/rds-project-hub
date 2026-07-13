// export_formcrete.cjs
// Exports current Formcrete data from local DB to Excel
// Run: node export_formcrete.cjs

const XLSX = require('xlsx');
const { Pool } = require('pg');

const pool = new Pool({
  host:'localhost', port:5432, database:'rds_local',
  user:'postgres', password:'rds2026',
  options:'-c timezone=UTC'
});

async function main() {
  const r = await pool.query(`
    SELECT title, status, client_sub_date, due_date, detailer, checker
    FROM tasks WHERE client = 'Formcrete'
    ORDER BY title ASC
  `);
  await pool.end();
  console.log('Total Formcrete tasks:', r.rows.length);

  const fmtD = v => { if (!v) return ''; return String(v).slice(0,10); };
  const rows = [['Title','Status','Client Sub Date','Due Date','Detailer','Checker']];
  for (const t of r.rows) {
    rows.push([
      t.title,
      t.status || '',
      fmtD(t.client_sub_date),
      fmtD(t.due_date),
      t.detailer || '',
      t.checker  || ''
    ]);
  }

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{wch:60},{wch:20},{wch:16},{wch:16},{wch:20},{wch:20}];
  XLSX.utils.book_append_sheet(wb, ws, 'Formcrete Tasks');

  const out = 'C:\\Users\\HP\\Documents\\Claude\\Projects\\RDS PROJECTS HUB\\Formcrete_Current_Data.xlsx';
  XLSX.writeFile(wb, out);
  console.log('Saved to:', out);
}
main().catch(e => { console.error(e.message); pool.end(); });
