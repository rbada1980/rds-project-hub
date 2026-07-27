// White Cap Projects Tracker update
// Sheet: "White Cap Work Schedule" | Columns: PROJECT NAME, Tasks, STATUS, CLIENT SUB. DATE, DETAILER, CHECKER
// Matches by project name + task title → updates existing, inserts new tasks/projects

const { createClient } = require("@supabase/supabase-js");
const XLSX = require("xlsx");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");
const path = require("path");

const supabase = createClient(
  "https://xypcbioltukahipkqqzc.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGNiaW9sdHVrYWhpcGtxcXpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTQzMTM2NSwiZXhwIjoyMDk1MDA3MzY1fQ.AoLxjBk3MR3_qjsCP50xzbyx7cp_kaQlVmN_eP_xuYU"
);

const STATUS_MAP = {
  "COMPLETED":       "Completed",
  "IN PROGRESS":     "In Progress",
  "NOT YET STARTED": "Not Yet Started",
};

// IST-safe: use local date methods, not toISOString()
function excelDateToISO(val) {
  try {
    if (!val) return null;
    if (val instanceof Date) {
      if (isNaN(val)) return null;
      const y = val.getFullYear(), m = String(val.getMonth()+1).padStart(2,"0"), d = String(val.getDate()).padStart(2,"0");
      return `${y}-${m}-${d}`;
    }
    if (typeof val === "number") {
      const dt = new Date(Math.round((val - 25569) * 86400 * 1000));
      return isNaN(dt) ? null : dt.toISOString().slice(0, 10);
    }
    const s = String(val).trim();
    // MM-DD-YYYY format (American — White Cap is a US client)
    if (/^\d{2}-\d{2}-\d{4}$/.test(s)) return `${s.slice(6)}-${s.slice(0,2)}-${s.slice(3,5)}`;
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    return null;
  } catch { return null; }
}

function normalize(s) { return (s||"").toString().trim().toLowerCase().replace(/\s+/g," "); }

const lines = [];
function log(msg) { process.stdout.write(msg + "\n"); lines.push(msg); }

