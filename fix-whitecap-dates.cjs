// fix-whitecap-dates.cjs — fixes the 2 remaining White Cap date mismatches
const XLSX=require("xlsx");
const{createClient}=require("@supabase/supabase-js");
const{Pool}=require("pg");
const path=require("path");

const sb=createClient("https://xypcbioltukahipkqqzc.supabase.co","eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGNiaW9sdHVrYWhpcGtxcXpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTQzMTM2NSwiZXhwIjoyMDk1MDA3MzY1fQ.AoLxjBk3MR3_qjsCP50xzbyx7cp_kaQlVmN_eP_xuYU");
const pool=new Pool({host:"localhost",port:5432,database:"rds_local",user:"postgres",password:"rds2026"});

function parseMMDD(v){
  if(!v)return null;
  if(v instanceof Date){const y=v.getFullYear(),m=String(v.getMonth()+1).padStart(2,"0"),d=String(v.getDate()).padStart(2,"0");return`${y}-${m}-${d}`;}
  const s=String(v).trim();
  const mdy=s.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/);
  if(mdy)return`${mdy[3]}-${mdy[1].padStart(2,"0")}-${mdy[2].padStart(2,"0")}`;
  if(/^\d{4}-\d{2}-\d{2}$/.test(s))return s;
  if(s.includes("T")){const dt=new Date(s);return isNaN(dt)?null:dt.toLocaleDateString("en-CA",{timeZone:"Asia/Kolkata"});}
  return null;
}

async function main(){
  const wb=XLSX.readFile(path.join(__dirname,"WhiteCap_2026_v2.xlsx"),{cellDates:true});
  const raw=XLSX.utils.sheet_to_json(wb.Sheets["White Cap Work Schedule"],{header:1,defval:null});

  let currentProj=null;
  const excelMap={};
  for(let i=3;i<raw.length;i++){
    const r=raw[i];
    if(r[0]&&String(r[0]).trim())currentProj=String(r[0]).trim();
    const title=r[1]?String(r[1]).trim():null;
    if(!currentProj||!title||title==="Tasks")continue;
    excelMap[`${currentProj.toLowerCase()}|${title.toLowerCase()}`]={sub:parseMMDD(r[3]),proj:currentProj,title};
  }

  const{data:projects}=await sb.from("projects").select("id,name,client").eq("client","White Cap");
  const pm={};(projects||[]).forEach(p=>{pm[p.id]=p;});
  const projIds=(projects||[]).map(p=>p.id);
  const{data:tasks}=await sb.from("tasks").select("id,title,project_id,client_sub_date").in("project_id",projIds);

  let fixed=0;
  for(const t of(tasks||[])){
    const p=pm[t.project_id];
    const key=`${(p?.name||"").toLowerCase()}|${t.title.toLowerCase()}`;
    const ex=excelMap[key];
    if(!ex?.sub||ex.sub===t.client_sub_date)continue;

    const{error}=await sb.from("tasks").update({client_sub_date:ex.sub}).eq("id",t.id);
    if(error){console.log(`❌ "${t.title}": ${error.message}`);}
    else{
      try{await pool.query("UPDATE tasks SET client_sub_date=$1 WHERE id=$2",[ex.sub,t.id]);}catch(_){}
      console.log(`✅ [${p?.name}] "${t.title}": ${t.client_sub_date} → ${ex.sub}`);
      fixed++;
    }
  }
  console.log(`\n✅ Done — ${fixed} task(s) fixed`);
  await pool.end();
}
main().catch(e=>{console.error("FATAL:",e.message);process.exit(1);});
