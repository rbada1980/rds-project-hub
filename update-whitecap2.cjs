// Import/update White Cap tasks from whitecap2-new.xlsx into Supabase + local PG
const path = require("path");
const fs   = require("fs");
const XLSX = require("xlsx");
const { createClient } = require("@supabase/supabase-js");
const { Pool } = require("pg");

const SUPABASE_URL = "https://xypcbioltukahipkqqzc.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGNiaW9sdHVrYWhpcGtxcXpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTQzMTM2NSwiZXhwIjoyMDk1MDA3MzY1fQ.AoLxjBk3MR3_qjsCP50xzbyx7cp_kaQlVmN_eP_xuYU";
const CLIENT_NAME  = "White Cap";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const pool     = new Pool({ host:"localhost", port:5432, database:"rds_local", user:"postgres", password:"rds2026" });

const EXCEL_PATH = path.join(__dirname, "whitecap2-new.xlsx");

function log(msg) { console.log(msg); }

// Excel date serial → ISO string (pure UTC, avoids IST -1 day bug)
const EXCEL_EPOCH_MS = Date.UTC(1899, 11, 30);
function excelDateToISO(val) {
  if (!val) return null;
  if (val instanceof Date) {
    if (isNaN(val)) return null;
    return val.toISOString().slice(0, 10);
  }
  if (typeof val === "number") {
    const ms = EXCEL_EPOCH_MS + Math.floor(val) * 86400 * 1000;
    const d  = new Date(ms);
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,"0")}-${String(d.getUTCDate()).padStart(2,"0")}`;
  }
  // Handle text dates like "01-29-2026" (MM-DD-YYYY)
  const s = String(val).trim();
  if (/^\d{2}-\d{2}-\d{4}$/.test(s)) {
    return `${s.slice(6)}-${s.slice(0,2)}-${s.slice(3,5)}`; // MM-DD-YYYY → YYYY-MM-DD
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return null;
}

function mapStatus(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  const upper = s.toUpperCase();
  if (upper === "COMPLETED")       return "Completed";
  if (upper === "NOT YET STARTED") return "Not Yet Started";
  if (upper === "INPROGRESS" || upper === "IN PROGRESS") return "In Progress";
  if (s.toLowerCase() === "job canceled") return "job canceled";
  return s; // pass through as-is
}

function strOrNull(v) {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s || null;
}

async function main() {
  if (!fs.existsSync(EXCEL_PATH)) {
    log("ERROR: " + EXCEL_PATH + " not found. Run write-whitecap2-excel.cjs first.");
    process.exit(1);
  }

  log("Reading: " + EXCEL_PATH);
  const wb   = XLSX.readFile(EXCEL_PATH, { cellDates: true });
  // Use "White Cap Work Schedule" sheet (contains the data)
  const sheetName = wb.SheetNames.find(s => /work\s*schedule/i.test(s)) || wb.SheetNames[wb.SheetNames.length - 1];
  log("Sheet: " + sheetName);
  const ws   = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null });
  log("Total rows: " + rows.length);

  // Find header row
  let headerIdx = -1;
  for (let i = 0; i < Math.min(5, rows.length); i++) {
    const r = rows[i];
    if (r && r[0] && /project\s*name/i.test(String(r[0]))) { headerIdx = i; break; }
  }
  if (headerIdx < 0) { log("ERROR: Header row not found"); process.exit(1); }
  log("Header at row index: " + headerIdx);

  // COL indices: PROJECT NAME(0) | Tasks(1) | STATUS(2) | CLIENT SUB. DATE(3) | DETAILER(4) | CHECKER(5)
  const COL = { PROJECT: 0, TASK: 1, STATUS: 2, SUB_DATE: 3, DETAILER: 4, CHECKER: 5 };

  const tasks = [];
  let lastProject = null;
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;
    // Track project name (spans multiple rows)
    if (row[COL.PROJECT] && String(row[COL.PROJECT]).trim()) {
      lastProject = String(row[COL.PROJECT]).trim();
    }
    const taskTitle = strOrNull(row[COL.TASK]);
    if (!lastProject || !taskTitle) continue;

    const rawStatus = strOrNull(row[COL.STATUS]);
    const status    = mapStatus(rawStatus) || "Not Yet Started";

    tasks.push({
      project:        lastProject,
      title:          taskTitle,
      status,
      client_sub_date: excelDateToISO(row[COL.SUB_DATE]),
      detailer:       strOrNull(row[COL.DETAILER]),
      checker:        strOrNull(row[COL.CHECKER]),
    });
  }

  log("Tasks parsed: " + tasks.length);
  const projectNames = [...new Set(tasks.map(t => t.project))];
  log("Projects (" + projectNames.length + "): " + projectNames.join(", "));

  // 1. Get or create projects
  log("\nClient: \"" + CLIENT_NAME + "\"");
  const projectIdMap = {};
  for (const pName of projectNames) {
    const { data: proj } = await supabase
      .from("projects").select("id,name")
      .eq("client", CLIENT_NAME).ilike("name", pName);

    if (proj && proj.length > 0) {
      projectIdMap[pName] = proj[0].id;
      log(`Project "${pName}": ${proj[0].id} (existing)`);
    } else {
      const { data: np, error: npErr } = await supabase
        .from("projects").insert({ name: pName, client: CLIENT_NAME }).select("id").single();
      if (npErr) { log(`ERROR creating project "${pName}": ` + npErr.message); continue; }
      projectIdMap[pName] = np.id;
      log(`Project "${pName}": ${np.id} (CREATED)`);

      // Sync to local PG
      try {
        await pool.query(
          `INSERT INTO projects (id, name, client, created_at, updated_at)
           VALUES ($1,$2,$3,NOW(),NOW()) ON CONFLICT (id) DO NOTHING`,
          [np.id, pName, CLIENT_NAME]
        );
      } catch(pgE) { log(`  PG project warn: ${pgE.message}`); }
    }
  }

  // 2. Get existing tasks for all White Cap projects
  const projectIds = Object.values(projectIdMap);
  if (projectIds.length === 0) { log("ERROR: No projects resolved"); await pool.end(); return; }

  let { data: existingTasks } = await supabase
    .from("tasks").select("id,title,project_id,status,client_sub_date,detailer,checker")
    .in("project_id", projectIds);
  existingTasks = existingTasks || [];
  log(`\nExisting tasks in DB: ${existingTasks.length}`);

  const existingMap = {};
  for (const t of existingTasks) {
    const key = t.project_id + "|" + t.title.trim().toLowerCase();
    existingMap[key] = t;
  }

  // 3. Upsert
  let updated = 0, inserted = 0, skipped = 0, errors = 0;
  for (const t of tasks) {
    const projId = projectIdMap[t.project];
    if (!projId) { skipped++; continue; }

    const key      = projId + "|" + t.title.trim().toLowerCase();
    const existing = existingMap[key];

    const payload = {
      title:          t.title,
      project_id:     projId,
      status:         t.status,
      client_sub_date: t.client_sub_date,
      updated_at:     new Date().toISOString(),
    };
    if (t.detailer) payload.detailer = t.detailer;
    if (t.checker)  payload.checker  = t.checker;

    if (existing) {
      const same =
        existing.status          === t.status &&
        existing.client_sub_date === t.client_sub_date &&
        (!t.detailer || existing.detailer === t.detailer) &&
        (!t.checker  || existing.checker  === t.checker);

      if (same) { log(`SKIP: "${t.title}" [${t.project}]`); skipped++; continue; }

      const { error } = await supabase.from("tasks").update(payload).eq("id", existing.id);
      if (error) { log(`ERR UPDATE "${t.title}": ` + error.message); errors++; continue; }
      log(`UPDATED: "${t.title}" [${t.project}] → ${t.status}`);

      const pgFields = ["status=$1","client_sub_date=$2","updated_at=NOW()"];
      const pgVals   = [t.status, t.client_sub_date];
      if (t.detailer) { pgFields.push(`detailer=$${pgVals.length+1}`); pgVals.push(t.detailer); }
      if (t.checker)  { pgFields.push(`checker=$${pgVals.length+1}`);  pgVals.push(t.checker); }
      pgVals.push(existing.id);
      try { await pool.query(`UPDATE tasks SET ${pgFields.join(",")} WHERE id=$${pgVals.length}`, pgVals); }
      catch(pgE) { log(`  PG ERR: ${pgE.message}`); }
      updated++;
    } else {
      const { data: newTask, error } = await supabase.from("tasks").insert(payload).select("id").single();
      if (error) { log(`ERR INSERT "${t.title}": ` + error.message); errors++; continue; }
      log(`INSERTED: "${t.title}" [${t.project}] → ${t.status}`);

      try {
        await pool.query(
          `INSERT INTO tasks (id,title,project_id,status,client_sub_date,detailer,checker,created_at,updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),NOW())
           ON CONFLICT (id) DO UPDATE SET status=$4,client_sub_date=$5,
             detailer=COALESCE($6,tasks.detailer),checker=COALESCE($7,tasks.checker),updated_at=NOW()`,
          [newTask.id, t.title, projId, t.status, t.client_sub_date, t.detailer, t.checker]
        );
      } catch(pgE) { log(`  PG ERR: ${pgE.message}`); }
      inserted++;
    }
  }

  log("\n=== Summary ===");
  log(`Updated:  ${updated}`);
  log(`Inserted: ${inserted}`);
  log(`Skipped:  ${skipped}`);
  log(`Errors:   ${errors}`);

  await pool.end();
}

main().catch(e => { log("FATAL: " + e.message); pool.end(); process.exit(1); });
