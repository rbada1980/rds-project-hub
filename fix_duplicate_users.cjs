// fix_duplicate_users.cjs — removes case-duplicate users from DB
const { createClient } = require("@supabase/supabase-js");

const SUPA_URL = "https://xypcbioltukahipkqqzc.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGNiaW9sdHVrYWhpcGtxcXpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0MzEzNjUsImV4cCI6MjA5NTAwNzM2NX0.DG5sv2bpx8j3Mmz0mqIsoDVaCMP2TmWqh-OQUfSZFRw";
const supabase = createClient(SUPA_URL, SUPA_KEY);

async function main(){
  // Fetch all users
  const {data:users,error} = await supabase.from("users").select("id,name,username,role");
  if(error){console.error("Failed to fetch users:",error.message);return;}
  console.log(`Total users: ${users.length}\n`);

  // Group by lowercased name to find duplicates
  const groups = {};
  for(const u of users){
    const key = u.name.toLowerCase().trim();
    if(!groups[key]) groups[key] = [];
    groups[key].push(u);
  }

  // Find groups with more than one user
  const dupes = Object.entries(groups).filter(([,arr])=>arr.length>1);
  if(!dupes.length){console.log("✓ No duplicate users found.");return;}

  console.log(`Found ${dupes.length} duplicate name(s):\n`);

  for(const [key, arr] of dupes){
    console.log(`  Duplicate: "${key}" — ${arr.length} entries`);
    arr.forEach(u=>console.log(`    id:${u.id}  name:"${u.name}"  username:"${u.username}"  role:${u.role}`));

    // Keep the one with proper title case (or the first Admin/Manager, else just first)
    const titleCase = str => str.replace(/\b\w/g,c=>c.toUpperCase());
    const preferred = arr.find(u=>u.name===titleCase(u.name)&&(u.role==="Admin"||u.role==="Manager"))
      || arr.find(u=>u.name===titleCase(u.name))
      || arr[0];

    const toDelete = arr.filter(u=>u.id !== preferred.id);
    console.log(`  → Keeping: "${preferred.name}" (id:${preferred.id})`);

    for(const dup of toDelete){
      // Reassign any tasks assigned to the duplicate → point to preferred user
      const {data:tasks} = await supabase.from("tasks").select("id,assignee,detailer,checker").eq("assignee", dup.name);
      if(tasks?.length){
        for(const t of tasks){
          await supabase.from("tasks").update({assignee: preferred.name}).eq("id",t.id);
        }
        console.log(`  → Reassigned ${tasks.length} tasks from "${dup.name}" to "${preferred.name}"`);
      }

      // Update assigned_users arrays in projects
      const {data:projs} = await supabase.from("projects").select("id,assigned_users");
      for(const p of (projs||[])){
        const arr2 = p.assigned_users||[];
        if(arr2.includes(dup.username)){
          const updated = [...new Set(arr2.map(u=>u===dup.username?preferred.username:u))];
          await supabase.from("projects").update({assigned_users:updated}).eq("id",p.id);
        }
      }

      // Delete the duplicate user
      const {error:de} = await supabase.from("users").delete().eq("id",dup.id);
      if(de) console.error(`  ❌ Could not delete "${dup.name}":`,de.message);
      else   console.log(`  🗑 Deleted duplicate: "${dup.name}" (id:${dup.id})`);
    }
    console.log();
  }

  console.log("=== Done ===");
}

main().catch(e=>console.error("FATAL:",e));
