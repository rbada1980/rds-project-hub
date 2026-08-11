// update-formcrete-2026.cjs
// Updates existing Formcrete tasks in Supabase + local PG from Excel
// Matches by project_id + title (case-insensitive), updates status/dates/detailer

const XLSX  = require("xlsx");
const { createClient } = require("@supabase/supabase-js");
const { Pool } = require("pg");
const path  = require("path");
const fs    = require("fs");

const sb = createClient(
  "https://xypcbioltukahipkqqzc.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGNiaW9sdHVrYWhpcGtxcXpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTQzMTM2NSwiZXhwIjoyMDk1MDA3MzY1fQ.AoLxjBk3MR3_qjsCP50xzbyx7cp_kaQlVmN_eP_xuYU"
);

const pool = new Pool({
  host:"localhost", port:5432, database:"rds_local", user:"postgres", password:"rds2026"
});

const EXCEL_PATH = path.join(__dirname, "Formcrete Projects Tracker_2026.xlsx");
const CLIENT = "Formcrete";

const STATUS_MAP = {
  "COMPLETED":       "Completed",
  "IN PROGRESS":     "In Progress",
  "NOT YET STARTED": "Not Yet Started",
};

const DETAILER_MAP = {
  "swathi":"Swathi","swa":"Swathi",
  "sai":"Sai",
  "dhanush":"Dhanush",
  "sridevi":"Sridevi",
  "balaram":"Balaram",
  "jagadeesh":"Jagadeesh",
  "nanaji":"Nanaji",
  "trisha":"Trisha",
  "chandra mouli":"Chandra Mouli","chandra":"Chandra Mouli",
};

function normName(raw) {
  if (!raw) return null;
  const first = raw.split(/[&,\/]/)[0].trim().toLowerCase();
  return DETAILER_MAP[first] || raw.trim();
}

function excelDateToISO(v) {
  if (!v) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "number") {
    const d = new Date(Math.round((v - 25569) * 86400 * 1000));
    return d.toISOString().slice(0, 10);
  }
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v.trim())) return v.trim();
  return null;
}

