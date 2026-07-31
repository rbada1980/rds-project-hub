const { createClient } = require("@supabase/supabase-js");
const { Client } = require("pg");

const sb = createClient(
  "https://xypcbioltukahipkqqzc.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGNiaW9sdHVrYWhpcGtxcXpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTQzMTM2NSwiZXhwIjoyMDk1MDA3MzY1fQ.AoLxjBk3MR3_qjsCP50xzbyx7cp_kaQlVmN_eP_xuYU"
);
const pg = new Client({ host:"localhost", port:5432, database:"rds_local", user:"postgres", password:"rds2026" });

const HOLIDAYS = [
  // ── Fixed national holidays ──
  { name:"New Year's Day",           date:"2026-01-01", type:"national" },
  { name:"Makar Sankranti",          date:"2026-01-14", type:"festival" },
  { name:"Republic Day",             date:"2026-01-26", type:"national" },
  // ── Lunar / religious (2026 approximations) ──
  { name:"Maha Shivaratri",          date:"2026-02-17", type:"festival" },
  { name:"Holi",                     date:"2026-03-03", type:"festival" },
  { name:"Eid ul-Fitr",              date:"2026-03-20", type:"festival" },
  { name:"Ram Navami",               date:"2026-03-27", type:"festival" },
  { name:"Good Friday",              date:"2026-04-03", type:"public"   },
  { name:"Mahavir Jayanti",          date:"2026-04-07", type:"festival" },
  { name:"Dr. Ambedkar Jayanti",     date:"2026-04-14", type:"national" },
  { name:"Labour Day",               date:"2026-05-01", type:"national" },
  { name:"Buddha Purnima",           date:"2026-05-01", type:"festival" },
  { name:"Eid al-Adha",              date:"2026-05-27", type:"festival" },
  { name:"Independence Day",         date:"2026-08-15", type:"national" },
  { name:"Janmashtami",              date:"2026-08-14", type:"festival" },
  { name:"Ganesh Chaturthi",         date:"2026-08-19", type:"festival" },
  { name:"Onam",                     date:"2026-09-05", type:"festival" },
  { name:"Gandhi Jayanti",           date:"2026-10-02", type:"national" },
  { name:"Dussehra",                 date:"2026-10-21", type:"festival" },
  { name:"Diwali",                   date:"2026-10-28", type:"festival" },
  { name:"Guru Nanak Jayanti",       date:"2026-11-15", type:"festival" },
  { name:"Christmas",                date:"2026-12-25", type:"public"   },
  // ── RDS Company events ──
  { name:"RDS Construction Cadd Anniversary", date:"2026-03-02", type:"company" },
].map(h=>({...h, year:2026}));

async function main(){
  await pg.connect();

  // Clear existing 2026 holidays to avoid duplicates
  const { error: delErr } = await sb.from("holidays").delete().eq("year",2026);
  if(delErr) console.log("⚠ Supabase delete warning:", delErr.message);
  await pg.query("DELETE FROM holidays WHERE year=2026");
  console.log("Cleared existing 2026 holidays");

  // Insert into Supabase
  const { error: insErr } = await sb.from("holidays").insert(HOLIDAYS);
  if(insErr){ console.log("❌ Supabase insert error:", insErr.message); }
  else { console.log("✅ Supabase: "+HOLIDAYS.length+" holidays inserted"); }

  // Insert into local PG
  for(const h of HOLIDAYS){
    await pg.query(
      "INSERT INTO holidays (name,date,type,year) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING",
      [h.name, h.date, h.type, h.year]
    );
  }
  console.log("✅ Local PG: "+HOLIDAYS.length+" holidays inserted");

  // Summary
  console.log("\n2026 Holiday List:");
  HOLIDAYS.forEach(h=>console.log("  "+h.date+" | "+h.type.padEnd(9)+" | "+h.name));

  await pg.end();
}
main().catch(e=>{ console.error("FATAL:",e.message); process.exit(1); });
