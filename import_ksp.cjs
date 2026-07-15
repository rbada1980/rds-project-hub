// KS&P Limited Task Import Script
// Run: node import_ksp.cjs

const { createClient } = require("@supabase/supabase-js");

const SUPA_URL = "https://xypcbioltukahipkqqzc.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGNiaW9sdHVrYWhpcGtxcXpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0MzEzNjUsImV4cCI6MjA5NTAwNzM2NX0.DG5sv2bpx8j3Mmz0mqIsoDVaCMP2TmWqh-OQUfSZFRw";
const supabase = createClient(SUPA_URL, SUPA_KEY);

// ── Data extracted from tekla format.xlsx ─────────────────────────
const CLIENT_NAME = "KS&P Limited";

const TASKS = [
  { title:"SC-P1-LEVEL-1",                      project:"Sports complex", status:"In Progress", priority:"High", assignee:"Divya",     detailer:"Divya",     checker:"Naidu", due_date:"2026-06-29", client_sub_date:"2026-06-29" },
  { title:"SC-P1-LEVEL-2",                      project:"Sports complex", status:"In Progress", priority:"High", assignee:"siva",      detailer:"siva",      checker:"Naidu", due_date:"2026-06-29", client_sub_date:"2026-06-29" },
  { title:"LRC Building GA & Details",           project:"LRC Building",  status:"In Progress", priority:"High", assignee:"Akash",     detailer:"Akash",     checker:"Naidu", due_date:"2026-06-29", client_sub_date:"2026-06-29" },
  { title:"LRC Building GA & Details (Checking)",project:"LRC Building",  status:"In Progress", priority:"High", assignee:"Naidu",     detailer:"Naidu",     checker:"Naidu", due_date:"2026-06-29", client_sub_date:"2026-06-29" },
];

async function run() {
  console.log("=== KS&P Limited Import ===\n");
  console.log("Status mapping: 'In Process' → 'In Progress'");
  console.log("Names used as-is from Excel (no cross-department matching)\n");

  // 1. Get or create client
  let { data: clients } = await supabase.from("clients").select("id,name");
  let client = clients.find(c => c.name.toLowerCase() === CLIENT_NAME.toLowerCase());
  if (!client) {
    console.log(`Creating client: ${CLIENT_NAME}`);
    const { data, error } = await supabase.from("clients").insert({ name: CLIENT_NAME }).select().single();
    if (error) { console.error("Failed to create client:", error.message); process.exit(1); }
    client = data;
  } else {
    console.log(`Client found: ${client.name} (${client.id})`);
  }

  // 3. Get existing projects
  let { data: projects } = await supabase.from("projects").select("id,name,client");
  const projectMap = {};

  const projectNames = [...new Set(TASKS.map(t => t.project))];
  for (const pName of projectNames) {
    let proj = projects.find(p =>
      p.name.toLowerCase() === pName.toLowerCase() &&
      p.client?.toLowerCase() === CLIENT_NAME.toLowerCase()
    );
    if (!proj) {
      console.log(`Creating project: ${pName}`);
      const { data, error } = await supabase.from("projects").insert({
        name: pName,
        client: CLIENT_NAME,
        color: "#6366f1",
        status: "Active"
      }).select().single();
      if (error) { console.error(`Failed to create project ${pName}:`, error.message); process.exit(1); }
      proj = data;
    } else {
      console.log(`Project found: ${proj.name} (${proj.id})`);
    }
    projectMap[pName] = proj.id;
  }

  // 4. Load existing tasks to avoid duplicates
  const { data: existingTasks } = await supabase.from("tasks").select("title,project_id");

  // 5. Insert tasks
  console.log("\n--- Inserting Tasks ---");
  let created = 0, skipped = 0;
  for (const t of TASKS) {
    const project_id = projectMap[t.project];
    const already = existingTasks?.find(e =>
      e.title?.toLowerCase() === t.title.toLowerCase() && e.project_id === project_id
    );
    if (already) {
      console.log(`  SKIP (exists): ${t.title}`);
      skipped++;
      continue;
    }

    const { error } = await supabase.from("tasks").insert({
      title: t.title,
      project_id,
      client: CLIENT_NAME,
      status: t.status,
      priority: t.priority,
      assignee: t.assignee,   // exact name from Excel — no cross-department matching
      detailer: t.detailer,
      checker: t.checker,
      due_date: t.due_date,
      client_sub_date: t.client_sub_date,
    });

    if (error) {
      console.error(`  ERROR: ${t.title} — ${error.message}`);
    } else {
      console.log(`  CREATED: ${t.title} → ${t.project} (assignee: ${t.assignee})`);
      created++;
    }
  }

  console.log(`\nDone — ${created} created, ${skipped} skipped.`);
}

run().catch(e => { console.error(e); process.exit(1); });
