// fix-formcrete-dup-projects.cjs
// Finds duplicate Formcrete projects (same name, different IDs)
// Re-assigns all tasks from the dupe to the original, then deletes the dupe

const { createClient } = require("@supabase/supabase-js");
const { Pool } = require("pg");

const sb = createClient(
  "https://xypcbioltukahipkqqzc.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGNiaW9sdHVrYWhpcGtxcXpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTQzMTM2NSwiZXhwIjoyMDk1MDA3MzY1fQ.AoLxjBk3MR3_qjsCP50xzbyx7cp_kaQlVmN_eP_xuYU"
);

const pool = new Pool({
  host: "localhost", port: 5432, database: "rds_local", user: "postgres", password: "rds2026"
});

async function main() {
  // Fetch all Formcrete projects
  const { data: projects, error } = await sb
    .from("projects")
    .select("id,name,created_at")
    .eq("client", "Formcrete")
    .order("created_at", { ascending: true });

  if (error) { console.error("Fetch error:", error.message); process.exit(1); }

  // Group by name (case-insensitive)
  const byName = {};
  for (const p of projects) {
    const key = p.name.trim().toLowerCase();
    if (!byName[key]) byName[key] = [];
    byName[key].push(p);
  }

  // Find duplicates
  const dupes = Object.entries(byName).filter(([, arr]) => arr.length > 1);
  if (dupes.length === 0) {
    console.log("✅ No duplicate projects found!");
    await pool.end(); return;
  }

  console.log(`⚠  Found ${dupes.length} duplicate project name(s):\n`);
  for (const [name, arr] of dupes) {
    console.log(`  "${arr[0].name}" — ${arr.length} copies:`);
    for (const p of arr) console.log(`    [${p.id}] created ${p.created_at}`);
  }

  // Fix each duplicate group
  for (const [, arr] of dupes) {
    // Keep the oldest (first created), delete the rest
    const [keep, ...remove] = arr;
    console.log(`\n🔧 Keeping [${keep.id}] "${keep.name}"`);

    for (const dup of remove) {
      console.log(`   Removing dupe [${dup.id}]...`);

      // 1. Fetch tasks under the dupe project
      const { data: dupeTasks } = await sb
        .from("tasks")
        .select("id,title")
        .eq("project_id", dup.id);

      console.log(`   → ${(dupeTasks||[]).length} tasks to re-assign`);

      // 2. For each task: check if same title already exists under keep project
      for (const t of (dupeTasks || [])) {
        const { data: existing } = await sb
          .from("tasks")
          .select("id")
          .eq("project_id", keep.id)
          .ilike("title", t.title)
          .maybeSingle();

        if (existing) {
          // Duplicate task too — delete the one under dupe project
          await sb.from("tasks").delete().eq("id", t.id);
          try { await pool.query("DELETE FROM tasks WHERE id=$1", [t.id]); } catch(_) {}
          console.log(`     🗑  Deleted duplicate task: "${t.title}"`);
        } else {
          // Move task to keep project
          await sb.from("tasks").update({ project_id: keep.id }).eq("id", t.id);
          try { await pool.query("UPDATE tasks SET project_id=$1 WHERE id=$2", [keep.id, t.id]); } catch(_) {}
          console.log(`     ✓  Moved task: "${t.title}"`);
        }
      }

      // 3. Delete the duplicate project
      const { error: delErr } = await sb.from("projects").delete().eq("id", dup.id);
      if (delErr) {
        console.error(`   ❌ Failed to delete project [${dup.id}]:`, delErr.message);
      } else {
        try { await pool.query("DELETE FROM projects WHERE id=$1", [dup.id]); } catch(_) {}
        console.log(`   ✅ Deleted duplicate project [${dup.id}]`);
      }
    }
  }

  console.log("\n✅ All duplicates fixed!");
  await pool.end();
}

main().catch(e => { console.error("FATAL:", e.message); process.exit(1); });
