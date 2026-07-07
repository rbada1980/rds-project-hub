const { Pool } = require("pg");
const pool = new Pool({ host: "localhost", port: 5432, database: "rds_local", user: "postgres", password: "rds2026" });

async function run() {
  // Show current password
  const r = await pool.query("SELECT username, password, role FROM users WHERE username='ramesh'");
  console.log("Current record:", JSON.stringify(r.rows));

  // Update to ecovon123
  await pool.query("UPDATE users SET password='ecovon123' WHERE username='ramesh'");
  console.log("Password updated to: ecovon123");

  // Verify
  const r2 = await pool.query("SELECT username, password FROM users WHERE username='ramesh'");
  console.log("After update:", JSON.stringify(r2.rows));

  await pool.end();
}

run().catch(e => { console.error("Error:", e.message); pool.end(); });
