const { Pool } = require("pg");
const { createClient } = require("@supabase/supabase-js");

const pool = new Pool({ host:"localhost", port:5432, database:"rds_local", user:"postgres", password:"rds2026" });
const supabase = createClient(
  "https://xypcbioltukahipkqqzc.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGNiaW9sdHVrYWhpcGtxcXpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTQzMTM2NSwiZXhwIjoyMDk1MDA3MzY1fQ.AoLxjBk3MR3_qjsCP50xzbyx7cp_kaQlVmN_eP_xuYU"
);

async function main() {
  // Check local PG
  const pg = await pool.query(`
    SELECT t.title, t.status, t.assignee, t.due_date, t.client_sub_date
    FROM tasks t
    JOIN projects p ON t.project_id = p.id
    WHERE p.client = 'KS&P Limited'
    ORDER BY t.title
  `);
  console.log("=== Local PG (KS&P) ===");
  pg.rows.forEach(r => console.log(`  "${r.title}" | ${r.status} | due=${r.due_date} | sub=${r.client_sub_date}`));

  // Check Supabase
  const { data } = await supabase.from("tasks")
    .select("title,status,due_date,client_sub_date,assignee,projects!inner(client)")
    .eq("projects.client", "KS&P Limited");
  console.log("\n=== Supabase (KS&P) ===");
  (data||[]).forEach(r => console.log(`  "${r.title}" | ${r.status} | due=${r.due_date} | sub=${r.client_sub_date}`));

  await pool.end();
}
main().catch(e => { console.error(e.message); pool.end(); });
