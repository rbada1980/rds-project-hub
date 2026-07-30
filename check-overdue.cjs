const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  "https://xypcbioltukahipkqqzc.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGNiaW9sdHVrYWhpcGtxcXpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTQzMTM2NSwiZXhwIjoyMDk1MDA3MzY1fQ.AoLxjBk3MR3_qjsCP50xzbyx7cp_kaQlVmN_eP_xuYU"
);

const today = new Date().toISOString().slice(0, 10);

async function main() {
  console.log("Today:", today);

  // Get all tasks with due_date < today and status not Completed/Done
  const { data: tasks, error } = await supabase
    .from("tasks")
    .select("id,title,status,due_date,assignee,project_id")
    .lt("due_date", today)
    .not("status", "in", '("Completed","Done")');

  if (error) { console.log("ERR:", error.message); return; }

  console.log(`\nOverdue tasks (due_date < ${today}, status not Completed/Done): ${tasks.length}`);

  if (!tasks.length) { console.log("  None!"); return; }

  // Get project names
  const pids = [...new Set(tasks.map(t => t.project_id))];
  const { data: projects } = await supabase.from("projects").select("id,name,client").in("id", pids);
  const projMap = {};
  (projects||[]).forEach(p => projMap[p.id] = p);

  tasks.forEach(t => {
    const p = projMap[t.project_id] || {};
    console.log(`  [${p.client||"?"}] ${p.name||"?"} → "${t.title}" | ${t.status} | due: ${t.due_date} | assignee: ${t.assignee}`);
  });
}
main().catch(e => console.error("FATAL:", e.message));
