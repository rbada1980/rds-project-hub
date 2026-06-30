// import_client.cjs — White Cap fresh import
// Run: node import_client.cjs
// Reads WhiteCap_Import.xlsx from C:\Users\HP\Documents\Claude\Projects\RDS PROJECTS HUB\

const https = require("https");
const path = require("path");

const SUPA_HOST = "xypcbioltukahipkqqzc.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGNiaW9sdHVrYWhpcGtxcXpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0MzEzNjUsImV4cCI6MjA5NTAwNzM2NX0.DG5sv2bpx8j3Mmz0mqIsoDVaCMP2TmWqh-OQUfSZFRw";

const EXCEL_PATH = "C:\\Users\\HP\\Documents\\Claude\\Projects\\RDS PROJECTS HUB\\WhiteCap_Import.xlsx";

const PROJECT_COLORS = ["#0d9488","#6366f1","#f59e0b","#ef4444","#8b5cf6","#10b981","#3b82f6","#ec4899","#14b8a6","#f97316"];

// ── HTTP helper ──────────────────────────────────────────────────────────────
function req(method, urlPath, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname: SUPA_HOST,
      path: `/rest/v1/${urlPath}`,
      method,
      headers: {
        "apikey": SUPA_KEY,
        "Authorization": `Bearer ${SUPA_KEY}`,
        "Content-Type": "application/json",
        "Prefer": "return=representation",
        ...(data ? { "Content-Length": Buffer.byteLength(data) } : {})
      }
    };
    const r = https.request(options, res => {
      let raw = "";
      res.on("data", c => raw += c);
      res.on("end", () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
        catch { resolve({ status: res.statusCode, body: raw }); }
      });
    });
    r.on("error", reject);
    if (data) r.write(data);
    r.end();
  });
}

// ── Excel parser ─────────────────────────────────────────────────────────────
function parseExcel() {
  let xlsx;
  try { xlsx = require("xlsx"); }
  catch {
    require("child_process").execSync("npm install xlsx --no-save", { stdio: "inherit", cwd: __dirname });
    xlsx = require("xlsx");
  }

  const wb = xlsx.readFile(EXCEL_PATH);
  const ws = wb.Sheets["White Cap Work Schedule"];
  if (!ws) throw new Error("Sheet 'White Cap Work Schedule' not found in Excel");

  const raw = xlsx.utils.sheet_to_json(ws, { header: 1, defval: null });

  function fmtDate(v) {
    if (!v) return null;
    if (typeof v === "number") {
      const d = xlsx.SSF.parse_date_code(v);
      if (d) return `${d.y}-${String(d.m).padStart(2,"0")}-${String(d.d).padStart(2,"0")}`;
    }
    if (typeof v === "string") {
      const s = v.trim();
      let m = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
      if (m) return `${m[3]}-${m[1].padStart(2,"0")}-${m[2].padStart(2,"0")}`;
      m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (m) return `${m[3]}-${m[1].padStart(2,"0")}-${m[2].padStart(2,"0")}`;
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    }
    return null;
  }

  function mapStatus(s) {
    const v = (s || "").trim().toLowerCase();
    if (v === "completed") return "Completed";
    if (["inprogress","in progress","in-progress"].includes(v)) return "In Progress";
    return "Not Yet Started";
  }

  // Col mapping (0-indexed): 2=PROJECT NAME, 3=SCOPE, 4=COMPONENTS OF WORK,
  // 6=STATUS, 7=CLIENT SUB DATE, 8=CUST REQ DATE, 17=DETAILER, 19=CHECKER
  const tasks = [];
  let currentProject = null;

  for (let i = 6; i < raw.length; i++) {
    const row = raw[i];
    if (!row || row.every(v => v === null)) continue;

    const projVal = row[2];
    if (projVal && String(projVal).trim()) currentProject = String(projVal).trim();

    const title = row[4];
    if (!title || !String(title).trim()) continue;
    if (!currentProject) continue;

    tasks.push({
      project: currentProject,
      title: String(title).trim(),
      scope: row[3] ? String(row[3]).trim() : "",
      status: mapStatus(row[6]),
      detailer: row[17] ? String(row[17]).trim() : "",
      checker: row[19] ? String(row[19]).trim() : "",
      client_sub_date: fmtDate(row[7]),
      due_date: fmtDate(row[8]),
    });
  }

  return tasks;
}

// Canonical name corrections — maps any wrong/variant spelling → correct DB name.
// RULE: Add here whenever a new Excel variant causes a duplicate user.
const NAME_MAP = {
  "siav kumar":    "Siva Kumar",
  "siva kumar":    "Siva Kumar",
  "shiva":         "Siva Kumar",    // Shiva = siav kumar = Siva Kumar (same Rebar person)
  "shiva kumar":   "Siva Kumar",
  "danush":        "Dhanush",
  "allu sai":      "Sai",
  "lokesh reddy":  "Lokesh",
  "eswar/siav kumar":    "Eswar",
  "allu sai/nanaji":     "Sai",
  "lokesh reddy/nanaji": "Lokesh",
  "nnj":                 "Nanaji",
  "eswar/nanaji":        "Eswar",
  "balaram/jagadeesh":   "Balaram",
  "sridevi / vaishnavi": "Sridevi",
};
function toTitleCase(s) { return s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase()); }
function normName(n) {
  if (!n) return "";
  const k = n.trim();
  return NAME_MAP[k.toLowerCase()] || toTitleCase(k);
}

