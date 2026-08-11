// final-health-check.cjs — full app health check
const{createClient}=require("@supabase/supabase-js");
const sb=createClient(
  "https://xypcbioltukahipkqqzc.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGNiaW9sdHVrYWhpcGtxcXpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTQzMTM2NSwiZXhwIjoyMDk1MDA3MzY1fQ.AoLxjBk3MR3_qjsCP50xzbyx7cp_kaQlVmN_eP_xuYU"
);

async function main(){
  const today=new Date().toLocaleDateString("en-CA",{timeZone:"Asia/Kolkata"});

  const[{data:projects},{data:tasks},{data:users}]=await Promise.all([
    sb.from("projects").select("id,name,client"),
    sb.from("tasks").select("id,title,project_id,client,status,due_date"),
    sb.from("users").select("id,name,role,is_active"),
  ]);

  const P=projects||[],T=tasks||[],U=users||[];

  // 1. Duplicate projects
  const projSeen=new Set();let dupProjs=0;
  P.forEach(p=>{const k=`${p.client}|${p.name.toLowerCase()}`;if(projSeen.has(k))dupProjs++;else projSeen.add(k);});

  // 2. Duplicate tasks
  const taskSeen=new Set();let dupTasks=0;
  T.forEach(t=>{const k=`${t.project_id}|${t.title.toLowerCase()}`;if(taskSeen.has(k))dupTasks++;else taskSeen.add(k);});

  // 3. Tasks with no project
  const projIds=new Set(P.map(p=>p.id));
  const orphanTasks=T.filter(t=>!projIds.has(t.project_id));

  // 4. Overdue breakdown by client
  const overdue=T.filter(t=>t.due_date&&t.due_date<today&&t.status!=="Completed"&&t.status!=="Done");
  const byClient={};overdue.forEach(t=>{byClient[t.client||"Unknown"]=(byClient[t.client||"Unknown"]||0)+1;});

  // 5. Status breakdown
  const byStatus={};T.forEach(t=>{byStatus[t.status||"null"]=(byStatus[t.status||"null"]||0)+1;});

  // 6. Tasks with null due_date
  const noDue=T.filter(t=>!t.due_date).length;

  // 7. Active users
  const activeUsers=U.filter(u=>u.is_active!==false&&u.role!=="Client");

  console.log(`\n╔══════════════════════════════════════╗`);
  console.log(`║        APP HEALTH CHECK — ${today}  ║`);
  console.log(`╚══════════════════════════════════════╝`);
  console.log(`\n📁 Projects  : ${P.length} total`);
  console.log(`📌 Tasks     : ${T.length} total`);
  console.log(`👥 Active users: ${activeUsers.length}`);

  console.log(`\n── Duplicates ──────────────────────────`);
  console.log(dupProjs===0?`✅ Duplicate projects : 0`:`❌ Duplicate projects : ${dupProjs}`);
  console.log(dupTasks===0?`✅ Duplicate tasks    : 0`:`❌ Duplicate tasks    : ${dupTasks}`);
  console.log(orphanTasks.length===0?`✅ Orphan tasks       : 0`:`❌ Orphan tasks       : ${orphanTasks.length}`);

  console.log(`\n── Task Status ─────────────────────────`);
  Object.entries(byStatus).sort((a,b)=>b[1]-a[1]).forEach(([s,n])=>console.log(`   ${s.padEnd(20)}: ${n}`));

  console.log(`\n── Overdue (${overdue.length} total) ──────────────────`);
  if(Object.keys(byClient).length===0){console.log("   ✅ None");}
  else Object.entries(byClient).sort((a,b)=>b[1]-a[1]).forEach(([c,n])=>console.log(`   ${c.padEnd(20)}: ${n}`));

  console.log(`\n── Data Quality ────────────────────────`);
  console.log(`   Tasks with no due date : ${noDue}`);

  const issues=dupProjs+dupTasks+orphanTasks.length;
  console.log(`\n${issues===0?"✅ All clear — no issues found!":"⚠  "+issues+" issue(s) need attention"}`);
}
main().catch(e=>{console.error("FATAL:",e.message);process.exit(1);});
