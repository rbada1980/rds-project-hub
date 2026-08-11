// check-all-dates.cjs
// Compares ALL tasks in DB vs their source Excel files across all clients
// Reports every date/status mismatch. Does NOT fix automatically — just reports.
// Run: node check-all-dates.cjs

const XLSX = require("xlsx");
const { createClient } = require("@supabase/supabase-js");
const path = require("path");
const fs = require("fs");

const sb = createClient(
  "https://xypcbioltukahipkqqzc.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGNiaW9sdHVrYWhpcGtxcXpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTQzMTM2NSwiZXhwIjoyMDk1MDA3MzY1fQ.AoLxjBk3MR3_qjsCP50xzbyx7cp_kaQlVmN_eP_xuYU"
);

// IST-safe date converter — handles Date objects, timestamp strings, serial numbers
function toIST(v) {
  if (!v) return null;
  if (v instanceof Date) {
    const y = v.getFullYear(), m = String(v.getMonth()+1).padStart(2,"0"), d = String(v.getDate()).padStart(2,"0");
    return `${y}-${m}-${d}`;
  }
  if (typeof v === "string") {
    if (v.includes("T") || v.includes("Z")) {
      const dt = new Date(v);
      if (isNaN(dt)) return null;
      return dt.toLocaleDateString("en-CA", {timeZone:"Asia/Kolkata"});
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(v.trim())) return v.trim();
    // DD-MM-YYYY or MM/DD/YYYY? skip
  }
  if (typeof v === "number") {
    const dt = new Date(Math.round((v-25569)*86400*1000));
    return dt.toLocaleDateString("en-CA", {timeZone:"Asia/Kolkata"});
  }
  return null;
}

const STATUS_MAP = {
  "COMPLETED": "Completed", "IN PROGRESS": "In Progress",
  "NOT YET STARTED": "Not Yet Started", "IN PROCESS": "In Process",
};

// Excel file configs — each describes one source file
const EXCEL_CONFIGS = [
  {
    client: "Formcrete",
    file: "Formcrete Projects Tracker_2026.xlsx",
    sheet: "PROJECTS",
    dataStart: 5,
    cols: { project:2, title:5, status:7, client_sub_date:8, due_date:9, detailer:14, checker:15 },
  },
  {
    client: "Formcrete",
    file: "Formcrete Projects.xlsx",
    sheet: "PROJECTS",
    dataStart: 2,
    cols: { project:0, title:2, status:3, client_sub_date:4, due_date:5, detailer:7, checker:8 },
  },
  {
    client: "White Cap",
    file: "WhiteCap_Import.xlsx",
    sheet: null, // first sheet
    dataStart: 1,
    cols: { project:2, title:4, status:6, client_sub_date:7, due_date:8, detailer:null, checker:null },
  },
  {
    client: "KSP",
    file: "ksp-new.xlsx",
    sheet: null,
    dataStart: 1,
    cols: { project:2, title:1, status:5, client_sub_date:11, due_date:10, detailer:8, checker:9 },
  },
];

function readExcel(cfg) {
  const fp = path.join(__dirname, cfg.file);
  if (!fs.existsSync(fp)) { console.log(`  ⚠ File not found: ${cfg.file}`); return []; }
  const wb = XLSX.readFile(fp, {cellDates:true});
  const sheetName = cfg.sheet || wb.SheetNames[0];
  const raw = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], {header:1, defval:null});
  const tasks = [];
  for (let i = cfg.dataStart; i < raw.length; i++) {
    const r = raw[i];
    const c = cfg.cols;
    const proj  = r[c.project] ? String(r[c.project]).trim() : null;
    const title = r[c.title]   ? String(r[c.title]).trim()   : null;
    if (!proj || !title) continue;
    const statusRaw = r[c.status] ? String(r[c.status]).trim().toUpperCase() : "";
    tasks.push({
      project:         proj,
      title,
      status:          STATUS_MAP[statusRaw] || null,
      client_sub_date: toIST(c.client_sub_date != null ? r[c.client_sub_date] : null),
      due_date:        toIST(c.due_date != null ? r[c.due_date] : null),
      detailer:        c.detailer != null && r[c.detailer] ? String(r[c.detailer]).trim() : null,
      checker:         c.checker  != null && r[c.checker]  ? String(r[c.checker]).trim()  : null,
    });
  }
  return tasks;
}

