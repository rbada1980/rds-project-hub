// dimension-fab-import.cjs
// Imports Dimension Fab tasks from Excel
// Usage:
//   node dimension-fab-import.cjs          ← dry-run
//   node dimension-fab-import.cjs --apply  ← live

const XLSX = require("xlsx");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const DRY = !process.argv.includes("--apply");
const sb  = createClient(
  "https://xypcbioltukahipkqqzc.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGNiaW9sdHVrYWhpcGtxcXpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTQzMTM2NSwiZXhwIjoyMDk1MDA3MzY1fQ.AoLxjBk3MR3_qjsCP50xzbyx7cp_kaQlVmN_eP_xuYU"
);

const CLIENT = "Dimension Fab";
const FILE   = path.join(__dirname, "Dimension Fab.xlsx");

const STATUS_MAP = {
  "in progress":     "In Progress",
  "not yet started": "Not Yet Started",
  "completed":       "Completed",
  "on hold":         "On Hold",
  "inprogress":      "In Progress",
};
function normStatus(s) {
  return STATUS_MAP[(s || "").toLowerCase().trim()] || s || "Not Yet Started";
}

// MM/DD/YYYY format as confirmed by user
function toISO(v) {
  if (!v) return null;
  if (v instanceof Date) {
    if (isNaN(v.getTime())) return null;
    const y = v.getFullYear();
    const m = String(v.getMonth() + 1).padStart(2, "0");
    const d = String(v.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  if (typeof v === "number") {
    const d = XLSX.SSF.parse_date_code(v);
    return `${d.y}-${String(d.m).padStart(2,"0")}-${String(d.d).padStart(2,"0")}`;
  }
  const s = String(v).trim();
  // MM/DD/YYYY
  const m1 = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m1) return `${m1[3]}-${m1[1]}-${m1[2]}`;
  // YYYY-MM-DD
  const m2 = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m2) return `${m2[1]}-${m2[2]}-${m2[3]}`;
  return null;
}

function norm(s) { return (s || "").trim().toLowerCase().replace(/\s+/g, " "); }

// Manually corrected dates (wrong Excel serial → correct date)
const DATE_OVERRIDES = {
  "sbr complex base slab & wall dowels-2nd": "2026-09-01",
};

async function run() {
  console.log(`\n${"═".repeat(60)}`);
  console.log(` Dimension Fab Import — ${DRY ? "DRY RUN" : "⚠ LIVE"}`);
  console.log(`${"═".repeat(60)}\n`);

  const wb   = XLSX.readFile(FILE, { cellDates: true });
  const ws   = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true });

  const tasks = [];
  let curProj = null;

  for (let i = 2; i < rows.length; i++) {
    const r      = rows[i];
    const proj   = String(r[0] || "").trim();
    const title  = String(r[1] || "").trim();
    const sub    = toISO(r[2]);
    const status = normStatus(String(r[3] || ""));
    const det    = String(r[4] || "").trim() || null;
    const chk    = String(r[5] || "").trim() || null;

    if (proj && !["projects", "dimension fab", ""].includes(norm(proj))) curProj = proj;
    if (!title || !curProj) continue;

    // Apply manual date correction
    const correctedDate = DATE_OVERRIDES[norm(title)] || sub;

    tasks.push({ project: curProj, title, status, sub_date: correctedDate, detailer: det, checker: chk });
  }

  console.log(`Excel tasks: ${tasks.length}`);
  tasks.forEach(t => console.log(`  "${t.title}" | ${t.status} | sub:${t.sub_date} | det:${t.detailer}`));
  console.log();

  // ── Find or create project ─────────────────────────────────────
  const projNames = [...new Set(tasks.map(t => t.project))];
  const projMap = {};

  for (const pname of projNames) {
    const { data: existing } = await sb.from("projects").select("id,name")
      .eq("client", CLIENT).ilike("name", pname).maybeSingle();

    if (existing) {
      projMap[norm(pname)] = existing.id;
      console.log(`Project found in DB: "${existing.name}" (id: ${existing.id})`);
    } else {
      console.log(`Project NOT in DB: "${pname}" — will ${DRY ? "create" : "creating"}...`);
      if (!DRY) {
        const { data: np, error } = await sb.from("projects").insert({
          name: pname, client: CLIENT, color: "#f59e0b"
        }).select("id").single();
        if (error) { console.error(`  ✗ ${error.message}`); continue; }
        projMap[norm(pname)] = np.id;
        console.log(`  ✚ Created project id: ${np.id}`);
      }
    }
  }

  let updated = 0, inserted = 0, unchanged = 0, errors = 0;

  for (const t of tasks) {
    const proj_id = projMap[norm(t.project)];
    if (!proj_id) { console.log(`  ⚠ No project id for "${t.project}"`); errors++; continue; }

    const { data: matches, error: fe } = await sb.from("tasks")
      .select("id,status,client_sub_date,detailer,checker")
      .eq("project_id", proj_id)
      .ilike("title", t.title)
      .limit(2);

    if (fe) { console.error(`  ✗ FIND ERROR: ${fe.message}`); errors++; continue; }

    const existing = matches && matches.length === 1 ? matches[0] : null;

    if (existing) {
      const newDet = t.detailer || existing.detailer || null;
      const newChk = t.checker  || existing.checker  || null;
      if (existing.status === t.status && existing.client_sub_date === t.sub_date &&
          (existing.detailer||null) === newDet && (existing.checker||null) === newChk) {
        console.log(`  = UNCHANGED: "${t.title}"`);
        unchanged++; continue;
      }
      console.log(`  ↺ UPDATE: "${t.title}" | ${t.status} | sub:${t.sub_date}`);
      if (!DRY) {
        const { error } = await sb.from("tasks").update({
          status: t.status, client_sub_date: t.sub_date, detailer: newDet, checker: newChk
        }).eq("id", existing.id);
        if (error) { console.error(`    ✗ ${error.message}`); errors++; continue; }
      }
      updated++;
    } else {
      console.log(`  ✚ INSERT: "${t.title}" | ${t.status} | sub:${t.sub_date}`);
      if (!DRY) {
        const { error } = await sb.from("tasks").insert({
          title: t.title, project_id: proj_id, client: CLIENT,
          status: t.status, client_sub_date: t.sub_date,
          detailer: t.detailer, checker: t.checker,
        });
        if (error) { console.error(`    ✗ ${error.message}`); errors++; continue; }
      }
      inserted++;
    }
  }

  console.log(`\n${"═".repeat(60)}`);
  if (DRY) {
    console.log(`DRY RUN — would update:${updated}, insert:${inserted}, unchanged:${unchanged}, errors:${errors}`);
    console.log(`Run with --apply to execute.`);
  } else {
    console.log(`DONE — ${updated} updated, ${inserted} inserted, ${unchanged} unchanged, ${errors} errors`);
  }
}

run().catch(e => { console.error(e); process.exit(1); });
