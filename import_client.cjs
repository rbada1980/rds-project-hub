// import_client.cjs — White Cap importer
// Run: node import_client.cjs
const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

const SUPA_URL = "https://xypcbioltukahipkqqzc.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGNiaW9sdHVrYWhpcGtxcXpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0MzEzNjUsImV4cCI6MjA5NTAwNzM2NX0.DG5sv2bpx8j3Mmz0mqIsoDVaCMP2TmWqh-OQUfSZFRw";
const EXCEL_FILE = 'WhiteCap_Import.xlsx';
const CLIENT_NAME = 'White Cap';
const PROJECT_COLORS = ['#14b8a6','#3b82f6','#a855f7','#f97316','#22c55e','#ec4899','#f59e0b','#ef4444','#8b5cf6','#06b6d4'];

const supabase = createClient(SUPA_URL, SUPA_KEY);

function clean(v) {
  if (v == null) return '';
  return String(v).replace(/ /g, ' ').trim();
}

function parseDate(v) {
  if (!v) return null;
  if (typeof v === 'number') {
    const d = XLSX.SSF.parse_date_code(v);
    if (d) return `${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`;
  }
  const s = clean(v);
  if (!s) return null;
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{2})-(\d{2})-(\d{4})/);
  if (m) return `${m[3]}-${m[1]}-${m[2]}`;
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return `${m[3]}-${String(m[1]).padStart(2,'0')}-${String(m[2]).padStart(2,'0')}`;
  return null;
}

function mapStatus(v) {
  const s = clean(v).toLowerCase();
  if (s === 'completed') return 'Completed';
  if (s === 'inprogress' || s === 'in progress' || s === 'in-progress') return 'In Progress';
  return 'Not Yet Started';
}

function toUsername(name) {
  return clean(name).toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
}

function parseExcel() {
  const wb = XLSX.readFile(EXCEL_FILE);
  const ws = wb.Sheets['White Cap Work Schedule'];
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
  const headers = raw[4].map(h => clean(h));
  const colIdx = {};
  headers.forEach((h, i) => { colIdx[h] = i; });

  const C = {
    project:   colIdx['PROJECT NAME'],
    scope:     colIdx['SCOPE'],
    task:      colIdx['Tasks'],
    status:    colIdx['STATUS'],
    clientSub: colIdx['CLIENT SUB. DATE'],
    custReq:   colIdx['CUST. REQ. DATE'],
    detailer:  colIdx['DETAILER'],
    checker:   colIdx['CHECKER'],
  };

  const projects = new Map();
  let curProject = null, curScope = null;

  for (let i = 5; i < raw.length; i++) {
    const row = raw[i];
    const projCell = clean(row[C.project]);
    const scopeCell = clean(row[C.scope]);
    const taskCell = clean(row[C.task]);
    if (projCell) curProject = projCell;
    if (scopeCell) curScope = scopeCell;
    if (!taskCell || !curProject) continue;
    if (!projects.has(curProject)) projects.set(curProject, []);
    projects.get(curProject).push({
      title:           taskCell,
      status:          mapStatus(row[C.status]),
      priority:        null,
      assignee:        null,
      detailer:        clean(row[C.detailer]) || null,
      checker:         clean(row[C.checker])  || null,
      scope:           curScope || null,
      due_date:        parseDate(row[C.custReq]),
      client_sub_date: parseDate(row[C.clientSub]),
      client:          CLIENT_NAME,
    });
  }
  return projects;
}

async function insertRow(table, data, label) {
  let payload = { ...data };
  for (let attempt = 0; attempt < 3; attempt++) {
    const { error } = await supabase.from(table).insert(payload);
    if (!error) { process.stdout.write(`    ✓ ${label}\n`); return { ok: true }; }
    const colMatch = error.message.match(/column "([^"]+)" of relation/);
    if (colMatch) {
      const badCol = colMatch[1];
      process.stdout.write(`    ⚠ removing unknown column '${badCol}', retrying…\n`);
      delete payload[badCol];
      continue;
    }
    process.stdout.write(`    ❌ ${label}: ${error.message}\n`);
    return { ok: false, error: error.message };
  }
  return { ok: false };
}

