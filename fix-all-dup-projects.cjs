// fix-all-dup-projects.cjs
// Finds and fixes duplicate project names across ALL clients in Supabase + local PG
// Keep oldest, merge tasks, delete dupes

const{createClient}=require("@supabase/supabase-js");
const{Pool}=require("pg");

const sb=createClient(
  "https://xypcbioltukahipkqqzc.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGNiaW9sdHVrYWhpcGtxcXpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTQzMTM2NSwiZXhwIjoyMDk1MDA3MzY1fQ.AoLxjBk3MR3_qjsCP50xzbyx7cp_kaQlVmN_eP_xuYU"
);
const pool=new Pool({host:"localhost",port:5432,database:"rds_local",user:"postgres",password:"rds2026"});

async function main(){
  // Fetch ALL projects
  const{data:projects,error}=await sb.from("projects").select("id,name,client,created_at").order("created_at",{ascending:true});
  if(error){console.error("Fetch error:",error.message);process.exit(1);}

  // Group by client + name (case-insensitive)
  const groups={};
  for(const p of projects){
    const key=`${p.client||""}|${p.name.trim().toLowerCase()}`;
    if(!groups[key])groups[key]=[];
    groups[key].push(p);
  }

  // Find duplicates
  const dupes=Object.entries(groups).filter(([,arr])=>arr.length>1);

  if(dupes.length===0){
    console.log("✅ No duplicate projects found across any client!");
    await pool.end();return;
  }

  console.log(`⚠  Found ${dupes.length} duplicate project group(s):\n`);
  for(const[key,arr]of dupes){
    const[client,name]=key.split("|");
    console.log(`  [${client||"no client"}] "${arr[0].name}" — ${arr.length} copies`);
    arr.forEach(p=>console.log(`    id=${p.id} created=${p.created_at}`));
  }

  console.log("\n🔧 Fixing...\n");

  let totalMerged=0,totalDeleted=0;

  for(const[key,arr]of dupes){
    const[keep,...remove]=arr; // oldest first (sorted by created_at asc)
    console.log(`\n  Keep: [${keep.id}] "${keep.name}" (${keep.client})`);

    // Fetch tasks for keep project
    const{data:keepTasks}=await sb.from("tasks").select("id,title").eq("project_id",keep.id);
    const keepTitles=new Set((keepTasks||[]).map(t=>t.title.toLowerCase()));

    for(const dup of remove){
      console.log(`  Removing dupe: [${dup.id}]`);

      // Fetch tasks under this dupe
      const{data:dupTasks}=await sb.from("tasks").select("id,title").eq("project_id",dup.id);
      console.log(`    ${(dupTasks||[]).length} tasks to handle`);

      for(const t of(dupTasks||[])){
        if(keepTitles.has(t.title.toLowerCase())){
          // Same title already exists under keep → delete this one
          await sb.from("tasks").delete().eq("id",t.id);
          try{await pool.query("DELETE FROM tasks WHERE id=$1",[t.id]);}catch(_){}
          console.log(`    🗑  Deleted duplicate task: "${t.title}"`);
        } else {
          // Move to keep project
          await sb.from("tasks").update({project_id:keep.id}).eq("id",t.id);
          try{await pool.query("UPDATE tasks SET project_id=$1 WHERE id=$2",[keep.id,t.id]);}catch(_){}
          keepTitles.add(t.title.toLowerCase());
          totalMerged++;
          console.log(`    ✓  Moved task: "${t.title}"`);
        }
      }

      // Delete the duplicate project
      const{error:delErr}=await sb.from("projects").delete().eq("id",dup.id);
      if(delErr){console.error(`    ❌ Failed to delete [${dup.id}]: ${delErr.message}`);}
      else{
        try{await pool.query("DELETE FROM projects WHERE id=$1",[dup.id]);}catch(_){}
        totalDeleted++;
        console.log(`    ✅ Deleted duplicate project [${dup.id}]`);
      }
    }
  }

  console.log(`\n✅ Done! Deleted ${totalDeleted} duplicate project(s), merged ${totalMerged} task(s)`);
  await pool.end();
}

main().catch(e=>{console.error("FATAL:",e.message);process.exit(1);});
