// ============================================================
// Fix local PostgreSQL attendance dates — IST off-by-one
// Run: node fix_local_attendance_dates.js
// ============================================================

const pg = require("pg");
const { Pool } = pg;

// Keep DATE as plain string (same as server.js line 16)
pg.types.setTypeParser(1082, val => val);

const pool = new Pool({
  host:     "localhost",
  port:     5432,
  database: "rds_local",
  user:     "postgres",
  password: "rds2026",
});

function toIST(loginAt) {
  if (!loginAt) return null;
  const d = new Date(loginAt);
  if (isNaN(d.getTime())) return null;
  // Use Intl to get the real IST date regardless of server timezone
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric", month: "2-digit", day: "2-digit"
  }).format(d);
}

async function main() {
  const client = await pool.connect();
  try {
    // 1. Fetch all attendance records
    const { rows } = await client.query(
      "SELECT id, user_name, date, login_at FROM attendance ORDER BY date ASC"
    );
    console.log(`Total records: ${rows.length}`);

    let correct = 0, wrong = [], noLogin = 0;
    for (const r of rows) {
      if (!r.login_at) { noLogin++; continue; }
      const istDate = toIST(r.login_at);
      if (!istDate) { noLogin++; continue; }
      if (r.date === istDate) { correct++; }
      else { wrong.push({ ...r, correct_date: istDate }); }
    }
    console.log(`Already correct: ${correct}`);
    console.log(`Wrong dates:     ${wrong.length}`);
    console.log(`No login_at:     ${noLogin}`);

    if (wrong.length === 0) {
      console.log("\n✅ All dates are correct — nothing to fix.");
      return;
    }

    console.log("\nSample wrong records:");
    wrong.slice(0, 5).forEach(r =>
      console.log(`  ${r.user_name}: stored=${r.date}, correct=${r.correct_date}`)
    );

    // 2. For each wrong record, check if correct date already exists (conflict)
    let updated = 0, deleted = 0, errors = [];

    for (const r of wrong) {
      // Check if a record already exists for (user_id, correct_date)
      const conflict = await client.query(
        "SELECT id, logout_at, total_work_minutes FROM attendance WHERE user_name=$1 AND date=$2",
        [r.user_name, r.correct_date]
      );

      if (conflict.rows.length > 0) {
        // Duplicate — keep the one with more data, delete the other
        const existing = conflict.rows[0];
        const wrongHasBetter =
          (r.logout_at && !existing.logout_at) ||
          ((r.total_work_minutes || 0) > (existing.total_work_minutes || 0));

        const deleteId  = wrongHasBetter ? existing.id : r.id;
        const keepId    = wrongHasBetter ? r.id : existing.id;
        const updateNeeded = wrongHasBetter; // only if we're keeping the wrong-date record

        try {
          await client.query("DELETE FROM attendance WHERE id=$1", [deleteId]);
          deleted++;
          if (updateNeeded) {
            await client.query("UPDATE attendance SET date=$1 WHERE id=$2", [r.correct_date, keepId]);
            updated++;
          }
        } catch (e) {
          errors.push(`${r.user_name} (${r.date}→${r.correct_date}): ${e.message}`);
        }
      } else {
        // No conflict — just update the date
        try {
          await client.query("UPDATE attendance SET date=$1 WHERE id=$2", [r.correct_date, r.id]);
          updated++;
        } catch (e) {
          errors.push(`${r.user_name} (${r.date}→${r.correct_date}): ${e.message}`);
        }
      }
    }

    console.log(`\n✅ Updated: ${updated}`);
    console.log(`🗑  Deleted duplicates: ${deleted}`);
    if (errors.length) {
      console.log(`❌ Errors (${errors.length}):`);
      errors.forEach(e => console.log("  " + e));
    } else {
      console.log("No errors.");
    }

    // 3. Final verification
    const { rows: final } = await client.query(
      "SELECT id, user_name, date, login_at FROM attendance ORDER BY date ASC"
    );
    let stillWrong = 0;
    for (const r of final) {
      if (!r.login_at) continue;
      const istDate = toIST(r.login_at);
      if (istDate && r.date !== istDate) stillWrong++;
    }
    console.log(`\nFinal check — still wrong: ${stillWrong}`);
    if (stillWrong === 0) console.log("✅ All attendance dates are now correct in local PostgreSQL.");

  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(e => { console.error("Fatal:", e.message); process.exit(1); });
