// DEBUG SCRIPT — Run: node debug_users.cjs
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(
  "https://xypcbioltukahipkqqzc.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGNiaW9sdHVrYWhpcGtxcXpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0MzEzNjUsImV4cCI6MjA5NTAwNzM2NX0.DG5sv2bpx8j3Mmz0mqIsoDVaCMP2TmWqh-OQUfSZFRw"
);

async function main() {
  console.log("══════════════════════════════════════");
  console.log(" USER DEBUG SCRIPT");
  console.log("══════════════════════════════════════\n");

  // 1. Show ALL users in DB
  const { data: allUsers, error: ae } = await sb.from("users").select("id,name,username,role").order("name");
  if (ae) { console.log("❌ Cannot fetch users:", ae.message); return; }
  console.log("ALL USERS IN DB (" + allUsers.length + " total):");
  allUsers.forEach(u => console.log(`  id:${u.id} | name:"${u.name}" | username:"${u.username}" | role:${u.role}`));

  // 2. Check each target username
  const targets = ["divya","siva","akash","naidu"];
  console.log("\nCHECKING TARGET USERNAMES:");
  for (const un of targets) {
    const { data: r } = await sb.from("users").select("id,name,username").eq("username", un);
    if (r && r.length > 0) console.log(`  @${un} → EXISTS: name="${r[0].name}" id=${r[0].id}`);
    else console.log(`  @${un} → NOT FOUND`);
  }

  // 3. Try inserting each user and show exact error
  console.log("\nTRYING TO INSERT ALL 4 USERS:");
  const users = [
    { name:"Divya", username:"divya", password:"RDSTechserv@2026", role:"User", client_name:"", email:"" },
    { name:"siva",  username:"siva",  password:"RDSTechserv@2026", role:"User", client_name:"", email:"" },
    { name:"Akash", username:"akash", password:"RDSTechserv@2026", role:"User", client_name:"", email:"" },
    { name:"Naidu", username:"naidu", password:"RDSTechserv@2026", role:"User", client_name:"", email:"" },
  ];
  for (const u of users) {
    const { data, error } = await sb.from("users").insert(u).select().single();
    if (error) {
      console.log(`  ❌ "${u.name}" (@${u.username}): ${error.message}`);
      console.log(`     code:${error.code} | details:${error.details} | hint:${error.hint}`);
    } else {
      console.log(`  ✓ "${u.name}" created → id:${data.id} @${data.username}`);
    }
  }

  console.log("\n══════════════════════════════════════");
  console.log(" Copy and share full output above");
  console.log("══════════════════════════════════════");
}
main().catch(e => console.error("FATAL:", e.message));
