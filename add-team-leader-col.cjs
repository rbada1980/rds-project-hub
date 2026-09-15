// add-team-leader-col.cjs
// Adds team_leader column to clients table in local PostgreSQL + Supabase
const { Pool } = require("pg");
const { createClient } = require("@supabase/supabase-js");

const SUPA_URL = "https://xypcbioltukahipkqqzc.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGNiaW9sdHVrYWhpcGtxcXpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTQzMTM2NSwiZXhwIjoyMDk1MDA3MzY1fQ.AoLxjBk3MR3_qjsCP50xzbyx7cp_kaQlVmN_eP_xuYU";

async function run() {
  // 1. Local PostgreSQL
  const pool = new Pool({ host:"localhost", port:5432, database:"rds_local", user:"postgres", password:"rds2026" });
  try {
    await pool.query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS team_leader TEXT DEFAULT ''`);
    console.log("✓ Local PostgreSQL: team_leader column added");
  } catch(e) { console.error("✗ Local PG error:", e.message); }
  await pool.end();

  // 2. Supabase — test if column already exists
  const sb = createClient(SUPA_URL, SUPA_KEY);
  const { data, error } = await sb.from("clients").select("team_leader").limit(1);
  if (!error) {
    console.log("✓ Supabase: team_leader column already exists");
  } else if (error.message.includes("team_leader")) {
    // Column missing — try via management API isn't available, show SQL
    console.log("\n⚠  Supabase column missing. Run this SQL in Supabase SQL Editor:");
    console.log("   ALTER TABLE clients ADD COLUMN IF NOT EXISTS team_leader TEXT DEFAULT '';");
    console.log("   URL: https://supabase.com/dashboard/project/xypcbioltukahipkqqzc/sql/new");
  } else {
    console.error("✗ Supabase error:", error.message);
  }

  console.log("\nDone.");
}
run().catch(console.error);
