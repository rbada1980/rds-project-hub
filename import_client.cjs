// ============================================================
//  import_client.cjs  –  White Cap data importer
//  Run: node import_client.cjs
// ============================================================
"use strict";
const https = require("https");

// ── Supabase credentials (from src/App.jsx lines 5-6) ────────
const SUPA_URL = "https://xypcbioltukahipkqqzc.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGNiaW9sdHVrYWhpcGtxcXpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0MzEzNjUsImV4cCI6MjA5NTAwNzM2NX0.DG5sv2bpx8j3Mmz0mqIsoDVaCMP2TmWqh-OQUfSZFRw";
const CLIENT_NAME = "White Cap";

// ── Parsed data (inline – extracted from Excel) ──────────────
const PARSED_PROJECTS = {
  "Felies Residence": [{"title":"Foundations and slab on grade","scope":"CIP&CMU","status":"Completed","detailer":"Praveena","checker":"Chandra Mouli","assignee":"Praveena","priority":"Medium","due_date":null,"client_sub_date":"2026-12-01"}],
  "Valencia Del Mar Pickleball": [{"title":"Foundations and slab on grade","scope":"CIP&CMU","status":"Completed","detailer":"Danush","checker":"Kameshwari","assignee":"Danush","priority":"Medium","due_date":null,"client_sub_date":"2026-01-19"}],
  "City of temple terrace-fire station #01": [{"title":"Foundations","scope":"CIP&CMU","status":"Completed","detailer":"Swathi","checker":"Chandra Mouli","assignee":"Swathi","priority":"Medium","due_date":null,"client_sub_date":null}],
  "228 Rutland": [{"title":"Foundations and slab on grade","scope":"CIP&CMU","status":"Completed","detailer":"Allu Sai","checker":"Kameshwari","assignee":"Allu Sai","priority":"Medium","due_date":null,"client_sub_date":"2026-01-13"}],
  "Palmetto Lakes Industrial Park": [{"title":"Foundations and slab on grade","scope":"CIP&CMU","status":"Completed","detailer":"Sri Lalitha","checker":"Chandra Mouli","assignee":"Sri Lalitha","priority":"Medium","due_date":null,"client_sub_date":null}],
  "Fenix Apartments": [{"title":"Foundations and slab on grade","scope":"CIP&CMU","status":"Completed","detailer":"Eswar","checker":"Kameshwari","assignee":"Eswar","priority":"Medium","due_date":null,"client_sub_date":"2026-02-17"}],
  "2460 Australian (Ocean Tower)": [{"title":"Foundations and slab on grade","scope":"CIP&CMU","status":"Completed","detailer":"Pradeep","checker":"Chandra Mouli","assignee":"Pradeep","priority":"Medium","due_date":null,"client_sub_date":null}],
  "Siesta Sands": [{"title":"Foundations and slab on grade","scope":"CIP&CMU","status":"Completed","detailer":"Lokesh Reddy","checker":"Chandra Mouli","assignee":"Lokesh Reddy","priority":"Medium","due_date":null,"client_sub_date":null}],
  "Marine Way Residences": [{"title":"Foundations and slab on grade","scope":"CIP&CMU","status":"Completed","detailer":"Sridevi","checker":"Chandra Mouli","assignee":"Sridevi","priority":"Medium","due_date":null,"client_sub_date":null}],
  "1042 Palm Way Road": [{"title":"Foundations and slab on grade","scope":"CIP&CMU","status":"Completed","detailer":"Narayana","checker":"Chandra Mouli","assignee":"Narayana","priority":"Medium","due_date":null,"client_sub_date":"2026-05-28"}],
  "127 EL Bravo Way": [{"title":"Foundations","scope":"CIP&CMU","status":"Completed","detailer":"Danush","checker":"Kameshwari","assignee":"Danush","priority":"Medium","due_date":null,"client_sub_date":"2026-02-17"}],
  "1900 NE 22ND Terrance": [{"title":"Foundations and slab on grade","scope":"CIP&CMU","status":"Not Yet Started","detailer":"Lokesh Reddy","checker":"Chandra Mouli","assignee":"Lokesh Reddy","priority":"Medium","due_date":null,"client_sub_date":"2026-05-28"}],
  "20 Hudson Ave": [{"title":"Foundations and slab on grade","scope":"CIP&CMU","status":"Completed","detailer":"Narayana","checker":"Chandra Mouli","assignee":"Narayana","priority":"Medium","due_date":null,"client_sub_date":"2026-01-13"}],
  "1333 Bvld": [{"title":"Foundations and slab on grade","scope":"CIP&CMU","status":"Completed","detailer":"Lokesh Reddy","checker":"Kameshwari","assignee":"Lokesh Reddy","priority":"Medium","due_date":null,"client_sub_date":"2026-07-05"}],
  "1050 N Lake way": [{"title":"Foundations and slab on grade","scope":"CIP&CMU","status":"Completed","detailer":"Lokesh Reddy","checker":"Kameshwari","assignee":"Lokesh Reddy","priority":"Medium","due_date":null,"client_sub_date":"2026-09-05"}],
  "164 Seminole": [{"title":"Foundations and slab on grade","scope":"CIP&CMU","status":"Completed","detailer":"Siva kumar","checker":"Kameshwari","assignee":"Siva kumar","priority":"Medium","due_date":null,"client_sub_date":"2026-08-04"}],
  "143 Reef Road": [{"title":"Foundations and slab on grade","scope":"CIP&CMU","status":"Completed","detailer":"Kunal","checker":"Chandra Mouli","assignee":"Kunal","priority":"Medium","due_date":null,"client_sub_date":"2026-03-13"}],
  "1820 S Federal Hwy - Fifth Third Bank": [{"title":"Foundations and slab on grade","scope":"CIP&CMU","status":"Completed","detailer":"Pradeep","checker":"Kameshwari","assignee":"Pradeep","priority":"Medium","due_date":null,"client_sub_date":"2026-04-24"}],
  "2651 SE 10th Court": [{"title":"Foundations and slab on grade","scope":"CIP&CMU","status":"Completed","detailer":"Narayana","checker":"Kameshwari","assignee":"Narayana","priority":"Medium","due_date":null,"client_sub_date":"2026-05-19"}],
  "10219 NW 91st Ave": [{"title":"Foundations and slab on grade","scope":"CIP&CMU","status":"Completed","detailer":"Vaishnavi","checker":"Chandra Mouli","assignee":"Vaishnavi","priority":"Medium","due_date":null,"client_sub_date":null}],
  "4950 Coconut Creek Pkwy": [{"title":"Foundations and slab on grade","scope":"CIP&CMU","status":"Completed","detailer":"Eswar","checker":"Kameshwari","assignee":"Eswar","priority":"Medium","due_date":null,"client_sub_date":null}],
  "12521 SW 29th Ct": [{"title":"Foundations and slab on grade","scope":"CIP&CMU","status":"Completed","detailer":"Eswar","checker":"Kameshwari","assignee":"Eswar","priority":"Medium","due_date":null,"client_sub_date":null}],
  "Punta Gorda Airport - Terminal Extension": [{"title":"Foundations and slab on grade","scope":"CIP&CMU","status":"Completed","detailer":"Sri Lalitha","checker":"Chandra Mouli","assignee":"Sri Lalitha","priority":"Medium","due_date":null,"client_sub_date":null}],
  "4th Street Lofts (Daytona Beach)": [{"title":"Foundations and slab on grade","scope":"CIP&CMU","status":"Completed","detailer":"Praveena","checker":"Kameshwari","assignee":"Praveena","priority":"Medium","due_date":null,"client_sub_date":null}],
  "Hana Multifamily": [{"title":"Foundations","scope":"CIP&CMU","status":"Completed","detailer":"Allu Sai","checker":"Kameshwari","assignee":"Allu Sai","priority":"Medium","due_date":null,"client_sub_date":null}],
  "Hacienda Heights": [{"title":"Foundations and slab on grade","scope":"CIP&CMU","status":"Completed","detailer":"Siva kumar","checker":"Chandra Mouli","assignee":"Siva kumar","priority":"Medium","due_date":null,"client_sub_date":null}],
  "1350 N Ocean Blvd": [{"title":"Foundations and slab on grade","scope":"CIP&CMU","status":"Completed","detailer":"Lokesh","checker":"Chandra Mouli","assignee":"Lokesh","priority":"Medium","due_date":null,"client_sub_date":null}],
  "3560 N Ocean Drive": [{"title":"Foundations and slab on grade","scope":"CIP&CMU","status":"Completed","detailer":"Pradeep","checker":"Kameshwari","assignee":"Pradeep","priority":"Medium","due_date":null,"client_sub_date":null}],
  "Abacoa Park - Phase 3 (Jupiter)": [{"title":"Foundations and slab on grade","scope":"CIP&CMU","status":"Completed","detailer":"Danush","checker":"Chandra Mouli","assignee":"Danush","priority":"Medium","due_date":null,"client_sub_date":null}],
  "La Maison Palm Beach": [{"title":"Foundations and slab on grade","scope":"CIP&CMU","status":"Completed","detailer":"Narayana","checker":"Kameshwari","assignee":"Narayana","priority":"Medium","due_date":null,"client_sub_date":null}],
  "Twin Palms": [{"title":"Foundations and slab on grade","scope":"CIP&CMU","status":"Completed","detailer":"Praveena","checker":"Chandra Mouli","assignee":"Praveena","priority":"Medium","due_date":null,"client_sub_date":null}],
  "Pine Crest School": [{"title":"Foundations and slab on grade","scope":"CIP&CMU","status":"Completed","detailer":"Vaishnavi","checker":"Kameshwari","assignee":"Vaishnavi","priority":"Medium","due_date":null,"client_sub_date":null}],
  "500 SE Brickell Key Dr": [{"title":"Foundations and slab on grade","scope":"CIP&CMU","status":"Completed","detailer":"Sri Lalitha","checker":"Chandra Mouli","assignee":"Sri Lalitha","priority":"Medium","due_date":null,"client_sub_date":null}],
  "Harbour Isle East": [{"title":"Foundations and slab on grade","scope":"CIP&CMU","status":"Completed","detailer":"Sridevi","checker":"Kameshwari","assignee":"Sridevi","priority":"Medium","due_date":null,"client_sub_date":null}],
  "Highland Lakes-Clubhouse": [{"title":"Foundations and slab on grade","scope":"CIP&CMU","status":"Completed","detailer":"Swathi","checker":"Chandra Mouli","assignee":"Swathi","priority":"Medium","due_date":null,"client_sub_date":null}],
  "3455 S Ocean Blvd": [{"title":"Foundations and slab on grade","scope":"CIP&CMU","status":"Completed","detailer":"Allu Sai","checker":"Kameshwari","assignee":"Allu Sai","priority":"Medium","due_date":null,"client_sub_date":null}],
  "Briar Bay Park": [{"title":"Foundations and slab on grade","scope":"CIP&CMU","status":"Completed","detailer":"Eswar","checker":"Chandra Mouli","assignee":"Eswar","priority":"Medium","due_date":null,"client_sub_date":null}],
  "Port 32 Stuart Marina- Phase 1": [{"title":"Foundations and slab on grade","scope":"CIP&CMU","status":"Completed","detailer":"Siva kumar","checker":"Kameshwari","assignee":"Siva kumar","priority":"Medium","due_date":null,"client_sub_date":null}],
  "WPB Fire Station -107": [{"title":"Foundations and slab on grade","scope":"CIP&CMU","status":"Completed","detailer":"Lokesh Reddy","checker":"Chandra Mouli","assignee":"Lokesh Reddy","priority":"Medium","due_date":null,"client_sub_date":null}],
  "Wellfield Pump Station": [{"title":"Foundations and slab on grade","scope":"CIP&CMU","status":"Completed","detailer":"Danush","checker":"Kameshwari","assignee":"Danush","priority":"Medium","due_date":null,"client_sub_date":null}],
  "WPB Fire Station 108": [{"title":"Foundations and slab on grade","scope":"CIP&CMU","status":"Completed","detailer":"Praveena","checker":"Chandra Mouli","assignee":"Praveena","priority":"Medium","due_date":null,"client_sub_date":null}],
  "Paving - Palm Beach County- MSA": [{"title":"Foundations and slab on grade","scope":"Paving","status":"Completed","detailer":"ESWAR","checker":"NANAJI","assignee":"ESWAR","priority":"Medium","due_date":null,"client_sub_date":null}],
  "Shoppes at Alton": [{"title":"Foundations and slab on grade","scope":"CIP&CMU","status":"Completed","detailer":"Vaishnavi","checker":"Kameshwari","assignee":"Vaishnavi","priority":"Medium","due_date":null,"client_sub_date":null}],
  "1000 S Ocean Drive": [{"title":"Foundations and slab on grade","scope":"CIP&CMU","status":"Completed","detailer":"Sri Lalitha","checker":"Chandra Mouli","assignee":"Sri Lalitha","priority":"Medium","due_date":null,"client_sub_date":null}],
  "800 SE 5th Court": [{"title":"Foundations and slab on grade","scope":"CIP&CMU","status":"Completed","detailer":"Sridevi","checker":"Kameshwari","assignee":"Sridevi","priority":"Medium","due_date":null,"client_sub_date":null}],
  "Gator Trace Golf Club": [{"title":"Foundations and slab on grade","scope":"CIP&CMU","status":"Completed","detailer":"Swathi","checker":"Chandra Mouli","assignee":"Swathi","priority":"Medium","due_date":null,"client_sub_date":null}],
  "777 N Ocean Drive": [{"title":"Foundations and slab on grade","scope":"CIP&CMU","status":"Completed","detailer":"Allu Sai","checker":"Kameshwari","assignee":"Allu Sai","priority":"Medium","due_date":null,"client_sub_date":null}],
  "16300 NW 11th Ave": [{"title":"Foundations and slab on grade","scope":"CIP&CMU","status":"Completed","detailer":"Eswar","checker":"Chandra Mouli","assignee":"Eswar","priority":"Medium","due_date":null,"client_sub_date":null}],
  "1305 Bay Dr": [{"title":"Foundations and slab on grade","scope":"CIP&CMU","status":"Completed","detailer":"Siva kumar","checker":"Kameshwari","assignee":"Siva kumar","priority":"Medium","due_date":null,"client_sub_date":null}],
  "Paving - City of Lake Worth Beach- MSA": [{"title":"Foundations and slab on grade","scope":"Paving","status":"Completed","detailer":"Eswar/Nanaji","checker":"Chandra Mouli/NNJ","assignee":"Eswar","priority":"Medium","due_date":null,"client_sub_date":null}],
  "Paving - City of Pahokee - MSA": [{"title":"Paving","scope":"Paving","status":"Completed","detailer":"Balaram/Jagadeesh","checker":"Chandra Mouli/NNJ","assignee":"Balaram","priority":"Medium","due_date":null,"client_sub_date":null}],
  "Paving - BSO (Broward County Sheriff Office) - MSA": [{"title":"Paving","scope":"Paving","status":"Completed","detailer":"Allu Sai/Nanaji","checker":"Lokesh Reddy/Nanaji","assignee":"Allu Sai","priority":"Medium","due_date":null,"client_sub_date":null}],
  "Paving - City of Lauderhill - MSA": [{"title":"Paving","scope":"Paving","status":"Completed","detailer":"eswar/siav kumar","checker":"Chandra Mouli/NNJ","assignee":"Eswar","priority":"Medium","due_date":null,"client_sub_date":null}],
  "Paving - Palm Beach County-Acme Drainage - MSA": [{"title":"Paving","scope":"Paving","status":"Completed","detailer":"Anji Reddy","checker":"Chandra Mouli","assignee":"Anji Reddy","priority":"Medium","due_date":null,"client_sub_date":null}],
  "Paving - City of Boynton Beach - MSA": [{"title":"Paving","scope":"Paving","status":"Completed","detailer":"Sridevi / Vaishnavi","checker":"Lokesh Reddy/Nanaji","assignee":"Sridevi","priority":"Medium","due_date":null,"client_sub_date":null}],
  "Paving - Fort Lauderdale - MSA": [{"title":"Paving","scope":"Paving","status":"Not Yet Started","detailer":"Rds","checker":"Rds","assignee":"Rds","priority":"Medium","due_date":null,"client_sub_date":null}],
  "Brightline": [{"title":"Foundations and slab on grade","scope":"CIP&CMU","status":"Completed","detailer":"Lokesh Reddy","checker":"Kameshwari","assignee":"Lokesh Reddy","priority":"Medium","due_date":null,"client_sub_date":null}],
  "Boca Raton High School": [{"title":"Foundations and slab on grade","scope":"CIP&CMU","status":"Completed","detailer":"Danush","checker":"Chandra Mouli","assignee":"Danush","priority":"Medium","due_date":null,"client_sub_date":null}],
  "2201 N Ocean Blvd": [{"title":"Foundations and slab on grade","scope":"CIP&CMU","status":"Completed","detailer":"Praveena","checker":"Kameshwari","assignee":"Praveena","priority":"Medium","due_date":null,"client_sub_date":null}],
  "1023 N Ocean Blvd": [{"title":"Foundations and slab on grade","scope":"CIP&CMU","status":"Completed","detailer":"Vaishnavi","checker":"Chandra Mouli","assignee":"Vaishnavi","priority":"Medium","due_date":null,"client_sub_date":null}],
  "6920 Collins Ave": [{"title":"Foundations and slab on grade","scope":"CIP&CMU","status":"Completed","detailer":"Sri Lalitha","checker":"Kameshwari","assignee":"Sri Lalitha","priority":"Medium","due_date":null,"client_sub_date":null}],
  "Paving - Port of Palm Beach - MSA": [{"title":"Paving","scope":"Paving","status":"Not Yet Started","detailer":"Sridevi / Vaishnavi","checker":"Lokesh Reddy/Nanaji","assignee":"Sridevi","priority":"Medium","due_date":null,"client_sub_date":null}],
  "Highland Beach - Library, Community Center, Town Hall": [{"title":"Foundations and slab on grade","scope":"CIP&CMU","status":"Not Yet Started","detailer":"Swathi","checker":"Chandra Mouli","assignee":"Swathi","priority":"Medium","due_date":null,"client_sub_date":null}],
  "Elan at Midtown": [{"title":"Foundations and slab on grade","scope":"CIP&CMU","status":"Not Yet Started","detailer":"Allu Sai","checker":"Kameshwari","assignee":"Allu Sai","priority":"Medium","due_date":null,"client_sub_date":null}],
  "Port 32 Stuart Marina - Phase 2": [{"title":"Foundations and slab on grade","scope":"CIP&CMU","status":"Not Yet Started","detailer":"Eswar","checker":"Chandra Mouli","assignee":"Eswar","priority":"Medium","due_date":null,"client_sub_date":null}],
  "City of Temple Terrace - Fire Station #02": [{"title":"Foundations","scope":"CIP&CMU","status":"Not Yet Started","detailer":"Siva kumar","checker":"Kameshwari","assignee":"Siva kumar","priority":"Medium","due_date":null,"client_sub_date":null}],
  "La Maison (Boca raton)": [{"title":"Foundations and slab on grade","scope":"CIP&CMU","status":"Not Yet Started","detailer":"Lokesh Reddy","checker":"Chandra Mouli","assignee":"Lokesh Reddy","priority":"Medium","due_date":null,"client_sub_date":null}],
  "Paving - City of Palm Beach Garden - MSA": [{"title":"Paving","scope":"Paving","status":"Not Yet Started","detailer":"Danush","checker":"Kameshwari","assignee":"Danush","priority":"Medium","due_date":null,"client_sub_date":null}]
};

