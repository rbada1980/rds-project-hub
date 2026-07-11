const { Pool } = require('pg');
const pool = new Pool({ host:'localhost', port:5432, database:'rds_local', user:'postgres', password:'rds2026' });

async function main() {
  const r = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM projects WHERE LOWER(COALESCE(client,'')) LIKE '%white cap%') as wc_projects,
      (SELECT COUNT(*) FROM tasks WHERE LOWER(COALESCE(client,'')) LIKE '%white cap%') as wc_tasks,
      (SELECT MAX(due_date) FROM tasks WHERE LOWER(COALESCE(client,'')) LIKE '%white cap%') as max_date,
      (SELECT COUNT(*) FROM tasks WHERE LOWER(COALESCE(client,'')) LIKE '%white cap%' AND EXTRACT(YEAR FROM due_date) < 2026) as pre_2026_count,
      (SELECT COUNT(*) FROM tasks WHERE LOWER(COALESCE(client,'')) LIKE '%white cap%' AND EXTRACT(YEAR FROM due_date) = 2026) as year_2026_count
  `);
  console.log('=== Local PostgreSQL White Cap Check ===');
  console.log(JSON.stringify(r.rows[0], null, 2));
  await pool.end();
}
main().catch(e => { console.error(e.message); pool.end(); });
