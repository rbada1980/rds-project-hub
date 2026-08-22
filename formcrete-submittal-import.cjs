// formcrete-submittal-import.cjs
// Updates Formcrete tasks with status + client_sub_date from tentative submittal dates file
// Usage: node formcrete-submittal-import.cjs

const XLSX    = require("xlsx");
const path    = require("path");
const { createClient } = require("@supabase/supabase-js");

const sb = createClient(
  "https://xypcbioltukahipkqqzc.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGNiaW9sdHVrYWhpcGtxcXpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTQzMTM2NSwiZXhwIjoyMDk1MDA3MzY1fQ.AoLxjBk3MR3_qjsCP50xzbyx7cp_kaQlVmN_eP_xuYU"
);

const CLIENT = "Formcrete";
const FILE   = path.join(__dirname, "Formcrete Tentative submittal dates_Aug 2026.xlsx");

const STATUS_MAP = {
  "in progress":     "In Progress",
  "not yet started": "Not Yet Started",
  "completed":       "Completed",
  "on hold":         "On Hold",
};
function normStatus(s) {
  return STATUS_MAP[(s||"").toLowerCase().trim()] || s || "Not Yet Started";
}
function toISO(v) {
  if (!v) return null;
  if (v instanceof Date) {
    if (isNaN(v.getTime())) return null;
    const y = v.getFullYear();
    const m = String(v.getMonth()+1).padStart(2,"0");
    const d = String(v.getDate()).padStart(2,"0");
    return `${y}-${m}-${d}`;
  }
  if (typeof v === "number") {
    const d = XLSX.SSF.parse_date_code(v);
    return `${d.y}-${String(d.m).padStart(2,"0")}-${String(d.d).padStart(2,"0")}`;
  }
  const s = String(v).trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  return null;
}
function norm(s) { return (s||"").trim().toLowerCase().replace(/\s+/g," "); }

async function run() {
  console.log(`\n${"═".repeat(60)}`);
  console.log(` Formcrete Submittal Dates Import`);
  console.log(`${"═".repeat(60)}\n`);

  // Parse Excel
  const wb   = XLSX.readFile(FILE, { cellDates: true });
  const ws   = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header:1, defval:null, raw:true });

  const tasks = [];
  let curProj = null;
  for (let i = 1; i < rows.length; i++) {
    const row   = rows[i];
    const proj  = String(row[1]||"").trim();
    const title = String(row[3]||"").trim();
    if (proj) curProj = proj;
    if (!title || !curProj) continue;
    tasks.push({
      project:  curProj,
      title,
      status:   normStatus(String(row[5]||"").trim()),
      sub_date: toISO(row[6]),
    });
  }
  console.log(`Excel tasks: ${tasks.length} across ${new Set(tasks.map(t=>t.project)).size} projects\n`);

  // Load Formcrete projects from DB
  const { data: projects } = await sb.from("projects").select("id,name").eq("client", CLIENT);
  const projMap = {};
  (projects||[]).forEach(p => projMap[norm(p.name)] = p.id);
  console.log(`DB Formcrete projects: ${(projects||[]).length}`);

  let updated=0, inserted=0, notFound=0, errors=0;

  for (const t of tasks) {
    const proj_id = projMap[norm(t.project)];
    if (!proj_id) {
      console.log(`  ⚠ Project not found: "${t.project}"`);
      notFound++;
      continue;
    }

    // Find existing task by project_id + title (case-insensitive)
    const { data: existing, error: fe } = await sb.from("tasks")
      .select("id,status,client_sub_date")
      .eq("project_id", proj_id)
      .ilike("title", t.title)
      .maybeSingle();

    if (fe) {
      console.error(`  ✗ FIND ERROR: "${t.title}" — ${fe.message}`);
      errors++; continue;
    }

    if (existing) {
      const { error } = await sb.from("tasks").update({
        status:          t.status,
        client_sub_date: t.sub_date,
      }).eq("id", existing.id);
      if (error) {
        console.error(`  ✗ UPDATE ERROR: "${t.title}" — ${error.message}`);
        errors++;
      } else {
        console.log(`  ↺ UPDATED: "${t.title}" | ${t.project} | ${t.status} | sub:${t.sub_date}`);
        updated++;
      }
    } else {
      // Task not in DB yet — insert
      const { error } = await sb.from("tasks").insert({
        title:           t.title,
        project_id:      proj_id,
        client:          CLIENT,
        status:          t.status,
        client_sub_date: t.sub_date,
      });
      if (error) {
        console.error(`  ✗ INSERT ERROR: "${t.title}" — ${error.message}`);
        errors++;
      } else {
        console.log(`  ✚ INSERTED: "${t.title}" | ${t.project} | ${t.status} | sub:${t.sub_date}`);
        inserted++;
      }
    }
  }

  console.log(`\n${"═".repeat(60)}`);
  console.log(`DONE — ${updated} updated, ${inserted} inserted, ${notFound} project not found, ${errors} errors`);
}

run().catch(e => { console.error(e); process.exit(1); });
