// KS&P Limited Task UPDATE Script — syncs app data to match latest Excel
// Run: node update_ksp.cjs

const { createClient } = require("@supabase/supabase-js");

const SUPA_URL = "https://xypcbioltukahipkqqzc.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGNiaW9sdHVrYWhpcGtxcXpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0MzEzNjUsImV4cCI6MjA5NTAwNzM2NX0.DG5sv2bpx8j3Mmz0mqIsoDVaCMP2TmWqh-OQUfSZFRw";
const supabase = createClient(SUPA_URL, SUPA_KEY);

// ── Latest data from Excel (tekla format — KS&P Limited) ──────────
const UPDATES = [
  { title:"SC-P1-LEVEL-1",                       project:"Sports complex", status:"In Progress", priority:"Low", assignee:"Divya", detailer:"Divya", checker:"Naidu", due_date:"2026-07-29", client_sub_date:"2026-07-29" },
  { title:"SC-P1-LEVEL-2",                       project:"Sports complex", status:"In Progress", priority:"Low", assignee:"siva",  detailer:"siva",  checker:"Naidu", due_date:"2026-07-29", client_sub_date:"2026-07-29" },
  { title:"LRC Building GA & Details",            project:"LRC Building",  status:"Completed",   priority:"Low", assignee:"Akash", detailer:"Akash", checker:"Naidu", due_date:"2026-06-29", client_sub_date:"2026-06-29" },
  { title:"LRC Building GA & Details (Checking)", project:"LRC Building",  status:"Completed",   priority:"Low", assignee:"Naidu", detailer:"Naidu", checker:"Naidu", due_date:"2026-06-29", client_sub_date:"2026-06-29" },
];

async function run() {
  console.log("=== KS&P Limited — Update tasks from Excel ===\n");

  // Load all projects to resolve project name → id
  const { data: projects } = await supabase.from("projects").select("id,name,client");

  // Load all tasks for KS&P Limited
  const { data: allTasks, error } = await supabase
    .from("tasks")
    .select("id,title,project_id,status,priority,assignee,detailer,checker,due_date,client_sub_date")
    .eq("client", "KS&P Limited");

  if (error) { console.error("Failed to load tasks:", error.message); process.exit(1); }
  console.log(`Found ${allTasks.length} existing KS&P tasks in app\n`);

  let updated = 0, notFound = 0;

  for (const u of UPDATES) {
    const proj = projects.find(p => p.name.toLowerCase() === u.project.toLowerCase());
    if (!proj) {
      console.log(`  NOT FOUND project: ${u.project}`);
      notFound++;
      continue;
    }

    const task = allTasks.find(t =>
      t.title?.toLowerCase() === u.title.toLowerCase() &&
      t.project_id === proj.id
    );

    if (!task) {
      console.log(`  NOT FOUND task: ${u.title} (${u.project})`);
      notFound++;
      continue;
    }

    // Show what's changing
    const changes = [];
    if (task.status        !== u.status)          changes.push(`status: "${task.status}" → "${u.status}"`);
    if (task.priority      !== u.priority)         changes.push(`priority: "${task.priority}" → "${u.priority}"`);
    if (task.assignee      !== u.assignee)         changes.push(`assignee: "${task.assignee}" → "${u.assignee}"`);
    if (task.detailer      !== u.detailer)         changes.push(`detailer: "${task.detailer}" → "${u.detailer}"`);
    if (task.checker       !== u.checker)          changes.push(`checker: "${task.checker}" → "${u.checker}"`);
    if (task.due_date      !== u.due_date)         changes.push(`due_date: "${task.due_date}" → "${u.due_date}"`);
    if (task.client_sub_date !== u.client_sub_date) changes.push(`client_sub_date: "${task.client_sub_date}" → "${u.client_sub_date}"`);

    if (!changes.length) {
      console.log(`  OK (no change): ${u.title}`);
      continue;
    }

    const { error: updateErr } = await supabase
      .from("tasks")
      .update({
        status:          u.status,
        priority:        u.priority,
        assignee:        u.assignee,
        detailer:        u.detailer,
        checker:         u.checker,
        due_date:        u.due_date,
        client_sub_date: u.client_sub_date,
      })
      .eq("id", task.id);

    if (updateErr) {
      console.error(`  ERROR: ${u.title} — ${updateErr.message}`);
    } else {
      console.log(`  UPDATED: ${u.title}`);
      changes.forEach(c => console.log(`    · ${c}`));
      updated++;
    }
  }

  console.log(`\nDone — ${updated} updated, ${notFound} not found.`);
}

run().catch(e => { console.error(e); process.exit(1); });
