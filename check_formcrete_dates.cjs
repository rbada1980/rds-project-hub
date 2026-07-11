// check_formcrete_dates.cjs — diagnose what years are in local DB + Supabase

const { Pool } = require("pg");

const SUPABASE_URL = "https://xypcbioltukahipkqqzc.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGNiaW9sdHVrYWhpcGtxcXpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0MzEzNjUsImV4cCI6MjA5NTAwNzM2NX0.DG5sv2bpx8j3Mmz0mqIsoDVaCMP2TmWqh-OQUfSZFRw";

const pool = new Pool({
  host: "localhost", port: 5432, database: "rds_local",
  user: "postgres", password: "rds2026",
  options: "-c timezone=UTC"
});

async function main() {
  // ── Local DB ──
  console.log("=== LOCAL DB ===");
  const r1 = await pool.query(`
    SELECT LEFT(due_date::text, 4) as yr, COUNT(*) as cnt
    FROM tasks WHERE LOWER(COALESCE(client,'')) LIKE '%formcrete%'
      AND due_date IS NOT NULL
    GROUP BY yr ORDER BY yr
  `);
  console.log("Due date years:", r1.rows.map(r => r.yr + ":" + r.cnt).join("  "));

  const r2 = await pool.query(`
    SELECT title, due_date::text, client_sub_date::text
    FROM tasks WHERE LOWER(COALESCE(client,'')) LIKE '%formcrete%'
      AND due_date IS NOT NULL
      AND LEFT(due_date::text,4)::int < 2025
    LIMIT 10
  `);
  console.log("Bad due_date tasks:", r2.rows.length);
  r2.rows.forEach(t => console.log("  ", t.title?.slice(0,45), "|", t.due_date));

  const r3 = await pool.query(`
    SELECT title, due_date::text, client_sub_date::text
    FROM tasks WHERE LOWER(COALESCE(client,'')) LIKE '%formcrete%'
      AND client_sub_date IS NOT NULL
      AND LEFT(client_sub_date::text,4)::int < 2025
    LIMIT 10
  `);
  console.log("Bad client_sub_date tasks:", r3.rows.length);
  r3.rows.forEach(t => console.log("  ", t.title?.slice(0,45), "|", t.client_sub_date));

  await pool.end();

  // ── Supabase ──
  console.log("\n=== SUPABASE ===");
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/tasks?client=eq.Formcrete&select=id,title,due_date,client_sub_date&limit=2000`,
    { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
  );
  const tasks = await res.json();
  console.log("Total Formcrete tasks:", tasks.length);

  const years = {};
  const bad = [];
  for (const t of tasks) {
    if (t.due_date) {
      const y = String(t.due_date).slice(0, 4);
      years[y] = (years[y] || 0) + 1;
      if (parseInt(y) < 2025) bad.push({ title: t.title, date: t.due_date });
    }
  }
  console.log("Due date year distribution:", JSON.stringify(years));
  console.log("Bad dates (year < 2025):", bad.length);
  bad.slice(0, 10).forEach(t => console.log("  ", t.title?.slice(0, 45), "|", t.date));

  // Also check distinct client values
  const res2 = await fetch(
    `${SUPABASE_URL}/rest/v1/tasks?select=client&limit=2000`,
    { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
  );
  const allTasks = await res2.json();
  const clients = {};
  for (const t of allTasks) {
    const c = t.client || "(null)";
    if (c.toLowerCase().includes("formcrete")) clients[c] = (clients[c]||0)+1;
  }
  console.log("\nFormcrete client variants:", JSON.stringify(clients));
}

main().catch(e => { console.error(e.message); pool.end(); });