async function main() {
  try {
    // ── 1. Read Excel ──────────────────────────────────────────────────────
    const xlsxPath = path.join(__dirname, "White Cap Projects Tracker2_2026.xlsx");
    if (!fs.existsSync(xlsxPath)) { log("ERROR: File not found: " + xlsxPath); return; }
    log("Reading: " + xlsxPath);

    const wb = XLSX.readFile(xlsxPath, { cellDates: true });
    const ws = wb.Sheets["White Cap Work Schedule"];
    if (!ws) { log("ERROR: Sheet 'White Cap Work Schedule' not found"); return; }
    const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

    // Header at row index 2 (row 3)
    const hr = 2;
    const headers = raw[hr].map(c => (c||"").toString().trim());
    const COL = {}; headers.forEach((h, i) => { if (h) COL[h] = i; });
    log("Columns: " + Object.keys(COL).join(" | "));

    const rows = [];
    let lastProj = null;
    for (let i = hr + 1; i < raw.length; i++) {
      const r = raw[i];
      if (!r) continue;
      if (r[COL["PROJECT NAME"]] && String(r[COL["PROJECT NAME"]]).trim()) lastProj = String(r[COL["PROJECT NAME"]]).trim();
      const task = r[COL["Tasks"]] ? String(r[COL["Tasks"]]).trim() : null;
      if (!task || !lastProj) continue;
      const rawStatus = r[COL["STATUS"]] ? String(r[COL["STATUS"]]).trim().toUpperCase() : null;
      rows.push({
        project:   lastProj,
        task,
        status:    STATUS_MAP[rawStatus] || "Not Yet Started",
        subDate:   excelDateToISO(r[COL["CLIENT SUB. DATE"]]),
        detailer:  r[COL["DETAILER"]] ? String(r[COL["DETAILER"]]).trim() : null,
        checker:   r[COL["CHECKER"]]  ? String(r[COL["CHECKER"]]).trim()  : null,
      });
    }
    log("Excel rows: " + rows.length);

    // ── 2. Load White Cap projects from Supabase ───────────────────────────
    const { data: dbProjects, error: pErr } = await supabase.from("projects").select("id,name").eq("client","White Cap");
    if (pErr) { log("ERROR fetching projects: " + pErr.message); return; }
    log("White Cap projects in DB: " + dbProjects.length);

    // ── 3. Load all tasks for those projects ──────────────────────────────
    let allTasks = [];
    if (dbProjects.length > 0) {
      const pids = dbProjects.map(p => p.id);
      let from = 0;
      while (true) {
        const { data, error } = await supabase.from("tasks")
          .select("id,title,status,detailer,checker,client_sub_date,project_id")
          .in("project_id", pids).range(from, from + 999);
        if (error || !data || data.length === 0) break;
        allTasks = allTasks.concat(data);
        if (data.length < 1000) break;
        from += 1000;
      }
    }
    log("White Cap tasks in DB: " + allTasks.length);

    // ── 4. Build lookup maps ───────────────────────────────────────────────
    // project lookup: normName → project
    const projMap = {};
    for (const p of dbProjects) { projMap[normalize(p.name)] = p; }

    // task lookup: "projNorm|titleNorm" → task
    const taskMap = {};
    for (const t of allTasks) {
      const proj = dbProjects.find(p => p.id === t.project_id);
      if (!proj) continue;
      const key = normalize(proj.name) + "|" + normalize(t.title);
      if (!taskMap[key]) taskMap[key] = [];
      taskMap[key].push(t);
    }

    // ── 5. Process each Excel row ──────────────────────────────────────────
    let updated = 0, inserted = 0, skipped = 0, newProjects = 0;
    const notFound = [];

    for (const row of rows) {
      const projNorm = normalize(row.project);
      const taskNorm = normalize(row.task);
      const lookupKey = projNorm + "|" + taskNorm;
      const matched = taskMap[lookupKey];

      if (matched && matched.length > 0) {
        // Update existing task(s)
        for (const t of matched) {
          const patch = {};
          if (row.status && t.status !== row.status)             patch.status = row.status;
          if (row.detailer && t.detailer !== row.detailer)       patch.detailer = row.detailer;
          if (row.checker  && t.checker  !== row.checker)        patch.checker  = row.checker;
          if (row.subDate  && t.client_sub_date !== row.subDate) patch.client_sub_date = row.subDate;
          if (Object.keys(patch).length === 0) { skipped++; continue; }
          const { error } = await supabase.from("tasks").update(patch).eq("id", t.id);
          if (error) log("UPDATE ERR [" + row.project + "/" + row.task + "]: " + error.message);
          else updated++;
        }
      } else {
        // New task — find or create the project
        let proj = projMap[projNorm];
        if (!proj) {
          // Create new project
          const newId = uuidv4();
          const { error: pe } = await supabase.from("projects").insert({
            id: newId, name: row.project, client: "White Cap",
            created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
          });
          if (pe) { log("PROJECT CREATE ERR [" + row.project + "]: " + pe.message); continue; }
          proj = { id: newId, name: row.project };
          projMap[projNorm] = proj;
          newProjects++;
          log("  New project: " + row.project);
        }
        // Insert new task
        const { error: te } = await supabase.from("tasks").insert({
          id: uuidv4(), project_id: proj.id,
          title: row.task, status: row.status,
          detailer: row.detailer, checker: row.checker,
          client_sub_date: row.subDate,
          created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        });
        if (te) log("INSERT ERR [" + row.project + "/" + row.task + "]: " + te.message);
        else { inserted++; notFound.push("[NEW] [" + row.project + "] " + row.task); }
      }
    }

    log("");
    log("=== White Cap Update Complete ===");
    log("Excel rows:       " + rows.length);
    log("Updated:          " + updated);
    log("Inserted (new):   " + inserted);
    log("Skipped (no chg): " + skipped);
    log("New projects:     " + newProjects);
    if (notFound.length) {
      log("\nNew tasks inserted:");
      notFound.forEach(x => log("  " + x));
    }

  } catch (err) {
    log("FATAL: " + err.message + "\n" + err.stack);
  }

  fs.writeFileSync(path.join(__dirname, "whitecap-update-result.txt"), lines.join("\n") + "\n");
}

main();
