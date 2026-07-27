const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");

const supabase = createClient(
  "https://xypcbioltukahipkqqzc.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGNiaW9sdHVrYWhpcGtxcXpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTQzMTM2NSwiZXhwIjoyMDk1MDA3MzY1fQ.AoLxjBk3MR3_qjsCP50xzbyx7cp_kaQlVmN_eP_xuYU"
);

async function main() {
  // Get Formcrete projects
  const { data: projects } = await supabase.from("projects").select("id,name,client").eq("client","Formcrete").order("name");
  console.log("FORMCRETE PROJECTS:", projects.length);

  // Get all tasks for these projects
  const pids = projects.map(p => p.id);
  const { data: tasks } = await supabase.from("tasks").select("id,title,status,assignee,detailer,checker,client_sub_date,project_id").in("project_id", pids).order("project_id").order("title");

  console.log("TOTAL TASKS:", tasks.length);

  // Group by project
  const byProject = {};
  for (const p of projects) byProject[p.id] = { name: p.name, tasks: [] };
  for (const t of tasks) if (byProject[t.project_id]) byProject[t.project_id].tasks.push(t);

  const out = Object.values(byProject).map(p => ({
    project: p.name,
    taskCount: p.tasks.length,
    sampleTitles: p.tasks.slice(0,3).map(t => t.title)
  }));

  fs.writeFileSync("formcrete-tasks.json", JSON.stringify({ projects, tasks, summary: out }, null, 2));
  console.log(JSON.stringify(out, null, 2));
}
main();
