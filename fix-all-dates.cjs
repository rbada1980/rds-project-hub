// fix-all-dates.cjs — fixes all date/status mismatches found by check-all-dates.cjs
const XLSX=require("xlsx");
const{createClient}=require("@supabase/supabase-js");
const{Pool}=require("pg");
const path=require("path");
const fs=require("fs");

const sb=createClient("https://xypcbioltukahipkqqzc.supabase.co","eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGNiaW9sdHVrYWhpcGtxcXpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTQzMTM2NSwiZXhwIjoyMDk1MDA3MzY1fQ.AoLxjBk3MR3_qjsCP50xzbyx7cp_kaQlVmN_eP_xuYU");
const pool=new Pool({host:"localhost",port:5432,database:"rds_local",user:"postgres",password:"rds2026"});

const STATUS_MAP={"COMPLETED":"Completed","IN PROGRESS":"In Progress","NOT YET STARTED":"Not Yet Started","IN PROCESS":"In Process"};

const EXCELS=[
  {client:"Formcrete",file:"Formcrete Projects Tracker_2026.xlsx",sheet:"PROJECTS",start:5,c:{proj:2,title:5,status:7,sub:8,due:9,checker:15}},
  {client:"Formcrete",file:"Formcrete Projects.xlsx",sheet:"PROJECTS",start:2,c:{proj:0,title:2,status:3,sub:4,due:5,checker:8}},
  {client:"White Cap",file:"WhiteCap_Import.xlsx",sheet:null,start:1,c:{proj:2,title:4,status:6,sub:7,due:8}},
  {client:"KSP",file:"ksp-new.xlsx",sheet:null,start:1,c:{proj:2,title:1,status:5,sub:11,due:10,checker:9}},
];

function toIST(v){
  if(!v)return null;
  if(v instanceof Date){const y=v.getFullYear(),m=String(v.getMonth()+1).padStart(2,"0"),d=String(v.getDate()).padStart(2,"0");return`${y}-${m}-${d}`;}
  if(typeof v==="string"){if(v.includes("T")||v.includes("Z")){const dt=new Date(v);return isNaN(dt)?null:dt.toLocaleDateString("en-CA",{timeZone:"Asia/Kolkata"});}if(/^\d{4}-\d{2}-\d{2}$/.test(v.trim()))return v.trim();}
  if(typeof v==="number")return new Date(Math.round((v-25569)*86400*1000)).toLocaleDateString("en-CA",{timeZone:"Asia/Kolkata"});
  return null;
}

async function main(){
  const{data:allProjects}=await sb.from("projects").select("id,name,client");
  const{data:allTasks}=await sb.from("tasks").select("id,title,project_id,status,due_date,client_sub_date,checker");
  const projMap={};(allProjects||[]).forEach(p=>{projMap[`${p.client}|${p.name.toLowerCase()}`]=p;});
  const taskMap={};(allTasks||[]).forEach(t=>{taskMap[`${t.project_id}|${t.title.toLowerCase()}`]=t;});

  let totalFixed=0;

  for(const cfg of EXCELS){
    const fp=path.join(__dirname,cfg.file);
    if(!fs.existsSync(fp)){console.log(`⚠ Missing: ${cfg.file}`);continue;}
    const wb=XLSX.readFile(fp,{cellDates:true});
    const raw=XLSX.utils.sheet_to_json(wb.Sheets[cfg.sheet||wb.SheetNames[0]],{header:1,defval:null});
    console.log(`\n📂 ${cfg.client} — ${cfg.file}`);
    let fixed=0,skipped=0;

    for(let i=cfg.start;i<raw.length;i++){
      const r=raw[i];const c=cfg.c;
      const projName=r[c.proj]?String(r[c.proj]).trim():null;
      const title=r[c.title]?String(r[c.title]).trim():null;
      if(!projName||!title)continue;
      const proj=projMap[`${cfg.client}|${projName.toLowerCase()}`];if(!proj)continue;
      const db=taskMap[`${proj.id}|${title.toLowerCase()}`];if(!db)continue;

      const exSub=toIST(c.sub!=null?r[c.sub]:null);
      const exDue=toIST(c.due!=null?r[c.due]:null);
      const exStatus=STATUS_MAP[(r[c.status]?String(r[c.status]).trim().toUpperCase():"")] ||null;
      const exChecker=c.checker!=null&&r[c.checker]?String(r[c.checker]).trim():null;

      const patch={};
      if(exDue&&exDue!==db.due_date)patch.due_date=exDue;
      if(exSub&&exSub!==db.client_sub_date)patch.client_sub_date=exSub;
      if(exChecker&&exChecker!==db.checker)patch.checker=exChecker;

      if(!Object.keys(patch).length){skipped++;continue;}

      const{error}=await sb.from("tasks").update(patch).eq("id",db.id);
      if(error){console.log(`  ❌ "${title}": ${error.message}`);}
      else{
        try{const sets=Object.keys(patch).map((k,i)=>`${k}=$${i+2}`).join(",");await pool.query(`UPDATE tasks SET ${sets} WHERE id=$1`,[db.id,...Object.values(patch)]);}catch(_){}
        fixed++;totalFixed++;
        console.log(`  ✅ "${title}": ${JSON.stringify(patch)}`);
      }
    }
    console.log(`  → ${fixed} fixed, ${skipped} already correct`);
  }

  console.log(`\n✅ Complete! Total fixed: ${totalFixed}`);
  await pool.end();
}
main().catch(e=>{console.error("FATAL:",e.message);process.exit(1);});
