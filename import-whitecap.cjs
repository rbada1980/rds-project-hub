/**
 * White Cap Excel → Hub Supabase Importer
 * Run: node import-whitecap.cjs
 * Place the Excel file path in EXCEL_FILE below.
 */

const { createClient } = require("@supabase/supabase-js");
const path = require("path");
const fs = require("fs");

const SUPA_URL  = "https://xypcbioltukahipkqqzc.supabase.co";
const SERVICE_KEY = (() => {
  try { return JSON.parse(fs.readFileSync(path.join(__dirname, "sync-config.json"), "utf8")).service_key; }
  catch { throw new Error("sync-config.json with service_key not found"); }
})();
const supabase = createClient(SUPA_URL, SERVICE_KEY);

// ── Point this at the uploaded Excel file ───────────────────────────────────
const EXCEL_FILE = process.argv[2] ||
  path.join(process.env.LOCALAPPDATA || "",
    "Packages","Claude_pzs8sxrjxfjjc","LocalCache","Roaming","Claude",
    "local-agent-mode-sessions",
    "919964d4-cd92-4eb6-b494-6c7ad2c02d36",
    "4c052105-2aba-4ec0-9a90-013070bec645",
    "local_d0d6e4a5-acfb-4c98-8222-e8da51f65329",
    "uploads","White Cap-24b64551.xlsx");

// ── Helpers ─────────────────────────────────────────────────────────────────
function normalizeStatus(s) {
  if (!s) return "Not Yet Started";
  const l = s.trim().toLowerCase();
  if (l === "completed") return "Completed";
  if (l.startsWith("inprogress") || l === "in progress") return "In Progress";
  if (l === "not yet started") return "Not Yet Started";
  if (l === "job canceled") return "Cancelled";
  return s.trim();
}

function fmtDate(d) {
  if (!d) return null;
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  const s = String(d).trim();
  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // MM-DD-YYYY
  const m = s.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (m) return `${m[3]}-${m[1]}-${m[2]}`;
  return null;
}

function slug(name) {
  return (name || "").trim().toLowerCase().replace(/\s+/g, " ");
}

const PROJECT_COLORS = ["#3b82f6","#10b981","#f59e0b","#ef4444","#8b5cf6","#06b6d4","#f97316","#ec4899","#14b8a6","#6366f1"];

