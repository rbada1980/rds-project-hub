// Import 68 ALTON DELRAY tasks into Supabase
// Creates the project if it doesn't exist, then inserts tasks

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

function excelDateToISO(val) {
  try {
    if (!val) return null;
    if (val instanceof Date) return isNaN(val) ? null : val.toISOString().slice(0, 10);
    if (typeof val === "number") {
      const d = new Date(Math.round((val - 25569) * 86400 * 1000));
      return isNaN(d) ? null : d.toISOString().slice(0, 10);
    }
    const s = String(val).trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    return null;
  } catch { return null; }
}

const lines = [];
function log(msg) { process.stdout.write(msg + "\n"); lines.push(msg); }

async function main() {
  try {
    // ── 1. Read Excel ──────────────────────────────────────────────────────
    // Search for the uploaded file
    const candidates = [
      "C:\\Users\\HP\\AppData\\Roaming\\Claude\\local-agent-mode-sessions",
    ];
    function findFile(dir, name, depth = 4) {
      if (depth === 0) return null;
      try {
        for (const f of fs.readdirSync(dir)) {
          const full = path.join(dir, f);
          try {
            const stat = fs.statSync(full);
            if (stat.isDirectory()) { const r = findFile(full, name, depth-1); if (r) return r; }
            else if (f === name) return full;
          } catch {}
        }
      } catch {}
      return null;
    }

    let xlsxPath = findFile("C:\\Users\\HP\\AppData\\Roaming\\Claude\\local-agent-mode-sessions", "Formcrete Projects.xlsx");
    if (!xlsxPath) {
      xlsxPath = path.join(__dirname, "Formcrete Projects.xlsx");
      if (!fs.existsSync(xlsxPath)) { log("ERROR: Formcrete Projects.xlsx not found"); return; }
    }
    log("Reading: " + xlsxPath);

    const wb = XLSX.readFile(xlsxPath, { cellDates: true });
    const ws = wb.Sheets["PROJECTS"];
    if (!ws) { log("ERROR: PROJECTS sheet not found"); return; }
    const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

    // Header at row index 1
    const hr = 1;
    const headers = raw[hr].map(c => (c || "").toString().trim());
    const COL = {}; headers.forEach((h, i) => { if (h) COL[h] = i; });

    // Extract ALTON DELRAY tasks
    const tasks = [];
    let lastProj = null;
    for (let i = hr + 1; i < raw.length; i++) {
      const r = raw[i];
      if (!r) continue;
      if (r[COL["PROJECT NAME"]] && String(r[COL["PROJECT NAME"]]).trim())
        lastProj = String(r[COL["PROJECT NAME"]]).trim();
      const taskTitle = r[COL["Tasks"]] ? String(r[COL["Tasks"]]).trim() : null;
      if (!taskTitle || !lastProj) continue;
      if (lastProj.toUpperCase() !== "ALTON DELRAY") continue;

      const rawStatus = r[COL["STATUS"]] ? String(r[COL["STATUS"]]).trim().toUpperCase() : null;
      tasks.push({
        title:           taskTitle,
        scope:           r[COL["SCOPE"]] ? String(r[COL["SCOPE"]]).trim() : null,
        status:          STATUS_MAP[rawStatus] || "Not Yet Started",
        client_sub_date: excelDateToISO(r[COL["SUB. DATE"]]),
        cust_req_date:   excelDateToISO(r[COL["CUST. REQ. DATE"]]),
        detailer:        r[COL["DETAILER"]] && String(r[COL["DETAILER"]]).trim() ? String(r[COL["DETAILER"]]).trim() : null,
        checker:         r[COL["CHECKER"]]  && String(r[COL["CHECKER"]]).trim()  ? String(r[COL["CHECKER"]]).trim()  : null,
      });
    }
    log("ALTON DELRAY tasks found in Excel: " + tasks.length);
    if (tasks.length === 0) { log("No tasks found — aborting"); return; }

    // ── 2. Find or create ALTON DELRAY project under Formcrete ────────────
    let { data: existing } = await supabase
      .from("projects")
      .select("id,name")
      .eq("client", "Formcrete")
      .ilike("name", "ALTON DELRAY");

    let projectId;
    if (existing && existing.length > 0) {
      projectId = existing[0].id;
      log("Project exists: " + projectId + " (" + existing[0].name + ")");
    } else {
      projectId = uuidv4();
      const { error: projErr } = await supabase.from("projects").insert({
        id:         projectId,
        name:       "ALTON DELRAY",
        client:     "Formcrete",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      if (projErr) { log("ERROR creating project: " + projErr.message); return; }
      log("Project created: " + projectId);
    }

    // ── 3. Check for already-existing tasks (avoid duplicates) ────────────
    const { data: existingTasks } = await supabase
      .from("tasks")
      .select("title")
      .eq("project_id", projectId);
    const existingTitles = new Set((existingTasks || []).map(t => t.title.trim().toLowerCase()));
    log("Existing tasks in DB for this project: " + existingTitles.size);

    // ── 4. Insert new tasks ────────────────────────────────────────────────
    const toInsert = tasks.filter(t => !existingTitles.has(t.title.toLowerCase()));
    log("Tasks to insert: " + toInsert.length);

    if (toInsert.length === 0) {
      log("All tasks already exist — nothing to insert.");
    } else {
      const rows = toInsert.map(t => ({
        id:              uuidv4(),
        project_id:      projectId,
        title:           t.title,
        status:          t.status,
        detailer:        t.detailer,
        checker:         t.checker,
        client_sub_date: t.client_sub_date,
        created_at:      new Date().toISOString(),
        updated_at:      new Date().toISOString(),
      }));

      // Insert in batches of 50
      let inserted = 0;
      for (let i = 0; i < rows.length; i += 50) {
        const batch = rows.slice(i, i + 50);
        const { error } = await supabase.from("tasks").insert(batch);
        if (error) { log("INSERT ERROR (batch " + i + "): " + error.message); }
        else { inserted += batch.length; }
      }
      log("Inserted: " + inserted);
    }

    log("");
    log("=== ALTON DELRAY Import Complete ===");
    log("Project ID: " + projectId);
    log("Tasks in Excel: " + tasks.length);
    log("Already existed: " + (tasks.length - toInsert.length));
    log("Newly inserted: " + toInsert.length);

  } catch (err) {
    log("FATAL: " + err.message);
    log(err.stack);
  }

  fs.writeFileSync(path.join(__dirname, "alton-delray-import-log.txt"), lines.join("\n") + "\n");
}

main();
