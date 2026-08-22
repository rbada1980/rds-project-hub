// whitecap-update-aug22.cjs
// Updates White Cap tasks from Tracker2 (Aug 22, 2026 format)
// New column format: col0=project, col1=title, col2=status, col3=date, col4=detailer, col5=checker
// Usage:
//   node whitecap-update-aug22.cjs          ← dry-run
//   node whitecap-update-aug22.cjs --apply  ← live update

const XLSX = require("xlsx");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const DRY = !process.argv.includes("--apply");
const sb  = createClient(
  "https://xypcbioltukahipkqqzc.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGNiaW9sdHVrYWhpcGtxcXpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTQzMTM2NSwiZXhwIjoyMDk1MDA3MzY1fQ.AoLxjBk3MR3_qjsCP50xzbyx7cp_kaQlVmN_eP_xuYU"
);

const CLIENT = "White Cap";
const FILE   = path.join(__dirname, "White Cap Projects Tracker2_2026.xlsx");

const STATUS_MAP = {
  "inprogress":      "In Progress",
  "in progress":     "In Progress",
  "not yet started": "Not Yet Started",
  "completed":       "Completed",
  "on hold":         "On Hold",
  "job canceled":    "On Hold",
};
function normStatus(s) {
  const key = (s || "").toLowerCase().trim();
  return STATUS_MAP[key] || s || "Not Yet Started";
}

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
  // MM-DD-YYYY
  const m1 = s.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (m1) return `${m1[3]}-${m1[1]}-${m1[2]}`;
  // MM/DD/YY or MM/DD/YYYY
  const m2 = s.match(/^(\d{2})\/(\d{2})\/(\d{2,4})$/);
  if (m2) {
    const yr = m2[3].length === 2 ? "20" + m2[3] : m2[3];
    return `${yr}-${m2[1]}-${m2[2]}`;
  }
  // YYYY-MM-DD
  const m3 = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m3) return `${m3[1]}-${m3[2]}-${m3[3]}`;
  return null;
}

function norm(s) { return (s || "").trim().toLowerCase().replace(/\s+/g, " "); }

// Nuvo sub-section labels that are not real tasks
const NUVO_SECTION_HEADERS = new Set([
  "bldg. type 1 (a, c, d & g)", "bldg. type 2 (e & h)", "bldg. type 3 (b & f)",
  "bus shelter - footings", "clubhouse", "garage type 1", "garage type 2",
  "mail kiosk - slab on grade", "trash compactor", "pool pavilion",
  "raised planters", "bbq station", "cabana footings", "trellis footings", "retaining wall"
]);

const SKIP_PROJ = new Set(["project name", "old projects modifications", ""]);

