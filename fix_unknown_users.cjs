// fix_unknown_users.cjs
// 1. Reassigns tasks with TBD / Tekla team as assignee/detailer/checker → Narayana
// 2. Deletes unknown user accounts (TBD, Tekla team) from the users table

const { createClient } = require("@supabase/supabase-js");

const SUPA_URL = "https://xypcbioltukahipkqqzc.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGNiaW9sdHVrYWhpcGtxcXpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0MzEzNjUsImV4cCI6MjA5NTAwNzM2NX0.DG5sv2bpx8j3Mmz0mqIsoDVaCMP2TmWqh-OQUfSZFRw";
const supabase = createClient(SUPA_URL, SUPA_KEY);

const UNKNOWN_PATTERNS = ["tbd", "tekla"];

function isUnknown(name) {
  if (!name) return false;
  const n = name.toLowerCase();
  return UNKNOWN_PATTERNS.some(p => n.includes(p));
}

async function main() {
  // ── 1. Find Narayana's display name ──
  const { data: users } = await supabase.from("users").select("id,name,username,role");
  const narayana = users.find(u => (u.name || "").toLowerCase().includes("narayana"));
  if (!narayana) { console.error("Narayana not found in users table!"); return; }
  console.log(`Narayana found: "${narayana.name}" (@${narayana.username})`);

  // ── 2. Find unknown users to delete ──
  const unknownUsers = users.filter(u => isUnknown(u.name) || isUnknown(u.username));
  console.log(`\nUnknown users found: ${unknownUsers.length}`);
  unknownUsers.forEach(u => console.log(`  - "${u.name}" (@${u.username})`));

  // ── 3. Get all tasks ──
  const { data: tasks } = await supabase.from("tasks").select("id,title,assignee,detailer,checker");
  console.log(`\nTotal tasks: ${tasks.length}`);

  let taskUpdated = 0;
  for (const t of tasks) {
    const updates = {};
    if (isUnknown(t.assignee)) updates.assignee = narayana.name;
    if (isUnknown(t.detailer)) updates.detailer = narayana.name;
    if (isUnknown(t.checker))  updates.checker  = narayana.name;
    if (!Object.keys(updates).length) continue;

    const { error } = await supabase.from("tasks").update(updates).eq("id", t.id);
    if (error) {
      console.error(`  x Task "${t.title}":`, error.message);
    } else {
      console.log(`  ok Reassigned "${t.title}" → Narayana (${Object.keys(updates).join(", ")})`);
      taskUpdated++;
    }
  }
  console.log(`\nTasks reassigned to Narayana: ${taskUpdated}`);

  // ── 4. Delete unknown user accounts ──
  let userDeleted = 0;
  for (const u of unknownUsers) {
    const { error } = await supabase.from("users").delete().eq("id", u.id);
    if (error) {
      console.error(`  x Delete "${u.name}":`, error.message);
    } else {
      console.log(`  ok Deleted user "${u.name}" (@${u.username})`);
      userDeleted++;
    }
  }
  console.log(`\nUnknown users deleted: ${userDeleted}`);
  console.log("\n=== Done ===");
}

main().catch(console.error);
