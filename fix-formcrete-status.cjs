// fix-formcrete-status.cjs
// Reads new Formcrete Excel, finds tasks where Excel=Completed/InProgress
// but DB has a lower status, then fixes them.
// Also reports title mismatches (tasks in Excel not found in DB by title).

const XLSX=require("xlsx");
const{createClient}=require("@supabase/supabase-js");
const{Pool}=require("pg");
const path=require("path");
const fs=require("fs");

const sb=createClient(
  "https://xypcbioltukahipkqqzc.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGNiaW9sdHVrYWhpcGtxcXpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTQzMTM2NSwiZXhwIjoyMDk1MDA3MzY1fQ.AoLxjBk3MR3_qjsCP50xzbyx7cp_kaQlVmN_eP_xuYU"
);
const pool=new Pool({host:"localhost",port:5432,database:"rds_local",user:"postgres",password:"rds2026"});

const CLIENT="Formcrete";
const UPLOAD_FILE="C:\\Users\\HP\\AppData\\Local\\Packages\\Claude_pzs8sxrjxfjjc\\LocalCache\\Roaming\\Claude\\local-agent-mode-sessions\\919964d4-cd92-4eb6-b494-6c7ad2c02d36\\4c052105-2aba-4ec0-9a90-013070bec645\\local_d0d6e4a5-acfb-4c98-8222-e8da51f65329\\uploads\\Formcrete Projects Tracker_2026-7464c7cf.xlsx";
const LOCAL_FILE=path.join(__dirname,"Formcrete Projects Tracker_2026.xlsx");
const FILE=fs.existsSync(UPLOAD_FILE)?UPLOAD_FILE:LOCAL_FILE;

const STATUS_ORDER={"Not Yet Started":0,"In Progress":1,"In Process":1,"Completed":2,"Done":2};
const STATUS_MAP={
  "COMPLETED":"Completed","IN PROGRESS":"In Progress","IN PROCESS":"In Progress",
  "NOT YET STARTED":"Not Yet Started",
};

async function main(){
  console.log("📂 Reading:",FILE);
  const wb=XLSX.readFile(FILE,{cellDates:true});
  const raw=XLSX.utils.sheet_to_json(wb.Sheets["PROJECTS"],{header:1,defval:null});

  // Auto-detect format
  const headerRow=raw.find(r=>r&&String(r[0]||"").toUpperCase().includes("PROJECT"));
  const isNew=headerRow&&String(headerRow[0]||"").toUpperCase()==="PROJECT NAME";
  const dataStart=isNew?3:5;
  const COL=isNew?{proj:0,title:2,status:3}:{proj:2,title:5,status:7};
  console.log(`📊 Format: ${isNew?"NEW":"OLD"}\n`);

  // Build Excel task map
  const excelTasks=[];
  let currentProj=null;
  for(let i=dataStart;i<raw.length;i++){
    const r=raw[i];
    if(r[COL.proj]&&String(r[COL.proj]).trim()) currentProj=String(r[COL.proj]).trim();
    const title=r[COL.title]?String(r[COL.title]).trim():null;
    if(!currentProj||!title) continue;
    const statusRaw=String(r[COL.status]||"").trim().toUpperCase();
    const status=STATUS_MAP[statusRaw]||"Not Yet Started";
    excelTasks.push({project:currentProj,title,status});
  }

  // Fetch DB
  const{data:projects}=await sb.from("projects").select("id,name").eq("client",CLIENT);
  const projByName={};
  (projects||[]).forEach(p=>{projByName[p.name.toLowerCase()]=p;});

  const projIds=(projects||[]).map(p=>p.id);
  const{data:dbTasks}=await sb.from("tasks")
    .select("id,title,project_id,status")
    .in("project_id",projIds);
  const taskMap={};
  (dbTasks||[]).forEach(t=>{taskMap[`${t.project_id}|${t.title.toLowerCase()}`]=t;});

  // Find mismatches
  let statusMismatch=[], notFound=[];
  for(const et of excelTasks){
    const proj=projByName[et.project.toLowerCase()];
    if(!proj) continue;
    const key=`${proj.id}|${et.title.toLowerCase()}`;
    const db=taskMap[key];
    if(!db){
      notFound.push({project:et.project,title:et.title,excelStatus:et.status});
    } else {
      const exOrd=STATUS_ORDER[et.status]??-1;
      const dbOrd=STATUS_ORDER[db.status]??-1;
      if(exOrd>dbOrd){
        statusMismatch.push({project:et.project,title:et.title,dbStatus:db.status,excelStatus:et.status,id:db.id});
      }
    }
  }

  console.log(`=== STATUS MISMATCHES (Excel higher than DB): ${statusMismatch.length} ===`);
  statusMismatch.forEach(t=>console.log(`  [${t.project}] "${t.title}"\n    DB=${t.dbStatus} → Excel=${t.excelStatus}`));

  console.log(`\n=== TASKS IN EXCEL NOT FOUND IN DB (title mismatch): ${notFound.length} ===`);
  notFound.slice(0,20).forEach(t=>console.log(`  [${t.project}] "${t.title}" (Excel: ${t.excelStatus})`));
  if(notFound.length>20) console.log(`  ... and ${notFound.length-20} more`);

  if(statusMismatch.length===0){
    console.log("\n✅ No status fixes needed.");
    await pool.end();
    return;
  }

  // Fix status mismatches
  console.log(`\n🔧 Fixing ${statusMismatch.length} status mismatches...`);
  let fixed=0,errors=0;
  for(const t of statusMismatch){
    const{error}=await sb.from("tasks").update({status:t.excelStatus}).eq("id",t.id);
    if(error){console.log(`  ❌ "${t.title}": ${error.message}`);errors++;}
    else{
      try{await pool.query("UPDATE tasks SET status=$1 WHERE id=$2",[t.excelStatus,t.id]);}catch(_){}
      console.log(`  ✅ [${t.project}] "${t.title}": ${t.dbStatus} → ${t.excelStatus}`);
      fixed++;
    }
  }

  console.log(`\n✅ Done — Fixed: ${fixed} | Errors: ${errors}`);
  await pool.end();
}
main().catch(e=>{console.error("FATAL:",e.message);process.exit(1);});
