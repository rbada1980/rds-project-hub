const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(
  "https://xypcbioltukahipkqqzc.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGNiaW9sdHVrYWhpcGtxcXpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTQzMTM2NSwiZXhwIjoyMDk1MDA3MzY1fQ.AoLxjBk3MR3_qjsCP50xzbyx7cp_kaQlVmN_eP_xuYU"
);
async function main() {
  const { data, error } = await supabase.from("projects")
    .select("id,name,client").ilike("name","%alton%");
  if(error){ console.log("ERR:",error.message); return; }
  console.log("Alton project(s):", JSON.stringify(data, null, 2));

  // Also check all distinct client values
  const { data: all } = await supabase.from("projects").select("client");
  const clients = [...new Set((all||[]).map(p=>p.client).filter(Boolean))].sort();
  console.log("All clients:", clients);
}
main().catch(e=>console.log("FATAL",e.message));
