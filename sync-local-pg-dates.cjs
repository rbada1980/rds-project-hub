// Sync client_sub_date from Supabase → local PostgreSQL
// Fetches ALL tasks' dates from Supabase and updates local PG to match

const { createClient } = require("@supabase/supabase-js");
const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

const supabase = createClient(
  "https://xypcbioltukahipkqqzc.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGNiaW9sdHVrYWhpcGtxcXpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTQzMTM2NSwiZXhwIjoyMDk1MDA3MzY1fQ.AoLxjBk3MR3_qjsCP50xzbyx7cp_kaQlVmN_eP_xuYU"
);
const pool = new Pool({ host:"localhost", port:5432, database:"rds_local", user:"postgres", password:"rds2026" });

const lines = [];
function log(msg) { process.stdout.write(msg + "\n"); lines.push(msg); }

async function main() {
  try {
    log("=== Syncing client_sub_date from Supabase → local PG ===");

    // Fetch all tasks from Supabase (paginated)
    let all = [];
    let from = 0;
    while (true) {
      const { data, error } = await supabase.from("tasks")
        .select("id,client_sub_date")
        .range(from, from + 999);
      if (error) { log("FETCH ERR: " + error.message); break; }
      if (!data || data.length === 0) break;
      all = all.concat(data);
      if (data.length < 1000) break;
      from += 1000;
    }
    log("Total tasks from Supabase: " + all.length);

    // Group by date value for batch updates
    const withDate = all.filter(t => t.client_sub_date);
    const withNull = all.filter(t => !t.client_sub_date);
    log("Tasks with date: " + withDate.length + ", without: " + withNull.length);

    // Update local PG — batch by date value
    const byDate = {};
    for (const t of withDate) {
      const d = String(t.client_sub_date).slice(0, 10);
      if (!byDate[d]) byDate[d] = [];
      byDate[d].push(t.id);
    }

    let fixed = 0;
    for (const [date, ids] of Object.entries(byDate).sort()) {
      const result = await pool.query(
        `UPDATE tasks SET client_sub_date = $1, updated_at = NOW() WHERE id = ANY($2::uuid[]) RETURNING id`,
        [date, ids]
      );
      log(`  ${date}: ${result.rowCount} rows updated`);
      fixed += result.rowCount;
    }

    // Null out tasks with no date
    if (withNull.length > 0) {
      const nullIds = withNull.map(t => t.id);
      const result = await pool.query(
        `UPDATE tasks SET client_sub_date = NULL, updated_at = NOW() WHERE id = ANY($1::uuid[]) AND client_sub_date IS NOT NULL RETURNING id`,
        [nullIds]
      );
      log("Cleared date for " + result.rowCount + " tasks (now null)");
    }

    log("\nTotal local PG updated: " + fixed);

    // Verify today
    const pgToday = await pool.query(
      `SELECT COUNT(*) FROM tasks WHERE client_sub_date = '2026-07-27'`
    );
    log("Local PG tasks due 2026-07-27: " + pgToday.rows[0].count);

    const { data: supa27 } = await supabase.from("tasks")
      .select("id,title").eq("client_sub_date", "2026-07-27");
    log("Supabase tasks due 2026-07-27: " + (supa27?.length || 0));
    (supa27 || []).forEach(t => log("  " + t.title));

  } catch (err) {
    log("FATAL: " + err.message + "\n" + err.stack);
  } finally {
    await pool.end();
  }
  try {
    fs.writeFileSync(path.join(__dirname, "sync-local-pg-result.txt"), lines.join("\n") + "\n");
  } catch(e) { /* ignore EBUSY */ }
}

main();
