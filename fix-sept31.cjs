// fix-sept31.cjs — fix invalid date 2026-09-31 → 2026-09-30
const{createClient}=require("@supabase/supabase-js");
const{Pool}=require("pg");
const sb=createClient(
  "https://xypcbioltukahipkqqzc.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGNiaW9sdHVrYWhpcGtxcXpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTQzMTM2NSwiZXhwIjoyMDk1MDA3MzY1fQ.AoLxjBk3MR3_qjsCP50xzbyx7cp_kaQlVmN_eP_xuYU"
);
const pool=new Pool({host:"localhost",port:5432,database:"rds_local",user:"postgres",password:"rds2026"});

async function run(){
  const titles=["Roof Floor slab (Residential)","Parapet walls (Residential) verticals"];
  for(const title of titles){
    const{data,error}=await sb.from("tasks")
      .update({client_sub_date:"2026-09-30",updated_at:new Date().toISOString()})
      .ilike("title",title)
      .select("id,title");
    if(error){ console.log("❌ Supabase error for:",title,"→",error.message); continue; }
    if(!data||!data.length){ console.log("⚠ Not found in Supabase:",title); continue; }
    console.log("✅ Supabase updated:",title);
    for(const t of data){
      try{
        await pool.query("UPDATE tasks SET client_sub_date=$1,updated_at=NOW() WHERE id=$2",["2026-09-30",t.id]);
        console.log("✅ Local DB updated:",title);
      }catch(e){ console.log("⚠ Local DB error:",e.message); }
    }
  }
  await pool.end();
  console.log("\nDone.");
}
run().catch(e=>console.error("FATAL:",e.message));
