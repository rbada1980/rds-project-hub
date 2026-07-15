// ================================================================
// Formcrete Excel → RDS Project Hub (Import/Update)
// Usage: node formcrete_import.cjs
// Excel: Formcrete Projects Tracker_2026.xlsx
//
// Column map (0-indexed):
//   0  S.No        2  PROJECT NAME    3  SCOPE
//   4  DWG NO.     5  COMPONENTS OF WORK (title)
//   6  REC. DATE   7  STATUS          8  SUB. DATE (client_sub_date)
//   9  CUST. REQ. DATE (due_date)     11 DET. WT. (det_weight)
//   14 DETAILER    15 CHECKER
//
// Missing-fields rule: if Excel cell is blank → store null, never "".
// On UPDATE: skip null Excel fields so existing DB values are preserved.
// ================================================================

const XLSX    = require("xlsx");
const path    = require("path");
const { createClient } = require("@supabase/supabase-js");

const SUPA_URL = "https://xypcbioltukahipkqqzc.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGNiaW9sdHVrYWhpcGtxcXpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0MzEzNjUsImV4cCI6MjA5NTAwNzM2NX0.DG5sv2bpx8j3Mmz0mqIsoDVaCMP2TmWqh-OQUfSZFRw";
const supabase = createClient(SUPA_URL, SUPA_KEY);

const CLIENT_NAME = "Formcrete";

const STATUS_MAP = {
  "completed":        "Completed",
  "in progress":      "In Progress",
  "in process":       "In Progress",
  "not yet started":  "Not Yet Started",
  "to be started":    "To Be Started",
};

function normalizeStatus(s) {
  return STATUS_MAP[(s || "").toLowerCase().trim()] || s || "Not Yet Started";
}

function toISO(val) {
  if (!val) return null;
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return null;
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, "0");
    const d = String(val.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  if (typeof val === "number") {
    // Excel serial date
    const d = XLSX.SSF.parse_date_code(val);
    return `${d.y}-${String(d.m).padStart(2,"0")}-${String(d.d).padStart(2,"0")}`;
  }
  if (typeof val === "string") {
    const s = val.trim();
    const m1 = s.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/);
    if (m1) return `${m1[3]}-${m1[2]}-${m1[1]}`;
    const m2 = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m2) return s;
  }
  return null;
}

function str(v) {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s || null;
}

function parseExcel(filePath) {
  const wb = XLSX.readFile(filePath, { cellDates: true, raw: false });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: false });

  const tasks = [];
  const seen  = new Set(); // deduplicate by "project|||title"

  for (let i = 5; i < rows.length; i++) {  // row index 5 = Excel row 6 (data starts)
    const row = rows[i];
    const title = str(row[5]);
    if (!title) continue;

    const project = str(row[2]);
    if (!project) continue;

    const dedupKey = `${project}|||${title}`;
    if (seen.has(dedupKey)) {
      console.log(`  ⏭  SKIP DUPLICATE in Excel: "${title}" (${project})`);
      continue;
    }
    seen.add(dedupKey);

    // Parse dates — toISO handles Date objects from cellDates:true
    let sub_date = null;
    let due_date = null;
    const rawSub = row[8];
    const rawDue = row[9];

    if (rawSub) {
      if (rawSub instanceof Date) sub_date = toISO(rawSub);
      else sub_date = toISO(rawSub);
    }
    if (rawDue) {
      if (rawDue instanceof Date) due_date = toISO(rawDue);
      else due_date = toISO(rawDue);
    }

    const detailer   = str(row[14]);   // DETAILER col
    const checker    = str(row[15]);   // CHECKER col (mostly null)
    const det_weight = row[11] !== null && row[11] !== undefined && String(row[11]).trim() !== ""
                       ? parseFloat(String(row[11]).replace(/,/g, ""))
                       : null;

    tasks.push({
      title,
      project,
      scope:           str(row[3]),
      status:          normalizeStatus(str(row[7])),
      // assignee → null (no assignee column in this Excel)
      assignee:        null,
      detailer,        // null if blank — preserved in DB if updating
      checker,         // null if blank — preserved in DB if updating
      client_sub_date: sub_date,   // null if blank
      due_date,                    // null if blank (CUST. REQ. DATE)
      det_weight,
    });
  }

  return tasks;
}

