// cleanup-nomi6-orphans.cjs
// Deletes NOMI-6 DB tasks that are NOT in the current Formcrete Excel.
// These are orphan tasks from an old import that were removed from the current file.

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
const UPLOAD_FILE="C:\\Users\\HP\\AppData\\Local\\Packages\\Claude_pzs8sxrjxfjjc\\LocalCache\\Roaming\\Claude\\local-agent-mode-sessions\\919964d4-cd92-4eb6-b494-6c7ad2c02d36\\4c052105-2aba-4ec0-9a90-013070bec645\\local_d0d6e4a5-acfb-4c98-8222-e8da51f65329\\uploads\\Formcrete Projects-bd936cde.xlsx";
const LOCAL_FILE=path.join(__dirname,"Formcrete Projects.xlsx");
const FILE=fs.existsSync(UPLOAD_FILE)?UPLOAD_FILE:LOCAL_FILE;

async function main(){
  console.log("📂 Reading Excel:", FILE);
  const wb=XLSX.readFile(FILE,{cellDates:true});
  const raw=XLSX.utils.sheet_to_json(wb.Sheets["PROJECTS"],{header:1,defval:null});

  // Build Excel title set for NOMI-6
  const nomiExcelTitles=new Set();
  let curProj=null;
  for(let i=1;i<raw.length;i++){
    const r=raw[i];
    if(!r) continue;
    if(r[0]&&String(r[0]).trim()) curProj=String(r[0]).trim();
    const title=r[2]?String(r[2]).trim():null;
    if(!curProj||!title) continue;
    if(curProj==="NOMI-6") nomiExcelTitles.add(title.toLowerCase());
  }
  console.log(`📋 NOMI-6 tasks in Excel: ${nomiExcelTitles.size}`);

  // Get NOMI-6 project from DB
  const{data:proj}=await sb.from("projects").select("id,name").eq("client",CLIENT).ilike("name","NOMI-6").single();
  if(!proj){console.error("❌ NOMI-6 project not found in DB");await pool.end();return;}
  console.log(`🗂  NOMI-6 project id: ${proj.id}`);

  // Get all NOMI-6 DB tasks
  const{data:dbTasks}=await sb.from("tasks").select("id,title,status").eq("project_id",proj.id);
  console.log(`📌 NOMI-6 DB tasks: ${dbTasks.length}`);

  // Find orphans: DB tasks NOT in current Excel
  const orphans=dbTasks.filter(t=>!nomiExcelTitles.has(t.title.toLowerCase()));
  console.log(`\n⚠️  Orphan tasks (in DB but NOT in Excel): ${orphans.length}`);
  orphans.forEach(t=>console.log(`   [${t.status}] "${t.title}" | id=${t.id}`));

  if(orphans.length===0){
    console.log("\n✅ No orphans found — DB matches Excel perfectly.");
    await pool.end();
    return;
  }

  // Delete orphans
  console.log(`\n🗑  Deleting ${orphans.length} orphan tasks...`);
  let deleted=0,errors=0;
  for(const t of orphans){
    const{error}=await sb.from("tasks").delete().eq("id",t.id);
    if(error){
      console.log(`  ❌ "${t.title}": ${error.message}`);
      errors++;
    } else {
      try{await pool.query("DELETE FROM tasks WHERE id=$1",[t.id]);}catch(_){}
      console.log(`  🗑  Deleted: "${t.title}" [${t.status}]`);
      deleted++;
    }
  }

  console.log(`\n✅ Done — Deleted: ${deleted} | Errors: ${errors}`);
  console.log(`   NOMI-6 now has ${dbTasks.length - deleted} tasks (matching Excel's ${nomiExcelTitles.size})`);
  await pool.end();
}
main().catch(e=>{console.error("FATAL:",e.message);process.exit(1);});
