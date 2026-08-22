// dedup-whitecap.cjs — remove duplicate tasks for White Cap
// Keeps 1 best copy per (project_id + title), deletes the rest.
// Usage:
//   node dedup-whitecap.cjs          ← dry-run
//   node dedup-whitecap.cjs --apply  ← delete duplicates

const { createClient } = require("@supabase/supabase-js");
const DRY = !process.argv.includes("--apply");

const sb = createClient(
  "https://xypcbioltukahipkqqzc.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGNiaW9sdHVrYWhpcGtxcXpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTQzMTM2NSwiZXhwIjoyMDk1MDA3MzY1fQ.AoLxjBk3MR3_qjsCP50xzbyx7cp_kaQlVmN_eP_xuYU"
);

function norm(s) { return (s || "").trim().toLowerCase().replace(/\s+/g, " "); }

// Score a task: higher = better to keep
function score(t) {
  let s = 0;
  if (norm(t.status) === "completed")       s += 100;
  if (norm(t.status) === "in progress")     s += 50;
  if (t.detailer)                           s += 10;
  if (t.checker)                            s += 5;
  if (t.client_sub_date)                    s += 5;
  if (t.det_weight)                         s += 3;
  if (t.scope)                              s += 2;
  return s;
}

async function main() {
  console.log(`\n=== White Cap Dedup — ${DRY ? "DRY RUN" : "⚠ LIVE DELETE"} ===\n`);

  // Load White Cap projects
  const { data: projects } = await sb.from("projects").select("id,name").eq("client", "White Cap");
  const projIds = (projects || []).map(p => p.id);
  const projMap = {};
  (projects || []).forEach(p => projMap[p.id] = p.name);
  console.log(`White Cap projects: ${projIds.length}`);

  // Load all tasks in chunks
  let allTasks = [];
  for (let i = 0; i < projIds.length; i += 50) {
    const chunk = projIds.slice(i, i + 50);
    let from = 0;
    while (true) {
      const { data } = await sb.from("tasks")
        .select("id,project_id,title,status,detailer,checker,client_sub_date,det_weight,scope")
        .in("project_id", chunk)
        .range(from, from + 999);
      if (!data || !data.length) break;
      allTasks = allTasks.concat(data);
      if (data.length < 1000) break;
      from += 1000;
    }
  }
  console.log(`White Cap tasks total: ${allTasks.length}`);

  // Group by project_id + normalised title
  const groups = {};
  allTasks.forEach(t => {
    const k = t.project_id + "|||" + norm(t.title);
    if (!groups[k]) groups[k] = [];
    groups[k].push(t);
  });

  const dupGroups = Object.values(groups).filter(g => g.length > 1);
  console.log(`Duplicate groups: ${dupGroups.length}`);

  let toDelete = [];
  dupGroups.forEach(g => {
    // Sort: highest score first, then by id (deterministic tie-break)
    g.sort((a, b) => score(b) - score(a) || a.id.localeCompare(b.id));
    const keep   = g[0];
    const remove = g.slice(1);
    toDelete = toDelete.concat(remove.map(t => t.id));
    console.log(`\n  "${g[0].title}" in [${projMap[g[0].project_id]}] — ${g.length} copies`);
    console.log(`    KEEP:   id=${keep.id} | ${keep.status} | det:${keep.detailer||"-"}`);
    remove.forEach(t => console.log(`    DELETE: id=${t.id} | ${t.status} | det:${t.detailer||"-"}`));
  });

  console.log(`\nTotal tasks to delete: ${toDelete.length}`);

  if (DRY) {
    console.log(`\nDRY RUN — nothing deleted. Run with --apply to delete.`);
    return;
  }

  // Delete in batches of 50
  let deleted = 0;
  for (let i = 0; i < toDelete.length; i += 50) {
    const chunk = toDelete.slice(i, i + 50);
    const { error } = await sb.from("tasks").delete().in("id", chunk);
    if (error) console.error(`  DELETE ERROR: ${error.message}`);
    else deleted += chunk.length;
  }
  console.log(`\nDone — deleted ${deleted} duplicate tasks.`);
  console.log(`Remaining White Cap tasks: ${allTasks.length - deleted}`);
}

main().catch(console.error);
