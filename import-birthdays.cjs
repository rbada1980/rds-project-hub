const { createClient } = require("@supabase/supabase-js");
const { Client } = require("pg");

const sb = createClient(
  "https://xypcbioltukahipkqqzc.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGNiaW9sdHVrYWhpcGtxcXpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTQzMTM2NSwiZXhwIjoyMDk1MDA3MzY1fQ.AoLxjBk3MR3_qjsCP50xzbyx7cp_kaQlVmN_eP_xuYU"
);
const pg = new Client({ host:"localhost", port:5432, database:"rds_local", user:"postgres", password:"rds2026" });

// Manually corrected birthday assignments (DB exact name → date)
// Year 1990 is a placeholder — only MM-DD is used by the birthday banner
const UPDATES = [
  { name:"Trisha",        dob:"1990-02-03" },
  { name:"Vaishnavi",     dob:"1990-03-07" },
  { name:"Siva Kumar",    dob:"1990-04-05" }, // [Rebar] Apr 5
  { name:"Balaram",       dob:"1990-05-16" },
  { name:"Swathi",        dob:"1990-05-22" },
  { name:"Naidu",         dob:"1990-05-23" }, // R.S. Naidu [Tekla]
  { name:"Pradeep",       dob:"1990-05-27" },
  { name:"Lokesh",        dob:"1990-05-28" },
  { name:"Kunal",         dob:"1990-06-11" },
  { name:"Jagadeesh",     dob:"1990-07-07" },
  { name:"Chandra Mouli", dob:"1990-07-09" },
  { name:"Lavanya",       dob:"1990-07-11" }, // K.Lavanya in Excel
  { name:"Divya",         dob:"1990-07-14" }, // K.Divya in Excel [Tekla]
  { name:"Anji Reddy",    dob:"1990-07-20" }, // "Anji" in Excel
  { name:"Sri Lalitha",   dob:"1990-08-03" },
  { name:"Nanaji",        dob:"1990-08-12" },
  { name:"Praveena",      dob:"1990-08-12" },
  { name:"Kameshwari",    dob:"1990-09-27" }, // Excel had "Kameswari" (spelling diff)
  { name:"Akash",         dob:"1990-10-03" }, // "Eswar Akash" in Excel = Akash [Tekla]
  { name:"Eswar",         dob:"1990-10-08" }, // Eswar [Team Leader]
  { name:"Pavan sai",     dob:"1990-10-15" }, // "Pavan" Oct 15 in Excel
  { name:"Sridevi",       dob:"1990-10-23" },
  { name:"Sai",           dob:"1990-11-02" }, // "A.Sai" in Excel
  { name:"Siva",          dob:"1990-11-06" }, // "6th Siva kumar" Nov = Siva [Team Leader]
  { name:"Narayana",      dob:"1990-12-05" },
  { name:"Dhanush",       dob:"1990-12-24" },
];

async function main(){
  await pg.connect();

  // Get all users to resolve names → IDs
  const { data: users, error } = await sb.from("users").select("id,name,role");
  if(error){ console.log("Supabase ERR:",error.message); return; }

  let ok=0, skip=0, err=0;
  for(const u of UPDATES){
    const dbUser = users.find(x=>x.name===u.name);
    if(!dbUser){
      console.log("⚠  SKIP (not found in DB): "+u.name);
      skip++; continue;
    }

    // Update Supabase
    const { error: se } = await sb.from("users").update({ date_of_birth: u.dob }).eq("id", dbUser.id);
    if(se){ console.log("❌ Supabase ERR ["+u.name+"]: "+se.message); err++; continue; }

    // Update local PG
    await pg.query("UPDATE users SET date_of_birth=$1 WHERE id=$2", [u.dob, dbUser.id]);

    console.log("✅ "+u.name+" ["+dbUser.role+"] → "+u.dob);
    ok++;
  }

  await pg.end();
  console.log("\nDone — Updated: "+ok+" | Skipped: "+skip+" | Errors: "+err);
}
main().catch(e=>{ console.error("FATAL:",e.message); process.exit(1); });
