// Run this once: node create_lavanya.cjs
// Creates Lavanya user in local PostgreSQL + Supabase

const { Pool } = require("pg");

const SUPA_URL = "https://xypcbioltukahipkqqzc.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGNiaW9sdHVrYWhpcGtxcXpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0MzEzNjUsImV4cCI6MjA5NTAwNzM2NX0.DG5sv2bpx8j3Mmz0mqIsoDVaCMP2TmWqh-OQUfSZFRw";

const pool = new Pool({
  host: "localhost",
  port: 5432,
  database: "rds_local",
  user: "postgres",
  password: "rds2026",
});

const USER = {
  name: "Lavanya",
  username: "lavanya",
  password: "RDSTechserv@2026",
  role: "HR & Finance",
  client_name: "",
  email: "lavanya@rdstechserv.com",
};

async function main() {
  // 1. Local PostgreSQL
  try {
    const r = await pool.query(
      `INSERT INTO users (name,username,password,role,client_name,email)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (username) DO UPDATE
         SET name=$1, password=$3, role=$4, client_name=$5, email=$6
       RETURNING id, name, username, role`,
      [USER.name, USER.username, USER.password, USER.role, USER.client_name, USER.email]
    );
    console.log("✅ Local PG — user saved:", r.rows[0]);
  } catch (e) {
    console.error("❌ Local PG error:", e.message);
  } finally {
    await pool.end();
  }

  // 2. Supabase
  try {
    const res = await fetch(
      SUPA_URL + "/rest/v1/users",
      {
        method: "POST",
        headers: {
          "apikey": SUPA_KEY,
          "Authorization": "Bearer " + SUPA_KEY,
          "Content-Type": "application/json",
          "Prefer": "resolution=merge-duplicates,return=representation",
        },
        body: JSON.stringify({
          name: USER.name,
          username: USER.username,
          password: USER.password,
          role: USER.role,
          client_name: USER.client_name,
          email: USER.email,
        }),
      }
    );
    const text = await res.text();
    if (res.ok) {
      console.log("✅ Supabase — user saved:", text);
    } else {
      console.error("❌ Supabase error:", res.status, text);
    }
  } catch (e) {
    console.error("❌ Supabase fetch error:", e.message);
  }
}

main();
