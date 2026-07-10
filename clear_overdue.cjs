const { createClient } = require("@supabase/supabase-js");
const SUPA_URL = "https://xypcbioltukahipkqqzc.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGNiaW9sdHVrYWhpcGtxcXpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0MzEzNjUsImV4cCI6MjA5NTAwNzM2NX0.DG5sv2bpx8j3Mmz0mqIsoDVaCMP2TmWqh-OQUfSZFRw";
const supabase = createClient(SUPA_URL, SUPA_KEY);

async function main() {
  const today = "2026-07-10";

  // Fetch all overdue tasks (past date, not done)
  const { data: tasks, error } = await supabase
    .from("tasks")
    .select("id, title, status, client_sub_date, due_date")
    .or(`client_sub_date.lt.${today},due_date.lt.${today}`)
    .not("status", "in", '("Completed","Done")');

  if (error) { console.error("Fetch error:", error); return; }
  console.log(`Found ${tasks.length} overdue tasks — marking all Completed`);

  const ids = tasks.map(t => t.id);
  const { error: upErr } = await supabase
    .from("tasks")
    .update({ status: "Completed" })
    .in("id", ids);

  if (upErr) { console.error("Update error:", upErr); return; }
  console.log(`✓ ${tasks.length} tasks marked Completed`);
  tasks.forEach(t => console.log(`  - "${t.title}" (was: ${t.status})`));
}

main().catch(console.error);
