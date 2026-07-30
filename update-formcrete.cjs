// Import/update 450 Formcrete tasks from formcrete-new.xlsx into Supabase + local PG
const path = require("path");
const fs   = require("fs");
const XLSX = require("xlsx");
const { createClient } = require("@supabase/supabase-js");
const { Pool } = require("pg");

const SUPABASE_URL = "https://xypcbioltukahipkqqzc.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGNiaW9sdHVrYWhpcGtxcXpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTQzMTM2NSwiZXhwIjoyMDk1MDA3MzY1fQ.AoLxjBk3MR3_qjsCP50xzbyx7cp_kaQlVmN_eP_xuYU";
const CLIENT_NAME  = "Formcrete";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const pool     = new Pool({ host:"localhost", port:5432, database:"rds_local", user:"postgres", password:"rds2026" });

const EXCEL_PATH = path.join(__dirname, "formcrete-new.xlsx");

function log(msg) {
  console.log(msg);
}

// Excel date serial → ISO date string (UTC, avoids IST -1 day bug)
const EXCEL_EPOCH_MS = Date.UTC(1899, 11, 30);
function excelDateToISO(val) {
  if (!val || typeof val !== "number") return null;
  const ms = EXCEL_EPOCH_MS + Math.floor(val) * 86400 * 1000;
  const d  = new Date(ms);
  const y  = d.getUTCFullYear();
  const m  = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

// If xlsx gives us a JS Date object, convert to ISO string
function toISODate(val) {
  if (!val) return null;
  if (val instanceof Date) {
    const y  = val.getFullYear();
    const m  = String(val.getMonth() + 1).padStart(2, "0");
    const dd = String(val.getDate()).padStart(2, "0");
    return `${y}-${m}-${dd}`;
  }
  if (typeof val === "number") return excelDateToISO(val);
  return null;
}

function mapStatus(raw) {
  if (!raw) return null;
  const s = String(raw).trim().toUpperCase();
  if (s === "COMPLETED")       return "Completed";
  if (s === "NOT YET STARTED") return "Not Yet Started";
  if (s === "IN PROGRESS")     return "In Progress";
  // "hold" or anything else → skip
  return null;
}

function strOrNull(v) {
  if (v === undefined || v === null || String(v).trim() === "") return null;
  return String(v).trim();
}

async function main() {
  if (!fs.existsSync(EXCEL_PATH)) {
    log("ERROR: " + EXCEL_PATH + " not found. Run write-formcrete-excel.cjs first.");
    process.exit(1);
  }

  log("Reading: " + EXCEL_PATH);
  const wb = XLSX.readFile(EXCEL_PATH, { cellDates: true });
  const ws = wb.Sheets["PROJECTS"];
  if (!ws) {
    log("ERROR: Sheet 'PROJECTS' not found. Sheets: " + wb.SheetNames.join(", "));
    process.exit(1);
  }

  // Header is at row 2 (0-indexed), data starts at row 3
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: null });
  log("Total rows in sheet: " + rows.length);

  // Find header row
  let headerIdx = -1;
  for (let i = 0; i < rows.length; i++) {
    if (rows[i] && rows[i][0] && String(rows[i][0]).trim().toUpperCase() === "PROJECT NAME") {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx < 0) {
    log("ERROR: Could not find header row with 'PROJECT NAME'");
    process.exit(1);
  }
  log("Header at row index: " + headerIdx);

  // Parse tasks - re-read with cellDates:true to get actual date objects
  const wb2 = XLSX.readFile(EXCEL_PATH, { cellDates: true });
  const ws2  = wb2.Sheets["PROJECTS"];
  const rows2 = XLSX.utils.sheet_to_json(ws2, { header: 1, raw: true, defval: null });

  const COL = { PROJECT: 0, SCOPE: 1, TASK: 2, STATUS: 3, SUB_DATE: 4, DUE_DATE: 5, DET_WT: 6, DETAILER: 7, CHECKER: 8 };

  const tasks = [];
  let lastProject = null;
  for (let i = headerIdx + 1; i < rows2.length; i++) {
    const row = rows2[i];
    // Track project name (may span multiple rows)
    if (row[COL.PROJECT] && String(row[COL.PROJECT]).trim()) {
      lastProject = String(row[COL.PROJECT]).trim();
    }
    const taskTitle = strOrNull(row[COL.TASK]);
    if (!lastProject || !taskTitle) continue;

    const rawStatus = strOrNull(row[COL.STATUS]);
    const status    = mapStatus(rawStatus);
    // Skip "hold" rows
    if (rawStatus && !status) {
      log(`SKIP (hold): "${taskTitle}" in "${lastProject}"`);
      continue;
    }

    const subDateRaw = row[COL.SUB_DATE];
    const dueDateRaw = row[COL.DUE_DATE];

    tasks.push({
      project:        lastProject,
      title:          taskTitle,
      scope:          strOrNull(row[COL.SCOPE]),
      status:         status || "Not Yet Started",
      client_sub_date: subDateRaw instanceof Date ? toISODate(subDateRaw) : (typeof subDateRaw === "number" ? excelDateToISO(subDateRaw) : null),
      due_date:       dueDateRaw instanceof Date ? toISODate(dueDateRaw) : (typeof dueDateRaw === "number" ? excelDateToISO(dueDateRaw) : null),
      detailer:       strOrNull(row[COL.DETAILER]),
      checker:        strOrNull(row[COL.CHECKER]),
    });
  }

  log("\nTasks parsed: " + tasks.length);

  // Get project names
  const projectNames = [...new Set(tasks.map(t => t.project))];
  log("Projects: " + projectNames.join(", "));

  // 1. Get or create projects (projects table has a text "client" column, not client_id)
  log(`\nClient: "${CLIENT_NAME}"`);
  const projectIdMap = {};
  for (const pName of projectNames) {
    let { data: proj } = await supabase
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
      log(`Project "${pName}": ${np.id} (created)`);

      // Sync new project to local PG
      try {
        await pool.query(
          `INSERT INTO projects (id, name, client, created_at, updated_at)
           VALUES ($1,$2,$3,NOW(),NOW()) ON CONFLICT (id) DO NOTHING`,
          [np.id, pName, CLIENT_NAME]
        );
      } catch(pgE) { log(`  PG project insert warn: ${pgE.message}`); }
    }
  }

  // 3. Get existing tasks for all Formcrete projects
  const projectIds = Object.values(projectIdMap);
  let { data: existingTasks } = await supabase
    .from("tasks").select("id,title,project_id,status,due_date,client_sub_date,detailer,checker")
    .in("project_id", projectIds);
  existingTasks = existingTasks || [];
  log(`\nExisting tasks in DB: ${existingTasks.length}`);

  // Build lookup: project_id + title → task
  const existingMap = {};
  for (const t of existingTasks) {
    const key = t.project_id + "|" + t.title.trim().toLowerCase();
    existingMap[key] = t;
  }

  // 4. Upsert tasks
  let updated = 0, inserted = 0, skipped = 0, errors = 0;

  for (const t of tasks) {
    const projId = projectIdMap[t.project];
    if (!projId) { log(`SKIP (no project): "${t.title}"`); skipped++; continue; }

    const key = projId + "|" + t.title.trim().toLowerCase();
    const existing = existingMap[key];

    const payload = {
      title:          t.title,
      project_id:     projId,
      status:         t.status,
      due_date:       t.due_date,
      client_sub_date: t.client_sub_date,
      updated_at:     new Date().toISOString(),
    };
    // Only set detailer/checker if Excel has a value (don't wipe existing)
    if (t.detailer) payload.detailer = t.detailer;
    if (t.checker)  payload.checker  = t.checker;

    if (existing) {
      // Check if anything changed
      const same =
        existing.status         === t.status &&
        existing.due_date       === t.due_date &&
        existing.client_sub_date === t.client_sub_date &&
        (!t.detailer || existing.detailer === t.detailer) &&
        (!t.checker  || existing.checker  === t.checker);

      if (same) {
        log(`SKIP (no change): "${t.title}" [${t.project}]`);
        skipped++;
        continue;
      }

      const { error } = await supabase.from("tasks")
        .update(payload).eq("id", existing.id);
      if (error) {
        log(`ERR UPDATE "${t.title}": ` + error.message);
        errors++;
        continue;
      }
      log(`UPDATED: "${t.title}" [${t.project}] → ${t.status}`);

      // Local PG
      const pgFields = ["status=$1","due_date=$2","client_sub_date=$3","updated_at=NOW()"];
      const pgVals   = [t.status, t.due_date, t.client_sub_date];
      if (t.detailer) { pgFields.push(`detailer=$${pgVals.length+1}`); pgVals.push(t.detailer); }
      if (t.checker)  { pgFields.push(`checker=$${pgVals.length+1}`);  pgVals.push(t.checker); }
      pgVals.push(existing.id);
      try {
        await pool.query(`UPDATE tasks SET ${pgFields.join(",")} WHERE id=$${pgVals.length}`, pgVals);
      } catch(pgE) { log(`  PG ERR: ${pgE.message}`); }

      updated++;
    } else {
      // Insert new task
      const ins = { ...payload, created_at: new Date().toISOString() };
      if (!ins.detailer && t.detailer) ins.detailer = t.detailer;
      if (!ins.checker  && t.checker)  ins.checker  = t.checker;

      const { data: newTask, error } = await supabase.from("tasks")
        .insert(ins).select("id").single();
      if (error) {
        log(`ERR INSERT "${t.title}": ` + error.message);
        errors++;
        continue;
      }
      log(`INSERTED: "${t.title}" [${t.project}] → ${t.status}`);

      // Local PG
      try {
        await pool.query(
          `INSERT INTO tasks (id,title,project_id,status,due_date,client_sub_date,detailer,checker,created_at,updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),NOW())
           ON CONFLICT (id) DO UPDATE SET status=$4,due_date=$5,client_sub_date=$6,detailer=COALESCE($7,tasks.detailer),checker=COALESCE($8,tasks.checker),updated_at=NOW()`,
          [newTask.id, t.title, projId, t.status, t.due_date, t.client_sub_date, t.detailer, t.checker]
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

  // 5. Final verification
  log("\n=== Formcrete Projects & Tasks in Supabase ===");
  for (const pName of projectNames) {
    const pid = projectIdMap[pName];
    if (!pid) continue;
    const { data: finalTasks } = await supabase
      .from("tasks").select("title,status,due_date")
      .eq("project_id", pid).order("title");
    log(`\n"${pName}" (${finalTasks ? finalTasks.length : 0} tasks):`);
    if (finalTasks) {
      for (const ft of finalTasks) {
        log(`  "${ft.title}" | ${ft.status} | ${ft.due_date || "no date"}`);
      }
    }
  }

  await pool.end();
}

main().catch(e => { log("FATAL: " + e.message); pool.end(); process.exit(1); });
