// check-all-duplicates.cjs — checks for duplicate projects AND tasks across all clients
const{createClient}=require("@supabase/supabase-js");
const sb=createClient(
  "https://xypcbioltukahipkqqzc.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGNiaW9sdHVrYWhpcGtxcXpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTQzMTM2NSwiZXhwIjoyMDk1MDA3MzY1fQ.AoLxjBk3MR3_qjsCP50xzbyx7cp_kaQlVmN_eP_xuYU"
);

async function main(){
  const{data:projects}=await sb.from("projects").select("id,name,client");
  const{data:tasks}=await sb.from("tasks").select("id,title,project_id,client");

  const projMap={};(projects||[]).forEach(p=>{projMap[p.id]=p;});

  // ── Duplicate PROJECTS ─────────────────────────────────────────────
  const projGroups={};
  for(const p of(projects||[])){
    const key=`${p.client||""}|${p.name.trim().toLowerCase()}`;
    if(!projGroups[key])projGroups[key]=[];
    projGroups[key].push(p);
  }
  const dupProjs=Object.values(projGroups).filter(g=>g.length>1);

  // ── Duplicate TASKS (same title in same project) ───────────────────
  const taskGroups={};
  for(const t of(tasks||[])){
    const key=`${t.project_id}|${t.title.trim().toLowerCase()}`;
    if(!taskGroups[key])taskGroups[key]=[];
    taskGroups[key].push(t);
  }
  const dupTasks=Object.values(taskGroups).filter(g=>g.length>1);

  // ── Report ─────────────────────────────────────────────────────────
  console.log(`\n=== DUPLICATE PROJECTS ===`);
  if(dupProjs.length===0){
    console.log("✅ None found");
  } else {
    console.log(`⚠  ${dupProjs.length} duplicate group(s):`);
    dupProjs.forEach(g=>{
      console.log(`  [${g[0].client}] "${g[0].name}" — ${g.length} copies`);
      g.forEach(p=>console.log(`    id=${p.id}`));
    });
  }

  console.log(`\n=== DUPLICATE TASKS ===`);
  if(dupTasks.length===0){
    console.log("✅ None found");
  } else {
    console.log(`⚠  ${dupTasks.length} duplicate task group(s):`);
    dupTasks.forEach(g=>{
      const p=projMap[g[0].project_id];
      console.log(`  [${g[0].client||p?.client}] ${p?.name} / "${g[0].title}" — ${g.length} copies`);
      g.forEach(t=>console.log(`    id=${t.id}`));
    });
  }

  console.log(`\n=== SUMMARY ===`);
  console.log(`Projects: ${(projects||[]).length} total | ${dupProjs.length} duplicate group(s)`);
  console.log(`Tasks   : ${(tasks||[]).length} total | ${dupTasks.length} duplicate group(s)`);

  if(dupTasks.length>0)console.log(`\nTo fix duplicate tasks, run: node fix-dup-tasks.cjs`);
  if(dupProjs.length>0)console.log(`To fix duplicate projects, run: node fix-all-dup-projects.cjs`);
}
main().catch(e=>{console.error("FATAL:",e.message);process.exit(1);});
