const { createClient } = require("@supabase/supabase-js");
const sb = createClient(
  "https://xypcbioltukahipkqqzc.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGNiaW9sdHVrYWhpcGtxcXpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTQzMTM2NSwiZXhwIjoyMDk1MDA3MzY1fQ.AoLxjBk3MR3_qjsCP50xzbyx7cp_kaQlVmN_eP_xuYU"
);

// Parsed from 2026 Events sheet (most current). No year in Excel → using 1990 placeholder.
// Only MM-DD matters for the birthday banner logic.
const BIRTHDAYS = [
  { name:"Trisha",        month:2,  day:3  },
  { name:"Vaishnavi",     month:3,  day:7  },
  { name:"K.Ajay",        month:3,  day:24 },
  { name:"Kalyan",        month:4,  day:2  },
  { name:"Ramesh",        month:4,  day:3  },
  { name:"Siva Kumar",    month:4,  day:5  },
  { name:"Jeswanth",      month:4,  day:2  },
  { name:"Harsha",        month:4,  day:6  },
  { name:"Prathyusha",    month:4,  day:25 },
  { name:"Balaram",       month:5,  day:16 },
  { name:"Swathi",        month:5,  day:22 },
  { name:"R.S. Naidu",    month:5,  day:23 },
  { name:"Pradeep",       month:5,  day:27 },
  { name:"Lokesh",        month:5,  day:28 },
  { name:"Vamsi",         month:6,  day:3  },
  { name:"Mohan",         month:6,  day:5  },
  { name:"Kunal",         month:6,  day:11 },
  { name:"Tirupathi",     month:6,  day:20 },
  { name:"Jagadeesh",     month:7,  day:7  },
  { name:"Chandra Mouli", month:7,  day:9  },
  { name:"K.Lavanya",     month:7,  day:11 },
  { name:"K.Divya",       month:7,  day:14 },
  { name:"Anji",          month:7,  day:20 },
  { name:"Sri Lalitha",   month:8,  day:3  },
  { name:"Pari",          month:8,  day:5  },
  { name:"Nanaji",        month:8,  day:12 },
  { name:"Praveena",      month:8,  day:12 },
  { name:"Vinay",         month:8,  day:21 },
  { name:"Sangeetha",     month:9,  day:25 },
  { name:"Kameswari",     month:9,  day:27 },
  { name:"Dhana Lakshmi", month:9,  day:18 },
  { name:"Eswar Akash",   month:10, day:3  },
  { name:"Eswar",         month:10, day:8  },
  { name:"Pavan",         month:10, day:15 },
  { name:"Sridevi",       month:10, day:23 },
  { name:"A.Sai",         month:11, day:2  },
  { name:"Aravind",       month:11, day:8  },
  { name:"Pavan Sai",     month:11, day:29 },
  { name:"Narayana",      month:12, day:5  },
  { name:"Chandu",        month:12, day:13 },
  { name:"G. Sai Teja",   month:12, day:25 },
  { name:"Dhanush",       month:12, day:24 },
  { name:"Shekar",        month:12, day:29 },
];

function pad(n){ return String(n).padStart(2,"0"); }
function toBirthDate(month,day){ return "1990-"+pad(month)+"-"+pad(day); }

async function main(){
  const { data: users, error } = await sb.from("users")
    .select("id,name,role,date_of_birth")
    .neq("role","Client").neq("role","Admin");
  if(error){ console.log("ERR:",error.message); return; }

  console.log("=== Employees in DB ("+users.length+") ===");
  users.forEach(u=>console.log("  ["+u.role+"] "+u.name+" | DOB: "+(u.date_of_birth||"NOT SET")));

  console.log("\n=== Birthday Matching ===");
  const matched=[], unmatched=[];

  for(const b of BIRTHDAYS){
    const nameL=b.name.toLowerCase().replace(/\./g," ").trim();
    let hit=null;

    // 1. Exact match
    hit=users.find(u=>u.name.toLowerCase()===nameL);
    // 2. Contains (Excel name inside DB name, or vice versa)
    if(!hit) hit=users.find(u=>u.name.toLowerCase().includes(nameL)||nameL.includes(u.name.toLowerCase()));
    // 3. First significant word match (unique)
    if(!hit){
      const words=nameL.split(/[\s.]+/).filter(w=>w.length>2);
      for(const w of words){
        const hits=users.filter(u=>u.name.toLowerCase().includes(w));
        if(hits.length===1){ hit=hits[0]; break; }
        if(hits.length>1){
          console.log("  ⚠ AMBIGUOUS '"+b.name+"' → matches: "+hits.map(u=>u.name).join(", "));
          unmatched.push({...b,reason:"ambiguous: "+hits.map(u=>u.name).join(", ")});
          hit="skip"; break;
        }
      }
    }
    if(hit==="skip") continue;

    if(hit){
      const dob=toBirthDate(b.month,b.day);
      console.log("  ✅ '"+b.name+"' → "+hit.name+" ["+hit.role+"] → "+dob+(hit.date_of_birth?" (had: "+hit.date_of_birth+")":""));
      matched.push({userId:hit.id,userName:hit.name,dob});
    } else {
      console.log("  ❌ NO MATCH: '"+b.name+"' ("+b.month+"/"+b.day+")");
      unmatched.push({...b,reason:"no match in DB"});
    }
  }

  console.log("\n✅ Matched: "+matched.length+" | ❌ Unmatched/Ambiguous: "+unmatched.length);
  if(unmatched.length>0){
    console.log("\nUnmatched — fix names in DB or script:");
    unmatched.forEach(b=>console.log("  "+b.name+" ("+b.month+"/"+b.day+") — "+b.reason));
  }
}
main().catch(e=>{ console.error("FATAL:",e.message); process.exit(1); });
