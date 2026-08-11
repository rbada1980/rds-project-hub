// import-whitecap-2026.cjs
// Imports White Cap.xlsx (sheet: White Cap Work Schedule)
// Column order (new file): PROJECT NAME | COMPONENTS OF WORK | STATUS | CLIENT SUB. DATE | DET. WT. | DETAILER | CHECKER
// - Creates missing projects (safe — unique constraint prevents dupes)
// - NEW tasks: inserted with all fields
// - EXISTING tasks: updates date + detailer/checker only; status only moves FORWARD, never back
// Run: node import-whitecap-2026.cjs

const XLSX=require("xlsx");
const{createClient}=require("@supabase/supabase-js");
const{Pool}=require("pg");
const path=require("path");

const sb=createClient(
  "https://xypcbioltukahipkqqzc.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGNiaW9sdHVrYWhpcGtxcXpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTQzMTM2NSwiZXhwIjoyMDk1MDA3MzY1fQ.AoLxjBk3MR3_qjsCP50xzbyx7cp_kaQlVmN_eP_xuYU"
);
const pool=new Pool({host:"localhost",port:5432,database:"rds_local",user:"postgres",password:"rds2026"});

const CLIENT="White Cap";
const FILE=path.join(__dirname,"White Cap.xlsx");
const SHEET="White Cap Work Schedule";

// Status order for forward-only updates
const STATUS_ORDER={"Not Yet Started":0,"In Progress":1,"In Process":1,"Completed":2,"Done":2};
const STATUS_MAP={
  "COMPLETED":"Completed","IN PROGRESS":"In Progress","NOT YET STARTED":"Not Yet Started",
  "Completed":"Completed","In Progress":"In Progress","Not Yet Started":"Not Yet Started",
  "IN PROCESS":"In Process","In Process":"In Process",
};

// Parse date — handles Excel Date objects (IST-safe) and MM-DD-YYYY / MM/DD/YYYY text
function parseDate(v){
  if(!v)return null;
  if(v instanceof Date){
    // Use IST timezone — Excel serial dates are midnight IST, arrive as ~18:30 UTC
    return v.toLocaleDateString("en-CA",{timeZone:"Asia/Kolkata"});
  }
  const s=String(v).trim();
  // MM-DD-YYYY or MM/DD/YYYY → YYYY-MM-DD
  const mdy=s.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/);
  if(mdy)return`${mdy[3]}-${mdy[1].padStart(2,"0")}-${mdy[2].padStart(2,"0")}`;
  if(/^\d{4}-\d{2}-\d{2}$/.test(s))return s;
  if(s.includes("T")){const dt=new Date(s);return isNaN(dt)?null:dt.toLocaleDateString("en-CA",{timeZone:"Asia/Kolkata"});}
  return null;
}

