// import-formcrete-exact.cjs
// Imports Formcrete Projects.xlsx with EXACT status matching.
// - Existing tasks: updates status to EXACTLY match Excel (bidirectional)
// - Also updates sub_date, due_date, detailer, checker
// - New tasks: inserted
// Run: node import-formcrete-exact.cjs

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
// Try uploads path first, fall back to local
const UPLOAD_FILE="C:\\Users\\HP\\AppData\\Local\\Packages\\Claude_pzs8sxrjxfjjc\\LocalCache\\Roaming\\Claude\\local-agent-mode-sessions\\919964d4-cd92-4eb6-b494-6c7ad2c02d36\\4c052105-2aba-4ec0-9a90-013070bec645\\local_d0d6e4a5-acfb-4c98-8222-e8da51f65329\\uploads\\Formcrete Projects.xlsx";
const FILE=fs.existsSync(UPLOAD_FILE)?UPLOAD_FILE:path.join(__dirname,"Formcrete Projects.xlsx");

const STATUS_MAP={
  "COMPLETED":"Completed","IN PROGRESS":"In Progress","IN PROCESS":"In Progress",
  "NOT YET STARTED":"Not Yet Started",
  "Completed":"Completed","In Progress":"In Progress","Not Yet Started":"Not Yet Started",
};

function parseDate(v){
  if(!v) return null;
  if(v instanceof Date) return v.toLocaleDateString("en-CA",{timeZone:"Asia/Kolkata"});
  if(typeof v==="number"){
    const d=new Date(Math.round((v-25569)*86400*1000));
    return d.toLocaleDateString("en-CA",{timeZone:"Asia/Kolkata"});
  }
  if(typeof v==="string"){
    const t=v.trim();
    if(/^\d{4}-\d{2}-\d{2}/.test(t)) return t.slice(0,10);
    // ISO string from cellDates
    if(t.includes("T")) return new Date(t).toLocaleDateString("en-CA",{timeZone:"Asia/Kolkata"});
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
  if(!raw) return null;
  const first=String(raw).split(/[&,\/]/)[0].trim();
  return NAME_MAP[first.toLowerCase()]||first||null;
}

async function main(){
  if(!fs.existsSync(FILE)){console.error("❌ File not found:",FILE);process.exit(1);}
  console.log("📂 Reading:",FILE);

  const wb=XLSX.readFile(FILE,{cellDates:true});
  if(!wb.Sheets["PROJECTS"]){
    console.error("❌ Sheet 'PROJECTS' not found. Available:",wb.SheetNames.join(", "));
    process.exit(1);
  }
  const raw=XLSX.utils.sheet_to_json(wb.Sheets["PROJECTS"],{header:1,defval:null});
  console.log("📄 Rows:",raw.length);

  // Detect header row and data start
  const headerIdx=raw.findIndex(r=>r&&String(r[0]||"").toUpperCase()==="PROJECT NAME");
  const dataStart=headerIdx>=0?headerIdx+1:2;
  const COL={proj:0,title:2,status:3,sub:4,req:5,det:7,chk:8};
  console.log(`📊 Header row: ${headerIdx} | Data starts: row ${dataStart}`);

  // Parse Excel tasks
  const excelTasks=[];
  let curProj=null;
  for(let i=dataStart;i<raw.length;i++){
    const r=raw[i];
    if(!r) continue;
    if(r[COL.proj]&&String(r[COL.proj]).trim()) curProj=String(r[COL.proj]).trim();
    const title=r[COL.title]?String(r[COL.title]).trim():null;
    if(!curProj||!title) continue;
    const statusRaw=String(r[COL.status]||"").trim().toUpperCase();
    excelTasks.push({
      project: curProj,
      title,
      status:  STATUS_MAP[statusRaw]||"Not Yet Started",
      sub:     parseDate(r[COL.sub]),
      req:     parseDate(r[COL.req]),
      det:     normName(r[COL.det]),
      chk:     normName(r[COL.chk]),
    });
  }

  const projSet=new Set(excelTasks.map(t=>t.project));
  console.log(`\n📋 Excel: ${excelTasks.length} tasks across ${projSet.size} projects`);

  // Log per-project summary from Excel
  const excelStats={};
  excelTasks.forEach(t=>{
    if(!excelStats[t.project]) excelStats[t.project]={C:0,I:0,N:0};
    if(t.status==="Completed") excelStats[t.project].C++;
    else if(t.status==="In Progress") excelStats[t.project].I++;
    else excelStats[t.project].N++;
  });
  Object.entries(excelStats).forEach(([p,s])=>
    console.log(`   ${p}: Completed=${s.C} InProgress=${s.I} NotYet=${s.N}`)
  );

  // Fetch existing projects
  const{data:existingProjs,error:pe}=await sb.from("projects").select("id,name").eq("client",CLIENT);
  if(pe){console.error("❌ Cannot fetch projects:",pe.message);process.exit(1);}
  const projByName={};
  (existingProjs||[]).forEach(p=>{projByName[p.name.toLowerCase()]=p;});
  console.log(`\n🗂  DB projects (Formcrete): ${(existingProjs||[]).length}`);

  // Create missing projects
  for(const name of projSet){
    if(projByName[name.toLowerCase()]) continue;
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
      // INSERT new task
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
      // UPDATE — exact status from Excel + dates + detailer/checker
      const patch={};
      if(et.status!==db.status) patch.status=et.status;  // EXACT — bidirectional
      if(et.sub&&et.sub!==db.client_sub_date) patch.client_sub_date=et.sub;
      if(et.req&&et.req!==db.due_date)         patch.due_date=et.req;
      if(et.det&&et.det!==db.detailer){patch.detailer=et.det;patch.assignee=et.det;}
      if(et.chk&&et.chk!==db.checker)  patch.checker=et.chk;

      if(!Object.keys(patch).length){skipped++;continue;}

      const{error}=await sb.from("tasks").update(patch).eq("id",db.id);
      if(error){console.log(`  ❌ Update "${et.title}": ${error.message}`);errors++;}
      else{
        try{
          const sets=Object.keys(patch).map((k,i)=>`${k}=$${i+2}`).join(",");
          await pool.query(`UPDATE tasks SET ${sets} WHERE id=$1`,[db.id,...Object.values(patch)]);
        }catch(_){}
        if(patch.status) console.log(`  🔄 [${et.project}] "${et.title}": ${db.status} → ${et.status}`);
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
