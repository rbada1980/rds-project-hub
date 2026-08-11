// delete-formcrete-all.cjs
// Deletes ALL Formcrete tasks and projects from Supabase + local PostgreSQL
// Run: node delete-formcrete-all.cjs

const{createClient}=require("@supabase/supabase-js");
const{Pool}=require("pg");

const sb=createClient(
  "https://xypcbioltukahipkqqzc.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGNiaW9sdHVrYWhpcGtxcXpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTQzMTM2NSwiZXhwIjoyMDk1MDA3MzY1fQ.AoLxjBk3MR3_qjsCP50xzbyx7cp_kaQlVmN_eP_xuYU"
);
const pool=new Pool({host:"localhost",port:5432,database:"rds_local",user:"postgres",password:"rds2026"});

const CLIENT="Formcrete";

async function main(){
  console.log("🗑  Deleting ALL Formcrete data...\n");

  // 1. Get all Formcrete project IDs
  const{data:projects,error:pe}=await sb.from("projects").select("id,name").eq("client",CLIENT);
  if(pe){console.error("❌ Cannot fetch projects:",pe.message);process.exit(1);}
  console.log(`📋 Found ${projects.length} Formcrete projects`);

  const projIds=projects.map(p=>p.id);

  // 2. Delete all tasks
  let taskCount=0;
  if(projIds.length>0){
    const{data:tasks}=await sb.from("tasks").select("id").in("project_id",projIds);
    taskCount=tasks?.length||0;
    console.log(`📌 Found ${taskCount} tasks to delete`);

    const{error:te}=await sb.from("tasks").delete().in("project_id",projIds);
    if(te){console.error("❌ Task delete error:",te.message);process.exit(1);}
    console.log(`✅ Deleted ${taskCount} tasks from Supabase`);

    // Local PostgreSQL tasks
    try{
      await pool.query("DELETE FROM tasks WHERE project_id=ANY($1)",[projIds]);
      console.log(`✅ Deleted tasks from local DB`);
    }catch(e){console.log("⚠ Local task delete:",e.message);}
  }

  // 3. Delete all projects
  const{error:pre}=await sb.from("projects").delete().eq("client",CLIENT);
  if(pre){console.error("❌ Project delete error:",pre.message);process.exit(1);}
  console.log(`✅ Deleted ${projects.length} projects from Supabase`);

  // Local PostgreSQL projects
  try{
    await pool.query("DELETE FROM projects WHERE client=$1",[CLIENT]);
    console.log(`✅ Deleted projects from local DB`);
  }catch(e){console.log("⚠ Local project delete:",e.message);}

  console.log(`\n✅ Done! All Formcrete data removed.`);
  console.log(`   Projects deleted : ${projects.length}`);
  console.log(`   Tasks deleted    : ${taskCount}`);
  console.log(`\nNow upload your Excel and run the import.`);

  await pool.end();
}
main().catch(e=>{console.error("FATAL:",e.message);process.exit(1);});
