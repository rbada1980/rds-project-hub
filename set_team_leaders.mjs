// Run: node set_team_leaders.js
// Changes:
//   Eswar         Manager → Team Leader
//   Chandra Mouli Manager → Team Leader
//   Kameshwari    (any)   → Team Leader
//   Narayana      stays   Manager

import { createClient } from "@supabase/supabase-js";
const supabase = createClient(
  "https://xypcbioltukahipkqqzc.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGNiaW9sdHVrYWhpcGtxcXpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0MzEzNjUsImV4cCI6MjA5NTAwNzM2NX0.DG5sv2bpx8j3Mmz0mqIsoDVaCMP2TmWqh-OQUfSZFRw"
);

async function main() {
  const { data: users, error } = await supabase.from("users").select("id,name,username,role");
  if (error) { console.error("Fetch error:", error.message); return; }

  console.log("All users:");
  users.forEach(u => console.log(`  ${u.id} | ${u.name} | ${u.username} | ${u.role}`));

  // Names to promote to Team Leader
  const teamLeaderNames = ["eswar", "chandra mouli", "chandramouli", "kameshwari"];

  const toUpdate = users.filter(u =>
    teamLeaderNames.some(n =>
      (u.name || "").toLowerCase().includes(n) ||
      (u.username || "").toLowerCase().includes(n)
    )
  );

  if (!toUpdate.length) {
    console.log("\n⚠ No matching users found for Team Leader update.");
    console.log("Check the names above and adjust teamLeaderNames if needed.");
    return;
  }

  console.log("\nUpdating to Team Leader:");
  for (const u of toUpdate) {
    const { error: e } = await supabase.from("users").update({ role: "Team Leader" }).eq("id", u.id);
    if (e) console.error(`  ✗ ${u.name}: ${e.message}`);
    else console.log(`  ✓ ${u.name} (${u.role} → Team Leader)`);
  }

  // Verify Narayana stays Manager
  const narayana = users.find(u =>
    (u.name || "").toLowerCase().includes("narayana") ||
    (u.username || "").toLowerCase().includes("narayana")
  );
  if (narayana) {
    if (narayana.role !== "Manager") {
      const { error: e } = await supabase.from("users").update({ role: "Manager" }).eq("id", narayana.id);
      if (e) console.error(`  ✗ Narayana: ${e.message}`);
      else console.log(`  ✓ Narayana confirmed as Manager`);
    } else {
      console.log(`  ✓ Narayana already Manager — no change needed`);
    }
  }

  console.log("\n=== Done ===");
}

main().catch(console.error);
