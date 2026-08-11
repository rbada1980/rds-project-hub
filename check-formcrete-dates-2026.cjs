// check-formcrete-dates-2026.cjs
// Compares Excel dates vs DB dates for all Formcrete tasks

const XLSX  = require("xlsx");
const { createClient } = require("@supabase/supabase-js");
const path  = require("path");

const sb = createClient(
  "https://xypcbioltukahipkqqzc.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGNiaW9sdHVrYWhpcGtxcXpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTQzMTM2NSwiZXhwIjoyMDk1MDA3MzY1fQ.AoLxjBk3MR3_qjsCP50xzbyx7cp_kaQlVmN_eP_xuYU"
);

function excelDateToISO(v) {
  if (!v) return null;
  if (v instanceof Date) return v.toISOString().slice(0,10);
  if (typeof v === "number") return new Date(Math.round((v-25569)*86400*1000)).toISOString().slice(0,10);
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v.trim())) return v.trim();
  return null;
}

async function main() {
  const wb  = XLSX.readFile(path.join(__dirname,"Formcrete Projects Tracker_2026.xlsx"),{cellDates:true});
  const raw = XLSX.utils.sheet_to_json(wb.Sheets["PROJECTS"],{header:1,defval:null});

  const excelTasks = [];
  for (let i=5; i<raw.length; i++) {
    const r = raw[i];
    const proj  = r[2] ? String(r[2]).trim() : null;
    const title = r[5] ? String(r[5]).trim() : null;
    if (!proj||!title) continue;
    excelTasks.push({
      project: proj, title,
      client_sub_date: excelDateToISO(r[8]),
      due_date:        excelDateToISO(r[9]),
    });
  }

  // Fetch DB
  const { data: projects } = await sb.from("projects").select("id,name").eq("client","Formcrete");
  const projByName = {};
  (projects||[]).forEach(p=>{ projByName[p.name.toLowerCase()]=p; });

  const projIds = (projects||[]).map(p=>p.id);
  const { data: dbTasks } = await sb.from("tasks")
    .select("id,title,project_id,client_sub_date,due_date")
    .in("project_id", projIds);

  const taskMap = {};
  (dbTasks||[]).forEach(t=>{ taskMap[`${t.project_id}|${t.title.toLowerCase()}`]=t; });

  let matched=0, mismatch=[], noDate=0, notInDB=0;

  for (const et of excelTasks) {
    const proj = projByName[et.project.toLowerCase()];
    if (!proj) { notInDB++; continue; }
    const key = `${proj.id}|${et.title.toLowerCase()}`;
    const db  = taskMap[key];
    if (!db) { notInDB++; continue; }

    const subMatch = et.client_sub_date === db.client_sub_date;
    const dueMatch = et.due_date === db.due_date;

    if (!et.client_sub_date && !et.due_date) { noDate++; continue; }
    if (subMatch && dueMatch) { matched++; continue; }

    mismatch.push({
      project: et.project, title: et.title,
      excel_sub: et.client_sub_date, db_sub: db.client_sub_date,
      excel_due: et.due_date,        db_due:  db.due_date,
    });
  }

  console.log(`\n=== Formcrete Date Check ===`);
  console.log(`✅ Dates match   : ${matched}`);
  console.log(`⚠  Mismatches   : ${mismatch.length}`);
  console.log(`—  No date in Excel: ${noDate}`);
  console.log(`?  Not in DB    : ${notInDB}`);

  if (mismatch.length > 0) {
    console.log(`\n=== MISMATCHED DATES ===`);
    for (const m of mismatch) {
      console.log(`\n[${m.project}] ${m.title}`);
      if (m.excel_sub !== m.db_sub)
        console.log(`  Client Sub: Excel=${m.excel_sub||'—'} | DB=${m.db_sub||'—'}`);
      if (m.excel_due !== m.db_due)
        console.log(`  Due Date : Excel=${m.excel_due||'—'} | DB=${m.db_due||'—'}`);
    }
  } else {
    console.log(`\n✅ All dates in DB match the Excel perfectly!`);
  }
}

main().catch(e=>{ console.error("FATAL:",e.message); process.exit(1); });
