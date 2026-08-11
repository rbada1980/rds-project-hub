// sync-supabase-to-local.cjs
// Pulls ALL Formcrete tasks+projects from Supabase → local PostgreSQL
// Run: node sync-supabase-to-local.cjs

const{createClient}=require("@supabase/supabase-js");
const{Pool}=require("pg");

const sb=createClient(
  "https://xypcbioltukahipkqqzc.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGNiaW9sdHVrYWhpcGtxcXpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTQzMTM2NSwiZXhwIjoyMDk1MDA3MzY1fQ.AoLxjBk3MR3_qjsCP50xzbyx7cp_kaQlVmN_eP_xuYU"
);
const pool=new Pool({host:"localhost",port:5432,database:"rds_local",user:"postgres",password:"rds2026"});

const CLIENT="Formcrete";

async function main(){
  console.log("🔄 Syncing Formcrete from Supabase → local PostgreSQL...\n");

  // 1. Fetch all Formcrete projects from Supabase
  const{data:projects,error:pe}=await sb.from("projects").select("*").eq("client",CLIENT);
  if(pe){console.error("❌ Cannot fetch projects:",pe.message);process.exit(1);}
  console.log(`📋 Found ${projects.length} Formcrete projects in Supabase`);

  // 2. Upsert projects into local PostgreSQL
  let projOk=0,projErr=0;
  for(const p of projects){
    try{
      await pool.query(
        `INSERT INTO projects(id,name,client,created_at,color,deadline,description,group_name,assigned_users)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)
         ON CONFLICT(id) DO UPDATE SET
           name=EXCLUDED.name,client=EXCLUDED.client,color=EXCLUDED.color,
           deadline=EXCLUDED.deadline,description=EXCLUDED.description,
           group_name=EXCLUDED.group_name,assigned_users=EXCLUDED.assigned_users`,
        [p.id,p.name,p.client,p.created_at||new Date(),p.color||null,p.deadline||null,
         p.description||null,p.group_name||null,p.assigned_users||null]
      );
      projOk++;
    }catch(e){
      // Try simpler insert if columns don't match
      try{
        await pool.query(
          `INSERT INTO projects(id,name,client,created_at) VALUES($1,$2,$3,$4)
           ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name,client=EXCLUDED.client`,
          [p.id,p.name,p.client,p.created_at||new Date()]
        );
        projOk++;
      }catch(e2){console.log(`  ⚠ Project "${p.name}": ${e2.message}`);projErr++;}
    }
  }
  console.log(`  ✅ Projects synced: ${projOk} ok, ${projErr} errors`);

  // 3. Fetch all Formcrete tasks from Supabase (paginated)
  const projIds=projects.map(p=>p.id);
  let allTasks=[];
  const PAGE=1000;
  let from=0;
  while(true){
    const{data,error}=await sb.from("tasks").select("*")
      .in("project_id",projIds).order("created_at").range(from,from+PAGE-1);
    if(error||!data||data.length===0)break;
    allTasks=allTasks.concat(data);
    if(data.length<PAGE)break;
    from+=PAGE;
  }
  console.log(`\n📌 Found ${allTasks.length} Formcrete tasks in Supabase`);

  // 4. Upsert tasks into local PostgreSQL
  let taskOk=0,taskErr=0;
  for(const t of allTasks){
    try{
      await pool.query(
        `INSERT INTO tasks(id,project_id,client,title,status,client_sub_date,due_date,
          assignee,detailer,checker,priority,created_at,notes,client_approval,client_comment)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
         ON CONFLICT(id) DO UPDATE SET
           status=EXCLUDED.status,client_sub_date=EXCLUDED.client_sub_date,
           due_date=EXCLUDED.due_date,assignee=EXCLUDED.assignee,
           detailer=EXCLUDED.detailer,checker=EXCLUDED.checker,
           priority=EXCLUDED.priority,notes=EXCLUDED.notes,
           client_approval=EXCLUDED.client_approval,client_comment=EXCLUDED.client_comment`,
        [t.id,t.project_id,t.client,t.title,t.status,t.client_sub_date||null,
         t.due_date||null,t.assignee||null,t.detailer||null,t.checker||null,
         t.priority||"Medium",t.created_at||new Date(),t.notes||null,
         t.client_approval||null,t.client_comment||null]
      );
      taskOk++;
    }catch(e){
      // Fallback: minimal columns
      try{
        await pool.query(
          `INSERT INTO tasks(id,project_id,client,title,status,client_sub_date,due_date,assignee,detailer,checker,priority,created_at)
           VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
           ON CONFLICT(id) DO UPDATE SET
             status=EXCLUDED.status,client_sub_date=EXCLUDED.client_sub_date,
             due_date=EXCLUDED.due_date,assignee=EXCLUDED.assignee,
             detailer=EXCLUDED.detailer,checker=EXCLUDED.checker`,
          [t.id,t.project_id,t.client,t.title,t.status,t.client_sub_date||null,
           t.due_date||null,t.assignee||null,t.detailer||null,t.checker||null,
           t.priority||"Medium",t.created_at||new Date()]
        );
        taskOk++;
      }catch(e2){console.log(`  ⚠ Task "${t.title}": ${e2.message}`);taskErr++;}
    }
  }

  console.log(`  ✅ Tasks synced: ${taskOk} ok, ${taskErr} errors`);
  console.log(`\n✅ Sync complete!`);
  console.log(`   Projects: ${projOk}/${projects.length}`);
  console.log(`   Tasks:    ${taskOk}/${allTasks.length}`);
  await pool.end();
}
main().catch(e=>{console.error("FATAL:",e.message);process.exit(1);});
