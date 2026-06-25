// fix_shiva_merge.cjs — merges "Shiva" into "Siva Kumar" across all tasks and projects
const { createClient } = require("@supabase/supabase-js");

const SUPA_URL = "https://xypcbioltukahipkqqzc.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGNiaW9sdHVrYWhpcGtxcXpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0MzEzNjUsImV4cCI6MjA5NTAwNzM2NX0.DG5sv2bpx8j3Mmz0mqIsoDVaCMP2TmWqh-OQUfSZFRw";
const supabase = createClient(SUPA_URL, SUPA_KEY);

const VARIANTS = ["Shiva","shiva","SHIVA","Shiva Kumar","shiva kumar","SHIVA KUMAR"];
const CANONICAL = "Siva Kumar";

async function main(){
  console.log(`=== Merging all Shiva variants → "${CANONICAL}" ===\n`);

  // 1. Find and delete the duplicate user record
  const {data:users} = await supabase.from("users").select("id,name,username");
  const shivaUsers = users.filter(u => VARIANTS.map(v=>v.toLowerCase()).includes(u.name.toLowerCase().trim()));
  if(shivaUsers.length){
    console.log(`Found ${shivaUsers.length} Shiva user record(s):`);
    for(const u of shivaUsers){
      console.log(`  Deleting user: "${u.name}" (id:${u.id})`);
      const {error} = await supabase.from("users").delete().eq("id",u.id);
      if(error) console.error(`  ❌ ${error.message}`);
      else console.log(`  ✓ Deleted`);
    }
  } else {
    console.log("No Shiva user records found in users table");
  }

  // 2. Fix tasks — assignee, detailer, checker fields
  const {data:tasks} = await supabase.from("tasks").select("id,assignee,detailer,checker");
  let taskFixed = 0;
  for(const t of tasks||[]){
    const updates = {};
    const fix = v => {
      if(!v) return v;
      // Handle slash-separated combos like "Shiva/someone"
      return v.split(/[\/]/).map(p => {
        const trimmed = p.trim();
        return VARIANTS.map(x=>x.toLowerCase()).includes(trimmed.toLowerCase()) ? CANONICAL : trimmed;
      }).join("/");
    };
    const newAssignee = fix(t.assignee);
    const newDetailer = fix(t.detailer);
    const newChecker  = fix(t.checker);
    if(newAssignee !== t.assignee) updates.assignee = newAssignee;
    if(newDetailer !== t.detailer) updates.detailer = newDetailer;
    if(newChecker  !== t.checker)  updates.checker  = newChecker;
    if(Object.keys(updates).length){
      const {error} = await supabase.from("tasks").update(updates).eq("id",t.id);
      if(error) console.error(`  ❌ task ${t.id}: ${error.message}`);
      else taskFixed++;
    }
  }
  console.log(`\n✓ Fixed ${taskFixed} task(s)`);

  // 3. Fix projects — assigned_users array (usernames)
  const {data:projects} = await supabase.from("projects").select("id,name,assigned_users");
  const shivaUsernames = shivaUsers.map(u=>u.username).filter(Boolean);
  // Also get canonical user's username
  const {data:sivaUser} = await supabase.from("users").select("username").ilike("name","Siva Kumar").single();
  const canonicalUsername = sivaUser?.username || "siva_kumar";
  console.log(`Canonical username: ${canonicalUsername}`);

  let projFixed = 0;
  for(const p of projects||[]){
    const arr = p.assigned_users || [];
    const needsFix = arr.some(u => shivaUsernames.includes(u) || VARIANTS.map(v=>v.toLowerCase()).includes((u||"").toLowerCase()));
    if(needsFix){
      const updated = [...new Set(arr.map(u => {
        if(shivaUsernames.includes(u) || VARIANTS.map(v=>v.toLowerCase()).includes((u||"").toLowerCase()))
          return canonicalUsername;
        return u;
      }))];
      const {error} = await supabase.from("projects").update({assigned_users:updated}).eq("id",p.id);
      if(error) console.error(`  ❌ project "${p.name}": ${error.message}`);
      else { console.log(`  ✓ Fixed project: ${p.name}`); projFixed++; }
    }
  }
  console.log(`\n✓ Fixed ${projFixed} project(s)`);

  console.log("\n=== Done — all Shiva data merged into Siva Kumar ===");
}

main().catch(e=>console.error("FATAL:",e));