async function run() {
  // Find the Excel file — check common locations
  const candidates = [
    path.join(__dirname, "Formcrete Projects Tracker_2026.xlsx"),
    path.join(__dirname, "..", "uploads", "Formcrete Projects Tracker_2026.xlsx"),
  ];
  const fs = require("fs");
  let filePath = candidates.find(p => fs.existsSync(p));
  if (!filePath) {
    // Try argv
    filePath = process.argv[2];
    if (!filePath || !fs.existsSync(filePath)) {
      console.error("Cannot find Formcrete Projects Tracker_2026.xlsx");
      console.error("Usage: node formcrete_import.cjs [path/to/file.xlsx]");
      process.exit(1);
    }
  }

  console.log(`\n=== Formcrete Import: ${path.basename(filePath)} ===\n`);
  const tasks = parseExcel(filePath);
  console.log(`Parsed ${tasks.length} unique tasks across ${new Set(tasks.map(t => t.project)).size} projects\n`);

  // ── Ensure client exists ──────────────────────────────────────
  const { data: clients } = await supabase.from("clients").select("id,name");
  if (!clients.find(c => c.name.toLowerCase() === CLIENT_NAME.toLowerCase())) {
    console.log(`Creating client: ${CLIENT_NAME}`);
    await supabase.from("clients").insert({ name: CLIENT_NAME });
  } else {
    console.log(`Client found: ${CLIENT_NAME}`);
  }

  // ── Load/cache projects ───────────────────────────────────────
  const { data: allProjects } = await supabase.from("projects").select("id,name,client");
  const projectCache = {};

  async function getOrCreateProject(name) {
    if (projectCache[name]) return projectCache[name];
    const existing = (allProjects || []).find(
      p => p.name.toLowerCase() === name.toLowerCase()
        && (p.client || "").toLowerCase() === CLIENT_NAME.toLowerCase()
    );
    if (existing) { projectCache[name] = existing.id; return existing.id; }

    console.log(`  → Creating project: "${name}"`);
    const { data, error } = await supabase.from("projects")
      .insert({ name, client: CLIENT_NAME, color: "#6366f1", status: "Active" })
      .select("id").single();
    if (error) { console.error(`    ERROR: ${error.message}`); return null; }
    allProjects.push({ id: data.id, name, client: CLIENT_NAME });
    projectCache[name] = data.id;
    return data.id;
  }

  // ── Process tasks ─────────────────────────────────────────────
  let created = 0, updated = 0, errors = 0;

  for (const t of tasks) {
    const project_id = await getOrCreateProject(t.project);
    if (!project_id) { errors++; continue; }

    // Check if task already exists
    const { data: existing } = await supabase.from("tasks")
      .select("id,status,detailer,checker,assignee,client_sub_date,due_date,det_weight,scope")
      .eq("title", t.title)
      .eq("project_id", project_id)
      .maybeSingle();

    if (existing) {
      // ── UPDATE: only write fields that Excel actually has ──────
      const payload = {
        status: t.status,        // always update status
        client: CLIENT_NAME,
      };
      // Only overwrite if Excel has a non-null value (preserve existing DB values otherwise)
      if (t.detailer   !== null) payload.detailer        = t.detailer;
      if (t.checker    !== null) payload.checker         = t.checker;
      if (t.assignee   !== null) payload.assignee        = t.assignee;
      if (t.client_sub_date !== null) payload.client_sub_date = t.client_sub_date;
      if (t.due_date   !== null) payload.due_date        = t.due_date;
      if (t.det_weight !== null) payload.det_weight      = t.det_weight;
      if (t.scope      !== null) payload.scope           = t.scope;

      const { error } = await supabase.from("tasks").update(payload).eq("id", existing.id);
      if (error) {
        console.error(`  ✗ UPDATE ERROR: "${t.title}" — ${error.message}`);
        errors++;
      } else {
        console.log(`  ↺ UPDATED: "${t.title}" (${t.project}) | ${t.status}${t.detailer ? ` | det:${t.detailer}` : ""}${t.client_sub_date ? ` | sub:${t.client_sub_date}` : ""}`);
        updated++;
      }
    } else {
      // ── INSERT: null fields stay null (rule: don't default) ───
      const { error } = await supabase.from("tasks").insert({
        title:           t.title,
        project_id,
        client:          CLIENT_NAME,
        status:          t.status,
        scope:           t.scope,
        assignee:        null,           // no assignee in this Excel
        detailer:        t.detailer,     // null if blank
        checker:         t.checker,      // null if blank
        client_sub_date: t.client_sub_date, // null if blank
        due_date:        t.due_date,     // null if blank
        det_weight:      t.det_weight,   // null if blank
      });
      if (error) {
        console.error(`  ✗ INSERT ERROR: "${t.title}" — ${error.message}`);
        errors++;
      } else {
        console.log(`  ✚ CREATED: "${t.title}" (${t.project}) | ${t.status}${t.detailer ? ` | det:${t.detailer}` : ""}${t.client_sub_date ? ` | sub:${t.client_sub_date}` : ""}`);
        created++;
      }
    }
  }

  console.log(`\n${"─".repeat(55)}`);
  console.log(`Done — ${created} created, ${updated} updated, ${errors} errors`);
}

run().catch(e => { console.error(e); process.exit(1); });
