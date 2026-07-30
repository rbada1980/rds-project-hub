// Check for any remaining duplicate tasks (same project_id + title) in Supabase
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  "https://xypcbioltukahipkqqzc.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGNiaW9sdHVrYWhpcGtxcXpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTQzMTM2NSwiZXhwIjoyMDk1MDA3MzY1fQ.AoLxjBk3MR3_qjsCP50xzbyx7cp_kaQlVmN_eP_xuYU"
);

async function main() {
  // Fetch all tasks in pages
  let all = [], from = 0;
  while (true) {
    const { data, error } = await supabase.from("tasks")
      .select("id,title,project_id,status,updated_at")
      .range(from, from + 999);
    if (error) { console.log("ERR:", error.message); break; }
    if (!data || data.length === 0) break;
    all = all.concat(data);
    if (data.length < 1000) break;
    from += 1000;
  }
  console.log("Total tasks: " + all.length);

  // Group by project_id + title (case-insensitive)
  const groups = {};
  for (const t of all) {
    const key = t.project_id + "||" + t.title.trim().toLowerCase();
    if (!groups[key]) groups[key] = [];
    groups[key].push(t);
  }

  const dups = Object.values(groups).filter(g => g.length > 1);
  console.log("Duplicate groups: " + dups.length);

  if (dups.length === 0) {
    console.log("\n✅ No duplicates found — database is clean!");
  } else {
    console.log("\n⚠ Duplicates found:");
    for (const g of dups) {
      console.log(`  x${g.length}: "${g[0].title}" (project: ${g[0].project_id})`);
      for (const t of g) {
        console.log(`    [${t.id}] ${t.status} | updated: ${t.updated_at}`);
      }
    }
    console.log("\nRun dedup-tasks.cjs to fix.");
  }
}
main().catch(e => { console.error("FATAL:", e.message); process.exit(1); });