async function run() {
  console.log(`\n${"═".repeat(65)}`);
  console.log(` White Cap Update — ${DRY ? "DRY RUN" : "⚠ LIVE UPDATE"}`);
  console.log(`${"═".repeat(65)}\n`);

  // ── Parse Excel ────────────────────────────────────────────────
  const wb   = XLSX.readFile(FILE, { cellDates: true });
  const ws   = wb.Sheets["White Cap Work Schedule"] || wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true });

  const xlTasks = [];
  const xlProjects = new Set();
  let curProj = null;

  for (let i = 3; i < rows.length; i++) {
    const r      = rows[i];
    const proj   = String(r[0] || "").trim();
    const title  = String(r[1] || "").trim();
    const status = String(r[2] || "").trim();
    const date   = r[3];
    const det    = String(r[4] || "").trim();
    const checker = String(r[5] || "").trim();

    if (proj && !SKIP_PROJ.has(norm(proj))) {
      curProj = proj;
      xlProjects.add(proj);
    }
    if (!title || !curProj) continue;
    // Skip Nuvo section headers
    if (curProj === "Nuvo" && NUVO_SECTION_HEADERS.has(norm(title))) continue;

    xlTasks.push({
      project:  curProj,
      title,
      status:   normStatus(status),
      sub_date: toISO(date),
      detailer: det || null,
      checker:  checker || null,
    });
  }

  console.log(`Excel: ${xlTasks.length} tasks across ${xlProjects.size} projects\n`);

  // ── Load DB projects ───────────────────────────────────────────
  const { data: dbProjects } = await sb.from("projects").select("id,name").eq("client", CLIENT);
  const projMap = {};
  (dbProjects || []).forEach(p => projMap[norm(p.name)] = p.id);
  console.log(`DB projects (White Cap): ${(dbProjects || []).length}\n`);

  // ── Process tasks ──────────────────────────────────────────────
  let updated = 0, inserted = 0, skippedNoProj = 0, unchanged = 0, errors = 0;
  const newProjects = [];

  for (const t of xlTasks) {
    let proj_id = projMap[norm(t.project)];

    // Project not in DB — create it
    if (!proj_id) {
      if (DRY) {
        console.log(`  ✚ NEW PROJECT: "${t.project}"`);
        newProjects.push(t.project);
        skippedNoProj++;
        continue;
      }
      const { data: np, error: pe } = await sb.from("projects").insert({
        name: t.project, client: CLIENT, color: "#0ea5e9"
      }).select("id").single();
      if (pe) {
        console.error(`  ✗ PROJECT CREATE ERROR: "${t.project}" — ${pe.message}`);
        skippedNoProj++; continue;
      }
      proj_id = np.id;
      projMap[norm(t.project)] = proj_id;
      console.log(`  ✚ CREATED PROJECT: "${t.project}"`);
    }

    // Find task in DB — use limit(2) to detect duplicates instead of maybeSingle()
    const { data: matches, error: fe } = await sb.from("tasks")
      .select("id,status,client_sub_date,detailer,checker")
      .eq("project_id", proj_id)
      .ilike("title", t.title)
      .limit(2);

    if (fe) {
      console.error(`  ✗ FIND ERROR: "${t.title}" — ${fe.message}`);
      errors++; continue;
    }

    if (matches && matches.length > 1) {
      console.log(`  ⚠ SKIP (duplicate in DB): "${t.title}" [${t.project}]`);
      errors++; continue;
    }

    const existing = matches && matches.length === 1 ? matches[0] : null;

    if (existing) {
      // Preserve existing detailer/checker if new file has null
      const newDet = t.detailer || existing.detailer || null;
      const newChk = t.checker  || existing.checker  || null;

      // Check if anything changed
      const sameStatus = existing.status === t.status;
      const sameDate   = existing.client_sub_date === t.sub_date;
      const sameDet    = (existing.detailer || null) === newDet;
      const sameChk    = (existing.checker  || null) === newChk;

      if (sameStatus && sameDate && sameDet && sameChk) {
        unchanged++;
        continue;
      }

      const changes = [];
      if (!sameStatus) changes.push(`status: ${existing.status} → ${t.status}`);
      if (!sameDate)   changes.push(`sub_date: ${existing.client_sub_date} → ${t.sub_date}`);
      if (!sameDet)    changes.push(`detailer: ${existing.detailer} → ${newDet}`);
      if (!sameChk)    changes.push(`checker: ${existing.checker} → ${newChk}`);

      console.log(`  ↺ UPDATE: "${t.title}" [${t.project}] — ${changes.join(" | ")}`);

      if (!DRY) {
        const { error } = await sb.from("tasks").update({
          status:          t.status,
          client_sub_date: t.sub_date,
          detailer:        newDet,
          checker:         newChk,
        }).eq("id", existing.id);
        if (error) { console.error(`    ✗ ${error.message}`); errors++; continue; }
      }
      updated++;
    } else {
      // New task — insert
      console.log(`  ✚ NEW TASK: "${t.title}" [${t.project}] | ${t.status}`);
      if (!DRY) {
        const { error } = await sb.from("tasks").insert({
          title:           t.title,
          project_id:      proj_id,
          client:          CLIENT,
          status:          t.status,
          client_sub_date: t.sub_date,
          detailer:        t.detailer,
          checker:         t.checker,
        });
        if (error) { console.error(`    ✗ ${error.message}`); errors++; continue; }
      }
      inserted++;
    }
  }

  console.log(`\n${"═".repeat(65)}`);
  if (DRY) {
    console.log(`DRY RUN SUMMARY:`);
    console.log(`  Would update:  ${updated} tasks`);
    console.log(`  Would insert:  ${inserted} new tasks`);
    console.log(`  Unchanged:     ${unchanged} tasks`);
    console.log(`  No proj found: ${skippedNoProj} tasks (${newProjects.length} new projects to create)`);
    console.log(`  Errors:        ${errors}`);
    console.log(`\nRun with --apply to execute.`);
  } else {
    console.log(`DONE — ${updated} updated, ${inserted} inserted, ${unchanged} unchanged, ${errors} errors`);
  }
}

run().catch(e => { console.error(e); process.exit(1); });
