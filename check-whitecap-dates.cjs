// check-whitecap-dates.cjs
// Compares White Cap DB dates vs new Excel (MM/DD/YYYY) and shows mismatches
const XLSX=require("xlsx");
const{createClient}=require("@supabase/supabase-js");
const{Pool}=require("pg");
const path=require("path");

const sb=createClient("https://xypcbioltukahipkqqzc.supabase.co","eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGNiaW9sdHVrYWhpcGtxcXpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTQzMTM2NSwiZXhwIjoyMDk1MDA3MzY1fQ.AoLxjBk3MR3_qjsCP50xzbyx7cp_kaQlVmN_eP_xuYU");
const pool=new Pool({host:"localhost",port:5432,database:"rds_local",user:"postgres",password:"rds2026"});

// Parse MM/DD/YYYY or MM-DD-YYYY correctly (White Cap format)
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
  const today=new Date().toLocaleDateString("en-CA",{timeZone:"Asia/Kolkata"});
  console.log("Today (IST):",today,"\n");

  // Read new Excel
  const wb=XLSX.readFile(path.join(__dirname,"WhiteCap_2026_v2.xlsx"),{cellDates:true});
  const raw=XLSX.utils.sheet_to_json(wb.Sheets["White Cap Work Schedule"],{header:1,defval:null});

  let currentProj=null;
  const excelMap={}; // "projname_lower|title_lower" → {sub, due}
  for(let i=3;i<raw.length;i++){
    const r=raw[i];
    if(r[0]&&String(r[0]).trim())currentProj=String(r[0]).trim();
    const title=r[1]?String(r[1]).trim():null;
    if(!currentProj||!title||title==="Tasks")continue;
    const key=`${currentProj.toLowerCase()}|${title.toLowerCase()}`;
    excelMap[key]={sub:parseMMDD(r[3]),proj:currentProj,title};
  }

  // Fetch White Cap DB tasks
  const{data:projects}=await sb.from("projects").select("id,name,client").eq("client","White Cap");
  const pm={};(projects||[]).forEach(p=>{pm[p.id]=p;});
  const projIds=(projects||[]).map(p=>p.id);
  const{data:tasks}=await sb.from("tasks").select("id,title,project_id,client_sub_date,status").in("project_id",projIds);

  // Today's submissions in DB
  const todaySubs=(tasks||[]).filter(t=>t.client_sub_date===today);
  console.log(`=== Today's White Cap submissions (client_sub_date=${today}) ===`);
  console.log(`Count: ${todaySubs.length}\n`);

  todaySubs.forEach(t=>{
    const p=pm[t.project_id];
    const key=`${(p?.name||"").toLowerCase()}|${t.title.toLowerCase()}`;
    const ex=excelMap[key];
    const exSub=ex?.sub||"not in Excel";
    const correct=ex?.sub===today;
    console.log(`${correct?"✅":"⚠ "} [${p?.name}] "${t.title}"`);
    console.log(`     DB sub_date=${today} | Excel sub_date=${exSub}`);
    if(!correct&&ex?.sub)console.log(`     → Should be: ${ex.sub} (${ex.sub.slice(8)}/${ex.sub.slice(5,7)}/${ex.sub.slice(0,4)})`);
  });

  // Find all mismatches between DB and Excel
  console.log(`\n=== All date mismatches (DB ≠ Excel) ===`);
  let mismatches=0;
  for(const t of(tasks||[])){
    const p=pm[t.project_id];
    const key=`${(p?.name||"").toLowerCase()}|${t.title.toLowerCase()}`;
    const ex=excelMap[key];
    if(!ex?.sub)continue;
    if(ex.sub!==t.client_sub_date){
      mismatches++;
      console.log(`  [${p?.name}] "${t.title}"`);
      console.log(`    DB=${t.client_sub_date||"null"} | Excel=${ex.sub}`);
    }
  }
  if(mismatches===0)console.log("✅ All dates match!");
  else console.log(`\n⚠  ${mismatches} mismatches found — run node fix-whitecap-dates.cjs to fix`);

  await pool.end();
}
main().catch(e=>{console.error("FATAL:",e.message);process.exit(1);});
