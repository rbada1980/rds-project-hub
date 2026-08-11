// query-formcrete-db.cjs — fetches all Formcrete projects+tasks from Supabase
const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

const sb = createClient(
  "https://xypcbioltukahipkqqzc.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGNiaW9sdHVrYWhpcGtxcXpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTQzMTM2NSwiZXhwIjoyMDk1MDA3MzY1fQ.AoLxjBk3MR3_qjsCP50xzbyx7cp_kaQlVmN_eP_xuYU"
);

async function main() {
  console.log("Fetching Formcrete projects...");
  const { data: projects, error: pe } = await sb
    .from("projects").select("id,name").eq("client","Formcrete").order("name");
  if (pe) { console.error("Error:", pe.message); process.exit(1); }
  console.log("Projects found:", projects.length);

  const projMap = Object.fromEntries(projects.map(p => [p.id, p.name]));
  const ids = projects.map(p => p.id);

  let tasks = [];
  for (let i = 0; i < ids.length; i += 50) {
    const chunk = ids.slice(i, i + 50);
    let from = 0;
    while (true) {
      const { data, error } = await sb.from("tasks")
        .select("id,project_id,title,status,detailer,checker,client_sub_date")
        .in("project_id", chunk)
        .range(from, from + 999);
      if (error || !data || !data.length) break;
      tasks = tasks.concat(data);
      if (data.length < 1000) break;
      from += 1000;
    }
  }
  console.log("Total tasks:", tasks.length);

  const byProj = {};
  tasks.forEach(t => {
    const n = projMap[t.project_id] || "?";
    if (!byProj[n]) byProj[n] = [];
    byProj[n].push(t);
  });

  const out = {
    projects: projects.map(p => ({ id: p.id, name: p.name })),
    totalTasks: tasks.length,
    byProject: Object.fromEntries(
      Object.entries(byProj).map(([n, ts]) => [n, ts.length])
    ),
    tasks: tasks.map(t => ({
      id: t.id,
      project: projMap[t.project_id] || t.project_id,
      title: t.title,
      status: t.status,
      detailer: t.detailer,
      checker: t.checker,
      sub: t.client_sub_date
    }))
  };

  const outFile = path.join(__dirname, "formcrete-db-result.json");
  fs.writeFileSync(outFile, JSON.stringify(out, null, 2));
  console.log("DONE. Result saved to formcrete-db-result.json");
  console.log("Projects:", projects.length, "| Tasks:", tasks.length);
  Object.entries(byProj).sort((a,b)=>b[1].length-a[1].length)
    .forEach(([n,ts]) => console.log("  " + n + ": " + ts.length));
}
main().catch(e => { console.error("FATAL:", e.message); process.exit(1); });
