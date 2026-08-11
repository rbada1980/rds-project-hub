// import-formcrete-2026.cjs
// Imports Formcrete Projects Tracker_2026.xlsx (sheet: PROJECTS)
// Auto-detects column layout (old 17-col vs new 12-col format)
// - NEW tasks: inserted
// - EXISTING tasks: updates sub_date, due_date, detailer, checker; status only moves FORWARD
// Run: node import-formcrete-2026.cjs

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
// Try uploaded files in order of preference (newest first), fall back to local copy
const UPLOAD_CANDIDATES=[
  "C:\\Users\\HP\\AppData\\Local\\Packages\\Claude_pzs8sxrjxfjjc\\LocalCache\\Roaming\\Claude\\local-agent-mode-sessions\\919964d4-cd92-4eb6-b494-6c7ad2c02d36\\4c052105-2aba-4ec0-9a90-013070bec645\\local_d0d6e4a5-acfb-4c98-8222-e8da51f65329\\uploads\\Formcrete Projects-bd936cde.xlsx",
  "C:\\Users\\HP\\AppData\\Local\\Packages\\Claude_pzs8sxrjxfjjc\\LocalCache\\Roaming\\Claude\\local-agent-mode-sessions\\919964d4-cd92-4eb6-b494-6c7ad2c02d36\\4c052105-2aba-4ec0-9a90-013070bec645\\local_d0d6e4a5-acfb-4c98-8222-e8da51f65329\\uploads\\Formcrete Projects Tracker_2026-7464c7cf.xlsx",
];
const UPLOAD_FILE=UPLOAD_CANDIDATES.find(f=>fs.existsSync(f))||"";
const FILE=UPLOAD_FILE||path.join(__dirname,"Formcrete Projects Tracker_2026.xlsx");
const SHEET="PROJECTS";

const STATUS_ORDER={"Not Yet Started":0,"In Progress":1,"In Process":1,"Completed":2,"Done":2};
const STATUS_MAP={
  "COMPLETED":"Completed","IN PROGRESS":"In Progress","IN PROCESS":"In Progress",
  "NOT YET STARTED":"Not Yet Started",
  "Completed":"Completed","In Progress":"In Progress","Not Yet Started":"Not Yet Started",
};

// IST-safe date conversion
function parseDate(v){
  if(!v)return null;
  if(v instanceof Date) return v.toLocaleDateString("en-CA",{timeZone:"Asia/Kolkata"});
  if(typeof v==="number"){
    const d=new Date(Math.round((v-25569)*86400*1000));
    return d.toLocaleDateString("en-CA",{timeZone:"Asia/Kolkata"});
  }
  if(typeof v==="string"){
    const t=v.trim();
    if(/^\d{4}-\d{2}-\d{2}/.test(t))return t.slice(0,10);
  }
  return null;
}

const NAME_MAP={
  "swathi":"Swathi","swa":"Swathi","sai":"Sai","dhanush":"Dhanush","danush":"Dhanush",
  "sridevi":"Sridevi","balaram":"Balaram","jagadeesh":"Jagadeesh","jgd":"Jagadeesh",
  "nanaji":"Nanaji","trisha":"Trisha","praveena":"Praveena","sri lalitha":"Sri Lalitha",
  "chandra mouli":"Chandra Mouli","chandra":"Chandra Mouli","kameshwari":"Kameshwari",
  "kameswari":"Kameswari","anji reddy":"Anji Reddy","pradeep":"Pradeep","blm":"Balaram",
};
function normName(raw){
  if(!raw)return null;
  const first=String(raw).split(/[&,\/]/)[0].trim();
  return NAME_MAP[first.toLowerCase()]||first||null;
}

