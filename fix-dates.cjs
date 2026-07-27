// Fix client_sub_date: all dates are stored 1 day early due to IST->UTC offset bug
// Shifts every non-null client_sub_date by +1 day in both Supabase and local PG

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
    // ── 1. Fix Supabase ─────────────────────────────────────────────────────
    log("=== Fixing Supabase ===");

    // Fetch all tasks with non-null client_sub_date
    let all = [];
    let from = 0;
    while (true) {
      const { data, error } = await supabase.from("tasks")
        .select("id,title,client_sub_date")
        .not("client_sub_date", "is", null)
        .range(from, from + 999);
      if (error) { log("FETCH ERROR: " + error.message); break; }
      if (!data || data.length === 0) break;
      all = all.concat(data);
      if (data.length < 1000) break;
      from += 1000;
    }
    log("Tasks with client_sub_date in Supabase: " + all.length);

    // Show sample of current dates
    log("Sample current dates:");
    all.slice(0, 5).forEach(t => log("  " + t.title.slice(0,40) + " → " + t.client_sub_date));

    // Shift each date +1 day
    let fixed = 0, errors = 0;
    for (const t of all) {
      const d = new Date(t.client_sub_date + "T00:00:00Z");
      d.setUTCDate(d.getUTCDate() + 1);
      const newDate = d.toISOString().slice(0, 10);
      const { error } = await supabase.from("tasks").update({ client_sub_date: newDate }).eq("id", t.id);
      if (error) { log("ERR " + t.id + ": " + error.message); errors++; }
      else fixed++;
    }
    log("Supabase fixed: " + fixed + " | errors: " + errors);

    // ── 2. Fix local PostgreSQL ─────────────────────────────────────────────
    log("\n=== Fixing local PostgreSQL ===");
    const result = await pool.query(`
      UPDATE tasks
      SET client_sub_date = (client_sub_date::date + INTERVAL '1 day')::date
      WHERE client_sub_date IS NOT NULL
      RETURNING id
    `);
    log("Local PG fixed: " + result.rowCount + " rows");

    // ── 3. Verify ────────────────────────────────────────────────────────────
    log("\n=== Verification (today = 2026-07-27) ===");
    const { data: todayTasks } = await supabase.from("tasks")
      .select("title,client_sub_date")
      .eq("client_sub_date", "2026-07-27");
    log("Tasks due today in Supabase: " + (todayTasks?.length || 0));
    (todayTasks || []).forEach(t => log("  " + t.title));

  } catch (err) {
    log("FATAL: " + err.message + "\n" + err.stack);
  } finally {
    await pool.end();
  }

  fs.writeFileSync(path.join(__dirname, "fix-dates-log.txt"), lines.join("\n") + "\n");
}

main();
