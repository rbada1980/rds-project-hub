/**
 * import_sync.cjs  ─  Universal upsert-based Excel sync for ANY client
 *
 * Usage:
 *   node import_sync.cjs "<ClientName>" "<ExcelFile.xlsx>" [SheetName]
 *
 * Examples:
 *   node import_sync.cjs "White Cap" "White Cap Projects Tracker2_2026.xlsx"
 *   node import_sync.cjs "Octavia" "Octavia_Tasks_Jul2026.xlsx" "Work Schedule"
 *
 * What it does (SAFE — no full wipe):
 *   1. Upsert projects  → match by (name + client). Same ID kept if exists.
 *   2. Upsert tasks     → match by (project_id + title + scope). Same ID kept.
 *   3. Delete tasks     → tasks in DB but NOT in the new Excel are deleted.
 *   4. Delete projects  → projects in DB (for this client) not in Excel are deleted
 *                         (along with their tasks first).
 *   5. Mirror everything to local PostgreSQL (if available).
 *
 *  Result: task_comments, audit_logs, notifications stay intact because IDs never change.
 */

'use strict';
const XLSX        = require('xlsx');
const { Pool }    = require('pg');
const { v4: uuid} = require('uuid');
const fs          = require('fs');
const path        = require('path');

// ── Config ────────────────────────────────────────────────────────────────────
const SUPA_URL = 'https://xypcbioltukahipkqqzc.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGNiaW9sdHVrYWhpcGtxcXpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0MzEzNjUsImV4cCI6MjA5NTAwNzM2NX0.DG5sv2bpx8j3Mmz0mqIsoDVaCMP2TmWqh-OQUfSZFRw';

const pool = new Pool({
  host: 'localhost', port: 5432, database: 'rds_local',
  user: 'postgres', password: 'rds2026',
  options: '-c timezone=UTC',
});

// ── Name normalisation (shared across all clients) ────────────────────────────
const NAME_MAP = {
  'siav kumar':          'Siva Kumar',
  'siva kumar':          'Siva Kumar',
  'shiva':               'Siva Kumar',
  'shiva kumar':         'Siva Kumar',
  'danush':              'Dhanush',
  'allu sai':            'Sai',
  'lokesh reddy':        'Lokesh',
  'nnj':                 'Nanaji',
  'eswar/siav kumar':    'Eswar',
  'allu sai/nanaji':     'Sai',
  'lokesh reddy/nanaji': 'Lokesh',
  'eswar/nanaji':        'Eswar',
  'balaram/jagadeesh':   'Balaram',
  'sridevi / vaishnavi': 'Sridevi',
};

const COLORS = [
  '#6366f1','#22d3ee','#f59e0b','#10b981','#ef4444',
  '#8b5cf6','#ec4899','#14b8a6','#f97316','#3b82f6',
  '#84cc16','#f43f5e','#0ea5e9','#d946ef','#fb923c',
];

function toTitleCase(str) {
  return str.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}
function normName(n) {
  if (!n) return '';
  const k = n.trim();
  return NAME_MAP[k.toLowerCase()] || toTitleCase(k);
}
function normField(f) {
  if (!f) return '';
  return f.split(/[\/,]/).map(p => normName(p.trim())).filter(Boolean).join('/');
}

// ── Date parser ───────────────────────────────────────────────────────────────
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
  let mt;
  mt = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (mt) return `${mt[3]}-${mt[1].padStart(2,'0')}-${mt[2].padStart(2,'0')}`;
  mt = s.match(/^(\d{1,2})-(\d{1,2})-(\d{2})$/);
  if (mt) return `20${mt[3]}-${mt[1].padStart(2,'0')}-${mt[2].padStart(2,'0')}`;
  mt = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mt) return `${mt[3]}-${mt[1].padStart(2,'0')}-${mt[2].padStart(2,'0')}`;
  mt = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
  if (mt) return `20${mt[3]}-${mt[1].padStart(2,'0')}-${mt[2].padStart(2,'0')}`;
  mt = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (mt) return `${mt[1]}-${mt[2]}-${mt[3]}`;
  console.warn(`  ⚠ Unknown date format: "${val}"`);
  return null;
}

function fixStatus(s) {
  if (!s) return 'Not Yet Started';
  const t = s.toString().trim();
  if (t.toLowerCase() === 'inprogress') return 'In Progress';
  return t;
}

