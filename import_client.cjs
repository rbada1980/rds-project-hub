// ══════════════════════════════════════════════════════════════
// KS&P Limited — Client Import Script
// Run from: C:\Users\HP\rds-project-hub\
// Command : node import_client.cjs
// ══════════════════════════════════════════════════════════════
const { createClient } = require('@supabase/supabase-js');

const SUPA_URL = "https://xypcbioltukahipkqqzc.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGNiaW9sdHVrYWhpcGtxcXpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0MzEzNjUsImV4cCI6MjA5NTAwNzM2NX0.DG5sv2bpx8j3Mmz0mqIsoDVaCMP2TmWqh-OQUfSZFRw";
const sb = createClient(SUPA_URL, SUPA_KEY);

const CLIENT_NAME = "KS&P Limited";

// ── Parsed from Excel ──────────────────────────────────────────
const RAW_TASKS = [
  { project:"Sports complex",   title:"SC-P1-LEVEL-1",                       status:"In Process", priority:"High", assignee:"Divya", detailer:"Divya", checker:"Naidu", due_date:"2026-06-29", client_sub_date:"2026-06-29" },
  { project:"Sports complex",   title:"SC-P1-LEVEL-2",                       status:"In Process", priority:"High", assignee:"siva",  detailer:"siva",  checker:"Naidu", due_date:"2026-06-29", client_sub_date:"2026-06-29" },
  { project:"LRC Building",     title:"LRC Building GA & Details",           status:"In Process", priority:"High", assignee:"Akash", detailer:"Akash", checker:"Naidu", due_date:"2026-06-29", client_sub_date:"2026-06-29" },
  { project:"LRC Building",     title:"LRC Building GA & Details (Checking)",status:"In Process", priority:"High", assignee:"Naidu", detailer:"Naidu", checker:"Naidu", due_date:"2026-06-29", client_sub_date:"2026-06-29" },
];

function mapStatus(s) {
  if (!s) return "Not Yet Started";
  const v = s.trim().toLowerCase();
  if (v === "completed") return "Completed";
  if (v.includes("progress") || v.includes("process") || v === "inprogress") return "In Progress";
  return "Not Yet Started";
}

const COLORS = ["#6366f1","#f59e0b","#06b6d4","#10b981","#ef4444","#8b5cf6","#ec4899","#14b8a6","#f97316","#84cc16"];
let colorIdx = 0;
const nextColor = () => COLORS[colorIdx++ % COLORS.length];

function toUsername(name) {
  return name.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
}

// Insert with auto-retry on unknown columns
async function safeInsert(table, payload, label) {
  let data = { ...payload };
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data: res, error } = await sb.from(table).insert(data).select().single();
    if (!error) { console.log(`  ✓ ${label}`); return res; }
    const colMatch = error.message?.match(/column "([^"]+)" of relation/);
    if (colMatch) {
      const col = colMatch[1];
      console.log(`  ⚠ Column "${col}" not in ${table} — removing & retrying`);
      delete data[col];
      continue;
    }
    console.log(`  ❌ ${label}: ${error.message}`);
    return null;
  }
  console.log(`  ❌ ${label}: too many retries`);
  return null;
}