async function checkClient(cfg, allProjects, allTasks) {
  const tasks = readExcel(cfg);
  if (tasks.length === 0) return;

  const clientProjs = allProjects.filter(p => p.client === cfg.client);
  const projByName = {};
  clientProjs.forEach(p => { projByName[p.name.toLowerCase()] = p; });

  const clientTaskIds = clientProjs.map(p => p.id);
  const taskMap = {};
  allTasks.filter(t => clientTaskIds.includes(t.project_id))
    .forEach(t => { taskMap[`${t.project_id}|${t.title.toLowerCase()}`] = t; });

  let matched = 0, mismatches = [], notInDB = [];

  for (const et of tasks) {
    const proj = projByName[et.project.toLowerCase()];
    if (!proj) { notInDB.push(`[no project] ${et.project} / ${et.title}`); continue; }
    const db = taskMap[`${proj.id}|${et.title.toLowerCase()}`];
    if (!db) { notInDB.push(`[no task] ${et.project} / ${et.title}`); continue; }

    const diffs = [];
    if (et.due_date && et.due_date !== db.due_date)
      diffs.push(`due_date: Excel=${et.due_date} | DB=${db.due_date||"—"}`);
    if (et.client_sub_date && et.client_sub_date !== db.client_sub_date)
      diffs.push(`sub_date: Excel=${et.client_sub_date} | DB=${db.client_sub_date||"—"}`);
    if (et.status && et.status !== db.status)
      diffs.push(`status: Excel=${et.status} | DB=${db.status||"—"}`);
    if (et.checker && et.checker !== db.checker)
      diffs.push(`checker: Excel=${et.checker} | DB=${db.checker||"—"}`);

    if (diffs.length > 0) mismatches.push({ proj: et.project, title: et.title, diffs, dbId: db.id });
    else matched++;
  }

  console.log(`\n  ✅ Match: ${matched} | ⚠ Mismatch: ${mismatches.length} | ❓ Not in DB: ${notInDB.length}`);

  if (mismatches.length > 0) {
    console.log(`\n  === MISMATCHES ===`);
    mismatches.forEach(m => {
      console.log(`\n  [${m.proj}] "${m.title}" (id:${m.dbId})`);
      m.diffs.forEach(d => console.log(`    ↳ ${d}`));
    });
  }

  return mismatches;
}

async function main() {
  console.log("🔍 Fetching all projects and tasks from Supabase...\n");

  const { data: allProjects } = await sb.from("projects").select("id,name,client");
  const { data: allTasks }    = await sb.from("tasks").select("id,title,project_id,status,due_date,client_sub_date,checker,detailer,assignee");

  console.log(`Projects: ${(allProjects||[]).length} | Tasks: ${(allTasks||[]).length}`);

  const allMismatches = [];

  // Process each Excel config
  const byClientFile = {};
  for (const cfg of EXCEL_CONFIGS) {
    const key = `${cfg.client} — ${cfg.file}`;
    console.log(`\n📂 ${key}`);
    const mm = await checkClient(cfg, allProjects||[], allTasks||[]);
    if (mm && mm.length > 0) allMismatches.push(...mm.map(m=>({...m, client:cfg.client, file:cfg.file})));
  }

  // Summary
  console.log("\n\n=== SUMMARY ===");
  if (allMismatches.length === 0) {
    console.log("✅ All Excel dates match the DB perfectly across all clients!");
  } else {
    console.log(`⚠  Total mismatches: ${allMismatches.length}`);
    const byClient = {};
    allMismatches.forEach(m => { (byClient[m.client]||(byClient[m.client]=[])).push(m); });
    Object.entries(byClient).forEach(([c,ms])=>console.log(`   ${c}: ${ms.length} task(s)`));
    console.log("\nTo fix these, run: node fix-all-dates.cjs");
  }

  // Also check for tasks with no Excel source (Bird Arts etc.)
  const clientsInExcel = [...new Set(EXCEL_CONFIGS.map(c=>c.client))];
  const orphanClients = [...new Set((allProjects||[]).map(p=>p.client||""))].filter(c=>c&&!clientsInExcel.includes(c)&&c!=="Client"&&c!=="KSP Tekla");
  if (orphanClients.length > 0) {
    console.log(`\n📋 Clients with NO Excel source file (manual data — check dates manually):`);
    orphanClients.forEach(c=>console.log(`   ${c}`));
  }

  // Write mismatches to a file for the fix script
  fs.writeFileSync(path.join(__dirname,"date-mismatches.json"), JSON.stringify(allMismatches,null,2));
  console.log("\n📄 Mismatches saved to date-mismatches.json");
}

main().catch(e=>{ console.error("FATAL:", e.message); process.exit(1); });