async function main() {
  if (!fs.existsSync(EXCEL_PATH)) {
    console.error("❌ File not found:", EXCEL_PATH);
    process.exit(1);
  }

  console.log("📂 Reading Excel...");
  const wb = XLSX.readFile(EXCEL_PATH, { cellDates: true });
  const raw = XLSX.utils.sheet_to_json(wb.Sheets["PROJECTS"], { header:1, defval:null });

  const excelTasks = [];
  for (let i = 5; i < raw.length; i++) {
    const r = raw[i];
    const projName = r[2] ? String(r[2]).trim() : null;
    const title    = r[5] ? String(r[5]).trim() : null;
    if (!projName || !title) continue;
    const statusRaw = r[7] ? String(r[7]).trim().toUpperCase() : "";
    excelTasks.push({
      project:         projName,
      title,
      status:          STATUS_MAP[statusRaw] || "Not Yet Started",
      client_sub_date: excelDateToISO(r[8]),
      due_date:        excelDateToISO(r[9]),
      detailer:        normName(r[14] ? String(r[14]) : null),
      checker:         normName(r[15] ? String(r[15]) : null),
    });
  }
  console.log(`📋 Excel: ${excelTasks.length} tasks`);

  // Fetch existing projects
  const { data: projects } = await sb.from("projects").select("id,name").eq("client", CLIENT);
  const projByName = {};
  (projects || []).forEach(p => { projByName[p.name.toLowerCase()] = p; });
  console.log(`🗂  Projects in DB: ${(projects||[]).length}`);

  // Fetch existing tasks
  const projIds = Object.values(projByName).map(p => p.id);
  const { data: dbTasks } = await sb.from("tasks").select("id,title,project_id,status,client_sub_date,due_date,detailer,checker").in("project_id", projIds);

  // Build lookup: project_id|title_lower → task
  const taskMap = {};
  (dbTasks || []).forEach(t => {
    taskMap[`${t.project_id}|${t.title.toLowerCase()}`] = t;
  });
  console.log(`📌 Tasks in DB: ${(dbTasks||[]).length}`);

  let updated = 0, inserted = 0, skipped = 0, notFound = 0;

  for (const et of excelTasks) {
    const proj = projByName[et.project.toLowerCase()];
    if (!proj) {
      // Create missing project
      const { data: np, error } = await sb.from("projects").insert({ name: et.project, client: CLIENT, status: "Active" }).select("id,name").single();
      if (error) { console.warn(`⚠ Cannot create project "${et.project}":`, error.message); notFound++; continue; }
      projByName[et.project.toLowerCase()] = np;
      try { await pool.query(`INSERT INTO projects(id,name,client,status,created_at) VALUES($1,$2,$3,$4,NOW()) ON CONFLICT(id) DO NOTHING`, [np.id, np.name, CLIENT, "Active"]); } catch(_) {}
      console.log(`➕ Created project: ${et.project}`);
    }

    const projId = (projByName[et.project.toLowerCase()] || {}).id;
    if (!projId) { notFound++; continue; }

    const key = `${projId}|${et.title.toLowerCase()}`;
    const existing = taskMap[key];

    if (existing) {
      // Build update payload — only changed fields
      const patch = {};
      if (et.status && et.status !== existing.status) patch.status = et.status;
      if (et.client_sub_date && et.client_sub_date !== existing.client_sub_date) patch.client_sub_date = et.client_sub_date;
      if (et.due_date && et.due_date !== existing.due_date) patch.due_date = et.due_date;
      if (et.detailer && et.detailer !== existing.detailer) patch.detailer = et.detailer;
      if (et.checker && et.checker !== existing.checker) patch.checker = et.checker;
      // Also set assignee = detailer if detailer changed
      if (patch.detailer) patch.assignee = patch.detailer;

      if (Object.keys(patch).length === 0) { skipped++; continue; }

      const { error } = await sb.from("tasks").update(patch).eq("id", existing.id);
      if (error) { console.error(`❌ Update failed "${et.title}":`, error.message); }
      else {
        try {
          const sets = Object.keys(patch).map((k,i) => `${k}=$${i+2}`).join(",");
          const vals = [existing.id, ...Object.values(patch)];
          await pool.query(`UPDATE tasks SET ${sets} WHERE id=$1`, vals);
        } catch(_) {}
        updated++;
      }
    } else {
      // Insert missing task
      const payload = {
        project_id: projId, client: CLIENT, title: et.title,
        status: et.status, client_sub_date: et.client_sub_date,
        due_date: et.due_date, assignee: et.detailer,
        detailer: et.detailer, checker: et.checker, priority: "Medium",
      };
      const { data: nt, error } = await sb.from("tasks").insert(payload).select("id").single();
      if (error) { console.error(`❌ Insert failed "${et.title}":`, error.message); }
      else {
        try { await pool.query(`INSERT INTO tasks(id,project_id,client,title,status,client_sub_date,due_date,assignee,detailer,checker,priority,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW()) ON CONFLICT(id) DO NOTHING`,
          [nt.id, projId, CLIENT, et.title, et.status, et.client_sub_date, et.due_date, et.detailer, et.detailer, et.checker, "Medium"]); } catch(_) {}
        taskMap[key] = { id: nt.id, ...payload };
        inserted++;
      }
    }
  }

  console.log(`\n✅ Done!`);
  console.log(`   Updated  : ${updated}`);
  console.log(`   Inserted : ${inserted} (new tasks)`);
  console.log(`   Skipped  : ${skipped} (no changes)`);
  console.log(`   Not found: ${notFound}`);
  await pool.end();
}

main().catch(e => { console.error("FATAL:", e.message); process.exit(1); });
