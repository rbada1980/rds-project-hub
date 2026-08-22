// check-duplicates.cjs — find duplicate tasks and projects for White Cap
const { createClient } = require("@supabase/supabase-js");

const sb = createClient(
  "https://xypcbioltukahipkqqzc.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGNiaW9sdHVrYWhpcGtxcXpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTQzMTM2NSwiZXhwIjoyMDk1MDA3MzY1fQ.AoLxjBk3MR3_qjsCP50xzbyx7cp_kaQlVmN_eP_xuYU"
);

function norm(s) { return (s || "").trim().toLowerCase().replace(/\s+/g, " "); }

async function main() {
  // 1. Duplicate PROJECTS (same name + client, case-insensitive)
  const { data: allProjects } = await sb.from("projects").select("id,name,client");
  const projGroups = {};
  (allProjects || []).forEach(p => {
    const k = norm(p.client) + "|||" + norm(p.name);
    if (!projGroups[k]) projGroups[k] = [];
    projGroups[k].push(p);
  });
  const dupProjects = Object.values(projGroups).filter(g => g.length > 1);

  console.log(`\n=== DUPLICATE PROJECTS ===`);
  if (dupProjects.length === 0) {
    console.log("None found ✓");
  } else {
    dupProjects.forEach(g => {
      console.log(`  "${g[0].name}" (client: ${g[0].client}) — ${g.length} copies:`);
      g.forEach(p => console.log(`    id=${p.id}`));
    });
  }

  // 2. Duplicate TASKS (same project_id + title, case-insensitive)
  const wcProjects = (allProjects || []).filter(p => norm(p.client) === "white cap");
  const wcIds = wcProjects.map(p => p.id);
  const projMap = {};
  wcProjects.forEach(p => projMap[p.id] = p.name);

  let allTasks = [];
  for (let i = 0; i < wcIds.length; i += 50) {
    const chunk = wcIds.slice(i, i + 50);
    let from = 0;
    while (true) {
      const { data } = await sb.from("tasks")
        .select("id,project_id,title,status")
        .in("project_id", chunk)
        .range(from, from + 999);
      if (!data || !data.length) break;
      allTasks = allTasks.concat(data);
      if (data.length < 1000) break;
      from += 1000;
    }
  }

  const taskGroups = {};
  allTasks.forEach(t => {
    const k = t.project_id + "|||" + norm(t.title);
    if (!taskGroups[k]) taskGroups[k] = [];
    taskGroups[k].push(t);
  });
  const dupTasks = Object.values(taskGroups).filter(g => g.length > 1);

  console.log(`\n=== DUPLICATE TASKS (White Cap) ===`);
  console.log(`Total White Cap projects: ${wcProjects.length}`);
  console.log(`Total White Cap tasks:    ${allTasks.length}`);
  if (dupTasks.length === 0) {
    console.log("No duplicate tasks found ✓");
  } else {
    console.log(`Found ${dupTasks.length} duplicate groups:`);
    dupTasks.forEach(g => {
      const proj = projMap[g[0].project_id] || g[0].project_id;
      console.log(`  "${g[0].title}" in [${proj}] — ${g.length} copies (ids: ${g.map(t=>t.id).join(", ")})`);
    });
  }

  // 3. Also check ALL clients for duplicate projects
  const allDupProjects = Object.values(projGroups).filter(g => g.length > 1);
  console.log(`\n=== DUPLICATE PROJECTS (ALL clients) ===`);
  if (allDupProjects.length === 0) {
    console.log("None found ✓");
  } else {
    console.log(`Found ${allDupProjects.length} duplicate project groups:`);
    allDupProjects.forEach(g => {
      console.log(`  "${g[0].name}" [${g[0].client}] — ${g.length} copies`);
    });
  }
}

main().catch(console.error);
