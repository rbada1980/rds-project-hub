// check-overdue-delta.cjs
// Shows which tasks are now overdue after the fix, grouped by what changed
const{createClient}=require("@supabase/supabase-js");
const path=require("path");
const fs=require("fs");

const sb=createClient(
  "https://xypcbioltukahipkqqzc.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGNiaW9sdHVrYWhpcGtxcXpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTQzMTM2NSwiZXhwIjoyMDk1MDA3MzY1fQ.AoLxjBk3MR3_qjsCP50xzbyx7cp_kaQlVmN_eP_xuYU"
);

async function main(){
  const today=new Date().toLocaleDateString("en-CA",{timeZone:"Asia/Kolkata"});

  // Load the mismatches JSON to see what was changed
  const mmFile=path.join(__dirname,"date-mismatches.json");
  const mismatches=fs.existsSync(mmFile)?JSON.parse(fs.readFileSync(mmFile,"utf8")):[];
  const changedIds=new Set(mismatches.map(m=>m.dbId));

  // Fetch all overdue tasks
  const{data:tasks}=await sb.from("tasks")
    .select("id,title,project_id,status,due_date,client_sub_date,client")
    .lt("due_date",today)
    .not("status","in","(Completed,Done)");

  const{data:projects}=await sb.from("projects").select("id,name,client");
  const pMap={};(projects||[]).forEach(p=>pMap[p.id]=p);

  const overdue=tasks||[];
  console.log(`\nTotal overdue tasks today: ${overdue.length}`);

  // Split: changed by fix vs pre-existing
  const changedAndOverdue=overdue.filter(t=>changedIds.has(t.id));
  const preExisting=overdue.filter(t=>!changedIds.has(t.id));

  console.log(`\n📌 Pre-existing overdue (unchanged by fix): ${preExisting.length}`);
  console.log(`⚠  Became overdue after fix: ${changedAndOverdue.length}`);

  if(changedAndOverdue.length>0){
    console.log(`\n=== Tasks that became overdue after fix ===`);
    changedAndOverdue.forEach(t=>{
      const p=pMap[t.project_id];
      console.log(`  [${t.client||p?.client}] ${p?.name} / "${t.title}" → due ${t.due_date} | status: ${t.status}`);
    });

    // Check if any were status-changed (now "Not Yet Started" or "In Progress" but due date passed)
    const statusChanged=changedAndOverdue.filter(t=>t.status==="Not Yet Started"||t.status==="In Progress");
    if(statusChanged.length>0){
      console.log(`\n⚠  ${statusChanged.length} task(s) may have had their STATUS reverted by the fix (were Completed, now open+overdue):`);
      statusChanged.forEach(t=>{
        const mm=mismatches.find(m=>m.dbId===t.id);
        const statusDiff=mm?.diffs?.find(d=>d.startsWith("status:"));
        if(statusDiff)console.log(`  "${t.title}": ${statusDiff}`);
      });
      console.log(`\nTo restore Completed status on these tasks, run: node restore-completed.cjs`);
    }
  }
}
main().catch(e=>{console.error("FATAL:",e.message);process.exit(1);});
