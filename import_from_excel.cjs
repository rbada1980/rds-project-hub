/**
 * import_from_excel.cjs
 * Reads White Cap Projects Tracker2_2026.xlsx DIRECTLY.
 * Wipes old WC data from BOTH Supabase and local PostgreSQL,
 * then inserts fresh data simultaneously (same UUIDs).
 *
 * Run: node import_from_excel.cjs
 */

const XLSX = require('xlsx');
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const EXCEL_FILE = path.join(__dirname, 'White Cap Projects Tracker2_2026.xlsx');
const SHEET_NAME = 'White Cap Work Schedule';
const CLIENT_NAME = 'White Cap';

const SUPABASE_URL = 'https://xypcbioltukahipkqqzc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGNiaW9sdHVrYWhpcGtxcXpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0MzEzNjUsImV4cCI6MjA5NTAwNzM2NX0.DG5sv2bpx8j3Mmz0mqIsoDVaCMP2TmWqh-OQUfSZFRw';

const pool = new Pool({
  host: 'localhost', port: 5432, database: 'rds_local',
  user: 'postgres', password: 'rds2026',
  options: '-c timezone=UTC'  // Store dates as UTC midnight, no IST shift
});

// ── Supabase helpers ──────────────────────────────────────────────────────────
async function supaFetch(method, path, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Supabase ${method} ${path}: ${res.status} ${text}`);
  return text ? JSON.parse(text) : null;
}

// ── Status fixer ─────────────────────────────────────────────────────────────
function fixStatus(s) {
  if (!s) return 'Not Yet Started';
  if (s === 'Inprogress') return 'In Progress';
  return s;
}

// ── Date parser (handles all Excel formats) ───────────────────────────────────
function parseDate(val) {
  if (!val) return null;
  // Already a JS Date (from xlsx cellDates:true)
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return null;
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const s = String(val).trim().replace(/(\d+)\.-/, '$1-'); // fix '03-11.-2026'
  // MM-DD-YYYY
  let m = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (m) return `${m[3]}-${m[1].padStart(2,'0')}-${m[2].padStart(2,'0')}`;
  // MM-DD-YY → assume 2026
  m = s.match(/^(\d{1,2})-(\d{1,2})-(\d{2})$/);
  if (m) return `20${m[3]}-${m[1].padStart(2,'0')}-${m[2].padStart(2,'0')}`;
  // MM/DD/YYYY
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[1].padStart(2,'0')}-${m[2].padStart(2,'0')}`;
  // MM/DD/YY → assume 2026
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
  if (m) return `20${m[3]}-${m[1].padStart(2,'0')}-${m[2].padStart(2,'0')}`;
  // YYYY-MM-DD (already correct)
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  console.warn(`  ⚠ Unknown date format: "${val}"`);
  return null;
}

