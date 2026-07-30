const { Client } = require("pg");
const pg = new Client({ host:"localhost", port:5432, database:"rds_local", user:"postgres", password:"rds2026" });

async function main(){
  await pg.connect();
  await pg.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS date_of_birth DATE;");
  console.log("✅ date_of_birth column added to local PostgreSQL users table");
  const r = await pg.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='users' AND column_name='date_of_birth'");
  console.log("Verified:", r.rows);
  await pg.end();
}
main().catch(e=>{ console.error("FATAL:",e.message); process.exit(1); });