// ── Supabase REST helper ──────────────────────────────────────────────────────
async function supa(method, endpoint, body, extraHeaders = {}) {
  const res = await fetch(`${SUPA_URL}/rest/v1/${endpoint}`, {
    method,
    headers: {
      apikey: SUPA_KEY,
      Authorization: `Bearer ${SUPA_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...extraHeaders,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`[Supabase ${method} ${endpoint}] ${res.status}: ${text}`);
  return text ? JSON.parse(text) : null;
}

// ── Local PostgreSQL helpers ──────────────────────────────────────────────────
async function pgRun(sql, params = []) {
  const client = await pool.connect();
  try { return await client.query(sql, params); }
  finally { client.release(); }
}

// ── Parse Excel → array of { project, scope, title, status, client_sub_date,
//                             due_date, detailer, checker, assignee, priority,
//                             tags, files, notes } ───────────────────────────
function parseExcel(filePath, sheetName) {
  const wb = XLSX.readFile(filePath, { cellDates: true, dateNF: 'yyyy-mm-dd' });

  // Pick sheet
  let wsName = sheetName;
  if (!wsName) {
    // Try to auto-detect: first non-empty sheet, or the only sheet
    wsName = wb.SheetNames[0];
    console.log(`  ℹ No sheet name given — using first sheet: "${wsName}"`);
  } else if (!wb.SheetNames.includes(wsName)) {
    // Fuzzy match (case-insensitive)
    const found = wb.SheetNames.find(n => n.toLowerCase().includes(wsName.toLowerCase()));
    if (!found) {
      console.error(`  ❌ Sheet "${wsName}" not found. Available: ${wb.SheetNames.join(', ')}`);
      console.log(`  ℹ Falling back to first sheet: "${wb.SheetNames[0]}"`);
      wsName = wb.SheetNames[0];
    } else {
      wsName = found;
    }
  }
  console.log(`  📄 Reading sheet: "${wsName}"`);
  const ws = wb.Sheets[wsName];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, dateNF: 'yyyy-mm-dd' });

  const parsed = [];
  let currentProject = null;
  let colorIdx = 0;

  // Find header row (first row with "Project" or column A text)
  let dataStart = 2; // default: skip row 0 (header) + row 1 (blank)
  for (let i = 0; i < Math.min(5, rows.length); i++) {
    const r = rows[i];
    if (r && r[0] && String(r[0]).toLowerCase().includes('project')) {
      dataStart = i + 1;
      break;
    }
  }

  // ── Auto-detect columns from header row ──────────────────────────────────────
  const HEADER_ALIASES = {
    'project name': 'project', 'projects': 'project', 'project': 'project',
    'tasks': 'title', 'task': 'title', 'description': 'title',
    'status': 'status',
    'client sub. date': 'client_sub_date', 'client sub date': 'client_sub_date',
    'sub date': 'client_sub_date', 'client sub.date': 'client_sub_date',
    'detailer': 'detailer', 'detailers': 'detailer', 'detaielrs': 'detailer',
    'checker': 'checker',
    'due date': 'due_date', 'due.date': 'due_date',
    'scope': 'scope',
    'det. wt.': 'det_weight', 'det.wt.': 'det_weight', 'det wt': 'det_weight',
    'det. wt': 'det_weight', 'tonnage': 'det_weight', 'weight': 'det_weight',
    'notes': 'notes', 'remarks': 'notes', 'note': 'notes',
  };

  // Scan rows 0-9 for header
  let colMap = {};
  let detectedHeaderRow = dataStart - 1;
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const r = rows[i]; if (!r) continue;
    const mapped = {}; let hits = 0;
    r.forEach((cell, j) => {
      if (!cell) return;
      const k = String(cell).toLowerCase().trim();
      if (HEADER_ALIASES[k]) { mapped[HEADER_ALIASES[k]] = j; hits++; }
    });
    if (hits >= 3) { colMap = mapped; detectedHeaderRow = i; break; }
  }

  // Fallback: positional defaults A=project B=title C=scope D=sub_date E=detailer F=checker G=det_weight H=due_date I=notes
  if (Object.keys(colMap).length === 0) {
    colMap = { project:0, title:1, scope:2, client_sub_date:3, detailer:4, checker:5, det_weight:6, due_date:7, notes:8 };
    console.log('  ⚠ No header row detected — using positional column defaults');
  } else {
    console.log(`  ✓ Header detected at row ${detectedHeaderRow}: ${JSON.stringify(colMap)}`);
  }

  function g(row, field) { const i = colMap[field]; return i !== undefined ? row[i] : undefined; }

  for (let i = detectedHeaderRow + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.every(c => !c)) continue;

    const projCell = g(row, 'project');
    if (projCell) { currentProject = String(projCell).trim(); colorIdx++; }
    const titleVal = g(row, 'title');
    if (!titleVal || !currentProject) continue;

    const subDate  = parseDate(g(row, 'client_sub_date'));
    const dueDate  = parseDate(g(row, 'due_date')) || subDate;
    const detRaw   = g(row, 'detailer') ? String(g(row, 'detailer')).trim() : '';
    const chkRaw   = g(row, 'checker')  ? String(g(row, 'checker')).trim()  : '';
    const detWtRaw = g(row, 'det_weight');
    const detWt    = (detWtRaw !== undefined && detWtRaw !== null && detWtRaw !== '')
                     ? parseFloat(detWtRaw) : null;

    parsed.push({
      project:         currentProject,
      _colorIdx:       colorIdx,
      scope:           g(row, 'scope') ? String(g(row, 'scope')).trim() : '',
      title:           String(titleVal).trim(),
      status:          fixStatus(g(row, 'status')),
      client_sub_date: subDate,
      due_date:        dueDate,
      detailer:        normField(detRaw),
      checker:         normField(chkRaw),
      assignee:        normName(detRaw.split(/[\/,]/)[0].trim()),
      priority:        'Medium',
      det_weight:      (!isNaN(detWt) && detWt !== null) ? detWt : null,
      tags:            [],
      files:           [],
      notes:           g(row, 'notes') ? String(g(row, 'notes')).trim() : '',
    });
  }

  console.log(`  ✓ Parsed ${parsed.length} task rows from Excel\n`);
  return parsed;
}

// ── Key helpers ───────────────────────────────────────────────────────────────
const projKey  = (name, client) => `${client}||${name}`.toLowerCase().trim();
const taskKey  = (projId, title, scope) => `${projId}||${title}||${scope}`.toLowerCase().trim();

// ── MAIN ──────────────────────────────────────────────────────────────────────
async function main() {
  const [,, CLIENT_NAME, EXCEL_ARG, SHEET_ARG] = process.argv;
  if (!CLIENT_NAME || !EXCEL_ARG) {
    console.error('Usage: node import_sync.cjs "<ClientName>" "<ExcelFile.xlsx>" [SheetName]');
    process.exit(1);
  }

  // Resolve Excel path (relative to script dir, or absolute)
  const EXCEL_FILE = path.isAbsolute(EXCEL_ARG)
    ? EXCEL_ARG
    : path.join(__dirname, EXCEL_ARG);

  if (!fs.existsSync(EXCEL_FILE)) {
    console.error(`❌ Excel file not found: ${EXCEL_FILE}`);
    process.exit(1);
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  RDS Sync — Client: "${CLIENT_NAME}"`);
  console.log(`  File   : ${path.basename(EXCEL_FILE)}`);
  console.log(`${'═'.repeat(60)}\n`);

  // ── 1. Test connections ────────────────────────────────────────────────────
  console.log('── Connecting …');
  const ping = await supa('GET', 'projects?select=id&limit=1');
  console.log('  ✓ Supabase connected');

  let localOk = false;
  try {
    await pgRun('SELECT 1');
    localOk = true;
    console.log('  ✓ Local PostgreSQL connected');
  } catch (e) {
    console.warn('  ⚠ Local PostgreSQL unavailable:', e.message, '— Supabase only');
  }

  // ── 2. Parse Excel ─────────────────────────────────────────────────────────
  console.log('\n── Parsing Excel …');
  const excelRows = parseExcel(EXCEL_FILE, SHEET_ARG || null);

  if (!excelRows.length) {
    console.error('❌ No rows parsed from Excel. Check sheet name / column layout.');
    process.exit(1);
  }

  // ── 3. Load users ──────────────────────────────────────────────────────────
  console.log('── Loading users …');
  const users = await supa('GET', 'users?select=id,name,username,role');
  const byName = {};
  for (const u of users) {
    byName[u.name.toLowerCase().trim()] = u;
    if (u.username) byName[u.username.toLowerCase().trim()] = u;
  }

  // Auto-create missing users
  const neededNames = new Set();
  for (const r of excelRows) {
    [r.detailer, r.checker, r.assignee].forEach(f => {
      if (f) f.split('/').forEach(n => { if (n.trim()) neededNames.add(normName(n.trim())); });
    });
  }
  for (const name of neededNames) {
    if (!name || byName[name.toLowerCase()]) continue;
    const username = name.toLowerCase().replace(/\s+/g, '_');
    try {
      const [nu] = await supa('POST', 'users', {
        name, username, password: 'RDSTechserv@2026', role: 'Rebar', client_name: '', email: '',
      });
      byName[name.toLowerCase()] = nu;
      byName[username] = nu;
      console.log(`  ➕ Created user: ${name}`);
    } catch (e) {
      console.warn(`  ⚠ Could not create user "${name}":`, e.message);
    }
  }
  console.log(`  ✓ ${users.length} users loaded`);

  // ── 4. Load existing DB state for this client ─────────────────────────────
  console.log(`\n── Loading existing "${CLIENT_NAME}" data from DB …`);
  const dbProjects = await supa('GET', `projects?client=eq.${encodeURIComponent(CLIENT_NAME)}&select=id,name,client`);
  const dbProjMap  = {};   // projKey → project row
  for (const p of dbProjects) dbProjMap[projKey(p.name, p.client)] = p;

  const dbTasks = dbProjects.length
    ? await supa('GET', `tasks?project_id=in.(${dbProjects.map(p => p.id).join(',')})&select=id,project_id,title,scope`)
    : [];
  const dbTaskMap = {};   // taskKey → task row
  for (const t of dbTasks) dbTaskMap[taskKey(t.project_id, t.title, t.scope || '')] = t;

  console.log(`  ✓ Found ${dbProjects.length} projects, ${dbTasks.length} tasks in DB`);

  // ── 5. Group Excel rows by project ─────────────────────────────────────────
  const excelProjectMap = {};   // project name → { colorIdx, tasks[] }
  for (const r of excelRows) {
    if (!excelProjectMap[r.project]) {
      excelProjectMap[r.project] = { colorIdx: r._colorIdx, tasks: [] };
    }
    excelProjectMap[r.project].tasks.push(r);
  }

  // ── 6. Upsert projects + tasks ─────────────────────────────────────────────
  console.log('\n── Syncing projects and tasks …');
  let projCreated = 0, projUpdated = 0, taskCreated = 0, taskUpdated = 0, taskDeleted = 0;

  // Track which project IDs we touched (for later deletion check)
  const touchedProjIds = new Set();
  // Track which task IDs we touched per project
  const touchedTaskIds = new Set();

  for (const [projName, { colorIdx: ci, tasks }] of Object.entries(excelProjectMap)) {
    const pKey = projKey(projName, CLIENT_NAME);
    const existing = dbProjMap[pKey];

    const projPayload = {
      name:           projName,
      client:         CLIENT_NAME,
      color:          COLORS[ci % COLORS.length],
      description:    '',
      assigned_users: [],
      deadline:       null,
    };

    let projId;
    if (existing) {
      // UPDATE — keep same ID
      await supa('PATCH', `projects?id=eq.${existing.id}`, projPayload);
      projId = existing.id;
      projUpdated++;
      if (localOk) {
        await pgRun(
          `UPDATE projects SET name=$1,client=$2,color=$3 WHERE id=$4`,
          [projName, CLIENT_NAME, projPayload.color, projId]
        ).catch(e => console.warn('  ⚠ local proj update:', e.message));
      }
    } else {
      // INSERT — new project
      projId = uuid();
      await supa('POST', 'projects', { id: projId, ...projPayload });
      projCreated++;
      if (localOk) {
        await pgRun(
          `INSERT INTO projects (id,name,client,color,description,assigned_users,deadline)
           VALUES ($1,$2,$3,$4,$5,$6,$7)
           ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name,client=EXCLUDED.client,color=EXCLUDED.color`,
          [projId, projName, CLIENT_NAME, projPayload.color, '', '{}', null]
        ).catch(e => console.warn('  ⚠ local proj insert:', e.message));
      }
    }
    touchedProjIds.add(projId);

    // ── Upsert tasks for this project ────────────────────────────────────────
    for (const r of tasks) {
      const tKey = taskKey(projId, r.title, r.scope);
      const existingTask = dbTaskMap[tKey];

      const assigneeUser  = byName[(r.assignee || '').toLowerCase().trim()];
      const detailerUser  = byName[(r.detailer || '').toLowerCase().split('/')[0].trim()];
      const checkerUser   = byName[(r.checker  || '').toLowerCase().split('/')[0].trim()];

      const taskPayload = {
        project_id:      projId,
        title:           r.title,
        scope:           r.scope,
        status:          r.status,
        priority:        r.priority,
        assignee:        assigneeUser?.name  || r.assignee  || '',
        detailer:        detailerUser?.name  || r.detailer  || '',
        checker:         checkerUser?.name   || r.checker   || '',
        client:          CLIENT_NAME,
        client_sub_date: r.client_sub_date,
        due_date:        r.due_date,
        det_weight:      r.det_weight !== undefined ? r.det_weight : null,
        tags:            r.tags || [],
        files:           r.files || [],
        notes:           r.notes || '',
      };

      let taskId;
      if (existingTask) {
        // UPDATE — keep same ID
        await supa('PATCH', `tasks?id=eq.${existingTask.id}`, taskPayload);
        taskId = existingTask.id;
        taskUpdated++;
        if (localOk) {
          await pgRun(
            `UPDATE tasks SET title=$1,status=$2,priority=$3,assignee=$4,detailer=$5,
             checker=$6,scope=$7,client_sub_date=$8,due_date=$9,client=$10,det_weight=$11 WHERE id=$12`,
            [r.title, r.status, r.priority, taskPayload.assignee, taskPayload.detailer,
             taskPayload.checker, r.scope, r.client_sub_date, r.due_date, CLIENT_NAME,
             r.det_weight !== undefined ? r.det_weight : null, existingTask.id]
          ).catch(e => console.warn('  ⚠ local task update:', e.message));
        }
      } else {
        // INSERT — new task
        taskId = uuid();
        await supa('POST', 'tasks', { id: taskId, ...taskPayload });
        taskCreated++;
        if (localOk) {
          await pgRun(
            `INSERT INTO tasks (id,project_id,title,status,priority,assignee,detailer,checker,scope,client_sub_date,due_date,client,det_weight,tags,files)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
             ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title,status=EXCLUDED.status,det_weight=EXCLUDED.det_weight`,
            [taskId, projId, r.title, r.status, r.priority,
             taskPayload.assignee, taskPayload.detailer, taskPayload.checker,
             r.scope, r.client_sub_date, r.due_date, CLIENT_NAME,
             r.det_weight !== undefined ? r.det_weight : null, '{}', '{}']
          ).catch(e => console.warn('  ⚠ local task insert:', e.message));
        }
      }
      touchedTaskIds.add(taskId);
    }

    // ── Delete tasks in DB but NOT in this Excel (for this project) ───────────
    const dbTasksForProj = dbTasks.filter(t => t.project_id === projId);
    for (const dt of dbTasksForProj) {
      if (!touchedTaskIds.has(dt.id)) {
        await supa('DELETE', `tasks?id=eq.${dt.id}`);
        taskDeleted++;
        if (localOk) {
          await pgRun('DELETE FROM tasks WHERE id=$1', [dt.id])
            .catch(e => console.warn('  ⚠ local task delete:', e.message));
        }
      }
    }
  }

  // ── 7. Delete projects (for this client) NOT in Excel ──────────────────────
  let projDeleted = 0;
  for (const dbProj of dbProjects) {
    if (!touchedProjIds.has(dbProj.id)) {
      // Delete all tasks first
      const orphanTasks = await supa('DELETE', `tasks?project_id=eq.${dbProj.id}`, undefined, { Prefer: 'return=representation' });
      await supa('DELETE', `projects?id=eq.${dbProj.id}`);
      projDeleted++;
      if (localOk) {
        await pgRun('DELETE FROM tasks WHERE project_id=$1', [dbProj.id])
          .catch(() => {});
        await pgRun('DELETE FROM projects WHERE id=$1', [dbProj.id])
          .catch(() => {});
      }
      console.log(`  🗑 Removed project (not in Excel): "${dbProj.name}"`);
    }
  }

  // ── 8. Summary ─────────────────────────────────────────────────────────────
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  ✅ Sync complete for "${CLIENT_NAME}"`);
  console.log(`     Projects : +${projCreated} created  / ~${projUpdated} updated  / -${projDeleted} removed`);
  console.log(`     Tasks    : +${taskCreated} created  / ~${taskUpdated} updated  / -${taskDeleted} removed`);
  console.log(`     Local DB : ${localOk ? '✓ synced' : '⚠ skipped (offline)'}`);
  console.log(`${'═'.repeat(60)}\n`);

  await pool.end().catch(() => {});
}

main().catch(e => {
  console.error('\n❌ Fatal error:', e.message);
  process.exit(1);
});
