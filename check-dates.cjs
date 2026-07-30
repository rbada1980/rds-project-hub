const { createClient } = require("@supabase/supabase-js");
const sb = createClient(
  "https://xypcbioltukahipkqqzc.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGNiaW9sdHVrYWhpcGtxcXpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTQzMTM2NSwiZXhwIjoyMDk1MDA3MzY1fQ.AoLxjBk3MR3_qjsCP50xzbyx7cp_kaQlVmN_eP_xuYU"
);

async function main() {
  let all = [], from = 0;
  while (true) {
    const { data, error } = await sb.from("tasks")
      .select("id,title,project_id,due_date,client_sub_date,status")
      .range(from, from + 999);
    if (error) { console.log("ERR:", error.message); break; }
    if (!data || data.length === 0) break;
    all = all.concat(data);
    if (data.length < 1000) break;
    from += 1000;
  }
  console.log("Total tasks:", all.length);

  // Bad format
  const bad = all.filter(t => {
    if (t.due_date && !/^\d{4}-\d{2}-\d{2}/.test(t.due_date)) return true;
    if (t.client_sub_date && !/^\d{4}-\d{2}-\d{2}/.test(t.client_sub_date)) return true;
    return false;
  });
  console.log("Bad date format:", bad.length);
  bad.slice(0, 5).forEach(t => console.log("  ", JSON.stringify(t.title), "due:", t.due_date, "sub:", t.client_sub_date));

  // Very old
  const old = all.filter(t => t.due_date && t.due_date < "2020-01-01");
  console.log("Due date before 2020:", old.length);
  old.slice(0, 5).forEach(t => console.log("  ", JSON.stringify(t.title), "due:", t.due_date));

  // Far future
  const fut = all.filter(t => t.due_date && t.due_date > "2030-01-01");
  console.log("Due date after 2030:", fut.length);
  fut.slice(0, 5).forEach(t => console.log("  ", JSON.stringify(t.title), "due:", t.due_date));

  // Overdue
  const today = "2026-07-30";
  const isDone = s => s === "Done" || s === "Completed";
  const overdue = all.filter(t => t.due_date && t.due_date < today && !isDone(t.status));
  console.log("Overdue (due_date < today, not done):", overdue.length);

  // Date coverage
  const hasDue = all.filter(t => t.due_date).length;
  const hasSub = all.filter(t => t.client_sub_date).length;
  const neither = all.filter(t => !t.due_date && !t.client_sub_date).length;
  console.log("Has due_date:", hasDue);
  console.log("Has client_sub_date:", hasSub);
  console.log("No dates at all:", neither);
}
main().catch(e => { console.error("FATAL:", e.message); process.exit(1); });
