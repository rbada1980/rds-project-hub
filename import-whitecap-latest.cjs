// import-whitecap-latest.cjs — White Cap Projects latest.xlsx
// Columns: PROJECT NAME(A)|SCOPE(B)|COMPONENTS OF WORK(C)|STATUS(D)|CLIENT SUB. DATE(E)|DET.WT.(F)|DETAILER(G)|CHECKER(H)
// Rules: Inprogress→"In Progress", "not yet started"→"Not Yet Started", skip canceled
//        New projects created, existing updated (date/detailer/checker + status forward-only)
//        Covers main + Old Projects Modifications section
// Run: node import-whitecap-latest.cjs

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
const FILE=path.join(__dirname,"White Cap Projects latest.xlsx");
const SHEET="White Cap Work Schedule";

const STATUS_ORDER={"Not Yet Started":0,"In Progress":1,"Completed":2,"On Hold":-1};
const STATUS_MAP={
  "Completed":"Completed","COMPLETED":"Completed",
  "In Progress":"In Progress","IN PROGRESS":"In Progress",
  "Inprogress":"In Progress","INPROGRESS":"In Progress","inprogress":"In Progress",
  "Not Yet Started":"Not Yet Started","NOT YET STARTED":"Not Yet Started",
  "not yet started":"Not Yet Started",
  "On Hold":"On Hold",
};
const SKIP_STATUSES=new Set(["job canceled","Job Canceled","JOB CANCELED"]);

function parseDate(v){
  if(!v)return null;
  if(v instanceof Date){
    return v.toLocaleDateString("en-CA",{timeZone:"Asia/Kolkata"});
  }
  let s=String(v).trim();
  // Fix typos like "03-11.-2026", "10-.04-2026"
  s=s.replace(/(\d)-\.(\d)/g,"$1-$2");
  let m=s.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/);
  if(m)return`${m[3]}-${m[1].padStart(2,"0")}-${m[2].padStart(2,"0")}`;
  m=s.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{2})$/);
  if(m)return`20${m[3]}-${m[1].padStart(2,"0")}-${m[2].padStart(2,"0")}`;
  if(/^\d{4}-\d{2}-\d{2}$/.test(s))return s;
  return null;
}

async function main(){
  console.log("📂 Reading:",FILE);
  const wb=XLSX.readFile(FILE,{cellDates:true});
  if(!wb.Sheets[SHEET]){console.error(`❌ Sheet "${SHEET}" not found`);process.exit(1);}
  const raw=XLSX.utils.sheet_to_json(wb.Sheets[SHEET],{header:1,defval:null});
  console.log(`📄 Rows: ${raw.length}`);

  // Col layout: 0=PROJECT NAME, 1=SCOPE, 2=COMPONENTS, 3=STATUS, 4=DATE, 5=DET.WT, 6=DETAILER, 7=CHECKER
  let curProject=null;
  let inOldMods=false;
  const excelTasks=[];
  let skippedCanceled=0;

  for(let i=3;i<raw.length;i++){
    const r=raw[i];
    if(!r||r.every(v=>v===null))continue;

    const pname=r[0]?String(r[0]).trim():null;
    const comp =r[2]?String(r[2]).trim():null;
    const statusRaw=r[3]?String(r[3]).trim():null;

    // Detect OLD PROJECTS MODIFICATIONS
    if(pname&&pname.toUpperCase().includes("OLD PROJECTS")){inOldMods=true;continue;}

    // Skip header/total rows
    if(pname&&["project name","total","note:"].some(h=>pname.toLowerCase().startsWith(h)))continue;

    // Update current project
    if(pname&&pname.length>1)curProject=pname;

    if(!comp||!statusRaw||!curProject)continue;
    if(comp.toLowerCase()==="components of work")continue;

    if(SKIP_STATUSES.has(statusRaw)){skippedCanceled++;continue;}

    const status=STATUS_MAP[statusRaw]||"Not Yet Started";
    excelTasks.push({
      project:curProject,
      title:comp,
      status,
      client_sub_date:parseDate(r[4]),
      detailer:r[6]?String(r[6]).trim():null,
      checker:r[7]?String(r[7]).trim():null,
    });
  }

  const projSet=new Set(excelTasks.map(t=>t.project));
  console.log(`\n📋 Excel: ${excelTasks.length} tasks, ${projSet.size} projects (skipped ${skippedCanceled} canceled)`);
  excelTasks.filter(t=>t.client_sub_date).slice(0,3)
    .forEach(t=>console.log(`   ✓ [${t.project}] "${t.title}" → ${t.client_sub_date}`));

  // Fetch existing White Cap projects
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
      console.log(`  ➕ Created: ${name}`);
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
    if(!proj){console.log(`  ⚠ No project for: "${et.project}"`);errors++;continue;}
    const key=`${proj.id}|${et.title.toLowerCase()}`;
    const db=taskMap[key];

    if(!db){
      const payload={
        project_id:proj.id,client:CLIENT,title:et.title,
        status:et.status,client_sub_date:et.client_sub_date||null,
        assignee:et.detailer||null,detailer:et.detailer||null,checker:et.checker||null,priority:"Medium",
      };
      const{data:nt,error}=await sb.from("tasks").insert(payload).select("id").single();
      if(error){console.log(`  ❌ Insert "${et.title}": ${error.message}`);errors++;}
      else{
        try{await pool.query(
          `INSERT INTO tasks(id,project_id,client,title,status,client_sub_date,assignee,detailer,checker,priority,created_at)
           VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW()) ON CONFLICT(id) DO NOTHING`,
          [nt.id,proj.id,CLIENT,et.title,et.status,et.client_sub_date||null,et.detailer,et.detailer,et.checker,"Medium"]
        );}catch(_){}
        taskMap[key]={id:nt.id,...payload};
        inserted++;
      }
    } else {
      const patch={};
      if(et.client_sub_date&&et.client_sub_date!==db.client_sub_date) patch.client_sub_date=et.client_sub_date;
      if(et.detailer&&et.detailer!==db.detailer){patch.detailer=et.detailer;patch.assignee=et.detailer;}
      if(et.checker&&et.checker!==db.checker) patch.checker=et.checker;
      const exOrd=STATUS_ORDER[et.status]??-1;
      const dbOrd=STATUS_ORDER[db.status]??-1;
      if(exOrd>dbOrd) patch.status=et.status;

      if(!Object.keys(patch).length){skipped++;continue;}
      patch.updated_at=new Date().toISOString();
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
  console.log(`   Inserted : ${inserted}`);
  console.log(`   Updated  : ${updated}`);
  console.log(`   Skipped  : ${skipped} (no changes)`);
  console.log(`   Canceled : ${skippedCanceled} (skipped)`);
  console.log(`   Errors   : ${errors}`);
  await pool.end();
}
main().catch(e=>{console.error("FATAL:",e.message);process.exit(1);});
