// Fix: create Adela II project + its 1 task that failed due to schema cache error
const { createClient } = require("@supabase/supabase-js");
const SUPA_URL = "https://xypcbioltukahipkqqzc.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGNiaW9sdHVrYWhpcGtxcXpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0MzEzNjUsImV4cCI6MjA5NTAwNzM2NX0.DG5sv2bpx8j3Mmz0mqIsoDVaCMP2TmWqh-OQUfSZFRw";
const supabase = createClient(SUPA_URL, SUPA_KEY);

async function run() {
  // Get or create project (without 'status' field to avoid schema cache issue)
  let { data: projects } = await supabase.from("projects").select("id,name,client");
  let proj = (projects || []).find(p =>
    p.name.toLowerCase() === "adela ii" && (p.client||"").toLowerCase() === "formcrete"
  );
  if (!proj) {
    const { data, error } = await supabase.from("projects")
      .insert({ name: "Adela II", client: "Formcrete", color: "#6366f1" })
      .select("id").single();
    if (error) { console.error("Project create failed:", error.message); process.exit(1); }
    proj = data;
    console.log("✓ Created project: Adela II (id:", proj.id, ")");
  } else {
    console.log("✓ Project exists: Adela II (id:", proj.id, ")");
  }

  // Check if task exists
  const { data: existing } = await supabase.from("tasks")
    .select("id").eq("title", "slabs markups").eq("project_id", proj.id).maybeSingle();

  if (existing) {
    const { error } = await supabase.from("tasks")
      .update({ status: "Not Yet Started", client: "Formcrete" }).eq("id", existing.id);
    console.log(error ? "✗ Update failed: " + error.message : "↺ UPDATED: slabs markups");
  } else {
    const { error } = await supabase.from("tasks").insert({
      title: "slabs markups", project_id: proj.id, client: "Formcrete",
      status: "Not Yet Started", assignee: null, detailer: null,
      checker: null, client_sub_date: null, due_date: null,
    });
    console.log(error ? "✗ Insert failed: " + error.message : "✚ CREATED: slabs markups");
  }
}
run().catch(e => { console.error(e); process.exit(1); });
