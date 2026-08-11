// fix-bird-arts-tasks.cjs
// Fixes wrong dates & missing checker for Bird Arts tasks in Supabase + local PG
// Run: node fix-bird-arts-tasks.cjs

const { createClient } = require("@supabase/supabase-js");
const { Pool } = require("pg");

const sb = createClient(
  "https://xypcbioltukahipkqqzc.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGNiaW9sdHVrYWhpcGtxcXpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTQzMTM2NSwiZXhwIjoyMDk1MDA3MzY1fQ.AoLxjBk3MR3_qjsCP50xzbyx7cp_kaQlVmN_eP_xuYU"
);
const pool = new Pool({
  host:"localhost", port:5432, database:"rds_local", user:"postgres", password:"rds2026"
});

async function main() {
  // 1. Find Bird Arts project
  const { data: projs } = await sb.from("projects").select("id,name").eq("client","Formcrete").ilike("name","Bird Arts");
  if (!projs || projs.length === 0) {
    console.log("❌ Bird Arts project not found in Formcrete");
    // Try across all clients
    const { data: all } = await sb.from("projects").select("id,name,client").ilike("name","Bird Arts");
    console.log("All Bird Arts projects:", JSON.stringify(all));
    await pool.end(); return;
  }
  console.log("Found projects:", JSON.stringify(projs));

  // 2. Fetch all tasks under Bird Arts
  const projIds = projs.map(p=>p.id);
  const { data: tasks } = await sb.from("tasks").select("id,title,project_id,due_date,client_sub_date,checker,assignee,detailer").in("project_id", projIds);
  console.log(`\nBird Arts tasks (${tasks?.length||0}):`);
  (tasks||[]).forEach(t=>console.log(`  [${t.id}] "${t.title}" due=${t.due_date} sub=${t.client_sub_date} checker=${t.checker}`));

  // 3. Fix each task's dates by shifting +1 day if they look off (IST timezone correction)
  //    Also set checker=Kameswari where currently null
  let fixed = 0;
  for (const t of (tasks||[])) {
    const patch = {};

    // The "2nd floor slab & beams" should be 28-08-2026
    // If due_date ends in wrong day, shift +1
    if (t.due_date) {
      const d = new Date(t.due_date + "T00:00:00Z"); // parse as UTC
      // Check if IST date is different from stored date
      const istDate = d.toLocaleDateString("en-CA", {timeZone:"Asia/Kolkata"});
      if (istDate !== t.due_date) {
        console.log(`\n  ⚠ due_date IST mismatch: stored=${t.due_date} IST=${istDate} -> fixing to ${istDate}`);
        patch.due_date = istDate;
      }
    }
    if (t.client_sub_date) {
      const d = new Date(t.client_sub_date + "T00:00:00Z");
      const istDate = d.toLocaleDateString("en-CA", {timeZone:"Asia/Kolkata"});
      if (istDate !== t.client_sub_date) {
        console.log(`  ⚠ client_sub_date IST mismatch: stored=${t.client_sub_date} IST=${istDate} -> fixing to ${istDate}`);
        patch.client_sub_date = istDate;
      }
    }

    // Specific fix for "2nd floor slab & beams" — user confirmed 28-08-2026
    if (t.title.toLowerCase().includes("2nd floor slab") && t.due_date === "2026-08-27") {
      console.log(`\n  🔧 Fixing "2nd floor slab & beams" due_date: 2026-08-27 → 2026-08-28`);
      patch.due_date = "2026-08-28";
    }
    if (t.title.toLowerCase().includes("2nd floor slab") && t.client_sub_date === "2026-08-14") {
      patch.client_sub_date = "2026-08-15";
    }

    // Set checker if missing
    if (!t.checker) {
      if (t.title.toLowerCase().includes("2nd floor slab") || t.title.toLowerCase().includes("3rd floor slab")) {
        console.log(`  🔧 Setting checker=Kameswari for "${t.title}"`);
        patch.checker = "Kameswari";
      }
    }

    if (Object.keys(patch).length > 0) {
      const { error } = await sb.from("tasks").update(patch).eq("id", t.id);
      if (error) { console.error(`  ❌ Update failed:`, error.message); }
      else {
        try {
          const sets = Object.keys(patch).map((k,i)=>`${k}=$${i+2}`).join(",");
          await pool.query(`UPDATE tasks SET ${sets} WHERE id=$1`, [t.id, ...Object.values(patch)]);
        } catch(_) {}
        console.log(`  ✅ Updated task [${t.id}]`);
        fixed++;
      }
    }
  }

  console.log(`\n✅ Done — ${fixed} task(s) fixed`);
  await pool.end();
}

main().catch(e=>{ console.error("FATAL:", e.message); process.exit(1); });
