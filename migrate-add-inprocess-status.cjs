// migrate-add-inprocess-status.cjs
// Adds "In Process" to the tasks_status_check constraint in local PostgreSQL
const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

const pool = new Pool({ host:"localhost", port:5432, database:"rds_local", user:"postgres", password:"rds2026" });

const lines = [];
function log(msg) { process.stdout.write(msg+"\n"); lines.push(msg); }

async function main() {
  try {
    // Check current constraint
    const check = await pool.query(`
      SELECT pg_get_constraintdef(oid) AS def
      FROM pg_constraint
      WHERE conname = 'tasks_status_check' AND conrelid = 'tasks'::regclass
    `);
    log("Current constraint: " + (check.rows[0]?.def || "not found"));

    // Drop old constraint
    await pool.query(`ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check`);
    log("Dropped old constraint (if existed)");

    // Recreate with "In Process" included
    await pool.query(`
      ALTER TABLE tasks ADD CONSTRAINT tasks_status_check
      CHECK (status IN (
        'Not Yet Started','In Progress','In Process',
        'Review','Completed','Done','To Be Started','To Do','job canceled'
      ))
    `);
    log("New constraint added with 'In Process' included");

    // Verify
    const verify = await pool.query(`
      SELECT pg_get_constraintdef(oid) AS def
      FROM pg_constraint
      WHERE conname = 'tasks_status_check' AND conrelid = 'tasks'::regclass
    `);
    log("Verified: " + verify.rows[0]?.def);

  } catch(err) {
    log("FATAL: " + err.message);
  } finally {
    await pool.end();
  }
  try { fs.writeFileSync(path.join(__dirname,"migrate-status-result.txt"), lines.join("\n")+"\n"); } catch(e){}
}
main();