// Split "Name1/Name2" into individual names, normalizing each part
function splitNames(raw) {
  if (!raw) return [];
  return raw.split(/[\/,&]+/).map(n => normName(n.trim())).filter(Boolean);
}

function toUsername(name) {
  return name.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function run() {

  // 1. Parse Excel
  console.log("\n📂 Parsing Excel...");
  const tasks = parseExcel();
  const projectNames = [...new Map(tasks.map(t => [t.project, true])).keys()];
  console.log(`  ✓ ${projectNames.length} projects, ${tasks.length} tasks parsed`);

  // 2. Fetch existing users
  console.log("\n👥 Fetching existing users...");
  const euRes = await req("GET", "users?select=id,name,username,role&limit=1000");
  const existingUsers = Array.isArray(euRes.body) ? euRes.body : [];
  console.log(`  Found ${existingUsers.length} existing users`);

  // 3. Collect all unique individual names from detailer/checker
  const allPeopleSet = new Set();
  for (const t of tasks) {
    for (const n of splitNames(t.detailer)) allPeopleSet.add(n);
    for (const n of splitNames(t.checker)) allPeopleSet.add(n);
  }
  const allPeople = [...allPeopleSet].filter(Boolean);

  // Build name→username map from existing users
  const userMap = {};
  for (const u of existingUsers) {
    if (u.name) userMap[u.name.toLowerCase()] = u.username;
    if (u.username) userMap[u.username.toLowerCase()] = u.username;
  }

  // 4. Create missing users
  console.log("\n👤 Checking/creating users...");
  let usersCreated = 0;

  for (const name of allPeople) {
    const key = name.toLowerCase();
    if (userMap[key]) {
      // Check by exact username query to avoid false positives
      const checkRes = await req("GET", `users?username=eq.${encodeURIComponent(userMap[key])}&select=id`);
      if (Array.isArray(checkRes.body) && checkRes.body.length > 0) {
        console.log(`  ✓ "${name}" exists (${userMap[key]})`);
        continue;
      }
    }

    // Query individually by username
    const uname = toUsername(name);
    const checkByUN = await req("GET", `users?username=eq.${encodeURIComponent(uname)}&select=id,username`);
    if (Array.isArray(checkByUN.body) && checkByUN.body.length > 0) {
      userMap[key] = uname;
      console.log(`  ✓ "${name}" exists by username (${uname})`);
      continue;
    }

    // Create new
    let username = uname;
    let r = await req("POST", "users", { name, username, password: "RDSTechserv@2026", role: "Rebar" });
    let created = Array.isArray(r.body) ? r.body[0] : r.body;
    if (created?.id) {
      userMap[key] = username;
      console.log(`  + "${name}" created (${username})`);
      usersCreated++;
    } else if (JSON.stringify(r.body).toLowerCase().includes("duplicate") || JSON.stringify(r.body).toLowerCase().includes("unique")) {
      username = uname + "_2";
      r = await req("POST", "users", { name, username, password: "RDSTechserv@2026", role: "Rebar" });
      created = Array.isArray(r.body) ? r.body[0] : r.body;
      if (created?.id) {
        userMap[key] = username;
        console.log(`  + "${name}" created with fallback username (${username})`);
        usersCreated++;
      } else {
        console.log(`  ❌ Failed to create "${name}": ${JSON.stringify(r.body).slice(0,200)}`);
      }
    } else {
      console.log(`  ❌ Failed to create "${name}": ${JSON.stringify(r.body).slice(0,200)}`);
    }
  }

  // 5. TEST INSERT
  console.log("\n🧪 Running test insert...");
  const testProj = await req("POST", "projects", {
    name: "__TEST_WHITECAP__", client: "White Cap",
    color: "#000000", description: "test", assigned_users: []
  });
  const testProjId = (Array.isArray(testProj.body) ? testProj.body[0] : testProj.body)?.id;
  if (!testProjId) {
    console.log(`  ❌ Test project failed: ${JSON.stringify(testProj.body).slice(0,300)}`);
    console.log("  Stopping — no existing data was touched.");
    return;
  }
  console.log(`  ✓ Test project OK (id=${testProjId})`);

  // Test task with auto-retry on unknown columns
  const knownBadCols = [];
  let testTaskId = null;
  let basePayload = {
    project_id: testProjId, title: "__TEST__", status: "Not Yet Started",
    client: "White Cap", tags: [], files: [], detailer: "", checker: "", scope: "", assignee: ""
  };

  for (let attempt = 0; attempt < 6; attempt++) {
    const p = { ...basePayload };
    for (const c of knownBadCols) delete p[c];
    const r = await req("POST", "tasks", p);
    const id = (Array.isArray(r.body) ? r.body[0] : r.body)?.id;
    if (id) { testTaskId = id; console.log(`  ✓ Test task OK (id=${id})`); break; }
    const errStr = JSON.stringify(r.body);
    const colMatch = errStr.match(/column "([^"]+)" of relation "tasks" does not exist/);
    if (colMatch) {
      knownBadCols.push(colMatch[1]);
      console.log(`  ⚠ Column "${colMatch[1]}" not in DB — removing`);
    } else {
      console.log(`  ❌ Test task failed: ${errStr.slice(0,300)}`);
      await req("DELETE", `projects?id=eq.${testProjId}`);
      console.log("  Stopping — no existing data was touched.");
      return;
    }
  }

  if (!testTaskId) {
    await req("DELETE", `projects?id=eq.${testProjId}`);
    console.log("  ❌ Could not insert test task. Stopping.");
    return;
  }

  // Cleanup test
  await req("DELETE", `tasks?id=eq.${testTaskId}`);
  await req("DELETE", `projects?id=eq.${testProjId}`);
  console.log("  ✓ Test records cleaned up");

  // 6. Delete existing White Cap data
  console.log("\n🗑  Deleting existing White Cap projects & tasks...");
  // Fetch ALL projects and filter by client in JS — avoids URL encoding issues
  const allProjRes = await req("GET", "projects?select=id,client&limit=5000");
  const allProjs = Array.isArray(allProjRes.body) ? allProjRes.body : [];
  const oldIds = [...new Set(
    allProjs
      .filter(p => p.client && p.client.replace(/[\s\-]/g,"").toLowerCase() === "whitecap")
      .map(p => p.id)
  )];
  console.log(`  Found ${oldIds.length} existing White Cap projects to remove`);
  for (const pid of oldIds) {
    await req("DELETE", `tasks?project_id=eq.${pid}`);
    await req("DELETE", `projects?id=eq.${pid}`);
  }
  console.log(`  ✓ Cleared ${oldIds.length} old projects and their tasks`);

  // 7. Insert projects
  console.log("\n📁 Inserting projects...");
  const projectMap = {};
  let projInserted = 0, projFailed = 0;

  for (let i = 0; i < projectNames.length; i++) {
    const pname = projectNames[i];
    const ptasks = tasks.filter(t => t.project === pname);

    const assignedSet = new Set();
    for (const t of ptasks) {
      for (const n of splitNames(t.detailer)) { const u = userMap[n.toLowerCase()]; if (u) assignedSet.add(u); }
      for (const n of splitNames(t.checker))  { const u = userMap[n.toLowerCase()]; if (u) assignedSet.add(u); }
    }

    const dues = ptasks.map(t => t.due_date).filter(Boolean).sort();
    const deadline = dues.length ? dues[dues.length - 1] : null;

    const r = await req("POST", "projects", {
      name: pname, client: "White Cap",
      color: PROJECT_COLORS[i % PROJECT_COLORS.length],
      description: `White Cap — ${pname}`,
      assigned_users: [...assignedSet],
      deadline
    });
    const created = (Array.isArray(r.body) ? r.body[0] : r.body);
    if (created?.id) {
      projectMap[pname] = created.id;
      process.stdout.write(`\r  ✓ ${++projInserted}/${projectNames.length} projects`);
    } else {
      projFailed++;
      console.log(`\n  ❌ Project "${pname}": ${JSON.stringify(r.body).slice(0,200)}`);
    }
  }
  console.log(`\n  Done: ${projInserted} inserted, ${projFailed} failed`);

  // 8. Insert tasks
  console.log("\n📋 Inserting tasks...");
  let taskInserted = 0, taskFailed = 0;
  const removedCols = [...knownBadCols];

  for (const t of tasks) {
    const pid = projectMap[t.project];
    if (!pid) { taskFailed++; continue; }

    const detPrimary = splitNames(t.detailer)[0] || "";

    let payload = {
      project_id: pid,
      title: t.title,
      status: t.status,
      client: "White Cap",
      scope: t.scope || "",
      detailer: t.detailer || "",
      checker: t.checker || "",
      assignee: detPrimary,
      due_date: t.due_date || null,
      client_sub_date: t.client_sub_date || null,
      tags: [],
      files: []
    };
    for (const c of removedCols) delete payload[c];

    let inserted = false;
    for (let attempt = 0; attempt < 6; attempt++) {
      const r = await req("POST", "tasks", payload);
      const id = (Array.isArray(r.body) ? r.body[0] : r.body)?.id;
      if (id) { inserted = true; break; }
      const errStr = JSON.stringify(r.body);
      const colMatch = errStr.match(/column "([^"]+)" of relation "tasks" does not exist/);
      if (colMatch) {
        const bad = colMatch[1];
        if (!removedCols.includes(bad)) { removedCols.push(bad); console.log(`\n  ⚠ Removing column "${bad}"`); }
        delete payload[bad];
      } else {
        console.log(`\n  ❌ Task "${t.