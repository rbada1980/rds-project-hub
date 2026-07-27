// Fix ALL client_sub_date values across entire app — shift +1 day
// Root cause: Excel import used toISOString() (UTC) instead of local IST date methods
// Batches by date value to minimise API calls (one update per unique date, not per task)

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
    // ── 1. Supabase: fetch all tasks with client_sub_date ──────────────────
    log("=== Fixing ALL client_sub_date values in Supabase (+1 day) ===");
    let all = [];
    let from = 0;
    while (true) {
      const { data, error } = await supabase.from("tasks")
        .select("id,client_sub_date")
        .not("client_sub_date", "is", null)
        .range(from, from + 999);
      if (error) { log("FETCH ERR: " + error.message); break; }
      if (!data || data.length === 0) break;
      all = all.concat(data);
      if (data.length < 1000) break;
      from += 1000;
    }
    log("Total tasks with client_sub_date: " + all.length);

    // Group by current date value
    const byDate = {};
    for (const t of all) {
      const cur = String(t.client_sub_date).slice(0, 10);
      if (!byDate[cur]) byDate[cur] = [];
      byDate[cur].push(t.id);
    }
    log("Unique dates: " + Object.keys(byDate).length);

    // One Supabase call per unique date (not per task)
    let totalFixed = 0;
    for (const [cur, ids] of Object.entries(byDate).sort()) {
      const d = new Date(cur + "T00:00:00Z");
      d.setUTCDate(d.getUTCDate() + 1);
      const newDate = d.toISOString().slice(0, 10);

      const { error } = await supabase.from("tasks")
        .update({ client_sub_date: newDate })
        .in("id", ids);

      if (error) {
        log(`  ERR ${cur} → ${newDate}: ${error.message}`);
      } else {
        log(`  ${cur} → ${newDate}  (${ids.length} tasks)`);
        totalFixed += ids.length;
      }
    }
    log("Supabase total fixed: " + totalFixed);

    // ── 2. Local PostgreSQL: single query for all ──────────────────────────
    log("\n=== Fixing local PostgreSQL ===");
    const pg = await pool.query(`
      UPDATE tasks
      SET client_sub_date = (client_sub_date::date + INTERVAL '1 day')::date,
          updated_at = NOW()
      WHERE client_sub_date IS NOT NULL
      RETURNING id
    `);
    log("Local PG fixed: " + pg.rowCount + " rows");

    // ── 3. Verify today ────────────────────────────────────────────────────
    log("\n=== Tasks due today (2026-07-27) ===");
    const { data: todayTasks } = await supabase.from("tasks")
      .select("title,client_sub_date,project_id")
      .eq("client_sub_date", "2026-07-27");
    log("Count: " + (todayTasks?.length || 0));
    (todayTasks || []).forEach(t => log("  " + t.title));

  } catch (err) {
    log("FATAL: " + err.message + "\n" + err.stack);
  } finally {
    await pool.end();
  }

  fs.writeFileSync(path.join(__dirname, "fix-all-dates-log.txt"), lines.join("\n") + "\n");
}

main();