async function main() {
  console.log("═══════════════════════════════════════════════");
  console.log(" KS&P Limited — Import Script");
  console.log("═══════════════════════════════════════════════\n");

  // ── STEP 1: Fetch existing users ────────────────────────────
  console.log("STEP 1: Fetching existing users…");
  const { data: existingUsers, error: ue } = await sb.from("users").select("*");
  if (ue) { console.log("❌ Cannot fetch users:", ue.message); process.exit(1); }
  console.log(`  Found ${existingUsers.length} existing users`);

  // ── STEP 2: Collect unique people names from Excel ──────────
  console.log("\nSTEP 2: Collecting unique names from Excel data…");
  const nameSet = new Set();
  for (const t of RAW_TASKS) {
    if (t.detailer) nameSet.add(t.detailer.trim());
    if (t.checker)  nameSet.add(t.checker.trim());
    if (t.assignee) nameSet.add(t.assignee.trim());
  }
  console.log("  People:", [...nameSet].join(", "));

  // ── STEP 3: Create missing users ────────────────────────────
  console.log("\nSTEP 3: Creating missing users…");
  let usersCreated = 0;
  const userMap = {}; // lowercase name/username → username
  for (const u of existingUsers) {
    if (u.name)     userMap[u.name.toLowerCase()]     = u.username;
    if (u.username) userMap[u.username.toLowerCase()] = u.username;
  }

  for (const name of nameSet) {
    const key = name.toLowerCase();
    if (userMap[key]) {
      console.log(`  ↩ "${name}" already exists as @${userMap[key]} — skipping`);
      continue;
    }
    let username = toUsername(name);
    // Check username collision too
    if (userMap[username]) {
      console.log(`  ↩ username "${username}" already taken — using existing`);
      userMap[key] = userMap[username];
      continue;
    }

    const payload = {
      name,
      username,
      password: "RDSTechserv@2026",
      role: "User",
      client_name: "",
      email: "",
    };

    const { data: nu, error: nue } = await sb.from("users").insert(payload).select().single();
    if (nue) {
      if (nue.message?.includes("duplicate") || nue.message?.includes("unique")) {
        username = username + "_2";
        payload.username = username;
        const { data: nu2, error: nue2 } = await sb.from("users").insert(payload).select().single();
        if (nue2) { console.log(`  ❌ User "${name}": ${nue2.message}`); continue; }
        console.log(`  ✓ Created user "${name}" → @${username} (renamed _2) | pw: RDSTechserv@2026`);
        userMap[key] = username; usersCreated++;
      } else {
        console.log(`  ❌ User "${name}": ${nue.message}`);
      }
    } else {
      console.log(`  ✓ Created user "${name}" → @${username} | pw: RDSTechserv@2026`);
      userMap[key] = username; usersCreated++;
    }
  }

  // ── STEP 4: SAFETY TEST INSERT ──────────────────────────────
  console.log("\nSTEP 4: Safety test insert…");
  const testProj = await safeInsert("projects", {
    name:"__TEST_IMPORT__", client:CLIENT_NAME, color:"#cccccc",
    description:"test", assigned_users:[], deadline:"2099-01-01",
  }, "test project");

  if (!testProj) {
    console.log("\n❌ Test project failed — ABORTING. No real data was changed.");
    process.exit(1);
  }

  const testTask = await safeInsert("tasks", {
    project_id:testProj.id, title:"__TEST_TASK__", status:"Not Yet Started",
    priority:"Low", assignee:"", detailer:"", checker:"", scope:"",
    due_date:"2099-01-01", client_sub_date:"2099-01-01",
    client:CLIENT_NAME, tags:[], files:[],
  }, "test task");

  if (!testTask) {
    await sb.from("projects").delete().eq("id", testProj.id);
    console.log("\n❌ Test task failed — ABORTING. Test project cleaned up.");
    process.exit(1);
  }

  // Remove test records
  await sb.from("tasks").delete().eq("id", testTask.id);
  await sb.from("projects").delete().eq("id", testProj.id);
  console.log("  ✓ Test passed — test records removed\n");

  // ── STEP 5: Delete existing KS&P data ───────────────────────
  console.log("STEP 5: Removing existing KS&P Limited projects & tasks…");
  const { data: oldProjs } = await sb.from("projects").select("id, name, client");
  const toDelete = (oldProjs || []).filter(p => {
    const c = (p.client || "").toLowerCase().replace(/[\s\-&]+/g, "");
    return c.includes("ks") && c.includes("plimited");
  });
  console.log(`  Found ${toDelete.length} existing KS&P project(s) to remove`);
  for (const p of toDelete) {
    await sb.from("tasks").delete().eq("project_id", p.id);
    await sb.from("projects").delete().eq("id", p.id);
    console.log(`  ✓ Deleted project "${p.name}" and its tasks`);
  }

  // ── STEP 6: Insert projects + tasks ─────────────────────────
  console.log("\nSTEP 6: Inserting projects and tasks…");
  const grouped = {};
  for (const t of RAW_TASKS) {
    if (!grouped[t.project]) grouped[t.project] = [];
    grouped[t.project].push(t);
  }

  let projectsInserted = 0, tasksInserted = 0, tasksFailed = 0;

  for (const [projName, tasks] of Object.entries(grouped)) {
    console.log(`\n  📁 "${projName}" — ${tasks.length} task(s)`);

    const memberKeys = new Set();
    for (const t of tasks) {
      if (t.detailer) memberKeys.add(t.detailer.trim().toLowerCase());
      if (t.checker)  memberKeys.add(t.checker.trim().toLowerCase());
      if (t.assignee) memberKeys.add(t.assignee.trim().toLowerCase());
    }
    const assigned_users = [...memberKeys].map(n => userMap[n]).filter(Boolean);
    const dates = tasks.map(t => t.due_date).filter(Boolean).sort();
    const deadline = dates[dates.length - 1] || null;

    const proj = await safeInsert("projects", {
      name: projName,
      client: CLIENT_NAME,
      color: nextColor(),
      description: "",
      assigned_users,
      deadline,
    }, `project "${projName}"`);

    if (!proj) { tasksFailed += tasks.length; continue; }
    projectsInserted++;

    for (const t of tasks) {
      const ok = await safeInsert("tasks", {
        project_id: proj.id,
        title: t.title,
        status: mapStatus(t.status),
        priority: t.priority || "Medium",
        assignee: t.assignee || "",
        detailer: t.detailer || "",
        checker: t.checker || "",
        scope: t.scope || "",
        due_date: t.due_date || null,
        client_sub_date: t.client_sub_date || null,
        client: CLIENT_NAME,
        tags: [],
        files: [],
      }, `task "${t.title}"`);
      if (ok) tasksInserted++; else tasksFailed++;
    }
  }

  // ── SUMMARY ─────────────────────────────────────────────────
  console.log("\n═══════════════════════════════════════════════");
  console.log(" IMPORT COMPLETE");
  console.log("═══════════════════════════════════════════════");
  console.log(`  ✓ Projects inserted : ${projectsInserted}`);
  console.log(`  ✓ Tasks inserted    : ${tasksInserted}`);
  console.log(`  ✓ Users created     : ${usersCreated}`);
  console.log(`  ❌ Failed           : ${tasksFailed}`);
  console.log("═══════════════════════════════════════════════\n");
  console.log("  Users created with password: RDSTechserv@2026");
  console.log("  Refresh the admin dashboard to see changes.\n");
}

main().catch(e => { console.error("\nFatal error:", e.message); process.exit(1); });
