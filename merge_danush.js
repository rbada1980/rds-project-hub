// Run: node merge_danush.js
// Merges "danush" → "dhanush" across users, tasks (assignee/detailer/checker), and projects (assigned_users)

const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(
  "https://xypcbioltukahipkqqzc.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGNiaW9sdHVrYWhpcGtxcXpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0MzEzNjUsImV4cCI6MjA5NTAwNzM2NX0.DG5sv2bpx8j3Mmz0mqIsoDVaCMP2TmWqh-OQUfSZFRw"
);

async function main() {
  console.log("=== Merging 'danush' → 'dhanush' ===\n");

  // ── 1. Find both user rows ──────────────────────────────────────────────
  const { data: users } = await supabase.from("users").select("*");
  const danush  = users.find(u => (u.name||"").toLowerCase().trim() === "danush"  || (u.username||"").toLowerCase().trim() === "danush");
  const dhanush = users.find(u => (u.name||"").toLowerCase().trim() === "dhanush" || (u.username||"").toLowerCase().trim() === "dhanush");

  console.log("danush  row:", danush  ? `id=${danush.id}  name="${danush.name}"  username="${danush.username}"` : "NOT FOUND");
  console.log("dhanush row:", dhanush ? `id=${dhanush.id} name="${dhanush.name}" username="${dhanush.username}"` : "NOT FOUND");

  // ── 2. Fix task fields: replace any "danush" variant with correct "Dhanush" ──
  const { data: tasks } = await supabase.from("tasks").select("id,title,assignee,detailer,checker");
  const danushPattern = /^danush$/i;

  let tasksFixed = 0;
  for (const t of tasks) {
    const patch = {};
    if (danushPattern.test((t.assignee||"").trim())) patch.assignee = "Dhanush";
    if (danushPattern.test((t.detailer||"").trim())) patch.detailer = "Dhanush";
    if (danushPattern.test((t.checker||"").trim()))  patch.checker  = "Dhanush";
    if (Object.keys(patch).length) {
      const { error } = await supabase.from("tasks").update(patch).eq("id", t.id);
      if (error) console.error(`Task ${t.id} error:`, error.message);
      else { console.log(`  ✓ Task "${t.title}" →`, patch); tasksFixed++; }
    }
  }
  console.log(`\nTasks fixed: ${tasksFixed}`);

  // ── 3. Fix projects.assigned_users array ─────────────────────────────────
  const { data: projects } = await supabase.from("projects").select("id,name,assigned_users");
  let projectsFixed = 0;
  for (const p of projects) {
    const au = p.assigned_users || [];
    const fixed = au.map(u => danushPattern.test((u||"").trim()) ? "dhanush" : u);
    // Also deduplicate (in case both "danush" and "dhanush" were in the array)
    const deduped = [...new Set(fixed)];
    if (JSON.stringify(au) !== JSON.stringify(deduped)) {
      const { error } = await supabase.from("projects").update({ assigned_users: deduped }).eq("id", p.id);
      if (error) console.error(`Project ${p.id} error:`, error.message);
      else { console.log(`  ✓ Project "${p.name}" assigned_users:`, deduped); projectsFixed++; }
    }
  }
  console.log(`Projects fixed: ${projectsFixed}`);

  // ── 4. Fix the users table: rename "danush" row to "Dhanush" ─────────────
  if (danush && dhanush) {
    // Both exist — delete the wrong "danush" row
    const { error } = await supabase.from("users").delete().eq("id", danush.id);
    if (error) console.error("Delete danush user error:", error.message);
    else console.log(`\n✓ Deleted duplicate user row: id=${danush.id} ("${danush.name}")`);

    // Make sure dhanush row has correct capitalisation
    const { error: e2 } = await supabase.from("users").update({ name: "Dhanush", username: "dhanush" }).eq("id", dhanush.id);
    if (e2) console.error("Update dhanush user error:", e2.message);
    else console.log(`✓ Kept dhanush row (id=${dhanush.id}) — name set to "Dhanush"`);

  } else if (danush && !dhanush) {
    // Only wrong row exists — rename it
    const { error } = await supabase.from("users").update({ name: "Dhanush", username: "dhanush" }).eq("id", danush.id);
    if (error) console.error("Rename danush user error:", error.message);
    else console.log(`\n✓ Renamed user row id=${danush.id}: "danush" → "Dhanush"`);

  } else if (!danush && dhanush) {
    console.log("\n✓ Only dhanush row exists (already correct). No user row change needed.");
  } else {
    console.log("\n⚠ Neither 'danush' nor 'dhanush' found in users table by exact name match.");
    console.log("All users:", users.map(u => `${u.name} / ${u.username}`).join(", "));
  }

  console.log("\n=== Done ===");
}

main().catch(console.error);
