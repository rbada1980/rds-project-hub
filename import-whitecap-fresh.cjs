// import-whitecap-fresh.cjs
// FRESH import of White Cap Excel → DB (no existing data, clean insert only)
// Imports MAIN SECTION ONLY — stops before "OLD PROJECTS MODIFICATIONS"
// Run AFTER delete-whitecap-all.cjs
// Run: node import-whitecap-fresh.cjs

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

const CLIENT="White Cap";
const SHEET="White Cap Work Schedule";

const CANDIDATES=[
  path.join(__dirname,"White Cap.xlsx"),
  path.join(__dirname,"White Cap_latest.xlsx"),
];
const FILE=CANDIDATES.find(f=>fs.existsSync(f));
if(!FILE){console.error("❌ No White Cap Excel file found.");process.exit(1);}

const STATUS_MAP={
  "COMPLETED":"Completed","IN PROGRESS":"In Progress","IN PROCESS":"In Progress",
  "NOT YET STARTED":"Not Yet Started",
  "Completed":"Completed","In Progress":"In Progress","Not Yet Started":"Not Yet Started",
};

// Handles: Excel serial numbers (numbers) + MM-DD-YYYY / MM/DD/YYYY strings
// Use cellDates:false so raw serials come as numbers → UTC midnight → correct IST date
// (cellDates:true on IST machine gives T18:29:50Z, 10s before midnight IST → wrong day)
function parseDate(v){
  if(!v) return null;
  if(typeof v==="number"){
    const d=new Date(Math.round((v-25569)*86400*1000));
    return d.toLocaleDateString("en-CA",{timeZone:"Asia/Kolkata"});
  }
  const s=String(v).trim();
  // MM-DD-YYYY or MM/DD/YYYY → YYYY-MM-DD
  const mdy=s.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/);
  if(mdy) return`${mdy[3]}-${mdy[1].padStart(2,"0")}-${mdy[2].padStart(2,"0")}`;
  if(/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // ISO string fallback — add 30min buffer to cross midnight IST safely
  if(s.includes("T")){
    const dt=new Date(new Date(s).getTime()+30*60*1000);
    return isNaN(dt)?null:dt.toLocaleDateString("en-CA",{timeZone:"Asia/Kolkata"});
  }
  return null;
}

