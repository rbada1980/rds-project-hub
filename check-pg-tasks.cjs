const { Client } = require("pg");
const { createClient } = require("@supabase/supabase-js");

const pg = new Client({ host: "localhost", port: 5432, database: "rds_local", user: "postgres", password: "rds2026" });
const sb = createClient(
  "https://xypcbioltukahipkqqzc.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGNiaW9sdHVrYWhpcGtxcXpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTQzMTM2NSwiZXhwIjoyMDk1MDA3MzY1fQ.AoLxjBk3MR3_qjsCP50xzbyx7cp_kaQlVmN_eP_xuYU"
);

async function main() {
  await pg.connect();

  // Local PG counts
  const r1 = await pg.query("SELECT COUNT(*) FROM tasks");
  const r2 = await pg.query("SELECT COUNT(*) FROM tasks WHERE due_date < '2026-07-30' AND status NOT IN ('Done','Completed')");
  console.log("Local PG total tasks:", r1.rows[0].count);
  console.log("Local PG overdue:", r2.rows[0].count);

  // Supabase counts
  let all = [], from = 0;
  while (true) {
    const { data, error } = await sb.from("tasks").select("id,title,due_date,status").range(from, from + 999);
    if (error) { console.log("Supabase ERR:", error.message); break; }
    if (!data || data.length === 0) break;
    all = all.concat(data);
    if (data.length < 1000) break;
    from += 1000;
  }
  const isDone = s => s === "Done" || s === "Completed";
  const sbOverdue = all.filter(t => t.due_date && t.due_date < "2026-07-30" && !isDone(t.status)).length;
  console.log("Supabase total tasks:", all.length);
  console.log("Supabase overdue:", sbOverdue);

  // Find tasks in PG but not in Supabase
  const sbIds = new Set(all.map(t => t.id));
  const pgAll = await pg.query("SELECT id, title, due_date, status FROM tasks");
  const pgIds = new Set(pgAll.rows.map(r => r.id));
  const onlyInPG = pgAll.rows.filter(r => !sbIds.has(r.id));
  const onlyInSB = all.filter(t => !pgIds.has(t.id));

  console.log("\nIn local PG but NOT in Supabase:", onlyInPG.length);
  onlyInPG.slice(0, 10).forEach(r => console.log("  [" + r.id + "]", r.title, "| due:", r.due_date, "| status:", r.status));

  console.log("\nIn Supabase but NOT in local PG:", onlyInSB.length);
  onlyInSB.slice(0, 10).forEach(t => console.log("  [" + t.id + "]", t.title, "| due:", t.due_date, "| status:", t.status));

  await pg.end();
}
main().catch(e => { console.error("FATAL:", e.message); process.exit(1); });
