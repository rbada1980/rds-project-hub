const { createClient } = require("@supabase/supabase-js");
const s = createClient(
  "https://xypcbioltukahipkqqzc.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGNiaW9sdHVrYWhpcGtxcXpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0MzEzNjUsImV4cCI6MjA5NTAwNzM2NX0.DG5sv2bpx8j3Mmz0mqIsoDVaCMP2TmWqh-OQUfSZFRw"
);
async function main() {
  const { data, error } = await s.from("tasks").select("due_date,status").eq("client","White Cap");
  if (error) { console.error("ERROR:", error.message); return; }
  const yrs = {}, statuses = {};
  for (const r of data) {
    const y = r.due_date ? r.due_date.substring(0,4) : "null";
    yrs[y] = (yrs[y]||0) + 1;
    statuses[r.status] = (statuses[r.status]||0) + 1;
  }
  console.log(`\n=== White Cap in Supabase: ${data.length} tasks ===`);
  console.log("\nBy year:");
  for (const [y,c] of Object.entries(yrs).sort()) console.log(`  ${y}: ${c} tasks`);
  console.log("\nBy status:");
  for (const [s,c] of Object.entries(statuses).sort()) console.log(`  ${s}: ${c}`);
}
main().catch(console.error);
