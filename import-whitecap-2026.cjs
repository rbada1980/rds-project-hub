// import-whitecap-2026.cjs — White Cap Projects 2026.xlsx
// New columns: S.No(A)|PROJECT NAME(B)|SCOPE(C)|COMPONENTS OF WORK(D)|STATUS(E)|CLIENT SUB. DATE(F)|DET.WT.(G)|DETAILER(H)|CHECKER(I)
// Rules:
//   - "Inprogress" → "In Progress"
//   - "job canceled" → SKIP
//   - Match tasks by project_id + title (case-insensitive); no duplicates
//   - New projects: create; existing: update date/detailer/checker + status forward-only
//   - Covers main projects AND Old Projects Modifications section
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
const FILE=path.join(__dirname,"White Cap Projects 2026.xlsx");
const SHEET="White Cap Work Schedule";

const STATUS_ORDER={"Not Yet Started":0,"In Progress":1,"Completed":2,"On Hold":-1};
const STATUS_MAP={
  "Completed":"Completed",
  "COMPLETED":"Completed",
  "In Progress":"In Progress",
  "IN PROGRESS":"In Progress",
  "Inprogress":"In Progress",
  "INPROGRESS":"In Progress",
  "Not Yet Started":"Not Yet Started",
  "NOT YET STARTED":"Not Yet Started",
  "On Hold":"On Hold",
};
const SKIP_STATUSES=new Set(["job canceled","Job Canceled","JOB CANCELED"]);

// Parse date — handles Excel Date objects, MM-DD-YYYY, MM/DD/YYYY, short year (MM-DD-YY)
function parseDate(v){
  if(!v)return null;
  if(v instanceof Date){
    return v.toLocaleDateString("en-CA",{timeZone:"Asia/Kolkata"});
  }
  let s=String(v).trim().replace(/\.\-/,"-").replace(/-\./,"-"); // fix "03-11.-2026" typos
  // Remove stray dots inside date strings like "10-.04-2026" → "10-04-2026"
  s=s.replace(/(\d)-\.(\d)/,"$1-$2").replace(/\.(\d{4})$/,"-$1");
  // MM-DD-YYYY or MM/DD/YYYY
  let m=s.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/);
  if(m)return`${m[3]}-${m[1].padStart(2,"0")}-${m[2].padStart(2,"0")}`;
  // MM-DD-YY (2-digit year like 01-14-26)
  m=s.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{2})$/);
  if(m)return`20${m[3]}-${m[1].padStart(2,"0")}-${m[2].padStart(2,"0")}`;
  // MM/DD/YY
  m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
  if(m)return`20${m[3]}-${m[1].padStart(2,"0")}-${m[2].padStart(2,"0")}`;
  if(/^\d{4}-\d{2}-\d{2}$/.test(s))return s;
  return null;
}

async function main(){
  console.log("📂 Reading:",FILE);
  const wb=XLSX.readFile(FILE,{cellDates:true});
  if(!wb.Sheets[SHEET]){
    console.error(`❌ Sheet "${SHEET}" not found. Available: ${wb.SheetNames.join(", ")}`);
    process.exit(1);
  }
  const raw=XLSX.utils.sheet_to_json(wb.Sheets[SHEET],{header:1,defval:null});
  console.log(`📄 Rows: ${raw.length}`);

  // Parse tasks from sheet
  // Columns (0-based): 0=S.No, 1=PROJECT NAME, 2=SCOPE, 3=COMPONENTS OF WORK, 4=STATUS, 5=DATE, 6=DET.WT, 7=DETAILER, 8=CHECKER
  let curProject=null;
  let inOldMods=false;
  const excelTasks=[];
  let skippedCanceled=0;

  for(let i=2;i<raw.length;i++){
    const r=raw[i];
    if(!r||r.every(v=>v===null))continue;

    // Detect OLD PROJECTS MODIFICATIONS header
    const col1str=String(r[1]||"").trim();
    if(col1str.toUpperCase().includes("OLD PROJECTS")){{inOldMods=true;continue;}}

    // Skip note/total rows
    if(col1str.toLowerCase().startsWith("note:"))continue;
    if(col1str.toLowerCase()==="total")continue;

    const sno=r[0];
    const pname=r[1]?String(r[1]).trim():null;
    const title=r[3]?String(r[3]).trim():null;
    const statusRaw=r[4]?String(r[4]).trim():null;

    // Update current project when a named row appears
    if(pname&&pname.length>1&&!pname.toLowerCase().includes("white cap")&&!pname.toLowerCase().startsWith("s.no")){
      // Not a header or section label
      if(sno!==null||inOldMods) curProject=pname;
    }

    if(!title||!statusRaw||!curProject)continue;

    // Skip "job canceled"
    if(SKIP_STATUSES.has(statusRaw)){skippedCanceled++;continue;}

    const status=STATUS_MAP[statusRaw]||"Not Yet Started";
    const date=parseDate(r[5]);
    const detailer=r[7]?String(r[7]).trim():null;
    const checker=r[8]?String(r[8]).trim():null;

    excelTasks.push({project:curProject,title,status,client_sub_date:date,detailer,checker});
  }

  const projSet=new Set(excelTasks.map(t=>t.project));
  console.log(`\n📋 Excel: ${excelTasks.length} tasks, ${projSet.size} projects (skipped ${skippedCanceled} canceled)`);

  // Sample dates
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

  // Fetch existing tasks for White Cap
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
      // INSERT new task
      const payload={
        project_id:proj.id,client:CLIENT,title:et.title,
        status:et.status,client_sub_date:et.client_sub_date,
        assignee:et.detailer||null,detailer:et.detailer||null,checker:et.checker||null,priority:"Medium",
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
      // UPDATE existing — date, detailer, checker; status forward-only
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