async function main(){
  console.log("📂 Reading:",FILE);
  const wb=XLSX.readFile(FILE,{cellDates:false});
  if(!wb.Sheets[SHEET]){
    console.error(`❌ Sheet "${SHEET}" not found. Available: ${wb.SheetNames.join(", ")}`);
    process.exit(1);
  }
  const raw=XLSX.utils.sheet_to_json(wb.Sheets[SHEET],{header:1,defval:null});
  console.log("📄 Total rows in file:",raw.length);

  // Find header row (PROJECT NAME)
  const headerIdx=raw.findIndex(r=>r&&String(r[0]||"").toUpperCase().includes("PROJECT NAME"));
  const dataStart=headerIdx+1;

  // Stop at OLD PROJECTS MODIFICATIONS — main section only
  const oldModIdx=raw.findIndex(r=>r&&String(r[0]||"").toUpperCase().includes("OLD PROJECTS"));
  const dataEnd=oldModIdx>0?oldModIdx:raw.length;

  console.log(`📊 Header at row ${headerIdx+1} | Data rows ${dataStart+1} to ${dataEnd} | OLD PROJ MOD starts at row ${oldModIdx+1}`);

  // Column mapping: col0=PROJECT NAME, col1=task title, col2=STATUS, col3=CLIENT SUB DATE, col4=DET.WT., col5=DETAILER, col6=CHECKER
  const COL={proj:0,title:1,status:2,date:3,det:5,chk:6};

  // Parse main section tasks
  const excelTasks=[];
  let curProj=null;
  const SKIP_TITLES=new Set(["components of work","tasks","header","scope"]);

  for(let i=dataStart;i<dataEnd;i++){
    const r=raw[i];
    if(!r) continue;
    if(r[COL.proj]&&String(r[COL.proj]).trim()) curProj=String(r[COL.proj]).trim();
    const title=r[COL.title]?String(r[COL.title]).trim():null;
    if(!curProj||!title) continue;
    if(SKIP_TITLES.has(title.toLowerCase())) continue;

    const statusRaw=String(r[COL.status]||"").trim();
    const status=STATUS_MAP[statusRaw.toUpperCase()]||STATUS_MAP[statusRaw]||"Not Yet Started";
    const det=r[COL.det]?String(r[COL.det]).trim()||null:null;
    const chk=r[COL.chk]?String(r[COL.chk]).trim()||null:null;

    excelTasks.push({
      project:curProj,
      title,
      status,
      date:parseDate(r[COL.date]),
      det,
      chk,
    });
  }

  const projSet=new Set(excelTasks.map(t=>t.project));
  console.log(`\n📋 ${excelTasks.length} tasks | ${projSet.size} projects (main section only)`);

  // Show summary per project
  const stats={};
  excelTasks.forEach(t=>{
    if(!stats[t.project]) stats[t.project]={C:0,I:0,N:0};
    if(t.status==="Completed") stats[t.project].C++;
    else if(t.status==="In Progress") stats[t.project].I++;
    else stats[t.project].N++;
  });
  Object.entries(stats).forEach(([p,s])=>
    console.log(`   ${p}: C=${s.C} I=${s.I} N=${s.N} total=${s.C+s.I+s.N}`)
  );

  // Sample dates for verification
  console.log("\n📅 Sample dates:");
  excelTasks.filter(t=>t.date).slice(0,5).forEach(t=>
    console.log(`   [${t.project}] "${t.title}" → ${t.date}`)
  );

  // Create projects
  console.log("\n🗂  Creating projects...");
  const projByName={};
  for(const name of projSet){
    const{data:np,error}=await sb.from("projects").insert({name,client:CLIENT}).select("id,name").single();
    if(error){console.error(`❌ Cannot create "${name}":`,error.message);process.exit(1);}
    projByName[name.toLowerCase()]=np;
    try{
      await pool.query(
        `INSERT INTO projects(id,name,client,created_at) VALUES($1,$2,$3,NOW()) ON CONFLICT(id) DO NOTHING`,
        [np.id,np.name,CLIENT]
      );
    }catch(_){}
    console.log(`  ✅ ${name} (id: ${np.id})`);
  }

  // Insert tasks
  console.log("\n📥 Inserting tasks...");
  let inserted=0,errors=0;
  for(const et of excelTasks){
    const proj=projByName[et.project.toLowerCase()];
    if(!proj){console.log(`  ⚠ No project for "${et.project}"`);errors++;continue;}
    const payload={
      project_id:proj.id,client:CLIENT,title:et.title,
      status:et.status,client_sub_date:et.date,
      assignee:et.det,detailer:et.det,checker:et.chk,priority:"Medium",
    };
    const{data:nt,error}=await sb.from("tasks").insert(payload).select("id").single();
    if(error){console.log(`  ❌ "${et.title}": ${error.message}`);errors++;}
    else{
      try{
        await pool.query(
          `INSERT INTO tasks(id,project_id,client,title,status,client_sub_date,assignee,detailer,checker,priority,created_at)
           VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW()) ON CONFLICT(id) DO NOTHING`,
          [nt.id,proj.id,CLIENT,et.title,et.status,et.date,et.det,et.det,et.chk,"Medium"]
        );
      }catch(_){}
      inserted++;
    }
  }

  console.log(`\n✅ Done!`);
  console.log(`   Projects created : ${projSet.size}`);
  console.log(`   Tasks inserted   : ${inserted}`);
  console.log(`   Errors           : ${errors}`);
  await pool.end();
}
main().catch(e=>{console.error("FATAL:",e.message);process.exit(1);});
