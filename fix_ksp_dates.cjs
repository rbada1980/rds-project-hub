// fix_ksp_dates.cjs
// Clears bad dates (year < 2025) from KS&P Limited tasks
// Also sets client_sub_date = null (no Excel source — staff set manually)

const SUPA_URL = "https://xypcbioltukahipkqqzc.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGNiaW9sdHVrYWhpcGtxcXpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0MzEzNjUsImV4cCI6MjA5NTAwNzM2NX0.DG5sv2bpx8j3Mmz0mqIsoDVaCMP2TmWqh-OQUfSZFRw";

const { Pool } = require("pg");
const pool = new Pool({
  host:"localhost", port:5432, database:"rds_local",
  user:"postgres", password:"rds2026",
  options:"-c timezone=UTC"
});

async function supaFetch(method, path, body) {
  const res = await fetch(`${SUPA_URL}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}`,
      "Content-Type": "application/json", Prefer: "return=minimal"
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path}: ${res.status} ${text}`);
  return text ? JSON.parse(text) : null;
}

async function main() {
  // Show current KS&P tasks
  const res = await fetch(`${SUPA_URL}/rest/v1/tasks?client=eq.KS%26P%20Limited&select=id,title,due_date,client_sub_date`, {
    headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` }
  });
  const tasks = await res.json();

  console.log(`KS&P Limited tasks: ${tasks.length}`);
  tasks.forEach(t => console.log(`  "${t.title}" | due: ${t.due_date} | sub: ${t.client_sub_date}`));
  console.log("");

  // Fix Supabase: clear bad due_date (year < 2025) + all client_sub_date → null
  await supaFetch("PATCH", "tasks?client=eq.KS%26P%20Limited&due_date=lt.2025-01-01", { due_date: null });
  console.log("Supabase: cleared bad due_date");

  await supaFetch("PATCH", "tasks?client=eq.KS%26P%20Limited&client_sub_date=lt.2025-01-01", { client_sub_date: null });
  console.log("Supabase: cleared bad client_sub_date");

  // Also clear subEquDue ones (where client_sub_date = due_date, which was old import mistake)
  // Since no Excel source exists, set ALL client_sub_date to null for KS&P
  await supaFetch("PATCH", "tasks?client=eq.KS%26P%20Limited", { client_sub_date: null });
  console.log("Supabase: set all KS&P client_sub_date = null");

  // Fix local DB
  const r1 = await pool.query(`
    UPDATE tasks SET due_date = NULL
    WHERE client = 'KS&P Limited' AND due_date IS NOT NULL
      AND LEFT(due_date::text, 4)::int < 2025
  `);
  console.log(`Local: cleared ${r1.rowCount} bad due_date rows`);

  const r2 = await pool.query(`
    UPDATE tasks SET client_sub_date = NULL
    WHERE client = 'KS&P Limited' AND client_sub_date IS NOT NULL
  `);
  console.log(`Local: cleared ${r2.rowCount} client_sub_date rows`);

  await pool.end();

  // Verify
  const vres = await fetch(`${SUPA_URL}/rest/v1/tasks?client=eq.KS%26P%20Limited&select=id,title,due_date,client_sub_date`, {
    headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` }
  });
  const vtasks = await vres.json();
  console.log("\nAfter fix:");
  vtasks.forEach(t => console.log(`  "${t.title}" | due: ${t.due_date} | sub: ${t.client_sub_date}`));
  console.log("\nDone. KS&P due_dates need to be set manually in the app (no Excel source).");
}

main().catch(e => { console.error(e.message); pool.end(); process.exit(1); });