// ── Read Excel ────────────────────────────────────────────────────────────────
function readExcel() {
  console.log(`\nReading: ${EXCEL_FILE}`);
  const wb = XLSX.readFile(EXCEL_FILE, { cellDates: true, dateNF: 'yyyy-mm-dd' });
  const ws = wb.Sheets[SHEET_NAME];
  if (!ws) throw new Error(`Sheet "${SHEET_NAME}" not found`);

  // Raw rows as arrays (row 1 = index 0)
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, dateNF: 'yyyy-mm-dd' });

  const projects = {};  // name → { tasks: [] }
  let currentProject = null;

  for (let i = 4; i < rows.length; i++) {  // data starts at row 5 (index 4)
    const row = rows[i];
    const colA = row[0] ? String(row[0]).trim() : null;
    const colB = row[1] ? String(row[1]).trim() : null;
    const colC = row[2] ? String(row[2]).trim() : null;
    const colD = row[3];  // date (may be Date object or string)
    const colE = row[4] ? String(row[4]).trim() : null;
    const colF = row[5] ? String(row[5]).trim() : null;

    if (colA) currentProject = colA;
    if (!colB || !currentProject) continue;

    const dueDate = parseDate(colD);

    if (!projects[currentProject]) {
      projects[currentProject] = { tasks: [], maxDate: null };
    }
    projects[currentProject].tasks.push({
      title: colB,
      status: fixStatus(colC),
      due_date: dueDate,
      client_sub_date: dueDate,  // same field in Excel
      detailer: colE,
      checker: colF,
      assignee: colE,  // detailer = assignee
    });
    if (dueDate && (!projects[currentProject].maxDate || dueDate > projects[currentProject].maxDate)) {
      projects[currentProject].maxDate = dueDate;
    }
  }

  return projects;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('=== White Cap Import: Excel → Supabase + Local ===');
  console.log(`Date: ${new Date().toISOString()}`);

  // 1. Read Excel
  const projects = readExcel();
  const projectNames = Object.keys(projects);
  const totalTasks = projectNames.reduce((s, n) => s + projects[n].tasks.length, 0);
  console.log(`\n✓ Read ${projectNames.length} projects, ${totalTasks} tasks from Excel`);

  // Verify dates
  const allDates = projectNames.flatMap(n => projects[n].tasks.map(t => t.due_date).filter(Boolean));
  const years = {};
  allDates.forEach(d => { const y = d.slice(0,4); years[y] = (years[y]||0)+1; });
  console.log(`  Date distribution: ${JSON.stringify(years)}`);
  console.log(`  Max due_date: ${allDates.sort().reverse()[0]}`);
  console.log(`  No date: ${totalTasks - allDates.length}`);

  const y2026count = allDates.filter(d => d.startsWith('2026')).length;
  if (!allDates.length || y2026count < allDates.length * 0.9) {
    console.error(`\n❌ Dates look wrong (only ${y2026count}/${allDates.length} are 2026). Aborting.`);
    await pool.end(); return;
  }

  // 2. Delete old WC data from Supabase
  console.log('\n--- Clearing Supabase WC data ---');
  try {
    await supaFetch('DELETE', `tasks?client=eq.${encodeURIComponent(CLIENT_NAME)}`);
    console.log('  ✓ Supabase tasks deleted');
    await supaFetch('DELETE', `projects?client=eq.${encodeURIComponent(CLIENT_NAME)}`);
    console.log('  ✓ Supabase projects deleted');
  } catch(e) {
    console.error('  ❌ Supabase delete failed:', e.message);
    await pool.end(); return;
  }

  // 3. Delete old WC data from local
  console.log('\n--- Clearing local WC data ---');
  const tDel = await pool.query(`DELETE FROM tasks WHERE LOWER(COALESCE(client,'')) LIKE '%white cap%'`);
  const pDel = await pool.query(`DELETE FROM projects WHERE LOWER(COALESCE(client,'')) LIKE '%white cap%'`);
  console.log(`  ✓ Local: ${tDel.rowCount} tasks + ${pDel.rowCount} projects deleted`);

  // 4. Insert projects + tasks
  console.log('\n--- Inserting projects and tasks ---');
  let projOk = 0, projErr = 0, taskOk = 0, taskErr = 0;

  for (const projName of projectNames) {
    const { tasks, maxDate } = projects[projName];
    const projId = uuidv4();
    const projPayload = {
      id: projId,
      name: projName,
      client: CLIENT_NAME,
      color: '#6366f1',
      description: '',
      assigned_users: [],
      deadline: maxDate || null,
    };

    // Insert project to Supabase
    try {
      await supaFetch('POST', 'projects', projPayload);
    } catch(e) {
      console.warn(`  ⚠ Supabase project "${projName}": ${e.message}`);
      projErr++;
      continue;
    }

    // Insert project to local
    try {
      await pool.query(
        `INSERT INTO projects (id,name,client,color,description,assigned_users,deadline)
         VALUES ($1,$2,$3,$4,$5,$6,$7::date)
         ON CONFLICT (id) DO UPDATE SET
           name=EXCLUDED.name, client=EXCLUDED.client, color=EXCLUDED.color,
           description=EXCLUDED.description, assigned_users=EXCLUDED.assigned_users,
           deadline=EXCLUDED.deadline`,
        [projId, projName, CLIENT_NAME, '#6366f1', '',
         JSON.stringify([]), maxDate || null]
      );
    } catch(e) {
      console.warn(`  ⚠ Local project "${projName}": ${e.message}`);
      // Continue — tasks will fail FK but at least Supabase has it
    }
    projOk++;

    // Insert tasks for this project
    for (const t of tasks) {
      const taskId = uuidv4();
      const taskPayload = {
        id: taskId,
        project_id: projId,
        title: t.title,
        client: CLIENT_NAME,
        status: t.status,
        priority: 'Medium',
        assignee: t.assignee || null,
        detailer: t.detailer || null,
        checker: t.checker || null,
        scope: '',
        client_sub_date: t.client_sub_date || null,
        due_date: t.due_date || null,
        tags: [],
        files: [],
      };

      // Insert task to Supabase
      let supaOk = false;
      try {
        await supaFetch('POST', 'tasks', taskPayload);
        supaOk = true;
      } catch(e) {
        console.warn(`  ⚠ Supabase task "${t.title}": ${e.message}`);
        taskErr++;
        continue;
      }

      // Insert task to local (same ID)
      try {
        await pool.query(
          `INSERT INTO tasks (id,project_id,title,client,status,priority,assignee,detailer,checker,scope,client_sub_date,due_date,tags,files)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::date,$12::date,$13,$14)
           ON CONFLICT (id) DO UPDATE SET
             project_id=EXCLUDED.project_id, title=EXCLUDED.title, client=EXCLUDED.client,
             status=EXCLUDED.status, priority=EXCLUDED.priority, assignee=EXCLUDED.assignee,
             detailer=EXCLUDED.detailer, checker=EXCLUDED.checker, scope=EXCLUDED.scope,
             client_sub_date=EXCLUDED.client_sub_date, due_date=EXCLUDED.due_date,
             tags=EXCLUDED.tags, files=EXCLUDED.files`,
          [taskId, projId, t.title, CLIENT_NAME, t.status, 'Medium',
           t.assignee||null, t.detailer||null, t.checker||null, '',
           t.client_sub_date||null, t.due_date||null, '[]', '[]']
        );
        taskOk++;
      } catch(e) {
        console.warn(`  ⚠ Local task "${t.title}": ${e.message}`);
        taskErr++;
      }
    }

    console.log(`  ✓ ${projName} — ${tasks.length} task(s)`);
  }

  console.log(`\n=== DONE: ${projOk} projects ✓, ${projErr} failed | ${taskOk} tasks ✓, ${taskErr} failed ===`);

  // 5. Verify both
  console.log('\n--- Verification ---');

  // Supabase
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/tasks?client=eq.${encodeURIComponent(CLIENT_NAME)}&select=due_date&limit=1000`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
    );
    const sTasks = await res.json();
    const today = new Date('2026-07-11');
    let sOverdue=0, sFuture=0;
    const sYears = {};
    for (const t of sTasks) {
      const yr = t.due_date ? t.due_date.slice(0,4) : 'null';
      sYears[yr] = (sYears[yr]||0)+1;
      if (t.due_date && new Date(t.due_date) < today) sOverdue++;
      else if (t.due_date) sFuture++;
    }
    console.log(`  Supabase: ${sTasks.length} tasks | years: ${JSON.stringify(sYears)}`);
    console.log(`  Supabase: ${sOverdue} overdue, ${sFuture} future`);
  } catch(e) {
    console.warn('  ⚠ Supabase verify failed:', e.message);
  }

  // Local
  try {
    const r = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE due_date IS NOT NULL AND EXTRACT(YEAR FROM due_date) = 2026) as y2026,
        COUNT(*) FILTER (WHERE due_date IS NOT NULL AND EXTRACT(YEAR FROM due_date) < 2026) as old,
        COUNT(*) FILTER (WHERE due_date IS NULL) as no_date,
        COUNT(*) FILTER (WHERE due_date IS NOT NULL AND due_date < CURRENT_DATE) as overdue,
        MAX(due_date) as max_date
      FROM tasks WHERE LOWER(COALESCE(client,'')) LIKE '%white cap%'
    `);
    const v = r.rows[0];
    console.log(`  Local: y2026=${v.y2026} | old=${v.old} | noDate=${v.no_date} | overdue=${v.overdue} | max=${v.max_date}`);
    if (parseInt(v.old) > 5) {
      console.warn('\n⚠ Warning: local still has some pre-2026 dates. Check date parsing.');
    } else {
      console.log('\n✅ Both Supabase and local updated successfully!');
    }
  } catch(e) {
    console.warn('  ⚠ Local verify failed:', e.message);
  }

  await pool.end();
}

main().catch(e => { console.error('Fatal:', e.message); pool.end(); });
