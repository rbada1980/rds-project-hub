// update-ksp.cjs — Upsert KS&P Limited tasks from ksp-tekla-format.xlsx
const { createClient } = require("@supabase/supabase-js");
const { Pool } = require("pg");
const XLSX = require("xlsx");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const supabase = createClient(
  "https://xypcbioltukahipkqqzc.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGNiaW9sdHVrYWhpcGtxcXpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTQzMTM2NSwiZXhwIjoyMDk1MDA3MzY1fQ.AoLxjBk3MR3_qjsCP50xzbyx7cp_kaQlVmN_eP_xuYU"
);
const pool = new Pool({ host:"localhost", port:5432, database:"rds_local", user:"postgres", password:"rds2026" });

const lines = [];
function log(msg) { process.stdout.write(msg+"\n"); lines.push(msg); }

// Pure UTC serial conversion — avoids IST timezone shift entirely
// Excel epoch anchor = Dec 30, 1899 UTC (accounts for Lotus leap-year bug)
const EXCEL_EPOCH_MS = Date.UTC(1899, 11, 30); // milliseconds

function excelDateToISO(val) {
  if (!val) return null;
  if (typeof val === "number") {
    const ms = EXCEL_EPOCH_MS + Math.floor(val) * 86400 * 1000;
    const d = new Date(ms);
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,"0")}-${String(d.getUTCDate()).padStart(2,"0")}`;
  }
  if (val instanceof Date) {
    // Shouldn't reach here when cellDates is off, but handle safely
    if (isNaN(val)) return null;
    const ms = EXCEL_EPOCH_MS; // fallback: treat as UTC
    // Use UTC date methods to avoid timezone shift
    return val.toISOString().slice(0, 10);
  }
  const s = String(val).trim();
  if (/^\d{2}-\d{2}-\d{4}$/.test(s)) return `${s.slice(6)}-${s.slice(3,5)}-${s.slice(0,2)}`; // DD-MM-YYYY (Indian)
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0,10);
  return null;
}

function normalize(s) { return (s||"").toString().trim().toLowerCase().replace(/\s+/g," "); }
function strOrNull(v) { const s = v ? String(v).trim() : null; return s || null; }

// Map Excel status values to DB-allowed values
function mapStatus(s) {
  if (!s) return null;
  const map = {
    "in process":   "In Progress",
    "in progress":  "In Progress",
    "inprocess":    "In Progress",
    "completed":    "Completed",
    "complete":     "Completed",
    "done":         "Completed",
    "pending":      "Pending",
    "on hold":      "On Hold",
    "cancelled":    "Cancelled",
    "canceled":     "Cancelled",
  };
  return map[s.toLowerCase().trim()] || s;
}

async function main() {
  try {
    // Try uploads path (newest file from Claude session), then local fallback
    const EXCEL_NEW     = path.join(__dirname, "ksp-new.xlsx");
    const EXCEL_LOCAL   = path.join(__dirname, "ksp-tekla-format.xlsx");
    const EXCEL = fs.existsSync(EXCEL_NEW) ? EXCEL_NEW : EXCEL_LOCAL;
    log("Using Excel: " + EXCEL);
    if (!fs.existsSync(EXCEL)) { log("ERROR: Excel not found"); return; }
    log("Reading: " + EXCEL);

    // 1. Parse Excel
    const wb = XLSX.readFile(EXCEL); // no cellDates — we convert serials manually
    const sheetName = wb.SheetNames[0];
    log("Sheet: " + sheetName);
    const ws = wb.Sheets[sheetName];
    const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

    // Find header row (contains "TASK" column)
    let hr = -1;
    for (let i = 0; i < Math.min(6, raw.length); i++) {
      const cells = (raw[i]||[]).map(c=>(c||"").toString().trim().toUpperCase());
      if (cells.includes("TASK")) { hr = i; break; }
    }
    if (hr < 0) { log("ERROR: Could not find header row with TASK column"); return; }

    const headers = (raw[hr]||[]).map(c=>(c||"").toString().trim().toUpperCase());
    log("Headers: " + headers.filter(Boolean).join(" | "));
    const COL = {};
    headers.forEach((h,i) => { if(h) COL[h]=i; });

    // Find row-number column (could be "#" or "SL. NO." etc.)
    const rowNumKey = Object.keys(COL).find(k => /^#$|sl\.?\s*no/i.test(k)) || "#";
    log("Row number column: \"" + rowNumKey + "\" (index " + COL[rowNumKey] + ")");

    // Parse task rows (row-number column must be a number)
    const excelTasks = [];
    for (let i = hr+1; i < raw.length; i++) {
      const r = raw[i];
      if (!r) continue;
      const num = r[COL[rowNumKey]];
      if (typeof num !== "number") continue;
      const title = strOrNull(r[COL["TASK"]]);
      const project = strOrNull(r[COL["PROJECT"]]);
      if (!title || !project) continue;
      excelTasks.push({
        title,
        project,
        status:         strOrNull(r[COL["STATUS"]]),
        priority:       strOrNull(r[COL["PRIORITY"]]),
        assignee:       strOrNull(r[COL["ASSIGNEE"]]),
        detailer:       strOrNull(r[COL["DETAILER"]]),
        checker:        strOrNull(r[COL["CHECKER"]]),
        client_sub_date: excelDateToISO(COL["CLIENT SUB DATE"] !== undefined ? r[COL["CLIENT SUB DATE"]] : null),
      });
    }

    log(`\nTasks parsed from Excel: ${excelTasks.length}`);
    excelTasks.forEach(t =>
      log(`  "${t.title}" | project="${t.project}" | status=${t.status} | assignee=${t.assignee} | date=${t.client_sub_date}`)
    );

    // 2. Find or create KS&P Limited projects in Supabase
    const projectNames = [...new Set(excelTasks.map(t=>t.project))];
    log(`\nProjects needed: ${projectNames.join(", ")}`);
    const pidMap = {}; // project name → project id

    for (const pname of projectNames) {
      const { data: found } = await supabase.from("projects")
        .select("id,name")
        .ilike("name", pname)
        .eq("client", "KS&P Limited");

      if (found && found.length > 0) {
        pidMap[pname] = found[0].id;
        log(`Project "${pname}" already exists: ${found[0].id}`);
      } else {
        // Create new project
        const { data: created, error } = await supabase.from("projects")
          .insert({ name: pname, client: "KS&P Limited", status: "Active" })
          .select("id,name");
        if (error) { log(`ERR creating project "${pname}": ${error.message}`); continue; }
        pidMap[pname] = created[0].id;
        log(`Project "${pname}" CREATED: ${created[0].id}`);
        // Sync new project to local PG
        try {
          await pool.query(
            `INSERT INTO projects (id, name, client, status, created_at, updated_at)
             VALUES ($1,$2,'KS&P Limited','Active',NOW(),NOW())
             ON CONFLICT (id) DO NOTHING`,
            [created[0].id, pname]
          );
        } catch(pgE) { log("PG project insert warn: "+pgE.message); }
      }
    }

    // 3. Fetch existing tasks for these projects from Supabase
    const existingMap = {}; // normalize(title)+"||"+pid → task row
    for (const [pname, pid] of Object.entries(pidMap)) {
      const { data: tasks } = await supabase.from("tasks")
        .select("id,title,status,assignee,detailer,checker,client_sub_date")
        .eq("project_id", pid);
      log(`Existing tasks in "${pname}": ${(tasks||[]).length}`);
      (tasks||[]).forEach(t => { existingMap[normalize(t.title)+"||"+pid] = t; });
    }

    // 4. Upsert tasks
    let updated=0, inserted=0, skipped=0, errors=0;

    for (const t of excelTasks) {
      const pid = pidMap[t.project];
      if (!pid) { log(`SKIP (no project id): "${t.title}"`); skipped++; continue; }

      const key = normalize(t.title)+"||"+pid;
      const existing = existingMap[key];

      if (existing) {
        // Check if any field changed
        const dbDate = existing.client_sub_date ? String(existing.client_sub_date).slice(0,10) : null;
        const noChange =
          existing.status    === t.status &&
          existing.assignee  === t.assignee &&
          existing.detailer  === t.detailer &&
          existing.checker   === t.checker &&
          dbDate             === t.client_sub_date;

        if (noChange) { log(`SKIP (no change): "${t.title}"`); skipped++; continue; }

        const upd = { updated_at: new Date().toISOString() };
        if (t.status)          upd.status          = t.status;
        if (t.assignee)        upd.assignee        = t.assignee;
        if (t.detailer)        upd.detailer        = t.detailer;
        if (t.checker)         upd.checker         = t.checker;
        if (t.client_sub_date) upd.client_sub_date = t.client_sub_date;

        const { error } = await supabase.from("tasks").update(upd).eq("id", existing.id);
        if (error) { log(`ERR updating "${t.title}": ${error.message}`); errors++; }
        else {
          log(`UPDATED: "${t.title}"`);
          updated++;
          // Sync to local PG
          try {
            await pool.query(
              `UPDATE tasks SET status=$1,assignee=$2,detailer=$3,checker=$4,client_sub_date=$5,updated_at=NOW() WHERE id=$6`,
              [t.status, t.assignee, t.detailer, t.checker, t.client_sub_date, existing.id]
            );
          } catch(pgE) { log("  PG update warn: "+pgE.message); }
        }

      } else {
        // INSERT new task
        const ins = {
          project_id:      pid,
          title:           t.title,
          status:          t.status || "Pending",
          assignee:        t.assignee,
          detailer:        t.detailer,
          checker:         t.checker,
          client_sub_date: t.client_sub_date,
        };
        if (t.priority) ins.priority = t.priority;

        const { data: created, error } = await supabase.from("tasks").insert(ins).select("id");
        if (error) {
          // Retry without priority if that's the issue
          if (error.message.includes("priority")) {
            delete ins.priority;
            const { data: c2, error: e2 } = await supabase.from("tasks").insert(ins).select("id");
            if (e2) { log(`ERR inserting "${t.title}": ${e2.message}`); errors++; continue; }
            log(`INSERTED (no priority field): "${t.title}" → ${c2[0].id}`);
            inserted++;
            // Sync to local PG
            try {
              await pool.query(
                `INSERT INTO tasks (id,project_id,title,status,assignee,detailer,checker,client_sub_date,created_at,updated_at)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),NOW()) ON CONFLICT(id) DO NOTHING`,
                [c2[0].id, pid, t.title, ins.status, ins.assignee, ins.detailer, ins.checker, ins.client_sub_date]
              );
            } catch(pgE) { log("  PG insert warn: "+pgE.message); }
          } else {
            log(`ERR inserting "${t.title}": ${error.message}`); errors++;
          }
        } else {
          log(`INSERTED: "${t.title}" → ${created[0].id}`);
          inserted++;
          // Sync to local PG
          try {
            await pool.query(
              `INSERT INTO tasks (id,project_id,title,status,assignee,detailer,checker,client_sub_date,created_at,updated_at)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),NOW()) ON CONFLICT(id) DO NOTHING`,
              [created[0].id, pid, t.title, ins.status, ins.assignee, ins.detailer, ins.checker, ins.client_sub_date]
            );
          } catch(pgE) { log("  PG insert warn: "+pgE.message); }
        }
      }
    }

    log("\n=== Summary ===");
    log(`Updated:  ${updated}`);
    log(`Inserted: ${inserted}`);
    log(`Skipped:  ${skipped}`);
    log(`Errors:   ${errors}`);

    // 5. Final verify — show all KS&P tasks in Supabase
    log("\n=== Final KS&P Tasks in Supabase ===");
    for (const [pname, pid] of Object.entries(pidMap)) {
      const { data: final } = await supabase.from("tasks")
        .select("title,status,assignee,client_sub_date")
        .eq("project_id", pid);
      log(`\n"${pname}" (${(final||[]).length} tasks):`);
      (final||[]).forEach(t => log(`  "${t.title}" | ${t.status} | ${t.assignee} | ${t.client_sub_date}`));
    }

  } catch(err) {
    log("FATAL: "+err.message+"\n"+err.stack);
  } finally {
    await pool.end();
  }
  try { fs.writeFileSync(path.join(__dirname,"ksp-update-result.txt"), lines.join("\n")+"\n"); } catch(e){}
}
main();
