/**
 * import_supabase_only.cjs
 * Reads White Cap Excel directly → wipes + inserts to Supabase only.
 * Run from bash: node import_supabase_only.cjs
 */
const XLSX = require('xlsx');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const EXCEL_FILE = path.join(__dirname, 'White Cap Projects Tracker2_2026.xlsx');
const SHEET_NAME = 'White Cap Work Schedule';
const CLIENT_NAME = 'White Cap';
const SUPABASE_URL = 'https://xypcbioltukahipkqqzc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGNiaW9sdHVrYWhpcGtxcXpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0MzEzNjUsImV4cCI6MjA5NTAwNzM2NX0.DG5sv2bpx8j3Mmz0mqIsoDVaCMP2TmWqh-OQUfSZFRw';
const H = {
  apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json', Prefer: 'return=representation'
};

async function supaFetch(method, path2, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path2}`, {
    method, headers: H, body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path2}: ${res.status} ${text.slice(0,200)}`);
  return text ? JSON.parse(text) : null;
}

function parseDate(val) {
  if (!val) return null;
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return null;
    const y = val.getFullYear(), m = String(val.getMonth()+1).padStart(2,'0'), d = String(val.getDate()).padStart(2,'0');
    return `${y}-${m}-${d}`;
  }
  const s = String(val).trim().replace(/(\d+)\.-/, '$1-');
  let m = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (m) return `${m[3]}-${m[1].padStart(2,'0')}-${m[2].padStart(2,'0')}`;
  m = s.match(/^(\d{1,2})-(\d{1,2})-(\d{2})$/);
  if (m) return `20${m[3]}-${m[1].padStart(2,'0')}-${m[2].padStart(2,'0')}`;
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[1].padStart(2,'0')}-${m[2].padStart(2,'0')}`;
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
  if (m) return `20${m[3]}-${m[1].padStart(2,'0')}-${m[2].padStart(2,'0')}`;
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  console.warn(`  ⚠ Unknown date: "${val}"`);
  return null;
}

function readExcel() {
  console.log(`Reading: ${EXCEL_FILE}`);
  const wb = XLSX.readFile(EXCEL_FILE, { cellDates: true, dateNF: 'yyyy-mm-dd' });
  const ws = wb.Sheets[SHEET_NAME];
  if (!ws) throw new Error(`Sheet "${SHEET_NAME}" not found`);
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, dateNF: 'yyyy-mm-dd' });
  const projects = {};
  let currentProject = null;
  for (let i = 4; i < rows.length; i++) {
    const row = rows[i];
    const colA = row[0] ? String(row[0]).trim() : null;
    const colB = row[1] ? String(row[1]).trim() : null;
    const colC = row[2] ? String(row[2]).trim() : null;
    const colD = row[3];
    const colE = row[4] ? String(row[4]).trim() : null;
    const colF = row[5] ? String(row[5]).trim() : null;
    if (colA) currentProject = colA;
    if (!colB || !currentProject) continue;
    const dueDate = parseDate(colD);
    if (!projects[currentProject]) projects[currentProject] = { tasks: [], maxDate: null };
    projects[currentProject].tasks.push({ title: colB, status: colC || 'Not Yet Started', due_date: dueDate, detailer: colE, checker: colF });
    if (dueDate && (!projects[currentProject].maxDate || dueDate > projects[currentProject].maxDate))
      projects[currentProject].maxDate = dueDate;
  }
  return projects;
}

async function main() {
  console.log('=== White Cap: Excel → Supabase ===');
  const projects = readExcel();
  const names = Object.keys(projects);
  const totalTasks = names.reduce((s, n) => s + projects[n].tasks.length, 0);
  console.log(`✓ Read ${names.length} projects, ${totalTasks} tasks`);

  const allDates = names.flatMap(n => projects[n].tasks.map(t => t.due_date).filter(Boolean));
  const years = {};
  allDates.forEach(d => { const y = d.slice(0,4); years[y]=(years[y]||0)+1; });
  console.log(`  Date distribution: ${JSON.stringify(years)}`);
  if (!allDates.length) { console.error('❌ No dates parsed. Abort.'); return; }

  // Wipe existing WC data
  console.log('\n--- Clearing Supabase WC data ---');
  await supaFetch('DELETE', `tasks?client=eq.White%20Cap`);
  console.log('  ✓ Tasks deleted');
  await supaFetch('DELETE', `projects?client=eq.White%20Cap`);
  console.log('  ✓ Projects deleted');

  // Insert in batches
  console.log('\n--- Inserting projects ---');
  const projPayloads = names.map(n => ({
    id: uuidv4(), name: n, client: CLIENT_NAME, color: '#6366f1',
    description: '', assigned_users: [], deadline: projects[n].maxDate || null
  }));
  // Store name→id map
  const projMap = {};
  projPayloads.forEach(p => { projMap[p.name] = p.id; });

  // Insert projects in one batch
  await supaFetch('POST', 'projects', projPayloads);
  console.log(`  ✓ ${projPayloads.length} projects inserted`);

  // Insert tasks in batches of 100
  console.log('\n--- Inserting tasks ---');
  const taskPayloads = names.flatMap(n => projects[n].tasks.map(t => ({
    id: uuidv4(), project_id: projMap[n], title: t.title, client: CLIENT_NAME,
    status: t.status, priority: 'Medium', assignee: t.detailer || null,
    detailer: t.detailer || null, checker: t.checker || null, scope: '',
    client_sub_date: t.due_date || null, due_date: t.due_date || null, tags: [], files: []
  })));

  const BATCH = 100;
  let inserted = 0;
  for (let i = 0; i < taskPayloads.length; i += BATCH) {
    const batch = taskPayloads.slice(i, i + BATCH);
    await supaFetch('POST', 'tasks', batch);
    inserted += batch.length;
    process.stdout.write(`\r  Inserted ${inserted}/${taskPayloads.length}...`);
  }
  console.log(`\n  ✓ ${inserted} tasks inserted`);

  // Verify
  console.log('\n--- Verify ---');
  const res = await fetch(`${SUPABASE_URL}/rest/v1/tasks?client=eq.White%20Cap&select=due_date&limit=500`, { headers: H });
  const tCheck = await res.json();
  const yr2 = {};
  tCheck.forEach(t => { const y = t.due_date ? t.due_date.slice(0,4) : 'null'; yr2[y]=(yr2[y]||0)+1; });
  const today = new Date('2026-07-11');
  const overdue = tCheck.filter(t => t.due_date && new Date(t.due_date) < today).length;
  console.log(`  ${tCheck.length} tasks | years: ${JSON.stringify(yr2)} | overdue: ${overdue}`);
  console.log('\n✅ Supabase updated! Now run replicate_wc_to_local.cjs on Windows.');
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
