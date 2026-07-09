// ══════════════════════════════════════════════════════════════
// cleanup_whitecap_local.cjs
// Run this ON THE OFFLINE SERVER (192.168.0.159) to clean the
// local PostgreSQL of old duplicate White Cap projects.
// Run: node cleanup_whitecap_local.cjs
// ══════════════════════════════════════════════════════════════
"use strict";
const { Pool } = require("pg");

const pool = new Pool({
  host: "localhost", port: 5432,
  database: "rds_local", user: "postgres", password: "rds2026",
});

async function main() {
  console.log("\n══════════════════════════════════════════");
  console.log("  White Cap Local PG Cleanup");
  console.log("══════════════════════════════════════════\n");

  // 1. Fetch all White Cap projects from local PG
  console.log("📋 Fetching White Cap projects from local DB...");
  const { rows: allProjects } = await pool.query(
    `SELECT id, name, created_at FROM projects WHERE client = 'White Cap' ORDER BY created_at ASC`
  );
  console.log(`   Found ${allProjects.length} total White Cap projects\n`);

  if (!allProjects.length) {
    console.log("✅ Nothing to clean."); await pool.end(); return;
  }

  // 2. Group by name — keep newest, collect older ones to delete
  const byName = {};
  for (const p of allProjects) {
    if (!byName[p.name]) byName[p.name] = [];
    byName[p.name].push(p);
  }

  const toDelete = [];
  let unique = 0;
  for (const [name, entries] of Object.entries(byName)) {
    if (entries.length === 1) { unique++; continue; }
    entries.sort((a, b) => a.created_at < b.created_at ? -1 : 1);
    const keep = entries[entries.length - 1];
    const old  = entries.slice(0, entries.length - 1);
    console.log(`📁 "${name}" — ${entries.length} copies`);
    console.log(`   KEEP  → ${keep.id} (${String(keep.created_at).slice(0,19)})`);
    for (const o of old) {
      console.log(`   DELETE→ ${o.id} (${String(o.created_at).slice(0,19)})`);
      toDelete.push(o);
    }
  }

  console.log(`\n   ${unique} projects unique (no duplicates)`);
  console.log(`   ${toDelete.length} old project(s) to delete\n`);

  if (!toDelete.length) {
    console.log("✅ Local DB is already clean."); await pool.end(); return;
  }

  // 3. Delete tasks then projects
  let projDel = 0, taskDel = 0, errors = 0;
  for (const p of toDelete) {
    try {
      const t = await pool.query(`DELETE FROM tasks WHERE project_id = $1`, [p.id]);
      taskDel++;
      console.log(`🗑  Deleted tasks for project ${p.id} ("${p.name}") — ${t.rowCount} rows`);
    } catch (e) {
      console.log(`   ⚠ tasks delete failed for ${p.id}: ${e.message}`);
    }
    try {
      await pool.query(`DELETE FROM projects WHERE id = $1`, [p.id]);
      projDel++;
      console.log(`🗑  Deleted project ${p.id} ("${p.name}")`);
    } catch (e) {
      console.log(`   ❌ project delete failed for ${p.id}: ${e.message}`);
      errors++;
    }
  }

  console.log("\n══════════════════════════════════════════");
  console.log("  LOCAL CLEANUP COMPLETE");
  console.log("══════════════════════════════════════════");
  console.log(`  Old projects deleted : ${projDel}`);
  console.log(`  Task groups deleted  : ${taskDel}`);
  console.log(`  Errors               : ${errors}`);
  console.log("══════════════════════════════════════════\n");

  await pool.end();
}

main().catch(e => { console.error("\n💥 Fatal:", e.message); pool.end(); process.exit(1); });
