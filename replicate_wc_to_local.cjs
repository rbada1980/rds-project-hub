/**
 * replicate_wc_to_local.cjs
 * Copies White Cap data from Supabase → local PostgreSQL.
 * Run AFTER import_client.cjs has populated Supabase with correct data.
 */
const { Pool } = require('pg');

const SUPABASE_URL = 'https://xypcbioltukahipkqqzc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGNiaW9sdHVrYWhpcGtxcXpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0MzEzNjUsImV4cCI6MjA5NTAwNzM2NX0.DG5sv2bpx8j3Mmz0mqIsoDVaCMP2TmWqh-OQUfSZFRw';

const pool = new Pool({ host: 'localhost', port: 5432, database: 'rds_local', user: 'postgres', password: 'rds2026' });

async function supaFetch(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
  });
  return res.json();
}

async function main() {
  console.log('=== White Cap: Replicate Supabase → Local PostgreSQL ===\n');

  // 1. Fetch all WC projects from Supabase
  const projects = await supaFetch('projects?client=eq.White Cap&select=*&limit=500');
  console.log(`✓ Fetched ${projects.length} WC projects from Supabase`);

  // 2. Fetch all WC tasks from Supabase
  const tasks = await supaFetch('tasks?client=eq.White Cap&select=*&limit=1000');
  console.log(`✓ Fetched ${tasks.length} WC tasks from Supabase`);

  // Verify dates
  const years = {};
  for (const t of tasks) {
    const yr = t.due_date ? String(t.due_date).substring(0,4) : 'null';
    years[yr] = (years[yr]||0)+1;
  }
  const maxDate = tasks.map(t=>t.due_date).filter(Boolean).sort().reverse()[0];
  console.log(`  Date distribution: ${JSON.stringify(years)}`);
  console.log(`  Max due_date: ${maxDate}`);

  if (!maxDate || maxDate < '2026-07') {
    console.error('\n❌ Supabase dates look wrong (max < 2026-07). Run import_client.cjs first!');
    await pool.end(); return;
  }

  // 3. Delete all WC data from local (tasks first for FK)
  console.log('\n--- Clearing local WC data ---');
  const tDel = await pool.query(`DELETE FROM tasks WHERE LOWER(COALESCE(client,'')) LIKE '%white cap%' OR LOWER(COALESCE(client,'')) LIKE '%whitecap%'`);
  const pDel = await pool.query(`DELETE FROM projects WHERE LOWER(COALESCE(client,'')) LIKE '%white cap%' OR LOWER(COALESCE(client,'')) LIKE '%whitecap%'`);
  console.log(`  🗑 Deleted ${tDel.rowCount} tasks + ${pDel.rowCount} projects from local`);

  // 4. Insert projects into local
  console.log('\n--- Inserting projects into local ---');
  let pOk = 0, pErr = 0;
  for (const p of projects) {
    try {
      await pool.query(
        `INSERT INTO projects (id,name,client,color,description,assigned_users,deadline)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (id) DO UPDATE SET
           name=EXCLUDED.name, client=EXCLUDED.client, color=EXCLUDED.color,
           description=EXCLUDED.description, assigned_users=EXCLUDED.assigned_users,
           deadline=EXCLUDED.deadline`,
        [p.id, p.name, p.client, p.color||'#6366f1', p.description||'',
         JSON.stringify(p.assigned_users||[]), p.deadline||null]
      );
      pOk++;
    } catch(e) { console.warn(`  ⚠ Project "${p.name}": ${e.message}`); pErr++; }
  }
  console.log(`  ✓ ${pOk} projects inserted, ${pErr} failed`);

  // 5. Insert tasks into local
  console.log('\n--- Inserting tasks into local ---');
  let tOk = 0, tFailed = 0;
  for (const t of tasks) {
    try {
      await pool.query(
        `INSERT INTO tasks (id,project_id,title,client,status,priority,assignee,detailer,checker,scope,client_sub_date,due_date,tags,files)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
         ON CONFLICT (id) DO UPDATE SET
           project_id=EXCLUDED.project_id, title=EXCLUDED.title, client=EXCLUDED.client,
           status=EXCLUDED.status, priority=EXCLUDED.priority, assignee=EXCLUDED.assignee,
           detailer=EXCLUDED.detailer, checker=EXCLUDED.checker, scope=EXCLUDED.scope,
           client_sub_date=EXCLUDED.client_sub_date, due_date=EXCLUDED.due_date,
           tags=EXCLUDED.tags, files=EXCLUDED.files`,
        [t.id, t.project_id, t.title, t.client||'White Cap',
         t.status||'Not Yet Started', t.priority||'Medium',
         t.assignee||null, t.detailer||null, t.checker||null, t.scope||'',
         t.client_sub_date||null, t.due_date||null,
         JSON.stringify(t.tags||[]), JSON.stringify(t.files||[])]
      );
      tOk++;
    } catch(e) { console.warn(`  ⚠ Task "${t.title}": ${e.message}`); tFailed++; }
  }
  console.log(`  ✓ ${tOk} tasks inserted, ${tFailed} failed`);

  // 6. Verify local
  console.log('\n--- Verifying local ---');
  const r = await pool.query(`
    SELECT
      COUNT(*) FILTER (WHERE due_date IS NOT NULL AND EXTRACT(YEAR FROM due_date) = 2026) as y2026,
      COUNT(*) FILTER (WHERE due_date IS NOT NULL AND EXTRACT(YEAR FROM due_date) < 2026) as old,
      COUNT(*) FILTER (WHERE due_date IS NULL) as no_date,
      MAX(due_date) as max_date
    FROM tasks WHERE LOWER(COALESCE(client,'')) LIKE '%white cap%'
  `);
  const v = r.rows[0];
  console.log(`  2026 dates: ${v.y2026} | old dates: ${v.old} | no date: ${v.no_date} | max: ${v.max_date}`);

  if (parseInt(v.old) > 10) {
    console.error('\n❌ Still too many old dates in local. Check for issues.');
  } else {
    console.log('\n✅ Local PostgreSQL now matches Supabase!');
  }

  await pool.end();
}

main().catch(e => { console.error('Fatal:', e.message); pool.end(); });
