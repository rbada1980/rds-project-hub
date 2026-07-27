// Fix Alton Delray project: set client = "Formcrete" in Supabase + local PG
const { createClient } = require("@supabase/supabase-js");
const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

const supabase = createClient(
  "https://xypcbioltukahipkqqzc.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGNiaW9sdHVrYWhpcGtxcXpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTQzMTM2NSwiZXhwIjoyMDk1MDA3MzY1fQ.AoLxjBk3MR3_qjsCP50xzbyx7cp_kaQlVmN_eP_xuYU"
);
const pool = new Pool({ host:"localhost", port:5432, database:"rds_local", user:"postgres", password:"rds2026" });

const lines = [];
function log(msg) { process.stdout.write(msg+"\n"); lines.push(msg); }

async function main() {
  try {
    // Check current state
    const { data: projects } = await supabase.from("projects").select("id,name,client").ilike("name","%alton%");
    log("Current Alton project(s):");
    (projects||[]).forEach(p => log(`  id=${p.id}  name="${p.name}"  client="${p.client}"`));

    // Check all clients
    const { data: all } = await supabase.from("projects").select("client");
    const clients = [...new Set((all||[]).map(p=>p.client).filter(Boolean))].sort();
    log("All clients in DB: " + clients.join(", "));

    // Fix: set client = "Formcrete" for all Alton Delray projects
    for (const p of (projects||[])) {
      if (p.client !== "Formcrete") {
        const { error } = await supabase.from("projects").update({ client: "Formcrete" }).eq("id", p.id);
        if (error) log("ERR updating "+p.name+": "+error.message);
        else log(`FIXED: "${p.name}" client "${p.client}" → "Formcrete"`);
      } else {
        log(`OK: "${p.name}" already has client="Formcrete"`);
      }
    }

    // Fix local PG too
    const pg = await pool.query(
      `UPDATE projects SET client='Formcrete', updated_at=NOW() WHERE LOWER(name) LIKE '%alton%' AND client IS DISTINCT FROM 'Formcrete' RETURNING id,name,client`
    );
    log(`Local PG updated: ${pg.rowCount} row(s)`);
    pg.rows.forEach(r => log(`  PG fixed: "${r.name}" → client=Formcrete`));

    // Verify final state
    const { data: final } = await supabase.from("projects").select("id,name,client").ilike("name","%alton%");
    log("\nFinal state:");
    (final||[]).forEach(p => log(`  "${p.name}" client="${p.client}"`));

  } catch(err) {
    log("FATAL: "+err.message);
  } finally {
    await pool.end();
  }
  try { fs.writeFileSync(path.join(__dirname,"alton-client-result.txt"), lines.join("\n")+"\n"); } catch(e){}
}
main();
