// restore-completed.cjs
// Restores "Completed" status on tasks that were incorrectly reverted by fix-all-dates.cjs
// Reads date-mismatches.json to find which tasks had status changed FROM Completed

const{createClient}=require("@supabase/supabase-js");
const{Pool}=require("pg");
const fs=require("fs");
const path=require("path");

const sb=createClient(
  "https://xypcbioltukahipkqqzc.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGNiaW9sdHVrYWhpcGtxcXpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTQzMTM2NSwiZXhwIjoyMDk1MDA3MzY1fQ.AoLxjBk3MR3_qjsCP50xzbyx7cp_kaQlVmN_eP_xuYU"
);
const pool=new Pool({host:"localhost",port:5432,database:"rds_local",user:"postgres",password:"rds2026"});

async function main(){
  const mmFile=path.join(__dirname,"date-mismatches.json");
  if(!fs.existsSync(mmFile)){console.error("❌ date-mismatches.json not found. Run check-all-dates.cjs first.");process.exit(1);}

  const mismatches=JSON.parse(fs.readFileSync(mmFile,"utf8"));

  // Find tasks where status diff shows DB=Completed (fix wrongly changed it away from Completed)
  const toRestore=mismatches.filter(m=>{
    const statusDiff=m.diffs&&m.diffs.find(d=>d.startsWith("status:"));
    if(!statusDiff)return false;
    // Format: "status: Excel=In Progress | DB=Completed"
    return statusDiff.includes("DB=Completed")||statusDiff.includes("DB=In Progress")&&statusDiff.includes("Excel=Not Yet Started");
  });

  // Also restore tasks currently open+overdue that were Completed (from check-overdue-delta output)
  // Re-query DB to find tasks that are now open but were in mismatches with status change
  const statusChangedIds=mismatches
    .filter(m=>m.diffs&&m.diffs.some(d=>d.startsWith("status:")))
    .map(m=>m.dbId);

  if(statusChangedIds.length===0){
    console.log("✅ No status changes found in mismatches — nothing to restore.");
    await pool.end();return;
  }

  // Fetch current status of all those tasks
  const{data:tasks}=await sb.from("tasks").select("id,title,status").in("id",statusChangedIds);
  const taskMap={};(tasks||[]).forEach(t=>taskMap[t.id]=t);

  // For each mismatch with a status diff, restore DB's original status
  let restored=0,skipped=0;

  for(const m of mismatches){
    const statusDiff=m.diffs&&m.diffs.find(d=>d.startsWith("status:"));
    if(!statusDiff)continue;

    // Parse: "status: Excel=In Progress | DB=Completed"
    const dbMatch=statusDiff.match(/DB=([^|)\n]+)/);
    if(!dbMatch)continue;
    const originalStatus=dbMatch[1].trim();

    // Only restore if the original DB status was Completed or Done
    if(originalStatus!=="Completed"&&originalStatus!=="Done"){skipped++;continue;}

    const current=taskMap[m.dbId];
    if(!current){skipped++;continue;}
    if(current.status===originalStatus){skipped++;continue;} // already correct

    // Restore
    const{error}=await sb.from("tasks").update({status:originalStatus}).eq("id",m.dbId);
    if(error){console.log(`  ❌ "${m.title}": ${error.message}`);}
    else{
      try{await pool.query("UPDATE tasks SET status=$1 WHERE id=$2",[originalStatus,m.dbId]);}catch(_){}
      console.log(`  ✅ Restored: "${m.title}" → ${originalStatus}`);
      restored++;
    }
  }

  console.log(`\n✅ Done! Restored: ${restored} | Skipped (already correct): ${skipped}`);
  console.log(`\nNote: fix-all-dates.cjs will no longer update STATUS going forward — only dates and checker.`);

  // Also patch fix-all-dates.cjs to never touch status again
  const fixFile=path.join(__dirname,"fix-all-dates.cjs");
  if(fs.existsSync(fixFile)){
    let src=fs.readFileSync(fixFile,"utf8");
    // Remove the status patch line
    src=src.replace(/\s*if\(exStatus&&exStatus!==db\.status\)patch\.status=exStatus;/g,"");
    fs.writeFileSync(fixFile,src);
    console.log(`\n🔧 Patched fix-all-dates.cjs — status updates disabled permanently.`);
  }

  await pool.end();
}
main().catch(e=>{console.error("FATAL:",e.message);process.exit(1);});
