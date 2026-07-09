// ══════════════════════════════════════════════════════════════
// merge_sivakumar.cjs
// Merges @shiva and @siav_kumar into @sivakumar (the correct one).
// Updates all tasks + projects, then deletes the duplicate users.
// Run: node merge_sivakumar.cjs
// ══════════════════════════════════════════════════════════════
"use strict";
const https = require("https");
const path  = require("path");
const fs    = require("fs");

const SUPA_URL = "https://xypcbioltukahipkqqzc.supabase.co";
const cfg      = JSON.parse(fs.readFileSync(path.join(__dirname, "sync-config.json"), "utf8"));
const SUPA_KEY = cfg.service_key;

// All usernames / name strings that belong to sivakumar
const DUPE_USERNAMES = ["shiva", "siav_kumar"];   // to delete
const CANONICAL_USERNAME = "sivakumar";

// Name variants to rewrite in task fields (assignee/detailer/checker)
// These are string values stored in tasks, not necessarily usernames
const DUPE_NAME_PATTERNS = [
  "shiva", "siav kumar", "siav_kumar",
  "siva kumar", "sivakumar",            // normalise any casing too
];

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

function isDupe(str) {
  if (!str) return false;
  return DUPE_NAME_PATTERNS.includes(str.trim().toLowerCase());
}

function fixField(val) {
  if (!val) return val;
  // Handle slash-separated combos like "shiva/someone"
  const parts = val.split("/").map(p => {
    const t = p.trim();
    return isDupe(t) ? CANONICAL_USERNAME : t;
  });
  // deduplicate
  return [...new Set(parts)].join("/");
}

async function main() {
  console.log("\n══════════════════════════════════════════");
  console.log("  Merge @shiva + @siav_kumar → @sivakumar");
  console.log("══════════════════════════════════════════\n");

  // 1. Get all users
  const { data: users } = await supa("GET", "/rest/v1/users?select=id,name,username&limit=500");
  const dupeUsers    = users.filter(u => DUPE_USERNAMES.includes((u.username||"").toLowerCase()));
  const canonical    = users.find(u => (u.username||"").toLowerCase() === CANONICAL_USERNAME);

  console.log(`Canonical user: ${canonical?.name} (@${canonical?.username}) id=${canonical?.id}`);
  console.log(`Duplicate users to remove:`);
  dupeUsers.forEach(u => console.log(`  ✗ ${u.name} (@${u.username}) id=${u.id}`));
  if (!canonical) { console.log("\n❌ @sivakumar user not found — aborting."); return; }

  // 2. Fix tasks
  console.log("\n📋 Scanning tasks...");
  const { data: tasks } = await supa("GET", "/rest/v1/tasks?select=id,assignee,detailer,checker&limit=5000");
  let taskFixed = 0;
  for (const t of tasks || []) {
    const na = fixField(t.assignee);
    const nd = fixField(t.detailer);
    const nc = fixField(t.checker);
    const updates = {};
    if (na !== t.assignee) updates.assignee = na;
    if (nd !== t.detailer) updates.detailer = nd;
    if (nc !== t.checker)  updates.checker  = nc;
    if (Object.keys(updates).length) {
      await supa("PATCH", `/rest/v1/tasks?id=eq.${t.id}`, updates);
      taskFixed++;
      console.log(`  ✓ task ${t.id}: ${JSON.stringify(updates)}`);
    }
  }
  console.log(`   ${taskFixed} task(s) updated`);

  // 3. Fix projects (assigned_users array of usernames)
  console.log("\n📁 Scanning projects...");
  const { data: projects } = await supa("GET", "/rest/v1/projects?select=id,name,assigned_users&limit=2000");
  const dupeUnames = new Set(dupeUsers.map(u => u.username.toLowerCase()));
  let projFixed = 0;
  for (const p of projects || []) {
    const arr = p.assigned_users || [];
    const needsFix = arr.some(u => dupeUnames.has((u||"").toLowerCase()));
    if (needsFix) {
      const updated = [...new Set(arr.map(u =>
        dupeUnames.has((u||"").toLowerCase()) ? CANONICAL_USERNAME : u
      ))];
      await supa("PATCH", `/rest/v1/projects?id=eq.${p.id}`, { assigned_users: updated });
      projFixed++;
      console.log(`  ✓ project "${p.name}": ${JSON.stringify(arr)} → ${JSON.stringify(updated)}`);
    }
  }
  console.log(`   ${projFixed} project(s) updated`);

  // 4. Delete duplicate user records
  console.log("\n🗑  Deleting duplicate user records...");
  for (const u of dupeUsers) {
    try {
      await supa("DELETE", `/rest/v1/users?id=eq.${u.id}`);
      console.log(`  ✓ Deleted @${u.username} (${u.name})`);
    } catch (e) {
      console.log(`  ⚠ Could not delete @${u.username}: ${e.message}`);
    }
  }

  console.log("\n══════════════════════════════════════════");
  console.log("  DONE");
  console.log(`  Tasks fixed    : ${taskFixed}`);
  console.log(`  Projects fixed : ${projFixed}`);
  console.log(`  Users deleted  : ${dupeUsers.length}`);
  console.log("══════════════════════════════════════════\n");
}

main().catch(e => { console.error("\n💥 Fatal:", e.message); process.exit(1); });
