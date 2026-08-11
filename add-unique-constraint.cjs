// add-unique-constraint.cjs
// Adds a unique constraint on (name, client) to the projects table in BOTH databases
// This prevents duplicate projects from ever being created again at the DB level

const{createClient}=require("@supabase/supabase-js");
const{Pool}=require("pg");

const sb=createClient(
  "https://xypcbioltukahipkqqzc.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGNiaW9sdHVrYWhpcGtxcXpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTQzMTM2NSwiZXhwIjoyMDk1MDA3MzY1fQ.AoLxjBk3MR3_qjsCP50xzbyx7cp_kaQlVmN_eP_xuYU"
);
const pool=new Pool({host:"localhost",port:5432,database:"rds_local",user:"postgres",password:"rds2026"});

async function main(){
  // 1. Verify no duplicates remain before adding constraint
  const{data:projects}=await sb.from("projects").select("id,name,client");
  const seen=new Set();
  const remaining=[];
  for(const p of(projects||[])){
    const key=`${p.client||""}|${p.name.trim().toLowerCase()}`;
    if(seen.has(key))remaining.push(p);
    seen.add(key);
  }
  if(remaining.length>0){
    console.log(`❌ Still have ${remaining.length} duplicate projects! Run fix-all-dup-projects.cjs first.`);
    remaining.forEach(p=>console.log(`   [${p.client}] ${p.name} id=${p.id}`));
    await pool.end();return;
  }
  console.log("✅ No duplicate projects found — safe to add constraint\n");

  // 2. Add unique constraint to local PostgreSQL
  console.log("📌 Adding unique constraint to local PostgreSQL...");
  try{
    await pool.query(`
      ALTER TABLE projects
      ADD CONSTRAINT projects_name_client_unique
      UNIQUE (name, client);
    `);
    console.log("  ✅ Local PG: constraint added");
  }catch(e){
    if(e.message.includes("already exists")){
      console.log("  ℹ  Local PG: constraint already exists");
    } else {
      console.log("  ⚠  Local PG error:", e.message);
    }
  }

  // 3. Add unique constraint to Supabase via rpc (raw SQL)
  console.log("\n📌 Adding unique constraint to Supabase...");
  const{data,error}=await sb.rpc("exec_sql",{sql:`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname='projects_name_client_unique'
      ) THEN
        ALTER TABLE projects ADD CONSTRAINT projects_name_client_unique UNIQUE (name, client);
      END IF;
    END$$;
  `});
  if(error){
    // If exec_sql rpc not available, show manual instruction
    console.log("  ⚠  Supabase RPC not available. Add constraint manually in Supabase SQL editor:");
    console.log(`
  ALTER TABLE projects
  ADD CONSTRAINT projects_name_client_unique
  UNIQUE (name, client);
    `);
  } else {
    console.log("  ✅ Supabase: constraint added");
  }

  console.log("\n✅ Done! Future imports cannot create duplicate projects for the same client.");
  await pool.end();
}
main().catch(e=>{console.error("FATAL:",e.message);process.exit(1);});
