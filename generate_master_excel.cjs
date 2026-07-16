/**
 * generate_master_excel.cjs
 * Run: node generate_master_excel.cjs
 *
 * Pulls ALL current data from local PostgreSQL and generates a master Excel file.
 * One sheet per client + a Summary sheet.
 * Columns: #, Task Title, Project, Status, Priority, Assignee, Detailer, Checker,
 *          Client Sub Date, Due Date, Det. Weight (Tons), Scope, Last Updated
 *
 * Output: exports/RDS_Master_YYYY-MM-DD_HHMM.xlsx
 */

const { Pool } = require('pg');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// ── DB config ─────────────────────────────────────────────
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'rds_local',
  user: 'postgres',
  password: 'rds2026',
  options: '-c timezone=UTC',
});

// ── Helpers ───────────────────────────────────────────────
const fmtDate = v => {
  if (!v) return '';
  return String(v).slice(0, 10);
};

const isDone = s => s === 'Completed' || s === 'Done';

const today = new Date().toISOString().slice(0, 10);

const isOverdue = t => {
  const d1 = fmtDate(t.client_sub_date);
  const d2 = fmtDate(t.due_date);
  return ((d1 && d1 < today) || (d2 && d2 < today)) && !isDone(t.status);
};

// ── Fetch data ────────────────────────────────────────────
async function fetchAll() {
  const [projRes, taskRes] = await Promise.all([
    pool.query('SELECT * FROM projects ORDER BY client, name'),
    pool.query('SELECT * FROM tasks ORDER BY client_sub_date, due_date'),
  ]);
  return { projects: projRes.rows, tasks: taskRes.rows };
}

// ── Build workbook ────────────────────────────────────────
function buildWorkbook(projects, tasks) {
  const wb = XLSX.utils.book_new();

  // Map project id → project
  const projMap = new Map(projects.map(p => [p.id, p]));

  // Group projects by client
  const clientMap = new Map();
  for (const p of projects) {
    const cl = (p.client || 'Unknown').trim();
    if (!clientMap.has(cl)) clientMap.set(cl, []);
    clientMap.get(cl).push(p);
  }

  // ── SUMMARY SHEET ─────────────────────────────────────
  const summaryRows = [
    ['RDS PROJECT HUB — MASTER EXPORT', '', '', '', '', '', ''],
    [`Generated: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`, '', '', '', '', '', ''],
    [],
    ['Client', 'Projects', 'Total Tasks', 'Completed', 'In Progress', 'Overdue', '% Done'],
  ];

  const clients = [...clientMap.keys()].sort();

  for (const client of clients) {
    const cProjects = clientMap.get(client) || [];
    const cProjIds = new Set(cProjects.map(p => p.id));
    const cTasks = tasks.filter(t => cProjIds.has(t.project_id));
    const done = cTasks.filter(t => isDone(t.status)).length;
    const inProg = cTasks.filter(t => t.status === 'In Progress').length;
    const overdue = cTasks.filter(t => isOverdue(t)).length;
    const pct = cTasks.length ? Math.round(done / cTasks.length * 100) : 0;
    summaryRows.push([client, cProjects.length, cTasks.length, done, inProg, overdue, `${pct}%`]);
  }

  // Totals row
  const allProjIds = new Set(projects.map(p => p.id));
  const allDone = tasks.filter(t => isDone(t.status)).length;
  const allInProg = tasks.filter(t => t.status === 'In Progress').length;
  const allOverdue = tasks.filter(t => isOverdue(t)).length;
  const allPct = tasks.length ? Math.round(allDone / tasks.length * 100) : 0;
  summaryRows.push([]);
  summaryRows.push(['TOTAL', clients.length, tasks.length, allDone, allInProg, allOverdue, `${allPct}%`]);

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
  summarySheet['!cols'] = [
    { wch: 30 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 8 }
  ];
  XLSX.utils.book_append_sheet(wb, summarySheet, '📊 Summary');

  // ── PER-CLIENT SHEETS ──────────────────────────────────
  const HEADERS = [
    '#', 'Task Title', 'Project', 'Status', 'Priority',
    'Assignee', 'Detailer', 'Checker',
    'Client Sub Date', 'Due Date', 'Det. Wt (Tons)', 'Scope', 'Last Updated'
  ];

  for (const client of clients) {
    const cProjects = clientMap.get(client) || [];
    const cProjIds = new Set(cProjects.map(p => p.id));
    const cTasks = tasks.filter(t => cProjIds.has(t.project_id));

    const rows = [
      [`Client: ${client}`, '', '', '', '', '', '', '', '', '', '', '', ''],
      [`Tasks: ${cTasks.length}  |  Done: ${cTasks.filter(t => isDone(t.status)).length}  |  Overdue: ${cTasks.filter(t => isOverdue(t)).length}`, '', '', '', '', '', '', '', '', '', '', '', ''],
      [],
      HEADERS,
    ];

    let rowNum = 1;
    for (const t of cTasks) {
      const proj = projMap.get(t.project_id);
      const ov = isOverdue(t);
      rows.push([
        rowNum++,
        t.title || '',
        proj?.name || '—',
        t.status || '',
        t.priority || '',
        t.assignee || '',
        t.detailer || '',
        t.checker || '',
        fmtDate(t.client_sub_date),
        fmtDate(t.due_date) + (ov ? ' ⚠' : ''),
        t.det_weight != null ? Number(t.det_weight) : '',
        t.scope || '',
        fmtDate(t.updated_at),
      ]);
    }

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [
      { wch: 4 },  // #
      { wch: 35 }, // title
      { wch: 25 }, // project
      { wch: 18 }, // status
      { wch: 10 }, // priority
      { wch: 15 }, // assignee
      { wch: 15 }, // detailer
      { wch: 15 }, // checker
      { wch: 15 }, // client sub date
      { wch: 15 }, // due date
      { wch: 14 }, // det weight
      { wch: 20 }, // scope
      { wch: 13 }, // updated_at
    ];

    // Safe sheet name: max 31 chars, no special chars
    const sheetName = client.replace(/[:\\/?*\[\]]/g, '').slice(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  }

  return wb;
}

// ── Main ──────────────────────────────────────────────────
async function main() {
  console.log('Connecting to local PostgreSQL...');
  try {
    const { projects, tasks } = await fetchAll();
    console.log(`Fetched ${projects.length} projects, ${tasks.length} tasks`);

    const wb = buildWorkbook(projects, tasks);

    // Save to exports folder
    const exportsDir = path.join(__dirname, 'exports');
    if (!fs.existsSync(exportsDir)) fs.mkdirSync(exportsDir);

    const now = new Date();
    const stamp = now.toISOString().slice(0, 16).replace('T', '_').replace(':', '');
    const filename = `RDS_Master_${stamp}.xlsx`;
    const outPath = path.join(exportsDir, filename);

    XLSX.writeFile(wb, outPath);
    console.log(`\n✅ Excel saved: ${outPath}`);
    console.log(`   Clients: ${[...new Map(projects.map(p => [p.client, 1])).keys()].length}`);
    console.log(`   Total tasks: ${tasks.length}`);
    console.log(`   Overdue: ${tasks.filter(t => {
      const d1 = fmtDate(t.client_sub_date);
      const d2 = fmtDate(t.due_date);
      return ((d1 && d1 < today) || (d2 && d2 < today)) && !isDone(t.status);
    }).length}`);
  } catch (e) {
    console.error('❌ Error:', e.message);
  } finally {
    await pool.end();
  }
}

main();