// ── Parse Excel ──────────────────────────────────────────────────────────────
function parseExcel(filePath) {
  let XLSX;
  try { XLSX = require("xlsx"); }
  catch {
    // Try openpyxl via child_process — fallback
    throw new Error("xlsx npm package not found. Run: npm install xlsx");
  }
  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

  // Find header row (row with PROJECT NAME)
  let hdrIdx = rows.findIndex(r => r && r[0] === "PROJECT NAME");
  if (hdrIdx === -1) hdrIdx = 2; // fallback

  const data = [];
  let curProject = null;
  let curScope = null;

  for (let i = hdrIdx + 1; i < rows.length; i++) {
    const [proj, scope, comp, rec_date, status, sub_date, det_wt, detailer, checker] = rows[i];
    if (proj) curProject = String(proj).trim();
    if (scope) curScope = String(scope).trim();
    if (!comp) continue;

    // Convert Excel serial dates
    const toDateStr = (v) => {
      if (!v) return null;
      if (typeof v === "number") {
        // Excel date serial
        const d = XLSX.SSF.parse_date_code(v);
        return `${d.y}-${String(d.m).padStart(2,"0")}-${String(d.d).padStart(2,"0")}`;
      }
      return fmtDate(String(v));
    };

    data.push({
      project:         curProject,
      scope:           curScope || "",
      title:           String(comp).trim(),
      rec_date:        toDateStr(rec_date),
      status:          normalizeStatus(status),
      client_sub_date: toDateStr(sub_date),
      det_weight:      typeof det_wt === "number" ? det_wt : null,
      assignee:        detailer ? String(detailer).trim() : "",
      detailer:        detailer ? String(detailer).trim() : "",
      checker:         checker  ? String(checker).trim()  : "",
    });
  }
  return data;
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log("📂 Reading Excel:", EXCEL_FILE);
  if (!fs.existsSync(EXCEL_FILE)) {
    throw new Error(`File not found: ${EXCEL_FILE}\nUsage: node import-whitecap.cjs <path-to-xlsx>`);
  }

  const rows = parseExcel(EXCEL_FILE);
  console.log(`✅ Parsed ${rows.length} task rows from Excel\n`);

  // ── 1. Fetch existing White Cap projects ──────────────────────────────────
  const { data: existingProjects, error: pErr } = await supabase
    .from("projects").select("id,name,client,assigned_users").eq("client", "White Cap");
  if (pErr) throw new Error("Fetch projects: " + pErr.message);

  const projMap = new Map(); // slug(name) → {id, name}
  existingProjects.forEach(p => projMap.set(slug(p.name), p));
  console.log(`📋 Found ${existingProjects.length} existing White Cap projects in hub`);

  // ── 2. Collect unique project names from Excel ────────────────────────────
  const excelProjects = [...new Set(rows.map(r => r.project).filter(Boolean))];
  console.log(`📋 Excel has ${excelProjects.length} unique project names\n`);

  // ── 3. Create missing projects ────────────────────────────────────────────
  let created = 0;
  for (const pName of excelProjects) {
    if (!projMap.has(slug(pName))) {
      const color = PROJECT_COLORS[projMap.size % PROJECT_COLORS.length];
      const { data: np, error: npErr } = await supabase.from("projects")
        .insert({ name: pName, client: "White Cap", color, description: "Imported from Excel.", assigned_users: [] })
        .select().single();
      if (npErr) { console.warn(`  ⚠ Could not create project "${pName}":`, npErr.message); continue; }
      projMap.set(slug(pName), np);
      console.log(`  ➕ Created project: ${pName}`);
      created++;
    }
  }
  if (created) console.log(`\n✅ Created ${created} new projects\n`);

  // ── 4. Fetch existing tasks for White Cap ─────────────────────────────────
  const wcProjIds = [...projMap.values()].map(p => p.id);
  const { data: existingTasks, error: tErr } = await supabase
    .from("tasks").select("id,project_id,title,status,assignee,checker,scope,client_sub_date,det_weight,detailer")
    .in("project_id", wcProjIds);
  if (tErr) throw new Error("Fetch tasks: " + tErr.message);

  // Build a lookup: proj_id+slug(title) → existing task
  const taskMap = new Map();
  existingTasks.forEach(t => taskMap.set(`${t.project_id}|${slug(t.title)}`, t));
  console.log(`📋 Found ${existingTasks.length} existing tasks for White Cap projects`);

  // ── 5. Upsert tasks ───────────────────────────────────────────────────────
  let inserts = 0, updates = 0, skipped = 0;

  for (const row of rows) {
    const proj = projMap.get(slug(row.project));
    if (!proj) { skipped++; continue; }

    const key = `${proj.id}|${slug(row.title)}`;
    const existing = taskMap.get(key);

    const payload = {
      project_id:      proj.id,
      title:           row.title,
      client:          "White Cap",
      status:          row.status,
      assignee:        row.assignee,
      detailer:        row.detailer,
      checker:         row.checker,
      scope:           row.scope,
      client_sub_date: row.client_sub_date,
      det_weight:      row.det_weight,
      due_date:        row.client_sub_date, // use client_sub_date as due_date
      priority:        "Medium",
    };

    if (existing) {
      // Check if anything changed
      const changed =
        existing.status          !== payload.status          ||
        existing.assignee        !== payload.assignee        ||
        existing.checker         !== payload.checker         ||
        existing.scope           !== payload.scope           ||
        existing.client_sub_date !== payload.client_sub_date ||
        existing.det_weight      !== payload.det_weight      ||
        existing.detailer        !== payload.detailer;

      if (!changed) { skipped++; continue; }

      const { error: uErr } = await supabase.from("tasks")
        .update(payload).eq("id", existing.id);
      if (uErr) { console.warn(`  ⚠ Update failed "${row.title}":`, uErr.message); continue; }
      updates++;
    } else {
      const { error: iErr } = await supabase.from("tasks").insert(payload);
      if (iErr) { console.warn(`  ⚠ Insert failed "${row.title}":`, iErr.message); continue; }
      inserts++;
    }
  }

  console.log(`\n🎉 Done!`);
  console.log(`   ➕ Inserted: ${inserts} new tasks`);
  console.log(`   ✏️  Updated:  ${updates} tasks`);
  console.log(`   ⏭  Skipped:  ${skipped} (no change or project not found)`);
}

main().catch(e => { console.error("❌", e.message); process.exit(1); });
