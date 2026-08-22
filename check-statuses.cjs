const { createClient } = require("@supabase/supabase-js");
const sb = createClient(
  "https://xypcbioltukahipkqqzc.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGNiaW9sdHVrYWhpcGtxcXpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTQzMTM2NSwiZXhwIjoyMDk1MDA3MzY1fQ.AoLxjBk3MR3_qjsCP50xzbyx7cp_kaQlVmN_eP_xuYU"
);
async function run() {
  let all = [], from = 0;
  while (true) {
    const { data } = await sb.from("tasks").select("id,status,client").range(from, from+999);
    if (!data || !data.length) break;
    all = all.concat(data);
    if (data.length < 1000) break;
    from += 1000;
  }
  console.log(`Total tasks: ${all.length}`);
  const VALID = new Set(["Completed","In Progress","Not Yet Started","On Hold"]);
  const counts = {};
  all.forEach(t => { counts[t.status] = (counts[t.status]||0)+1; });
  console.log("\nAll statuses in DB:");
  Object.entries(counts).sort((a,b)=>b[1]-a[1]).forEach(([s,c])=>{
    const flag = VALID.has(s) ? "✓" : "⚠ INVALID";
    console.log(`  ${flag.padEnd(10)} "${s}" — ${c} tasks`);
  });
  const invalid = all.filter(t => !VALID.has(t.status));
  if (invalid.length) {
    console.log(`\nInvalid status tasks by client:`);
    const byClient = {};
    invalid.forEach(t => { byClient[t.client] = (byClient[t.client]||0)+1; });
    Object.entries(byClient).forEach(([c,n])=>console.log(`  ${c}: ${n}`));
  }
}
run().catch(console.error);
