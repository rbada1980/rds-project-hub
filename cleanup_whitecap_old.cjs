// ══════════════════════════════════════════════════════════════
// cleanup_whitecap_old.cjs  — deletes OLD duplicate White Cap data
// Keeps the NEWEST version of each project (just imported).
// Run: node cleanup_whitecap_old.cjs
// ══════════════════════════════════════════════════════════════
"use strict";
const https = require("https");
const path  = require("path");
const fs    = require("fs");

const SUPA_URL = "https://xypcbioltukahipkqqzc.supabase.co";
const cfg      = JSON.parse(fs.readFileSync(path.join(__dirname, "sync-config.json"), "utf8"));
const SUPA_KEY = cfg.service_key;

function supa(method, endpoint, body) {
  return new Promise((resolve, reject) => {
    const data   = body ? JSON.stringify(body) : null;
    const parsed = new URL(SUPA_URL + endpoint);
    const opts   = {
      hostname: parsed.hostname,
      path:     parsed.pathname + parsed.search,
      method,
      headers: {
        "apikey":        SUPA_KEY,
        "Authorization": `Bearer ${SUPA_KEY}`,
        "Content-Type":  "application/json",
        "Prefer":        "return=representation",
      },
    };
    if (data) opts.headers["Content-Length"] = Buffer.byteLength(data);
    const req = https.request(opts, res => {
      let raw = "";
      res.on("data", c => raw += c);
      res.on("end", () => {
        try {
          const out = raw ? JSON.parse(raw) : null;
          if (res.statusCode >= 200 && res.statusCode < 300) resolve({ data: out, status: res.statusCode });
          else reject(new Error(`HTTP ${res.statusCode}: ${raw.slice(0, 400)}`));
        } catch (e) { reject(new Error(`Parse: ${e.message} raw=${raw.slice(0,200)}`)); }
      });
    });
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

async function main() {
  console.log("\n══════════════════════════════════════════");
  console.log("  White Cap Old Data Cleanup");
  console.log("══════════════════════════════════════════\n");

  // 1. Fetch ALL White Cap projects (id, name, created_at, deadline)
  console.log("📋 Fetching all White Cap projects...");
  const { data: allProjects } = await supa(
    "GET",
    "/rest/v1/projects?client=eq.White Cap&select=id,name,created_at,deadline&order=created_at.asc&limit=2000"
  );

  if (!allProjects || allProjects.length === 0) {
    console.log("No White Cap projects found.");
    return;
  }
  console.log(`   Found ${allProjects.length} total White Cap projects\n`);

  // 2. Group by name — collect all IDs per project name
  const byName = {};
  for (const p of allProjects) {
    if (!byName[p.name]) byName[p.name] = [];
    byName[p.name].push(p);
  }

  // 3. Find duplicates — keep newest (last in list since sorted asc), delete rest
  const toDelete = [];
  let uniqueCount = 0;

  for (const [name, entries] of Object.entries(byName)) {
    if (entries.length === 1) {
      uniqueCount++;
      continue;
    }
    // Sort by created_at ascending — last = newest
    entries.sort((a, b) => a.created_at.localeCompare(b.created_at));
    const keep = entries[entries.length - 1];
    const old  = entries.slice(0, entries.length - 1);
    console.log(`📁 "${name}" — ${entries.length} copies`);
    console.log(`   KEEP  → ${keep.id} (${keep.created_at.slice(0,19)})`);
    for (const o of old) {
      console.log(`   DELETE→ ${o.id} (${o.created_at.slice(0,19)})`);
      toDelete.push(o);
    }
  }

  console.log(`\n   ${uniqueCount} projects are unique (no duplicates)`);
  console.log(`   ${toDelete.length} OLD project(s) to delete\n`);

  if (toDelete.length === 0) {
    console.log("✅ Nothing to delete — database is already clean.");
    return;
  }

  // 4. Delete tasks + projects for each old entry
  let projDeleted = 0, taskGroupsDeleted = 0, errors = 0;

  for (const p of toDelete) {
    // Delete tasks first
    try {
      const { data: delTasks } = await supa("DELETE", `/rest/v1/tasks?project_id=eq.${p.id}`);
      taskGroupsDeleted++;
      console.log(`🗑  Deleted tasks for project ${p.id} ("${p.name}")`);
    } catch (e) {
      console.log(`   ⚠ Could not delete tasks for ${p.id}: ${e.message}`);
    }

    // Delete project
    try {
      await supa("DELETE", `/rest/v1/projects?id=eq.${p.id}`);
      projDeleted++;
      console.log(`🗑  Deleted project  ${p.id} ("${p.name}")`);
    } catch (e) {
      console.log(`   ❌ Could not delete project ${p.id}: ${e.message}`);
      errors++;
    }
  }

  console.log("\n══════════════════════════════════════════");
  console.log("  CLEANUP COMPLETE");
  console.log("══════════════════════════════════════════");
  console.log(`  Old projects deleted : ${projDeleted}`);
  console.log(`  Task groups deleted  : ${taskGroupsDeleted}`);
  console.log(`  Errors               : ${errors}`);
  console.log("══════════════════════════════════════════\n");
}

main().catch(e => { console.error("\n💥 Fatal:", e.message); process.exit(1); });
