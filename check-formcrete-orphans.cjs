// check-formcrete-orphans.cjs
// Finds DB tasks for Formcrete that are NOT in the current Excel file.
// Also shows status breakdown per project so you can see which ones have "Not Yet Started".

const XLSX=require("xlsx");
const{createClient}=require("@supabase/supabase-js");
const path=require("path");
const fs=require("fs");

const sb=createClient(
  "https://xypcbioltukahipkqqzc.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGNiaW9sdHVrYWhpcGtxcXpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTQzMTM2NSwiZXhwIjoyMDk1MDA3MzY1fQ.AoLxjBk3MR3_qjsCP50xzbyx7cp_kaQlVmN_eP_xuYU"
);

const CLIENT="Formcrete";
const UPLOAD_FILE="C:\\Users\\HP\\AppData\\Local\\Packages\\Claude_pzs8sxrjxfjjc\\LocalCache\\Roaming\\Claude\\local-agent-mode-sessions\\919964d4-cd92-4eb6-b494-6c7ad2c02d36\\4c052105-2aba-4ec0-9a90-013070bec645\\local_d0d6e4a5-acfb-4c98-8222-e8da51f65329\\uploads\\Formcrete Projects Tracker_2026-7464c7cf.xlsx";
const LOCAL_FILE=path.join(__dirname,"Formcrete Projects Tracker_2026.xlsx");
const FILE=fs.existsSync(UPLOAD_FILE)?UPLOAD_FILE:LOCAL_FILE;

const STATUS_ORDER={"Not Yet Started":0,"In Progress":1,"In Process":1,"Completed":2,"Done":2};
const STATUS_MAP={
  "COMPLETED":"Completed","IN PROGRESS":"In Progress","IN PROCESS":"In Progress",
  "NOT YET STARTED":"Not Yet Started",
  "Completed":"Completed","In Progress":"In Progress","Not Yet Started":"Not Yet Started",
};

async function main(){
  console.log("📂 Reading Excel:",FILE);
  const wb=XLSX.readFile(FILE,{cellDates:true});
  const raw=XLSX.utils.sheet_to_json(wb.Sheets["PROJECTS"],{header:1,defval:null});

  const headerRow=raw.find(r=>r&&String(r[0]||"").toUpperCase().includes("PROJECT"));
  const isNew=headerRow&&String(headerRow[0]||"").toUpperCase()==="PROJECT NAME";
  const dataStart=isNew?3:5;
  const COL=isNew?{proj:0,title:2,status:3}:{proj:2,title:5,status:7};
  console.log(`📊 Format: ${isNew?"NEW (12-col)":"OLD (17-col)"}`);

  // Build Excel task set: "projectname|tasktitle" → excelStatus
  const excelSet=new Map();
  let currentProj=null;
  for(let i=dataStart;i<raw.length;i++){
    const r=raw[i];
    if(r[COL.proj]&&String(r[COL.proj]).trim()) currentProj=String(r[COL.proj]).trim();
    const title=r[COL.title]?String(r[COL.title]).trim():null;
    if(!currentProj||!title) continue;
    const statusRaw=String(r[COL.status]||"").trim().toUpperCase();
    excelSet.set(`${currentProj.toLowerCase()}|${title.toLowerCase()}`,STATUS_MAP[statusRaw]||"Not Yet Started");
  }
  console.log(`📋 Excel tasks: ${excelSet.size}`);

  // Fetch all Formcrete projects + tasks
  const{data:projects,error:pe}=await sb.from("projects").select("id,name").eq("client",CLIENT);
  if(pe){console.error("❌",pe.message);return;}

  const projIds=projects.map(p=>p.id);
  const projById={};
  projects.forEach(p=>projById[p.id]=p.name);

  const{data:dbTasks,error:te}=await sb.from("tasks")
    .select("id,title,status,project_id")
    .in("project_id",projIds);
  if(te){console.error("❌",te.message);return;}

  console.log(`📌 DB tasks: ${dbTasks.length}`);

  // Status breakdown by project
  console.log("\n=== STATUS BREAKDOWN BY PROJECT ===");
  const byProj={};
  dbTasks.forEach(t=>{
    const pn=projById[t.project_id]||t.project_id;
    if(!byProj[pn]) byProj[pn]={Completed:0,"In Progress":0,"Not Yet Started":0,total:0};
    byProj[pn][t.status]=(byProj[pn][t.status]||0)+1;
    byProj[pn].total++;
  });
  Object.entries(byProj).sort(([a],[b])=>a.localeCompare(b)).forEach(([name,counts])=>{
    const nys=counts["Not Yet Started"]||0;
    const flag=nys>0?" ⚠️":"";
    console.log(`  ${name}: Total=${counts.total} ✅Completed=${counts.Completed||0} 🔄InProgress=${counts["In Progress"]||0} ❌NotYet=${nys}${flag}`);
  });

  // Orphan check: DB tasks NOT in Excel
  console.log("\n=== DB TASKS NOT FOUND IN CURRENT EXCEL (orphans) ===");
  const orphans=[];
  dbTasks.forEach(t=>{
    const pn=projById[t.project_id]||"?";
    const key=`${pn.toLowerCase()}|${t.title.toLowerCase()}`;
    if(!excelSet.has(key)){
      orphans.push({project:pn,title:t.title,status:t.status,id:t.id});
    }
  });
  console.log(`Total orphans: ${orphans.length}`);

  // Group orphans by project and status
  const orphanByProj={};
  orphans.forEach(o=>{
    if(!orphanByProj[o.project]) orphanByProj[o.project]=[];
    orphanByProj[o.project].push(o);
  });

  // Show orphans that are "Not Yet Started" — these are suspicious
  const suspiciousOrphans=orphans.filter(o=>o.status==="Not Yet Started"||o.status==="In Progress");
  console.log(`Orphans with incomplete status (suspicious): ${suspiciousOrphans.length}`);
  if(suspiciousOrphans.length){
    console.log("\n--- SUSPICIOUS ORPHANS (Not Yet Started / In Progress but NOT in Excel) ---");
    suspiciousOrphans.forEach(o=>console.log(`  [${o.project}] "${o.title}" → ${o.status} | id=${o.id}`));
  }

  // Focus on NOMI-6 and 4541-Gables
  const focusProjects=["nomi-6","4541-gables cypress creek","4541 gables cypress creek"];
  console.log("\n=== FOCUS: NOMI-6 & 4541-GABLES ALL DB TASKS ===");
  dbTasks
    .filter(t=>focusProjects.some(fp=>projById[t.project_id]?.toLowerCase().includes(fp.split("-")[0].trim())||projById[t.project_id]?.toLowerCase().includes("nomi")||projById[t.project_id]?.toLowerCase().includes("gables")))
    .sort((a,b)=>(STATUS_ORDER[a.status]??0)-(STATUS_ORDER[b.status]??0)||a.title.localeCompare(b.title))
    .forEach(t=>console.log(`  [${projById[t.project_id]}] [${t.status}] ${t.title}`));
}
main().catch(e=>{console.error("FATAL:",e.message);process.exit(1);});