async function main() {
  console.log('\n═══════════════════════════════════════════');
  console.log('  WHITE CAP IMPORTER');
  console.log('═══════════════════════════════════════════\n');

  // 1. Parse
  console.log('📄 Parsing Excel…');
  const projectMap = parseExcel();
  let totalTasks = 0;
  projectMap.forEach(tasks => totalTasks += tasks.length);
  console.log(`   ✓ ${projectMap.size} projects, ${totalTasks} tasks found\n`);

  // 2. Fetch existing users
  console.log('👥 Fetching existing users…');
  const { data: existingUsers, error: ueErr } = await supabase.from('users').select('id,name,username');
  if (ueErr) { console.error('❌ Cannot fetch users:', ueErr.message); process.exit(1); }
  const userByName = new Map();
  const userByUsername = new Map();
  for (const u of existingUsers) {
    userByName.set(clean(u.name).toLowerCase(), u);
    userByUsername.set(clean(u.username).toLowerCase(), u);
  }
  console.log(`   ✓ ${existingUsers.length} existing users loaded\n`);

  // 3. Create missing users
  const namesNeeded = new Set();
  projectMap.forEach(tasks => tasks.forEach(t => {
    if (t.detailer) namesNeeded.add(t.detailer);
    if (t.checker)  namesNeeded.add(t.checker);
  }));
  console.log(`👤 Checking ${namesNeeded.size} unique names…`);
  let usersCreated = 0;
  for (const name of namesNeeded) {
    if (!name) continue;
    const lname = name.toLowerCase();
    if (userByName.has(lname)) { console.log(`   ↷ exists: ${name}`); continue; }
    let uname = toUsername(name);
    if (userByUsername.has(uname)) uname = uname + '_2';
    const { data: created, error: cErr } = await supabase.from('users')
      .insert({ name, username: uname, password: 'RDSTechserv@2026', role: 'User' })
      .select().single();
    if (cErr) {
      console.log(`   ❌ create '${name}': ${cErr.message}`);
    } else {
      console.log(`   ✓ created: ${name} (@${uname})`);
      userByName.set(lname, created);
      userByUsername.set(uname, created);
      usersCreated++;
    }
  }
  console.log();

  // 4. Test insert
  console.log('🧪 Test insert…');
  const { data: testProj, error: tpErr } = await supabase.from('projects')
    .insert({ name: '__TEST_WHITECAP__', client: CLIENT_NAME, color: '#999999', description: 'test' })
    .select().single();
  if (tpErr) { console.error('❌ Test project failed:', tpErr.message); process.exit(1); }
  console.log('   ✓ test project ok');
  const { error: ttErr } = await supabase.from('tasks')
    .insert({ project_id: testProj.id, title: '__TEST__', status: 'Not Yet Started', client: CLIENT_NAME, tags: [], files: [] });
  if (ttErr) {
    console.error('❌ Test task failed:', ttErr.message);
    await supabase.from('projects').delete().eq('id', testProj.id);
    process.exit(1);
  }
  console.log('   ✓ test task ok');
  await supabase.from('tasks').delete().eq('project_id', testProj.id);
  await supabase.from('projects').delete().eq('id', testProj.id);
  console.log('   ✓ test records cleaned\n');

  // 5. Delete existing White Cap data
  console.log('🗑  Removing existing White Cap data…');
  const { data: oldProjs } = await supabase.from('projects').select('id,name')
    .or('client.ilike.%White Cap%,client.ilike.%WhiteCap%,client.ilike.%White-Cap%');
  if (oldProjs && oldProjs.length > 0) {
    for (const op of oldProjs) {
      await supabase.from('tasks').delete().eq('project_id', op.id);
      await supabase.from('projects').delete().eq('id', op.id);
      console.log(`   ✓ deleted: ${op.name}`);
    }
  } else {
    console.log('   (none found)');
  }
  console.log();

  // 6. Insert
  console.log('📥 Inserting…');
  let projInserted = 0, taskInserted = 0, taskFailed = 0;
  let colorIdx = 0;

  for (const [projName, tasks] of projectMap) {
    const assignedSet = new Set();
    let latestDue = null;
    for (const t of tasks) {
      if (t.detailer) { const u = userByName.get(t.detailer.toLowerCase()); if (u) assignedSet.add(u.username); }
      if (t.checker)  { const u = userByName.get(t.checker.toLowerCase());  if (u) assignedSet.add(u.username); }
      if (t.due_date && (!latestDue || t.due_date > latestDue)) latestDue = t.due_date;
    }

    const { data: proj, error: pErr } = await supabase.from('projects').insert({
      name:           projName,
      client:         CLIENT_NAME,
      color:          PROJECT_COLORS[colorIdx++ % PROJECT_COLORS.length],
      description:    '',
      assigned_users: [...assignedSet],
      deadline:       latestDue,
    }).select().single();

    if (pErr) {
      console.log(`\n  ❌ Project '${projName}': ${pErr.message}`);
      taskFailed += tasks.length;
      continue;
    }
    console.log(`\n  ✓ [${projInserted+1}/${projectMap.size}] ${projName} (${tasks.length} tasks)`);
    projInserted++;

    for (const t of tasks) {
      const r = await insertRow('tasks', {
        project_id:      proj.id,
        title:           t.title,
        status:          t.status,
        // priority not in this DB schema
        assignee:        t.assignee,
        detailer:        t.detailer,
        checker:         t.checker,
        scope:           t.scope,
        due_date:        t.due_date,
        client_sub_date: t.client_sub_date,
        client:          CLIENT_NAME,
        tags:            [],
        files:           [],
      }, t.title.slice(0, 70));
      if (r.ok) taskInserted++; else taskFailed++;
    }
  }

  console.log('\n═══════════════════════════════════════════');
  console.log('  IMPORT COMPLETE');
  console.log('═══════════════════════════════════════════');
  console.log(`  ✓ Projects : ${projInserted} / ${projectMap.size}`);
  console.log(`  ✓ Tasks    : ${taskInserted} / ${totalTasks}`);
  console.log(`  ✓ Users    : ${usersCreated} created`);
  if (taskFailed > 0) console.log(`  ❌ Failed  : ${taskFailed}`);
  console.log('═══════════════════════════════════════════\n');
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
