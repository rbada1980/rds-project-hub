// import-formcrete-fresh.cjs
// FRESH import of Formcrete Excel → DB (no existing data, clean insert only)
// Run AFTER delete-formcrete-all.cjs
// Run: node import-formcrete-fresh.cjs

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

// Try uploaded file first, then local copy
const CANDIDATES=[
  "C:\\Users\\HP\\AppData\\Local\\Packages\\Claude_pzs8sxrjxfjjc\\LocalCache\\Roaming\\Claude\\local-agent-mode-sessions\\919964d4-cd92-4eb6-b494-6c7ad2c02d36\\4c052105-2aba-4ec0-9a90-013070bec645\\local_d0d6e4a5-acfb-4c98-8222-e8da51f65329\\uploads\\Formcrete Projects.xlsx",
  path.join(__dirname,"Formcrete_latest.xlsx"),
  path.join(__dirname,"Formcrete Projects.xlsx"),
];
const FILE=CANDIDATES.find(f=>fs.existsSync(f));
if(!FILE){console.error("❌ No Formcrete Excel file found.");process.exit(1);}

const STATUS_MAP={
  "COMPLETED":"Completed","IN PROGRESS":"In Progress","IN PROCESS":"In Progress",
  "NOT YET STARTED":"Not Yet Started",
  "Completed":"Completed","In Progress":"In Progress","Not Yet Started":"Not Yet Started",
};

function parseDate(v){
  if(!v) return null;
  // Use raw serial number (cellDates:false) → UTC midnight → correct IST date
  // Do NOT use instanceof Date: XLSX on IST machine gives T18:29:50Z (10s before midnight IST) → wrong day
  if(typeof v==="number"){
    const d=new Date(Math.round((v-25569)*86400*1000));
    return d.toLocaleDateString("en-CA",{timeZone:"Asia/Kolkata"});
  }
  const s=String(v).trim();
  if(/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0,10);
  // ISO string from Date object fallback — add 30min buffer to cross midnight IST safely
  if(s.includes("T")){
    const dt=new Date(new Date(s).getTime()+30*60*1000);
    return isNaN(dt)?null:dt.toLocaleDateString("en-CA",{timeZone:"Asia/Kolkata"});
  }
  return null;
}

const NAME_MAP={
  "swathi":"Swathi","swa":"Swathi","sai":"Sai","dhanush":"Dhanush","danush":"Dhanush",
  "sridevi":"Sridevi","balaram":"Balaram","jagadeesh":"Jagadeesh","jgd":"Jagadeesh",
  "nanaji":"Nanaji","trisha":"Trisha","praveena":"Praveena","sri lalitha":"Sri Lalitha",
  "chandra mouli":"Chandra Mouli","chandra":"Chandra Mouli","kameshwari":"Kameshwari",
  "kameswari":"Kameswari","anji reddy":"Anji Reddy","pradeep":"Pradeep","blm":"Balaram",
  "jeswanth":"Jeswanth",
};
function normName(raw){
  if(!raw) return null;
  const first=String(raw).split(/[&,\/]/)[0].trim();
  return NAME_MAP[first.toLowerCase()]||first||null;
}

async function main(){
  console.log("📂 Reading:",FILE);
  const wb=XLSX.readFile(FILE,{cellDates:false});
  const raw=XLSX.utils.sheet_to_json(wb.Sheets["PROJECTS"],{header:1,defval:null});
  console.log("📄 Total rows:",raw.length);

  const headerIdx=raw.findIndex(r=>r&&String(r[0]||"").toUpperCase()==="PROJECT NAME");
  const dataStart=headerIdx+1;
  // Read ENTIRE file — both main section AND old projects modifications
  // (Old proj mod section has active tasks with future dates — must not skip)
  const oldModIdx=raw.findIndex(r=>r&&String(r[0]||"").toUpperCase().includes("OLD PROJECTS"));
  const dataEnd=raw.length;
  if(oldModIdx>0) console.log(`📊 Main section ends at row ${oldModIdx+1}, OLD PROJ MOD starts there — importing BOTH sections`);
  console.log(`📊 Total rows to read: ${dataEnd-dataStart}`);
  const COL={proj:0,title:2,status:3,sub:4,req:5,det:7,chk:8};
  console.log(`📊 Header row ${headerIdx} | Data from row ${dataStart}`);

  // Parse tasks
  const excelTasks=[];
  let curProj=null;
  for(let i=dataStart;i<dataEnd;i++){
    const r=raw[i];
    if(!r) continue;
    if(r[COL.proj]&&String(r[COL.proj]).trim()) curProj=String(r[COL.proj]).trim();
    const title=r[COL.title]?String(r[COL.title]).trim():null;
    if(!curProj||!title) continue;
    const statusRaw=String(r[COL.status]||"").trim();
    const isHold=statusRaw.toLowerCase()==="hold";
    const status=isHold?"Not Yet Started":(STATUS_MAP[statusRaw.toUpperCase()]||STATUS_MAP[statusRaw]||"Not Yet Started");
    excelTasks.push({
      project:curProj,title,status,
      sub:parseDate(r[COL.sub]),
      req:parseDate(r[COL.req]),
      det:normName(r[COL.det]),
      chk:normName(r[COL.chk]),
    });
  }

  const projSet=new Set(excelTasks.map(t=>t.project));
  console.log(`\n📋 ${excelTasks.length} tasks | ${projSet.size} projects`);

  // Show summary
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
      status:et.status,client_sub_date:et.sub,due_date:et.req,
      assignee:et.det,detailer:et.det,checker:et.chk,priority:"Medium",
    };
    const{data:nt,error}=await sb.from("tasks").insert(payload).select("id").single();
    if(error){console.log(`  ❌ "${et.title}": ${error.message}`);errors++;}
    else{
      try{
        await pool.query(
          `INSERT INTO tasks(id,project_id,client,title,status,client_sub_date,due_date,assignee,detailer,checker,priority,created_at)
           VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW()) ON CONFLICT(id) DO NOTHING`,
          [nt.id,proj.id,CLIENT,et.title,et.status,et.sub,et.req,et.det,et.det,et.chk,"Medium"]
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
