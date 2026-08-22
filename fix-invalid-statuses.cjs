// fix-invalid-statuses.cjs
// Migrates "In Process" → "In Progress" and "Review" → "In Progress" across all tasks
const { createClient } = require("@supabase/supabase-js");
const sb = createClient(
  "https://xypcbioltukahipkqqzc.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGNiaW9sdHVrYWhpcGtxcXpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTQzMTM2NSwiZXhwIjoyMDk1MDA3MzY1fQ.AoLxjBk3MR3_qjsCP50xzbyx7cp_kaQlVmN_eP_xuYU"
);
async function run() {
  // Fix "In Process" → "In Progress"
  const { data: d1, error: e1 } = await sb.from("tasks")
    .update({ status: "In Progress" }).eq("status", "In Process").select("id");
  if (e1) console.error("Error fixing In Process:", e1.message);
  else console.log(`Fixed "In Process" → "In Progress": ${d1?.length || 0} tasks`);

  // Fix "Review" → "In Progress"
  const { data: d2, error: e2 } = await sb.from("tasks")
    .update({ status: "In Progress" }).eq("status", "Review").select("id");
  if (e2) console.error("Error fixing Review:", e2.message);
  else console.log(`Fixed "Review" → "In Progress": ${d2?.length || 0} tasks`);

  console.log("Done.");
}
run().catch(console.error);
