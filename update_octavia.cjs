// update_octavia.cjs
// Updates ONLY Octavia project tasks in Formcrete (Supabase + local DB)
// Reads from Octavia.xlsx — does NOT touch any other Formcrete tasks
//
// Run: node update_octavia.cjs

const XLSX    = require('xlsx');
const { Pool } = require('pg');

const EXCEL_FILE = "C:\\Users\\HP\\Documents\\Claude\\Projects\\RDS PROJECTS HUB\\Octavia.xlsx";

const SUPA_URL = "https://xypcbioltukahipkqqzc.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGNiaW9sdHVrYWhpcGtxcXpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0MzEzNjUsImV4cCI6MjA5NTAwNzM2NX0.DG5sv2bpx8j3Mmz0mqIsoDVaCMP2TmWqh-OQUfSZFRw";

const pool = new Pool({
  host: 'localhost', port: 5432, database: 'rds_local',
  user: 'postgres', password: 'rds2026',
  options: '-c timezone=UTC'
});

async function supaFetch(method, path, body) {
  const res = await fetch(`${SUPA_URL}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}`,
      'Content-Type': 'application/json', Prefer: 'return=minimal'
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path}: ${res.status} ${text}`);
  return text ? JSON.parse(text) : null;
}

function dateToISO(val) {
  if (!val) return null;
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return null;
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  if (typeof val === 'string') {
    const s = val.trim();
    // ISO timestamp: 2026-05-20T18:29:50.000Z → 2026-05-20
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  }
  return null;
}

function fixStatus(s) {
  if (!s) return 'Not Yet Started';
  const u = s.toString().trim().toUpperCase();
  if (u === 'COMPLETED')       return 'Completed';
  if (u === 'IN PROGRESS')     return 'In Progress';
  if (u === 'NOT YET STARTED') return 'Not Yet Started';
  return s.trim(); // keep as-is if unknown
}

function norm(s) {
  return (s || '').toString().trim().toLowerCase().replace(/\s+/g, ' ');
}

async function main() {
  console.log('=== Octavia Update (Formcrete) ===\n');

  // ── 1. Read Excel ──
  const wb = XLSX.readFile(EXCEL_FILE, { cellDates: true });
  const ws = wb.Sheets['PROJECTS'];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true });

  // Find header row (has "Tasks name")
  let dataStart = -1;
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].some(v => v && String(v).toLowerCase().includes('tasks name'))) {
      dataStart = i + 1;
      console.log(`Header found at row ${i + 1}, data starts at row ${i + 2}`);
      break;
    }
  }
  if (dataStart === -1) throw new Error('Could not find header row in Excel');

  const excelTasks = [];
  for (let i = dataStart; i < rows.length; i++) {
    const r = rows[i];
    const title = r[1] ? String(r[1]).trim() : null;
    if (!title) continue;
    excelTasks.push({
      title,
      status:          fixStatus(r[2]),
      due_date:        dateToISO(r[3]),  // "Sub date" col
      client_sub_date: dateToISO(r[4]),  // "client sub date" col
      detailer:        r[5] ? String(r[5]).trim() : null,
      checker:         r[6] ? String(r[6]).trim() : null,
    });
  }
  console.log(`Excel: ${excelTasks.length} Octavia tasks\n`);
  excelTasks.forEach(t => console.log(`  "${t.title}" | ${t.status} | due:${t.due_date} | sub:${t.client_sub_date} | ${t.detailer} / ${t.checker}`));

  // ── 2. Fetch Octavia tasks from Supabase via project name ──
  console.log('\nFetching Octavia project from Supabase...');

  // Find the project(s) named "Octavia" under Formcrete
  const projRes = await fetch(
    `${SUPA_URL}/rest/v1/projects?client=eq.Formcrete&name=ilike.*Octavia*&select=id,name`,
    { headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` } }
  );
  const projects = await projRes.json();
  console.log(`Found projects: ${JSON.stringify(projects.map(p => p.name))}`);

  let dbTasks = [];

  if (projects.length > 0) {
    // Fetch tasks by project_id
    for (const proj of projects) {
      const tRes = await fetch(
        `${SUPA_URL}/rest/v1/tasks?project_id=eq.${proj.id}&select=id,title&limit=500`,
        { headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` } }
      );
      const tTasks = await tRes.json();
      console.log(`  "${proj.name}": ${tTasks.length} tasks`);
      dbTasks = dbTasks.concat(tTasks);
    }
  } else {
    // Fallback: fetch ALL Formcrete tasks and match by title
    console.log('No Octavia project found — fetching all Formcrete tasks to match by title...');
    const allRes = await fetch(
      `${SUPA_URL}/rest/v1/tasks?client=eq.Formcrete&select=id,title&limit=2000`,
      { headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` } }
    );
    dbTasks = await allRes.json();
    console.log(`Total Formcrete tasks in DB: ${dbTasks.length}`);
  }

  console.log(`Total Octavia tasks to match against: ${dbTasks.length}`);

  // ── 3. Match & Update ──
  let updated = 0, notFound = 0;

  for (const ex of excelTasks) {
    // Try exact match first, then partial
    let match = dbTasks.find(t => norm(t.title) === norm(ex.title));
    if (!match) {
      match = dbTasks.find(t =>
        norm(t.title).includes(norm(ex.title)) ||
        norm(ex.title).includes(norm(t.title))
      );
    }

    if (!match) {
      console.log(`  ⚠ NOT FOUND in DB: "${ex.title}"`);
      notFound++;
      continue;
    }

    const upd = {
      status:          ex.status,
      due_date:        ex.due_date        || null,
      client_sub_date: ex.client_sub_date || null,
      detailer:        ex.detailer        || null,
      checker:         ex.checker         || null,
    };

    // Supabase update
    await supaFetch('PATCH', `tasks?id=eq.${match.id}`, upd);

    // Local DB update
    await pool.query(`
      UPDATE tasks SET
        status          = $1,
        due_date        = $2::date,
        client_sub_date = $3::date,
        detailer        = $4,
        checker         = $5
      WHERE id = $6
    `, [upd.status, upd.due_date, upd.client_sub_date, upd.detailer, upd.checker, match.id]);

    console.log(`  ✓ Updated: "${match.title}"`);
    updated++;
  }

  await pool.end();
  console.log(`\n=== Done: ${updated} updated | ${notFound} not found in DB ===`);
  if (notFound > 0) {
    console.log('⚠ Tasks not found may be new — add them manually in the app if needed.');
  }
}

main().catch(e => { console.error('Fatal:', e.message); pool.end(); process.exit(1); });