// ── Color palette ─────────────────────────────────────────────
const COLORS = ["#3b82f6","#06b6d4","#8b5cf6","#f97316","#ec4899","#22c55e","#eab308","#ef4444","#a855f7","#14b8a6","#f59e0b","#6366f1"];

// ── Helpers ───────────────────────────────────────────────────
function req(method, path, body, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${SUPA_URL}/rest/v1/${path}`);
    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method,
      headers: {
        "apikey": SUPA_KEY,
        "Authorization": `Bearer ${SUPA_KEY}`,
        "Content-Type": "application/json",
        "Prefer": "return=representation",
        ...extraHeaders,
      },
    };
    if (data) options.headers["Content-Length"] = Buffer.byteLength(data);
    const r = https.request(options, res => {
      let raw = "";
      res.on("data", d => raw += d);
      res.on("end", () => {
        try {
          const parsed = raw ? JSON.parse(raw) : null;
          if (res.statusCode >= 200 && res.statusCode < 300) resolve(parsed);
          else reject(new Error(`HTTP ${res.statusCode}: ${raw}`));
        } catch { reject(new Error(`Parse error: ${raw}`)); }
      });
    });
    r.on("error", reject);
    if (data) r.write(data);
    r.end();
  });
}

function get(path) { return req("GET", path); }
function post(path, body) { return req("POST", path, body); }
function del(path) { return req("DELETE", path, null, { "Prefer": "return=minimal" }); }

// Normalize a name for comparison (lowercase, collapse whitespace)
function normName(n) { return (n || "").toLowerCase().trim().replace(/\s+/g, " "); }
function toUsername(name) { return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, ""); }

// ── Main ──────────────────────────────────────────────────────
async function main() {
  console.log("=".repeat(60));
  console.log("  White Cap – Supabase Importer");
  console.log("=".repeat(60));

  let stats = { projectsInserted: 0, tasksInserted: 0, usersCreated: 0, failed: 0 };

  // ── STEP 1: Fetch existing users ──────────────────────────
  console.log("\n[1] Fetching existing users…");
  let existingUsers;
  try {
    existingUsers = await get("users?select=id,name,username,role");
    console.log(`    Found ${existingUsers.length} existing users`);
  } catch (e) {
    console.error("❌ Failed to fetch users:", e.message);
    process.exit(1);
  }

  // ── STEP 2: Collect all unique names from detailer/checker ──
  const allNames = new Set();
  for (const tasks of Object.values(PARSED_PROJECTS)) {
    for (const t of tasks) {
      // Handle slash-separated names like "Eswar/Nanaji"
      for (const field of [t.detailer, t.checker, t.assignee]) {
        if (!field) continue;
        for (const part of field.split("/")) {
          const n = part.trim();
          if (n && n.toLowerCase() !== "rds") allNames.add(n);
        }
      }
    }
  }

  console.log(`\n[2] Checking/creating ${allNames.size} unique names as users…`);
  const userMap = {}; // name (lower) → username
  for (const u of existingUsers) {
    userMap[normName(u.name)] = u.username;
    userMap[normName(u.username)] = u.username;
  }

  for (const name of allNames) {
    const key = normName(name);
    if (userMap[key]) {
      console.log(`    ↷ skip "${name}" (already exists as @${userMap[key]})`);
      continue;
    }
    let username = toUsername(name);
    // Check if username taken
    const unameTaken = existingUsers.some(u => normName(u.username) === normName(username));
    if (unameTaken) username = username + "_2";

    try {
      const newUser = await post("users", {
        name: name,
        username,
        password: "Rds@2025",
        role: "User",
        client_name: "",
        email: "",
      });
      const created = Array.isArray(newUser) ? newUser[0] : newUser;
      existingUsers.push(created);
      userMap[normName(name)] = created.username;
      userMap[normName(username)] = created.username;
      stats.usersCreated++;
      console.log(`    ✓ Created user "${name}" → @${created.username}`);
    } catch (e) {
      // Try with _2 suffix if duplicate username
      if (e.message.includes("duplicate") || e.message.includes("unique")) {
        try {
          const un2 = username + "_2";
          const newUser = await post("users", { name, username: un2, password: "Rds@2025", role: "User", client_name: "", email: "" });
          const created = Array.isArray(newUser) ? newUser[0] : newUser;
          existingUsers.push(created);
          userMap[normName(name)] = created.username;
          stats.usersCreated++;
          console.log(`    ✓ Created user "${name}" → @${un2} (retried)`);
        } catch (e2) {
          console.error(`    ❌ Failed to create "${name}": ${e2.message}`);
          stats.failed++;
        }
      } else {
        console.error(`    ❌ Failed to create "${name}": ${e.message}`);
        stats.failed++;
      }
    }
  }

  // ── STEP 3: Safety test ───────────────────────────────────
  console.log("\n[3] Running safety test (insert + delete test records)…");
  let testProjId = null;
  let testTaskId = null;

  try {
    const tp = await post("projects", {
      name: "__TEST_IMPORT_WHITECAP__",
      client: "White Cap",
      color: "#000000",
      description: "test",
      assigned_users: [],
      deadline: null,
    });
    testProjId = (Array.isArray(tp) ? tp[0] : tp).id;
    console.log(`    ✓ Test project inserted (id=${testProjId})`);
  } catch (e) {
    console.error("    ❌ Test project insert failed:", e.message);
    console.error("    STOPPING – no data was deleted.");
    process.exit(1);
  }

  // Try inserting a test task (detect which columns exist)
  const testTaskPayload = {
    project_id: testProjId,
    title: "__TEST_TASK__",
    status: "Not Yet Started",
    priority: "Medium",
    assignee: "",
    detailer: "",
    checker: "",
    scope: "",
    due_date: null,
    client_sub_date: null,
    client: "White Cap",
    tags: [],
    files: [],
  };

  let taskFields = Object.keys(testTaskPayload);
  let taskInserted = false;
  while (!taskInserted && taskFields.length > 0) {
    const payload = {};
    for (const k of taskFields) payload[k] = testTaskPayload[k];
    try {
      const tt = await post("tasks", payload);
      testTaskId = (Array.isArray(tt) ? tt[0] : tt).id;
      console.log(`    ✓ Test task inserted (id=${testTaskId})`);
      taskInserted = true;
    } catch (e) {
      // Find column that doesn't exist
      const colMatch = e.message.match(/column "([^"]+)"/);
      if (colMatch) {
        const badCol = colMatch[1];
        console.log(`    ⚠ Column "${badCol}" not found – removing and retrying…`);
        taskFields = taskFields.filter(k => k !== badCol);
      } else {
        console.error("    ❌ Test task insert failed:", e.message);
        // Clean up test project
        try { await del(`projects?id=eq.${testProjId}`); } catch {}
        console.error("    STOPPING – no data was deleted.");
        process.exit(1);
      }
    }
  }

  // Record which fields are valid for tasks
  const validTaskFields = new Set(taskFields);
  console.log(`    ✓ Valid task fields: ${[...validTaskFields].join(", ")}`);

  // Delete test records
  try {
    if (testTaskId) await del(`tasks?id=eq.${testTaskId}`);
    if (testProjId) await del(`projects?id=eq.${testProjId}`);
    console.log("    ✓ Test records cleaned up");
  } catch (e) {
    console.error("    ⚠ Cleanup warning:", e.message);
  }

  // ── STEP 4: Delete existing White Cap data ────────────────
  console.log("\n[4] Deleting existing White Cap projects & tasks…");
  // Match: "White Cap", "white cap", "whitecap", "white-cap"
  const clientVariants = ["White Cap", "white cap", "whitecap", "white-cap", "WhiteCap"];

  for (const variant of clientVariants) {
    try {
      // Delete tasks linked to matching projects first
      const matchProjs = await get(`projects?client=eq.${encodeURIComponent(variant)}&select=id`);
      if (matchProjs && matchProjs.length > 0) {
        const ids = matchProjs.map(p => p.id);
        for (const pid of ids) {
          await del(`tasks?project_id=eq.${pid}`);
        }
        await del(`projects?client=eq.${encodeURIComponent(variant)}`);
        console.log(`    ✓ Deleted ${matchProjs.length} projects for variant "${variant}"`);
      }
    } catch (e) {
      console.log(`    ⚠ Delete variant "${variant}": ${e.message}`);
    }
  }

  // ── STEP 5: Insert all projects ────────────────────────────
  console.log("\n[5] Inserting projects and tasks…");
  const projectEntries = Object.entries(PARSED_PROJECTS);
  const insertedProjectIds = {};

  for (let pi = 0; pi < projectEntries.length; pi++) {
    const [projName, tasks] = projectEntries[pi];
    const color = COLORS[pi % COLORS.length];

    // Build assigned_users array
    const assignedSet = new Set();
    let latestDue = null;
    for (const t of tasks) {
      for (const field of [t.detailer, t.assignee, t.checker]) {
        if (!field) continue;
        for (const part of field.split("/")) {
          const n = normName(part.trim());
          if (n && userMap[n]) assignedSet.add(userMap[n]);
        }
      }
      if (t.due_date && (!latestDue || t.due_date > latestDue)) latestDue = t.due_date;
    }

    try {
      const proj = await post("projects", {
        name: projName,
        client: CLIENT_NAME,
        color,
        description: tasks[0]?.scope || "",
        assigned_users: [...assignedSet],
        deadline: latestDue,
      });
      const projId = (Array.isArray(proj) ? proj[0] : proj).id;
      insertedProjectIds[projName] = projId;
      stats.projectsInserted++;
      console.log(`    ✓ [${pi+1}/${projectEntries.length}] Project: "${projName}"`);
    } catch (e) {
      console.error(`    ❌ Project "${projName}": ${e.message}`);
      stats.failed++;
      continue;
    }

    // ── Insert tasks for this project ──────────────────────
    for (const t of tasks) {
      const projId = insertedProjectIds[projName];
      if (!projId) { stats.failed++; continue; }

      // Resolve assignee username (first part if slash-separated)
      const assigneeName = (t.assignee || "").split("/")[0].trim();
      const assigneeUsername = userMap[normName(assigneeName)] || assigneeName || "";

      const detailerName = (t.detailer || "").split("/")[0].trim();
      const checkerName = (t.checker || "").split("/")[0].trim();

      const fullPayload = {
        project_id: projId,
        title: t.title,
        status: t.status,
        priority: t.priority,
        assignee: assigneeUsername,
        detailer: detailerName,
        checker: checkerName,
        scope: t.scope || "",
        due_date: t.due_date || null,
        client_sub_date: t.client_sub_date || null,
        client: CLIENT_NAME,
        tags: [],
        files: [],
      };

      // Only include fields confirmed valid
      const taskPayload = {};
      for (const k of Object.keys(fullPayload)) {
        if (validTaskFields.has(k)) taskPayload[k] = fullPayload[k];
      }

      let inserted = false;
      let retryFields = Object.keys(taskPayload);
      while (!inserted && retryFields.length > 0) {
        const payload = {};
        for (const k of retryFields) payload[k] = taskPayload[k];
        try {
          await post("tasks", payload);
          stats.tasksInserted++;
          inserted = true;
        } catch (e) {
          const colMatch = e.message.match(/column "([^"]+)"/);
          if (colMatch) {
            const bad = colMatch[1];
            console.log(`      ⚠ Removing unknown column "${bad}" and retrying task…`);
            retryFields = retryFields.filter(k => k !== bad);
            validTaskFields.delete(bad);
          } else {
            console.error(`      ❌ Task "${t.title}" in "${projName}": ${e.message}`);
            stats.failed++;
            break;
          }
        }
      }
    }
  }

  // ── Final report ──────────────────────────────────────────
  console.log("\n" + "=".repeat(60));
  console.log("  IMPORT COMPLETE");
  console.log("=".repeat(60));
  console.log(`  ✓ Projects inserted : ${stats.projectsInserted}`);
  console.log(`  ✓ Tasks inserted    : ${stats.tasksInserted}`);
  console.log(`  ✓ Users created     : ${stats.usersCreated}`);
  console.log(`  ❌ Failed            : ${stats.failed}`);
  console.log("=".repeat(60));
}

main().catch(e => {
  console.error("\n💥 Unhandled error:", e.message);
  process.exit(1);
});
