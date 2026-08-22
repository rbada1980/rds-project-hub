// ================================================================
// formcrete-import-aug2026.cjs
// Latest Excel: Formcrete Projects Tracker_2026 (Aug 17 2026)
//
// NEW column layout (0-indexed), header row 5, data from row 6:
//   col0 = PROJECT NAME
//   col1 = SCOPE
//   col2 = COMPONENTS OF WORK (task title)
//   col3 = STATUS
//   col4 = SUB. DATE
//   col5 = CUST. REQ. DATE
//   col6 = DET. WT.
//   col7 = DETAILER
//   col8 = CHECKER
//
// Usage:
//   node formcrete-import-aug2026.cjs             ← dry-run (safe)
//   node formcrete-import-aug2026.cjs --apply     ← write to DB
//
// Never deletes DB-only tasks.
// ================================================================

const XLSX   = require("xlsx");
const path   = require("path");
const fs     = require("fs");
const { createClient } = require("@supabase/supabase-js");

const SUPA_URL = "https://xypcbioltukahipkqqzc.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGNiaW9sdHVrYWhpcGtxcXpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTQzMTM2NSwiZXhwIjoyMDk1MDA3MzY1fQ.AoLxjBk3MR3_qjsCP50xzbyx7cp_kaQlVmN_eP_xuYU";
const sb     = createClient(SUPA_URL, SUPA_KEY);

const CLIENT  = "Formcrete";
const DRY_RUN = !process.argv.includes("--apply");

// ── Locate Excel ──────────────────────────────────────────────────────────
const CANDIDATES = [
  path.join(__dirname, "Formcrete Projects Tracker_2026.xlsx"),
  path.join(
    process.env.APPDATA || "C:\\Users\\HP\\AppData\\Roaming",
    "Claude\\local-agent-mode-sessions\\919964d4-cd92-4eb6-b494-6c7ad2c02d36\\4c052105-2aba-4ec0-9a90-013070bec645\\local_d0d6e4a5-acfb-4c98-8222-e8da51f65329\\uploads\\Formcrete Projects Tracker_2026-7464c7cf.xlsx"
  ),
  process.argv[2] || "",
].filter(Boolean);

// ── Helpers ───────────────────────────────────────────────────────────────
const STATUS_MAP = {
  "completed":       "Completed",
  "in progress":     "In Progress",
  "in_progress":     "In Progress",
  "not yet started": "Not Yet Started",
  "not_yet_started": "Not Yet Started",
  "on hold":         "On Hold",
  "on_hold":         "On Hold",
};
function mapStatus(raw) {
  const k = (raw || "").trim().toLowerCase();
  return STATUS_MAP[k] || (raw ? raw.trim() : "Not Yet Started");
}
function norm(s) { return (s || "").trim().toLowerCase().replace(/\s+/g, " "); }
function toISO(val) {
  if (!val) return null;
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return null;
    return `${val.getFullYear()}-${String(val.getMonth()+1).padStart(2,"0")}-${String(val.getDate()).padStart(2,"0")}`;
  }
  if (typeof val === "number") {
    const d = XLSX.SSF.parse_date_code(val);
    return d ? `${d.y}-${String(d.m).padStart(2,"0")}-${String(d.d).padStart(2,"0")}` : null;
  }
  if (typeof val === "string") {
    const s = val.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const m = s.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/);
    if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  }
  return null;
}
function str(v) {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s || null;
}

// ── Parse Excel ───────────────────────────────────────────────────────────
function parseExcel(filePath) {
  const wb = XLSX.readFile(filePath, { cellDates: true, raw: false });
  // Use PROJECTS sheet
  const sheetName = wb.SheetNames.includes("PROJECTS") ? "PROJECTS" : wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: false });

  console.log(`  Sheet: "${sheetName}", total rows: ${rows.length}`);

  const tasks = [];
  const seen  = new Set();
  let currentProject = null;

  // Header at rows[4] (Excel row 5), data from rows[5] (Excel row 6)
  for (let i = 5; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.every(v => v === null || v === undefined || String(v).trim() === "")) continue;

    const proj  = str(row[0]);
    const title = str(row[2]);

    if (proj) currentProject = proj;
    if (!currentProject) continue;
    if (!title) continue;
    const tl = title.toLowerCase();
    if (tl === "components of work" || tl.startsWith("note: submittal dates")) continue;

    const key = `${currentProject}|||${title}`;
    if (seen.has(key)) {
      console.log(`  ⏭  SKIP DUPLICATE: "${title}" (${currentProject})`);
      continue;
    }
    seen.add(key);

    const detWtRaw = str(row[6]);
    let det_weight = null;
    if (detWtRaw) {
      const n = parseFloat(detWtRaw.replace(/,/g, ""));
      if (!isNaN(n)) det_weight = n;
    }

    tasks.push({
      project:         currentProject,
      scope:           str(row[1]),
      title,
      status:          mapStatus(str(row[3])),
      detailer:        str(row[7]),
      checker:         str(row[8]),
      client_sub_date: toISO(row[4]),
      due_date:        toISO(row[5]),
      det_weight,
    });
  }
  return tasks;
}

