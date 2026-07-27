// Update Formcrete tasks from Excel tracker
// Matches by: project name + task title (COMPONENTS OF WORK)
// Updates: status, detailer, checker, client_sub_date

const { createClient } = require("@supabase/supabase-js");
const XLSX = require("xlsx");
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

function normalize(s) {
  return (s || "").toString().trim().toLowerCase().replace(/\s+/g, " ");
}

function excelDateToISO(val) {
  // Use getFullYear/getMonth/getDate (local IST time) — NOT toISOString() which gives UTC (-1 day before 05:30 IST)
  try {
    if (!val) return null;
    if (val instanceof Date) {
      if (isNaN(val)) return null;
      const y = val.getFullYear(), m = String(val.getMonth()+1).padStart(2,"0"), d = String(val.getDate()).padStart(2,"0");
      return `${y}-${m}-${d}`;
    }
    if (typeof val === "number") {
      const dt = new Date(Math.round((val - 25569) * 86400 * 1000));
      if (isNaN(dt)) return null;
      return dt.toISOString().slice(0, 10); // serial dates are UTC-based, toISOString is correct here
    }
    const s = String(val).trim().slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s;
    return null;
  } catch { return null; }
}

const RESULT_FILE = path.join(__dirname, "formcrete-update-result.txt");
const lines = [];
function log(msg) {
  process.stdout.write(msg + "\n");
  lines.push(msg);
}

async function main() {
  try {
    // ── 1. Read Excel ──────────────────────────────────────────────────────
    const localPath = path.join(__dirname, "Formcrete Projects Tracker_2026.xlsx");
    if (!fs.existsSync(localPath)) {
      log("ERROR: Formcrete Projects Tracker_2026.xlsx not found in " + __dirname);
      return;
    }
    log("Reading: " + localPath);

    let wb;
    try {
      wb = XLSX.readFile(localPath, { cellDates: true });
    } catch (e) {
      log("ERROR reading Excel: " + e.message);
      return;
    }

    const ws = wb.Sheets[wb.SheetNames[0]];
    const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

    // Find header row
    let headerRow = -1;
    for (let i = 0; i < raw.length; i++) {
      if (raw[i] && raw[i].some(c => c && String(c).trim() === "PROJECT NAME")) {
        headerRow = i;
        break;
      }
    }
    if (headerRow < 0) { log("ERROR: Header row not found"); return; }

    const headers = raw[headerRow].map(c => (c || "").toString().trim());
    const COL = {};
    headers.forEach((h, i) => { if (h) COL[h] = i; });
    log("Columns: " + Object.keys(COL).join(", "));

    // Parse rows (fill-down PROJECT NAME)
    const rows = [];
    let lastProject = null;
    for (let i = headerRow + 1; i < raw.length; i++) {
      const r = raw[i];
      if (!r) continue;
      const proj = r[COL["PROJECT NAME"]];
      if (proj && String(proj).trim()) lastProject = String(proj).trim();
      const comp = r[COL["COMPONENTS OF WORK"]];
      if (!comp || !String(comp).trim()) continue;
      rows.push({
        project:   lastProject || "",
        component: String(comp).trim(),
        status:    r[COL["STATUS"]]   ? String(r[COL["STATUS"]]).trim()   : null,
        subDate:   excelDateToISO(r[COL["SUB. DATE"]]),
        detailer:  r[COL["DETAILER"]] ? String(r[COL["DETAILER"]]).trim() : null,
        checker:   r[COL["CHECKER"]]  ? String(r[COL["CHECKER"]]).trim()  : null,
      });
    }
    log("Excel rows: " + rows.length);

    // ── 2. Load Formcrete projects ─────────────────────────────────────────
    const { data: projects, error: projErr } = await supabase
      .from("projects").select("id,name").eq("client", "Formcrete");
    if (projErr) { log("ERROR fetching projects: " + projErr.message); return; }
    log("Projects in DB: " + projects.length);

    // ── 3. Load all tasks for those projects ──────────────────────────────
    const pids = projects.map(p => p.id);
    // Supabase returns max 1000 rows by default; use range if needed
    let allTasks = [];
    let from = 0;
    const PAGE = 1000;
    while (true) {
      const { data: chunk, error: taskErr } = await supabase
        .from("tasks")
        .select("id,title,status,detailer,checker,client_sub_date,project_id")
        .in("project_id", pids)
        .range(from, from + PAGE - 1);
      if (taskErr) { log("ERROR fetching tasks: " + taskErr.message); return; }
      if (!chunk || chunk.length === 0) break;
      allTasks = allTasks.concat(chunk);
      if (chunk.length < PAGE) break;
      from += PAGE;
    }
    log("Tasks in DB: " + allTasks.length);

    // ── 4. Build lookup map ────────────────────────────────────────────────
    const taskMap = {};
    for (const t of allTasks) {
      const proj = projects.find(p => p.id === t.project_id);
      if (!proj) continue;
      const key = normalize(proj.name) + "|" + normalize(t.title || "");
      if (!taskMap[key]) taskMap[key] = [];
      taskMap[key].push(t);
    }
    log("Unique project|title keys: " + Object.keys(taskMap).length);

    // ── 5. Match & update ─────────────────────────────────────────────────
    let updated = 0, notFound = 0, skipped = 0, errors = 0;
    const notFoundList = [];

    for (let ri = 0; ri < rows.length; ri++) {
      const row = rows[ri];
      const key = normalize(row.project) + "|" + normalize(row.component);
      const matched = taskMap[key];

      if (!matched || matched.length === 0) {
        notFound++;
        notFoundList.push(`[${row.project}] ${row.component}`);
        continue;
      }

      const newStatus = row.status ? (STATUS_MAP[row.status.toUpperCase()] || null) : null;

      for (const task of matched) {
        const patch = {};
        if (newStatus && task.status !== newStatus)
          patch.status = newStatus;
        if (row.detailer && row.detailer !== task.detailer)
          patch.detailer = row.detailer;
        if (row.checker && row.checker !== task.checker)
          patch.checker = row.checker;
        if (row.subDate && row.subDate !== task.client_sub_date)
          patch.client_sub_date = row.subDate;

        if (Object.keys(patch).length === 0) { skipped++; continue; }

        try {
          const { error } = await supabase.from("tasks").update(patch).eq("id", task.id);
          if (error) {
            log(`ERR [${row.project}/${row.component}]: ${error.message}`);
            errors++;
          } else {
            updated++;
          }
        } catch (e) {
          log(`THROW [${row.project}/${row.component}]: ${e.message}`);
          errors++;
        }
      }

      if ((ri + 1) % 50 === 0) log(`Progress: ${ri + 1}/${rows.length} rows processed...`);
    }

    log("");
    log("=== Formcrete Update Complete ===");
    log(`Excel rows:          ${rows.length}`);
    log(`Matched:             ${rows.length - notFound}`);
    log(`Updated:             ${updated}`);
    log(`Skipped (no change): ${skipped}`);
    log(`Not found:           ${notFound}`);
    log(`Errors:              ${errors}`);
    if (notFoundList.length) {
      log("");
      log("Unmatched rows:");
      for (const x of notFoundList) log("  " + x);
    }

  } catch (fatalErr) {
    log("FATAL: " + fatalErr.message);
    log(fatalErr.stack);
  }

  // Write result to a separate file (no stdout conflict)
  fs.writeFileSync(RESULT_FILE, lines.join("\n") + "\n");
  process.stdout.write("\nResult saved to: " + RESULT_FILE + "\n");
}

main();
