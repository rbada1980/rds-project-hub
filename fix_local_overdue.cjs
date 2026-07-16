// Fix overdue tasks in LOCAL PostgreSQL (matches the Supabase fix already applied)
// Run: node fix_local_overdue.cjs

const { Pool } = require("pg");

const pool = new Pool({
  host:     "localhost",
  database: "rds_local",
  user:     "postgres",
  password: "rds2026",
  port:     5432,
});

async function run() {
  const today = new Date().toISOString().split("T")[0];
  const done  = ["Completed", "Approved", "Submitted", "Cancelled", "On Hold"];

  // 1. Check how many are overdue
  const check = await pool.query(`
    SELECT id, title, client, status, due_date
    FROM tasks
    WHERE due_date IS NOT NULL
      AND due_date < $1
      AND status NOT IN (${done.map((_,i)=>`$${i+2}`).join(",")})
    ORDER BY client, due_date
  `, [today, ...done]);

  console.log(`\nFound ${check.rows.length} overdue tasks in local DB:\n`);
  const byClient = {};
  check.rows.forEach(r => { byClient[r.client||"(none)"] = (byClient[r.client||"(none)"]||0)+1; });
  Object.entries(byClient).forEach(([c,n]) => console.log(`  ${c}: ${n}`));

  if (check.rows.length === 0) {
    console.log("Nothing to fix.");
    await pool.end();
    return;
  }

  // 2. Clear due_date for all overdue tasks
  const ids = check.rows.map(r => r.id);
  const fix = await pool.query(`
    UPDATE tasks
    SET due_date = NULL,
        updated_at = NOW()
    WHERE id = ANY($1::uuid[])
    RETURNING id
  `, [ids]);

  console.log(`\n✓ Cleared due_date on ${fix.rows.length} tasks`);
  await pool.end();
}

run().catch(e => { console.error(e); process.exit(1); });
