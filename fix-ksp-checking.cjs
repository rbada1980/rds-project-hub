// Fix: set "LRC Building GA & Details (Checking)" to Completed in both Supabase and local PG
const { createClient } = require("@supabase/supabase-js");
const { Pool } = require("pg");

const supabase = createClient(
  "https://xypcbioltukahipkqqzc.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGNiaW9sdHVrYWhpcGtxcXpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTQzMTM2NSwiZXhwIjoyMDk1MDA3MzY1fQ.AoLxjBk3MR3_qjsCP50xzbyx7cp_kaQlVmN_eP_xuYU"
);
const pool = new Pool({ host:"localhost", port:5432, database:"rds_local", user:"postgres", password:"rds2026" });

async function main() {
  const TITLE = "LRC Building GA & Details (Checking)";
  const PROJECT_ID = "5e624ee4-9daa-46ca-9dda-12fa51d3e927"; // LRC Building

  // 1. Get current state from Supabase
  const { data: tasks } = await supabase.from("tasks")
    .select("id,title,status")
    .eq("project_id", PROJECT_ID)
    .ilike("title", TITLE);

  if (!tasks || tasks.length === 0) {
    console.log("ERROR: Task not found in Supabase");
    return;
  }

  const task = tasks[0];
  console.log(`Found: "${task.title}" | current status: ${task.status}`);

  // 2. Update Supabase
  const { error } = await supabase.from("tasks")
    .update({ status: "Completed", updated_at: new Date().toISOString() })
    .eq("id", task.id);

  if (error) {
    console.log("ERR Supabase update:", error.message);
  } else {
    console.log("Supabase: UPDATED to Completed ✓");
  }

  // 3. Update local PG
  try {
    const res = await pool.query(
      `UPDATE tasks SET status='Completed', updated_at=NOW() WHERE id=$1`,
      [task.id]
    );
    console.log("Local PG: UPDATED to Completed ✓ (rows affected:", res.rowCount + ")");
  } catch(pgE) {
    console.log("Local PG error:", pgE.message);
  }

  // 4. Verify Supabase
  const { data: verify } = await supabase.from("tasks")
    .select("title,status")
    .eq("id", task.id);
  console.log("\nVerify Supabase:", verify?.[0]?.status);

  await pool.end();
}
main().catch(e => { console.error("FATAL:", e.message); pool.end(); });