// ── Main ──────────────────────────────────────────────────────────────────
async function main() {
  const filePath = CANDIDATES.find(p => p && fs.existsSync(p));
  if (!filePath) {
    console.error("Cannot find Formcrete Excel file. Pass path as argument:");
    console.error('  node formcrete-import-aug2026.cjs "C:\\path\\to\\file.xlsx"');
    process.exit(1);
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log(` Formcrete Import — ${DRY_RUN ? "DRY RUN (no DB writes)" : "⚡ APPLY MODE"}`);
  console.log(`${"=".repeat(60)}`);
  console.log(` Excel: ${path.basename(filePath)}\n`);

  const excelTasks = parseExcel(filePath);
  console.log(`\nExcel tasks parsed: ${excelTasks.length}`);

  // ── Fetch DB projects ──────────────────────────────────────────
  const { data: projects, error: pe } = await sb
    .from("projects").select("id,name").eq("client", CLIENT);
  if (pe) { console.error("Projects fetch error:", pe.message); process.exit(1); }

  const projByNorm = {};
  const projIdToName = {};
  projects.forEach(p => {
    projByNorm[norm(p.name)] = p;
    projIdToName[p.id] = p.name;
  });

  // ── Fetch DB tasks ─────────────────────────────────────────────
  const projIds = projects.map(p => p.id);
  let dbTasks = [];
  for (let i = 0; i < projIds.length; i += 50) {
    const chunk = projIds.slice(i, i + 50);
    let from = 0;
    while (true) {
      const { data, error } = await sb.from("tasks")
        .select("id,project_id,title,status,detailer,checker,client_sub_date,due_date,det_weight,scope")
        .in("project_id", chunk).range(from, from + 999);
      if (error || !data || !data.length) break;
      dbTasks = dbTasks.concat(data);
      if (data.length < 1000) break;
      from += 1000;
    }
  }
  console.log(`DB tasks fetched: ${dbTasks.length}`);

  // ── Build lookup ───────────────────────────────────────────────
  const dbLookup = {};
  dbTasks.forEach(t => {
    const pname = projIdToName[t.project_id] || "";
    dbLookup[norm(pname) + "||" + norm(t.title)] = t;
  });

  // ── Compare ────────────────────────────────────────────────────
  const toInsert = [], toUpdate = [], unchanged = [], missingProj = new Set();

  for (const et of excelTasks) {
    const pnorm = norm(et.project);
    const dbProj = projByNorm[pnorm];

    if (!dbProj) {
      missingProj.add(et.project);
      toInsert.push({ ...et, _reason: "new_project" });
      continue;
    }

    const dbT = dbLookup[pnorm + "||" + norm(et.title)];
    if (!dbT) {
      toInsert.push({ ...et, project_id: dbProj.id });
      continue;
    }

    const changes = [];
    if (norm(dbT.status) !== norm(et.status)) changes.push(`status: "${dbT.status}" → "${et.status}"`);
    if (et.client_sub_date && dbT.client_sub_date !== et.client_sub_date)
      changes.push(`sub_date: "${dbT.client_sub_date}" → "${et.client_sub_date}"`);
    if (et.due_date && dbT.due_date !== et.due_date)
      changes.push(`due_date: "${dbT.due_date}" → "${et.due_date}"`);
    if (et.detailer && norm(dbT.detailer) !== norm(et.detailer))
      changes.push(`detailer: "${dbT.detailer}" → "${et.detailer}"`);
    if (et.checker && norm(dbT.checker) !== norm(et.checker))
      changes.push(`checker: "${dbT.checker}" → "${et.checker}"`);

    if (changes.length > 0) toUpdate.push({ ...et, db_id: dbT.id, project_id: dbProj.id, changes });
    else unchanged.push(et);
  }

  const excelKeys = new Set(excelTasks.map(et => norm(et.project) + "||" + norm(et.title)));
  const dbOnly = dbTasks.filter(t => {
    const pname = projIdToName[t.project_id] || "";
    return !excelKeys.has(norm(pname) + "||" + norm(t.title));
  });

  // ── Print summary ──────────────────────────────────────────────
  console.log(`\n${"─".repeat(60)}`);
  console.log(` DIFF SUMMARY`);
  console.log(`${"─".repeat(60)}`);
  console.log(` Excel tasks:            ${excelTasks.length}`);
  console.log(` DB tasks:               ${dbTasks.length}`);
  console.log(` To INSERT (new):        ${toInsert.length}`);
  console.log(` To UPDATE (changed):    ${toUpdate.length}`);
  console.log(` Unchanged:              ${unchanged.length}`);
  console.log(` DB-only (keep as-is):   ${dbOnly.length}`);
  if (missingProj.size > 0)
    console.log(` ⚠ New projects (will create): ${[...missingProj].join(", ")}`);

  // Per-project breakdown
  const allProjNames = [...new Set([
    ...excelTasks.map(t => t.project),
    ...dbTasks.map(t => projIdToName[t.project_id] || "")
  ])].filter(Boolean).sort();

  console.log(`\n${"─".repeat(60)}`);
  console.log(` PER-PROJECT`);
  console.log(`${"─".repeat(60)}`);
  allProjNames.forEach(p => {
    const ins  = toInsert.filter(t => t.project === p).length;
    const upd  = toUpdate.filter(t => t.project === p).length;
    const unch = unchanged.filter(t => t.project === p).length;
    const dbo  = dbOnly.filter(t => (projIdToName[t.project_id]||"") === p).length;
    if (ins+upd+unch+dbo === 0) return;
    const parts = [];
    if (ins)  parts.push(`+${ins} new`);
    if (upd)  parts.push(`~${upd} update`);
    if (unch) parts.push(`=${unch} ok`);
    if (dbo)  parts.push(`○${dbo} DB-only`);
    console.log(`  ${p}: ${parts.join(", ")}`);
  });

  if (toInsert.length) {
    console.log(`\n${"─".repeat(60)}`);
    console.log(` NEW TASKS TO INSERT`);
    console.log(`${"─".repeat(60)}`);
    const byP = {};
    toInsert.forEach(t => { (byP[t.project]=byP[t.project]||[]).push(t.title); });
    Object.entries(byP).forEach(([p,ts]) => {
      console.log(`  ${p} (${ts.length}):`);
      ts.forEach(t => console.log(`    + ${t}`));
    });
  }

  if (toUpdate.length) {
    console.log(`\n${"─".repeat(60)}`);
    console.log(` TASKS TO UPDATE (first 20)`);
    console.log(`${"─".repeat(60)}`);
    toUpdate.slice(0,20).forEach(t => {
      console.log(`  [${t.project}] ${t.title}`);
      t.changes.forEach(c => console.log(`    ${c}`));
    });
    if (toUpdate.length > 20) console.log(`  ... and ${toUpdate.length-20} more`);
  }

  if (dbOnly.length) {
    console.log(`\n${"─".repeat(60)}`);
    console.log(` DB-ONLY (not in Excel — kept untouched)`);
    console.log(`${"─".repeat(60)}`);
    const byP = {};
    dbOnly.forEach(t => { const p=projIdToName[t.project_id]||"?"; (byP[p]=byP[p]||[]).push(t.title); });
    Object.entries(byP).forEach(([p,ts]) => {
      console.log(`  ${p}: ${ts.length} tasks`);
      ts.slice(0,3).forEach(t => console.log(`    ○ ${t}`));
      if (ts.length>3) console.log(`    ... +${ts.length-3} more`);
    });
  }

  // ── Apply ──────────────────────────────────────────────────────
  if (DRY_RUN) {
    console.log(`\n${"=".repeat(60)}`);
    console.log(` DRY RUN COMPLETE — nothing written.`);
    console.log(` Run with --apply to execute changes.`);
    console.log(`${"=".repeat(60)}\n`);
    return;
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log(` APPLYING CHANGES...`);
  console.log(`${"=".repeat(60)}\n`);

  let created=0, updated=0, errors=0;
  const projCache = { ...projByNorm };

  for (const pname of missingProj) {
    const { data, error } = await sb.from("projects")
      .insert({ name: pname, client: CLIENT, color: "#6366f1", status: "Active" })
      .select("id").single();
    if (error) { console.error(`  ✗ Create project "${pname}": ${error.message}`); }
    else { projCache[norm(pname)] = data; console.log(`  ✚ Project created: "${pname}"`); }
  }

  for (const t of toInsert) {
    const proj = projCache[norm(t.project)];
    if (!proj) { errors++; continue; }
    const { error } = await sb.from("tasks").insert({
      title: t.title, project_id: proj.id, client: CLIENT,
      status: t.status, scope: t.scope, assignee: null,
      detailer: t.detailer, checker: t.checker,
      client_sub_date: t.client_sub_date, due_date: t.due_date,
      det_weight: t.det_weight,
    });
    if (error) { console.error(`  ✗ INSERT "${t.title}": ${error.message}`); errors++; }
    else { console.log(`  ✚ [${t.project}] ${t.title}`); created++; }
  }

  for (const t of toUpdate) {
    const payload = { status: t.status };
    if (t.detailer        !== null) payload.detailer        = t.detailer;
    if (t.checker         !== null) payload.checker         = t.checker;
    if (t.client_sub_date !== null) payload.client_sub_date = t.client_sub_date;
    if (t.due_date        !== null) payload.due_date        = t.due_date;
    if (t.det_weight      !== null) payload.det_weight      = t.det_weight;
    if (t.scope           !== null) payload.scope           = t.scope;

    const { error } = await sb.from("tasks").update(payload).eq("id", t.db_id);
    if (error) { console.error(`  ✗ UPDATE "${t.title}": ${error.message}`); errors++; }
    else { console.log(`  ↺ [${t.project}] ${t.title} | ${t.changes.join(", ")}`); updated++; }
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log(` DONE: ${created} inserted, ${updated} updated, ${errors} errors`);
  console.log(`${"=".repeat(60)}\n`);
}

main().catch(e => { console.error("FATAL:", e.message); process.exit(1); });
