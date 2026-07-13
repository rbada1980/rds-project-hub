// reimport_octavia.cjs
// Deletes ALL existing Octavia tasks and re-inserts fresh from Excel
// Does NOT touch any other Formcrete project or tasks
//
// Run: node reimport_octavia.cjs

const XLSX     = require('xlsx');
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

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
      'Content-Type': 'application/json', Prefer: 'return=representation'
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
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  }
  return null;
}

function fixStatus(s) {
  if (!s) return 'Not Yet Started';
  const u = s.toString().trim().toUpperCase();
  if (u === 'COMPLETED')       return 'Completed';
  if (u === 'IN PROGRESS' || u === 'INPROGRESS') return 'In Progress';
  if (u === 'NOT YET STARTED') return 'Not Yet Started';
  return s.trim();
}

async function main() {
  console.log('=== Octavia Re-Import (Formcrete) ===\n');

  // ── 1. Read Excel ──
  const wb = XLSX.readFile(EXCEL_FILE, { cellDates: true });
  const ws = wb.Sheets['PROJECTS'];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true });

  // Find header row
  let dataStart = -1;
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].some(v => v && String(v).toLowerCase().includes('tasks name'))) {
      dataStart = i + 1;
      break;
    }
  }
  if (dataStart === -1) throw new Error('Header row not found in Excel');

  const excelTasks = [];
  for (let i = dataStart; i < rows.length; i++) {
    const r = rows[i];
    const title = r[1] ? String(r[1]).trim() : null;
    if (!title) continue;
    excelTasks.push({
      title,
      status:          fixStatus(r[2]),
      due_date:        dateToISO(r[3]),   // "Sub date"
      client_sub_date: dateToISO(r[4]),   // "client sub date"
      detailer:        r[5] ? String(r[5]).trim() : null,
      checker:         r[6] ? String(r[6]).trim() : null,
    });
  }
  console.log(`Excel: ${excelTasks.length} Octavia tasks`);

  // ── 2. Find Octavia project in Supabase ──
  const projRes = await fetch(
    `${SUPA_URL}/rest/v1/projects?client=eq.Formcrete&name=ilike.*Octavia*&select=id,name`,
    { headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` } }
  );
  const projects = await projRes.json();
  if (projects.length === 0) throw new Error('Octavia project not found in Supabase. Create it in the app first.');
  const proj = projects[0];
  console.log(`Project: "${proj.name}" (id: ${proj.id})\n`);

  // ── 3. Delete existing Octavia tasks ──
  console.log('Deleting old Octavia tasks...');

  // Supabase: delete by project_id
  const delRes = await fetch(
    `${SUPA_URL}/rest/v1/tasks?project_id=eq.${proj.id}`,
    {
      method: 'DELETE',
      headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}`, Prefer: 'return=minimal' }
    }
  );
  if (!delRes.ok) throw new Error(`Supabase delete failed: ${delRes.status} ${await delRes.text()}`);
  console.log('  ✓ Supabase: old tasks deleted');

  // Local: get project_id from local DB, delete tasks
  const localProj = await pool.query(
    `SELECT id FROM projects WHERE client = 'Formcrete' AND LOWER(name) LIKE '%octavia%' LIMIT 1`
  );
  if (localProj.rows.length > 0) {
    const localProjId = localProj.rows[0].id;
    const d = await pool.query(`DELETE FROM tasks WHERE project_id = $1`, [localProjId]);
    console.log(`  ✓ Local: ${d.rowCount} old tasks deleted`);
  } else {
    console.log('  ℹ Local: no matching project found — will insert with Supabase project ID');
  }

  // ── 4. Insert fresh tasks ──
  console.log(`\nInserting ${excelTasks.length} fresh tasks...`);
  let ok = 0, err = 0;

  // Use local project ID if found, else Supabase project ID
  const insertProjId = localProj.rows.length > 0 ? localProj.rows[0].id : proj.id;

  for (const t of excelTasks) {
    const taskId = uuidv4();
    const payload = {
      id:              taskId,
      project_id:      proj.id,   // Supabase project ID
      title:           t.title,
      client:          'Formcrete',
      status:          t.status,
      priority:        'Medium',
      detailer:        t.detailer || null,
      checker:         t.checker  || null,
      assignee:        t.detailer || null,
      scope:           '',
      due_date:        t.due_date        || null,
      client_sub_date: t.client_sub_date || null,
      tags:            [],
      files:           [],
    };

    // Supabase insert
    try {
      await supaFetch('POST', 'tasks', payload);
    } catch(e) {
      console.warn(`  ⚠ Supabase "${t.title}": ${e.message}`);
      err++; continue;
    }

    // Local insert (same UUID, use local project ID)
    try {
      await pool.query(`
        INSERT INTO tasks
          (id, project_id, title, client, status, priority, detailer, checker, assignee,
           scope, due_date, client_sub_date, tags, files)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::date,$12::date,$13,$14)
        ON CONFLICT (id) DO UPDATE SET
          project_id=EXCLUDED.project_id, title=EXCLUDED.title, status=EXCLUDED.status,
          detailer=EXCLUDED.detailer, checker=EXCLUDED.checker, assignee=EXCLUDED.assignee,
          due_date=EXCLUDED.due_date, client_sub_date=EXCLUDED.client_sub_date
      `, [
        taskId, insertProjId, t.title, 'Formcrete', t.status, 'Medium',
        t.detailer||null, t.checker||null, t.detailer||null, '',
        t.due_date||null, t.client_sub_date||null, '[]', '[]'
      ]);
      console.log(`  ✓ "${t.title}" | ${t.status} | due:${t.due_date}`);
      ok++;
    } catch(e) {
      console.warn(`  ⚠ Local "${t.title}": ${e.message}`);
      err++;
    }
  }

  await pool.end();
  console.log(`\n=== Done: ${ok} inserted ✓ | ${err} errors ===`);
}

main().catch(e => { console.error('Fatal:', e.message); pool.end(); process.exit(1); });
