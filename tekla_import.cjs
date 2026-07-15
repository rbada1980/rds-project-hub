// ================================================================
// Tekla Excel → RDS Project Hub  (Universal Import/Update)
// Usage: node tekla_import.cjs "path\to\file.xlsx"
// ================================================================

const XLSX    = require("xlsx");
const path    = require("path");
const { createClient } = require("@supabase/supabase-js");

const SUPA_URL = "https://xypcbioltukahipkqqzc.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGNiaW9sdHVrYWhpcGtxcXpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0MzEzNjUsImV4cCI6MjA5NTAwNzM2NX0.DG5sv2bpx8j3Mmz0mqIsoDVaCMP2TmWqh-OQUfSZFRw";
const supabase = createClient(SUPA_URL, SUPA_KEY);

// Status mapping from Excel → App
const STATUS_MAP = {
  "in process":    "In Progress",
  "in progress":   "In Progress",
  "completed":     "Completed",
  "complete":      "Completed",
  "not yet started": "Not Yet Started",
  "to be started": "To Be Started",
};

function normalizeStatus(s) {
  return STATUS_MAP[(s || "").toLowerCase().trim()] || s || "Not Yet Started";
}

function excelDateToISO(val) {
  if (!val) return null;
  if (typeof val === "number") {
    // Excel serial date
    const d = XLSX.SSF.parse_date_code(val);
    return `${d.y}-${String(d.m).padStart(2,"0")}-${String(d.d).padStart(2,"0")}`;
  }
  if (typeof val === "string") {
    // Try DD-MM-YYYY, DD/MM/YYYY, or YYYY-MM-DD
    const s = val.trim();
    const m1 = s.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/);
    if (m1) return `${m1[3]}-${m1[2]}-${m1[1]}`;
    const m2 = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m2) return s;
  }
  return null;
}

// ── Parse Excel ──────────────────────────────────────────────────
function parseExcel(filePath) {
  const wb = XLSX.readFile(filePath, { cellDates: false, raw: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

  const sections = []; // [ { client, tasks[] } ]
  let currentClient = null;
  let tasks = [];

  for (const row of rows) {
    const cell0 = row[0] != null ? String(row[0]).trim() : "";

    // Client header row
    if (cell0.toUpperCase().startsWith("CLIENT:")) {
      if (currentClient && tasks.length) sections.push({ client: currentClient, tasks });
      currentClient = cell0.replace(/^CLIENT:/i, "").trim();
      tasks = [];
      continue;
    }

    // Skip header / empty rows
    if (!cell0 || cell0 === "#" || cell0.toLowerCase().includes("task")) continue;

    // Check if row[0] is a number (task row)
    const num = parseInt(cell0);
    if (isNaN(num)) continue;

    const title   = row[1] ? String(row[1]).trim() : null;
    if (!title) continue;

    tasks.push({
      title,
      project:         row[2] ? String(row[2]).trim() : "",
      status:          normalizeStatus(row[3]),
      priority:        row[4] ? String(row[4]).trim() : "Medium",
      assignee:        row[5] ? String(row[5]).trim() : "",
      detailer:        row[6] ? String(row[6]).trim() : "",
      checker:         row[7] ? String(row[7]).trim() : "",
      due_date:        excelDateToISO(row[8]),
      client_sub_date: excelDateToISO(row[9]),
    });
  }

  // Last section
  if (currentClient && tasks.length) sections.push({ client: currentClient, tasks });
  return sections;
}

// ── Main ─────────────────────────────────────────────────────────
async function run() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error("Usage: node tekla_import.cjs \"path\\to\\file.xlsx\"");
    process.exit(1);
  }

  console.log(`\n=== Tekla Import: ${path.basename(filePath)} ===\n`);
  const sections = parseExcel(filePath);

  if (!sections.length) {
    console.log("No tasks found in file.");
    return;
  }

  // Load existing projects
  const { data: allProjects } = await supabase.from("projects").select("id,name,client");
  const projectCache = {};

  async function getOrCreateProject(name, clientName) {
    const key = `${name}|||${clientName}`;
    if (projectCache[key]) return projectCache[key];

    const existing = allProjects.find(p =>
      p.name.toLowerCase() === name.toLowerCase() &&
      (p.client || "").toLowerCase() === clientName.toLowerCase()
    );
    if (existing) { projectCache[key] = existing.id; return existing.id; }

    console.log(`  → Creating project: "${name}" (${clientName})`);
    const { data, error } = await supabase.from("projects")
      .insert({ name, client: clientName, color: "#6366f1", status: "Active" })
      .select("id").single();
    if (error) { console.error(`    ERROR creating project: ${error.message}`); return null; }
    allProjects.push({ id: data.id, name, client: clientName });
    projectCache[key] = data.id;
    return data.id;
  }

  let totalCreated = 0, totalUpdated = 0, totalErrors = 0;

  for (const { client: clientName, tasks } of sections) {
    console.log(`\nClient: ${clientName} (${tasks.length} tasks)`);

    // Ensure client exists (don't create clients via import - just warn)
    const { data: clients } = await supabase.from("clients").select("id,name");
    const clientExists = clients.find(c => c.name.toLowerCase() === clientName.toLowerCase());
    if (!clientExists) {
      console.log(`  → Creating client: "${clientName}"`);
      await supabase.from("clients").insert({ name: clientName });
    }

    for (const t of tasks) {
      const project_id = await getOrCreateProject(t.project, clientName);
      if (!project_id) { totalErrors++; continue; }

      // Check if task exists
      const { data: existing } = await supabase.from("tasks")
        .select("id,status,due_date,client_sub_date,priority,assignee,detailer,checker")
        .eq("title", t.title)
        .eq("project_id", project_id)
        .maybeSingle();

      if (existing) {
        // Update
        const { error } = await supabase.from("tasks").update({
          status:          t.status,
          priority:        t.priority,
          assignee:        t.assignee,
          detailer:        t.detailer,
          checker:         t.checker,
          due_date:        t.due_date,
          client_sub_date: t.client_sub_date,
          client:          clientName,
        }).eq("id", existing.id);

        if (error) { console.error(`  ✗ UPDATE ERROR: ${t.title} — ${error.message}`); totalErrors++; }
        else { console.log(`  ↺ UPDATED: ${t.title} | ${t.status} | due:${t.due_date}`); totalUpdated++; }
      } else {
        // Insert
        const { error } = await supabase.from("tasks").insert({
          title:           t.title,
          project_id,
          client:          clientName,
          status:          t.status,
          priority:        t.priority,
          assignee:        t.assignee,
          detailer:        t.detailer,
          checker:         t.checker,
          due_date:        t.due_date,
          client_sub_date: t.client_sub_date,
        });

        if (error) { console.error(`  ✗ INSERT ERROR: ${t.title} — ${error.message}`); totalErrors++; }
        else { console.log(`  ✚ CREATED: ${t.title} | ${t.status} | due:${t.due_date}`); totalCreated++; }
      }
    }
  }

  console.log(`\n${"─".repeat(50)}`);
  console.log(`Done — ${totalCreated} created, ${totalUpdated} updated, ${totalErrors} errors`);
}

run().catch(e => { console.error(e); process.exit(1); });