async function main(){
  if(!fs.existsSync(FILE)){console.error("❌ File not found:",FILE);process.exit(1);}
  console.log("📂 Reading:",FILE);

  const wb=XLSX.readFile(FILE,{cellDates:true});
  if(!wb.Sheets[SHEET]){console.error(`❌ Sheet "${SHEET}" not found. Sheets: ${wb.SheetNames.join(", ")}`);process.exit(1);}

  const raw=XLSX.utils.sheet_to_json(wb.Sheets[SHEET],{header:1,defval:null});
  console.log(`📄 Rows: ${raw.length}`);

  // Auto-detect column layout from header row
  // New format: PROJECT NAME | SCOPE | COMPONENTS OF WORK | STATUS | SUB. DATE | CUST. REQ. DATE | DET. WT. | DETAILER | CHECKER
  // Old format: S.No | BILL STATUS | PROJECT NAME | SCOPE | DWG NO. | COMPONENTS OF WORK | REC. DATE | STATUS | SUB. DATE | CUST. REQ. DATE | ... | DETAILER | CHECKER
  const headerIdx=raw.findIndex(r=>r&&String(r[0]||"").toUpperCase()==="PROJECT NAME");
  const oldHeaderIdx=raw.findIndex(r=>r&&String(r[0]||"").toUpperCase()==="S.NO");
  const isNewFormat=headerIdx>=0;
  // dataStart = right after whichever header was found
  const dataStart=isNewFormat?(headerIdx+1):(oldHeaderIdx>=0?oldHeaderIdx+1:5);
  const COL=isNewFormat
    ?{proj:0,title:2,status:3,sub:4,req:5,det:7,chk:8}
    :{proj:2,title:5,status:7,sub:8,req:9,det:14,chk:15};

  console.log(`📊 Format: ${isNewFormat?"NEW (12-col)":"OLD (17-col)"} | data starts row ${dataStart}`);
  console.log(`   proj=col${COL.proj} title=col${COL.title} status=col${COL.status} sub=col${COL.sub} det=col${COL.det} chk=col${COL.chk}`);

  const excelTasks=[];
  let currentProj=null;
  for(let i=dataStart;i<raw.length;i++){
    const r=raw[i];
    if(r[COL.proj]&&String(r[COL.proj]).trim())currentProj=String(r[COL.proj]).trim();
    const title=r[COL.title]?String(r[COL.title]).trim():null;
    if(!currentProj||!title)continue;
    const statusRaw=String(r[COL.status]||"").trim().toUpperCase();
    excelTasks.push({
      project:currentProj,title,
      status:  STATUS_MAP[statusRaw]||"Not Yet Started",
      sub:     parseDate(r[COL.sub]),
      req:     parseDate(r[COL.req]),
      det:     normName(r[COL.det]),
      chk:     normName(r[COL.chk]),
    });
  }

  const projSet=new Set(excelTasks.map(t=>t.project));
  console.log(`\n📋 Excel: ${excelTasks.length} tasks across ${projSet.size} projects`);
  excelTasks.filter(t=>t.sub).slice(0,3).forEach(t=>console.log(`   ✓ [${t.project}] "${t.title}" → sub=${t.sub}`));

  // Fetch existing Formcrete projects
  const{data:existingProjs,error:pe}=await sb.from("projects").select("id,name").eq("client",CLIENT);
  if(pe){console.error("❌ Cannot fetch projects:",pe.message);process.exit(1);}
  const projByName={};
  (existingProjs||[]).forEach(p=>{projByName[p.name.toLowerCase()]=p;});
  console.log(`\n🗂  DB projects (Formcrete): ${(existingProjs||[]).length}`);

  // Create missing projects
  for(const name of projSet){
    if(projByName[name.toLowerCase()])continue;
    const{data:np,error}=await sb.from("projects").insert({name,client:CLIENT}).select("id,name").single();
    if(error){console.log(`  ⚠ Cannot create "${name}": ${error.message}`);}
    else{
      projByName[np.name.toLowerCase()]=np;
      try{await pool.query(
        `INSERT INTO projects(id,name,client,created_at) VALUES($1,$2,$3,NOW()) ON CONFLICT(id) DO NOTHING`,
        [np.id,np.name,CLIENT]
      );}catch(_){}
      console.log(`  ➕ New project: ${name}`);
    }
  }

  // Fetch existing tasks
  const projIds=Object.values(projByName).map(p=>p.id);
  const{data:dbTasks}=await sb.from("tasks")
    .select("id,title,project_id,status,client_sub_date,due_date,detailer,checker")
    .in("project_id",projIds);
  const taskMap={};
  (dbTasks||[]).forEach(t=>{taskMap[`${t.project_id}|${t.title.toLowerCase()}`]=t;});
  console.log(`📌 DB tasks (Formcrete): ${(dbTasks||[]).length}`);

  let inserted=0,updated=0,skipped=0,errors=0;

  for(const et of excelTasks){
    const proj=projByName[et.project.toLowerCase()];
    if(!proj){console.log(`  ⚠ No project for: "${et.project}"`);errors++;continue;}
    const key=`${proj.id}|${et.title.toLowerCase()}`;
    const db=taskMap[key];

    if(!db){
      // INSERT
      const payload={
        project_id:proj.id,client:CLIENT,title:et.title,
        status:et.status,client_sub_date:et.sub,due_date:et.req,
        assignee:et.det,detailer:et.det,checker:et.chk,priority:"Medium",
      };
      const{data:nt,error}=await sb.from("tasks").insert(payload).select("id").single();
      if(error){console.log(`  ❌ Insert "${et.title}": ${error.message}`);errors++;}
      else{
        try{await pool.query(
          `INSERT INTO tasks(id,project_id,client,title,status,client_sub_date,due_date,assignee,detailer,checker,priority,created_at)
           VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW()) ON CONFLICT(id) DO NOTHING`,
          [nt.id,proj.id,CLIENT,et.title,et.status,et.sub,et.req,et.det,et.det,et.chk,"Medium"]
        );}catch(_){}
        taskMap[key]={id:nt.id,...payload};
        inserted++;
      }
    } else {
      // UPDATE — dates + detailer/checker; status only moves forward
      const patch={};
      if(et.sub&&et.sub!==db.client_sub_date) patch.client_sub_date=et.sub;
      if(et.req&&et.req!==db.due_date)         patch.due_date=et.req;
      if(et.det&&et.det!==db.detailer){patch.detailer=et.det;patch.assignee=et.det;}
      if(et.chk&&et.chk!==db.checker)  patch.checker=et.chk;
      const exOrd=STATUS_ORDER[et.status]??-1;
      const dbOrd=STATUS_ORDER[db.status]??-1;
      if(exOrd>dbOrd) patch.status=et.status;

      if(!Object.keys(patch).length){skipped++;continue;}
      const{error}=await sb.from("tasks").update(patch).eq("id",db.id);
      if(error){console.log(`  ❌ Update "${et.title}": ${error.message}`);errors++;}
      else{
        try{
          const sets=Object.keys(patch).map((k,i)=>`${k}=$${i+2}`).join(",");
          await pool.query(`UPDATE tasks SET ${sets} WHERE id=$1`,[db.id,...Object.values(patch)]);
        }catch(_){}
        updated++;
      }
    }
  }

  console.log(`\n✅ Done!`);
  console.log(`   Inserted : ${inserted} (new tasks)`);
  console.log(`   Updated  : ${updated}`);
  console.log(`   Skipped  : ${skipped} (no changes)`);
  console.log(`   Errors   : ${errors}`);
  await pool.end();
}
main().catch(e=>{console.error("FATAL:",e.message);process.exit(1);});
