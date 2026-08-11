// fix-dup-tasks.cjs — removes duplicate tasks keeping the oldest copy
const{createClient}=require("@supabase/supabase-js");
const{Pool}=require("pg");
const sb=createClient(
  "https://xypcbioltukahipkqqzc.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGNiaW9sdHVrYWhpcGtxcXpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTQzMTM2NSwiZXhwIjoyMDk1MDA3MzY1fQ.AoLxjBk3MR3_qjsCP50xzbyx7cp_kaQlVmN_eP_xuYU"
);
const pool=new Pool({host:"localhost",port:5432,database:"rds_local",user:"postgres",password:"rds2026"});

async function main(){
  const{data:tasks}=await sb.from("tasks").select("id,title,project_id,client,created_at").order("created_at",{ascending:true});

  const groups={};
  for(const t of(tasks||[])){
    const key=`${t.project_id}|${t.title.trim().toLowerCase()}`;
    if(!groups[key])groups[key]=[];
    groups[key].push(t);
  }
  const dupes=Object.values(groups).filter(g=>g.length>1);

  if(dupes.length===0){console.log("✅ No duplicate tasks found!");await pool.end();return;}
  console.log(`⚠  Found ${dupes.length} duplicate group(s) — fixing...\n`);

  let deleted=0;
  for(const g of dupes){
    const[keep,...remove]=g; // oldest first
    console.log(`Keep : [${keep.id}] "${keep.title}"`);
    for(const t of remove){
      const{error}=await sb.from("tasks").delete().eq("id",t.id);
      if(error){console.log(`  ❌ Failed to delete [${t.id}]: ${error.message}`);}
      else{
        try{await pool.query("DELETE FROM tasks WHERE id=$1",[t.id]);}catch(_){}
        console.log(`  🗑  Deleted dupe [${t.id}]`);
        deleted++;
      }
    }
  }
  console.log(`\n✅ Done — deleted ${deleted} duplicate task(s)`);
  await pool.end();
}
main().catch(e=>{console.error("FATAL:",e.message);process.exit(1);});