async function main(){
  console.log("📂 Reading:", FILE);
  const wb=XLSX.readFile(FILE,{cellDates:true});

  if(!wb.Sheets[SHEET]){
    console.error(`❌ Sheet "${SHEET}" not found. Available: ${wb.SheetNames.join(", ")}`);
    process.exit(1);
  }

  const raw=XLSX.utils.sheet_to_json(wb.Sheets[SHEET],{header:1,defval:null});
  console.log(`📄 Sheet rows: ${raw.length}`);

  // Detect column layout from header row
  // New format (row 2): PROJECT NAME | COMPONENTS OF WORK | STATUS | CLIENT SUB. DATE | DET. WT. | DETAILER | CHECKER
  // Old format (row 2): PROJECT NAME | Tasks | STATUS | CLIENT SUB. DATE | DETAILER | CHECKER
  const headerRow=raw.find(r=>r&&String(r[0]||"").includes("PROJECT"));
  const hasDetWT=headerRow&&String(headerRow[4]||"").toLowerCase().includes("wt");
  const COL={
    title:  1,
    status: 2,
    date:   3,
    detailer: hasDetWT ? 5 : 4,  // shifted if DET. WT. column present
    checker:  hasDetWT ? 6 : 5,
  };
  console.log(`📊 Column layout: detailer=col${COL.detailer}, checker=col${COL.checker} (DET.WT. column: ${hasDetWT?"YES":"NO"})`);

  // Parse all tasks from sheet
  let currentProj=null;
  const SKIP_TITLES=new Set(["tasks","components of work","header","scope"]);
  const excelTasks=[];

  for(let i=3;i<raw.length;i++){
    const r=raw[i];
    if(r[0]&&String(r[0]).trim())currentProj=String(r[0]).trim();
    const title=r[COL.title]?String(r[COL.title]).trim():null;
    if(!currentProj||!title||SKIP_TITLES.has(title.toLowerCase()))continue;
    const statusRaw=String(r[COL.status]||"").trim();
    excelTasks.push({
      project:         currentProj,
      title,
      status:          STATUS_MAP[statusRaw]||"Not Yet Started",
      client_sub_date: parseDate(r[COL.date]),
      detailer:        r[COL.detailer]?String(r[COL.detailer]).trim():null,
      checker:         r[COL.checker]?String(r[COL.checker]).trim():null,
    });
  }

  const projSet=new Set(excelTasks.map(t=>t.project));
  console.log(`\n📋 Excel: ${excelTasks.length} tasks across ${projSet.size} projects`);

  // Sample a few dates to confirm parsing
  const datesamples=excelTasks.filter(t=>t.client_sub_date).slice(0,3);
  datesamples.forEach(t=>console.log(`   ✓ [${t.project}] "${t.title}" → ${t.client_sub_date}`));

  // Fetch existing White Cap projects from DB
  const{data:existingProjs,error:pe}=await sb.from("projects").select("id,name").eq("client",CLIENT);
  if(pe){console.error("❌ Cannot fetch projects:",pe.message);process.exit(1);}
  const projByName={};
  (existingProjs||[]).forEach(p=>{projByName[p.name.toLowerCase()]=p;});
  console.log(`\n🗂  DB projects (White Cap): ${(existingProjs||[]).length}`);

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
    .select("id,title,project_id,status,client_sub_date,detailer,checker")
    .in("project_id",projIds);
  const taskMap={};
  (dbTasks||[]).forEach(t=>{taskMap[`${t.project_id}|${t.title.toLowerCase()}`]=t;});
  console.log(`📌 DB tasks (White Cap): ${(dbTasks||[]).length}`);

  let inserted=0,updated=0,skipped=0,errors=0;

  for(const et of excelTasks){
    const proj=projByName[et.project.toLowerCase()];
    if(!proj){console.log(`  ⚠ No project in DB for: "${et.project}"`);errors++;continue;}
    const key=`${proj.id}|${et.title.toLowerCase()}`;
    const db=taskMap[key];

    if(!db){
      // INSERT
      const payload={
        project_id:proj.id,client:CLIENT,title:et.title,
        status:et.status,client_sub_date:et.client_sub_date,
        assignee:et.detailer,detailer:et.detailer,checker:et.checker,priority:"Medium",
      };
      const{data:nt,error}=await sb.from("tasks").insert(payload).select("id").single();
      if(error){console.log(`  ❌ Insert "${et.title}": ${error.message}`);errors++;}
      else{
        try{await pool.query(
          `INSERT INTO tasks(id,project_id,client,title,status,client_sub_date,assignee,detailer,checker,priority,created_at)
           VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW()) ON CONFLICT(id) DO NOTHING`,
          [nt.id,proj.id,CLIENT,et.title,et.status,et.client_sub_date,et.detailer,et.detailer,et.checker,"Medium"]
        );}catch(_){}
        taskMap[key]={id:nt.id,...payload};
        inserted++;
      }
    } else {
      // UPDATE — only dates, detailer, checker; status only moves forward
      const patch={};
      if(et.client_sub_date&&et.client_sub_date!==db.client_sub_date) patch.client_sub_date=et.client_sub_date;
      if(et.detailer&&et.detailer!==db.detailer){patch.detailer=et.detailer;patch.assignee=et.detailer;}
      if(et.checker&&et.checker!==db.checker)    patch.checker=et.checker;
      // Status: only move forward (never back)
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
