const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");

const supabase = createClient(
  "https://xypcbioltukahipkqqzc.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGNiaW9sdHVrYWhpcGtxcXpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0MzEzNjUsImV4cCI6MjA5NTAwNzM2NX0.DG5sv2bpx8j3Mmz0mqIsoDVaCMP2TmWqh-OQUfSZFRw"
);

async function main() {
  const { data, error } = await supabase
    .from("projects")
    .select("id, name, client, created_at")
    .order("client")
    .order("name")
    .order("created_at");

  if (error) { fs.writeFileSync("projects-result.json", JSON.stringify({ error })); return; }

  const formcrete = data.filter(p => p.client?.toLowerCase().includes("formcrete"));
  const whitecap  = data.filter(p => p.client?.toLowerCase().includes("white") || p.client?.toLowerCase().includes("whitecap"));

  const result = { formcrete, whitecap };
  fs.writeFileSync("projects-result.json", JSON.stringify(result, null, 2));
  console.log("Done. formcrete:", formcrete.length, "whitecap:", whitecap.length);
}
main();
