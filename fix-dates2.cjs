// Targeted date fix — only shifts dates for tasks we imported/updated
// 1. ALTON DELRAY: all 68 tasks (project_id known)
// 2. Formcrete: re-run update with corrected excelDateToISO using local date methods

const { createClient } = require("@supabase/supabase-js");
const { Pool } = require("pg");
const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");

const supabase = createClient(
  "https://xypcbioltukahipkqqzc.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGNiaW9sdHVrYWhpcGtxcXpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTQzMTM2NSwiZXhwIjoyMDk1MDA3MzY1fQ.AoLxjBk3MR3_qjsCP50xzbyx7cp_kaQlVmN_eP_xuYU"
);

const pool = new Pool({ host:"localhost", port:5432, database:"rds_local", user:"postgres", password:"rds2026" });

// FIXED: use local date methods (IST) not toISOString() (UTC)
function excelDateToISO(val) {
  try {
    if (!val) return null;
    if (val instanceof Date) {
      if (isNaN(val)) return null;
      const y = val.getFullYear();
      const m = String(val.getMonth() + 1).padStart(2, "0");
      const d = String(val.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
    if (typeof val === "number") {
      const dt = new Date(Math.round((val - 25569) * 86400 * 1000));
      if (isNaN(dt)) return null;
      const y = dt.getUTCFullYear();
      const m = String(dt.getUTCMonth() + 1).padStart(2, "0");
      const d = String(dt.getUTCDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
    const s = String(val).trim().slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s;
    return null;
  } catch { return null; }
}

const STATUS_MAP = { "COMPLETED":"Completed", "IN PROGRESS":"In Progress", "NOT YET STARTED":"Not Yet Started" };

const lines = [];
function log(msg) { process.stdout.write(msg + "\n"); lines.push(msg); }

async function fixAltonDelray() {
  const ALTON_PROJECT_ID = "6f915efb-e314-423c-adc8-99a16b79fa7d";
  log("\n=== 1. Fix ALTON DELRAY dates (+1 day) ===");

  // Fetch ALTON DELRAY tasks with dates
  const { data: tasks, error } = await supabase.from("tasks")
    .select("id,title,client_sub_date")
    .eq("project_id", ALTON_PROJECT_ID)
    .not("client_sub_date", "is", null);
  if (error) { log("FETCH ERROR: " + error.message); return; }
  log("ALTON DELRAY tasks with dates: " + tasks.length);

  // Batch update: group by current date → shift to new date
  const byDate = {};
  for (const t of tasks) {
    const cur = String(t.client_sub_date).slice(0, 10);
    if (!byDate[cur]) byDate[cur] = [];
    byDate[cur].push(t.id);
  }

  let fixed = 0;
  for (const [cur, ids] of Object.entries(byDate)) {
    const d = new Date(cur + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() + 1);
    const newDate = d.toISOString().slice(0, 10);
    log(`  ${cur} → ${newDate} (${ids.length} tasks)`);

    // Supabase: batch by ids
    const { error: e } = await supabase.from("tasks").update({ client_sub_date: newDate }).in("id", ids);
    if (e) log("  SUPABASE ERR: " + e.message);
    else fixed += ids.length;
  }
  log("Supabase ALTON DELRAY fixed: " + fixed);

  // Local PG: single query
  const pg = await pool.query(
    `UPDATE tasks SET client_sub_date = (client_sub_date::date + INTERVAL '1 day')::date WHERE project_id = $1 AND client_sub_date IS NOT NULL RETURNING id`,
    [ALTON_PROJECT_ID]
  );
  log("Local PG ALTON DELRAY fixed: " + pg.rowCount);
}

async function fixFormcrete() {
  log("\n=== 2. Re-apply Formcrete dates (corrected) ===");

  // Read both Excel files
  const files = [
    path.join(__dirname, "Formcrete Projects Tracker_2026.xlsx"),
    path.join(__dirname, "Formcrete Projects.xlsx"),
  ];

  // Collect rows from both files
  let allRows = [];
  for (const fp of files) {
    if (!fs.existsSync(fp)) { log("Missing: " + fp); continue; }
    log("Reading: " + fp);
    const wb = XLSX.readFile(fp, { cellDates: true });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
    // Find header
    let hr = -1;
    for (let i = 0; i < 10; i++) {
      if (raw[i] && raw[i].some(c => c && ["COMPONENTS OF WORK","Tasks"].includes(String(c).trim()))) { hr = i; break; }
    }
    if (hr < 0) { log("Header not found in " + fp); continue; }
    const headers = raw[hr].map(c => (c||"").toString().trim());
    const COL = {}; headers.forEach((h, i) => { if (h) COL[h] = i; });
    const taskCol = COL["COMPONENTS OF WORK"] ?? COL["Tasks"];
    let lastProj = null;
    for (let i = hr + 1; i < raw.length; i++) {
      const r = raw[i];
      if (!r) continue;
      if (r[COL["PROJECT NAME"]] && String(r[COL["PROJECT NAME"]]).trim()) lastProj = String(r[COL["PROJECT NAME"]]).trim();
      const comp = r[taskCol] ? String(r[taskCol]).trim() : null;
      if (!comp || !lastProj) continue;
      const subDate = excelDateToISO(r[COL["SUB. DATE"]]);
      if (!subDate) continue; // only update rows that have a date
      allRows.push({ project: lastProj, task: comp, subDate });
    }
  }
  log("Total rows with dates: " + allRows.length);

  // Load all Formcrete projects
  const { data: projects } = await supabase.from("projects").select("id,name").eq("client", "Formcrete");
  const { data: allTasks } = await supabase.from("tasks").select("id,title,client_sub_date,project_id")
    .in("project_id", projects.map(p => p.id));

  // Build lookup
  const taskMap = {};
  for (const t of allTasks) {
    const proj = projects.find(p => p.id === t.project_id);
    if (!proj) continue;
    const key = (proj.name + "|" + t.title).toLowerCase().trim();
    taskMap[key] = t;
  }

  let updated = 0, skipped = 0;
  for (const row of allRows) {
    const key = (row.project + "|" + row.task).toLowerCase().trim();
    const task = taskMap[key];
    if (!task) continue;
    if (task.client_sub_date === row.subDate) { skipped++; continue; }

    const { error } = await supabase.from("tasks").update({ client_sub_date: row.subDate }).eq("id", task.id);
    if (!error) {
      // Also fix local PG
      await pool.query("UPDATE tasks SET client_sub_date = $1 WHERE id = $2", [row.subDate, task.id]);
      updated++;
    }
  }
  log("Formcrete dates corrected: " + updated + " | already correct: " + skipped);
}

async function verify() {
  log("\n=== Verification: tasks due today (2026-07-27) ===");
  const { data } = await supabase.from("tasks").select("title,client_sub_date,project_id")
    .eq("client_sub_date", "2026-07-27");
  const pids = [...new Set((data||[]).map(t => t.project_id))];
  const { data: projs } = await supabase.from("projects").select("id,name").in("id", pids);
  const pm = new Map((projs||[]).map(p => [p.id, p.name]));
  log("Count: " + (data||[]).length);
  (data||[]).forEach(t => log("  [" + (pm.get(t.project_id)||"?") + "] " + t.title));
}

async function main() {
  try {
    await fixAltonDelray();
    await fixFormcrete();
    await verify();
  } catch (err) {
    log("FATAL: " + err.message + "\n" + err.stack);
  } finally {
    await pool.end();
  }
  fs.writeFileSync(path.join(__dirname, "fix-dates2-log.txt"), lines.join("\n") + "\n");
}

main();
