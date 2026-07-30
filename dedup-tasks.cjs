// Finds and deletes duplicate tasks (same project_id + title) across all clients
// Keeps the row with the latest updated_at; deletes the rest from Supabase + local PG
const { createClient } = require("@supabase/supabase-js");
const { Pool } = require("pg");

const supabase = createClient(
  "https://xypcbioltukahipkqqzc.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGNiaW9sdHVrYWhpcGtxcXpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTQzMTM2NSwiZXhwIjoyMDk1MDA3MzY1fQ.AoLxjBk3MR3_qjsCP50xzbyx7cp_kaQlVmN_eP_xuYU"
);
const pool = new Pool({ host:"localhost", port:5432, database:"rds_local", user:"postgres", password:"rds2026" });

function log(msg) { console.log(msg); }

async function main() {
  log("Fetching all tasks from Supabase...");

  // Fetch all tasks (paginate in batches of 1000)
  let allTasks = [];
  let from = 0;
  const PAGE = 1000;
  while (true) {
    const { data, error } = await supabase
      .from("tasks")
      .select("id,title,project_id,status,updated_at,due_date,client_sub_date")
      .range(from, from + PAGE - 1)
      .order("updated_at", { ascending: false });
    if (error) { log("ERR fetching tasks: " + error.message); break; }
    if (!data || data.length === 0) break;
    allTasks = allTasks.concat(data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  log("Total tasks in DB: " + allTasks.length);

  // Group by project_id + normalised title
  const groups = {};
  for (const t of allTasks) {
    const key = t.project_id + "||" + t.title.trim().toLowerCase();
    if (!groups[key]) groups[key] = [];
    groups[key].push(t);
  }

  // Find groups with duplicates
  const dupGroups = Object.values(groups).filter(g => g.length > 1);
  log("Duplicate groups found: " + dupGroups.length);

  if (dupGroups.length === 0) {
    log("No duplicates — nothing to do.");
    await pool.end();
    return;
  }

  let deleted = 0;
  let errors  = 0;

  for (const group of dupGroups) {
    // Sort by updated_at descending — keep the first (most recent)
    group.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
    const keep    = group[0];
    const remove  = group.slice(1);
    const removeIds = remove.map(t => t.id);

    log(`\nKEEP  [${keep.id}] "${keep.title}" | ${keep.status} | updated: ${keep.updated_at}`);
    for (const r of remove) {
      log(`  DEL [${r.id}] "${r.title}" | ${r.status} | updated: ${r.updated_at} | due: ${r.due_date}`);
    }

    // Delete from Supabase
    const { error: delErr } = await supabase
      .from("tasks")
      .delete()
      .in("id", removeIds);

    if (delErr) {
      log("  ERR Supabase delete: " + delErr.message);
      errors++;
      continue;
    }

    // Delete from local PG
    try {
      const res = await pool.query(
        `DELETE FROM tasks WHERE id = ANY($1::uuid[])`,
        [removeIds]
      );
      log(`  Supabase: deleted ${removeIds.length} | PG: deleted ${res.rowCount}`);
    } catch(pgE) {
      log("  PG delete warn: " + pgE.message);
    }

    deleted += removeIds.length;
  }

  log("\n=== Summary ===");
  log("Duplicate groups: " + dupGroups.length);
  log("Rows deleted:     " + deleted);
  log("Errors:           " + errors);
  log("\nDone. Run check-overdue.cjs to verify the new count.");

  await pool.end();
}

main().catch(e => { log("FATAL: " + e.message); pool.end(); process.exit(1); });
