const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(
  "https://xypcbioltukahipkqqzc.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGNiaW9sdHVrYWhpcGtxcXpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTQzMTM2NSwiZXhwIjoyMDk1MDA3MzY1fQ.AoLxjBk3MR3_qjsCP50xzbyx7cp_kaQlVmN_eP_xuYU"
);
async function main() {
  const { data, error } = await supabase.from("tasks").select("title,client_sub_date,project_id").eq("client_sub_date","2026-07-27");
  if(error){ console.log("ERR:",error.message); return; }
  console.log("Tasks due 2026-07-27:", data.length);
  data.slice(0,10).forEach(t => console.log(" -", t.title));
}
main().catch(e=>console.log("FATAL",e.message));
