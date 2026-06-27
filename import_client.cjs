// ══════════════════════════════════════════════════════════════
// KS&P Limited — Client Import Script
// Run: cd C:\Users\HP\rds-project-hub && node import_client.cjs
// ══════════════════════════════════════════════════════════════
const { createClient } = require('@supabase/supabase-js');

const SUPA_URL = "https://xypcbioltukahipkqqzc.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGNiaW9sdHVrYWhpcGtxcXpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0MzEzNjUsImV4cCI6MjA5NTAwNzM2NX0.DG5sv2bpx8j3Mmz0mqIsoDVaCMP2TmWqh-OQUfSZFRw";
const sb = createClient(SUPA_URL, SUPA_KEY);

const CLIENT_NAME = "KS&P Limited";

// ── Parsed from Excel ──────────────────────────────────────────
const RAW_TASKS = [
  { project:"Sports complex",  title:"SC-P1-LEVEL-1",                       status:"In Process", priority:"High", assignee:"Divya", detailer:"Divya", checker:"Naidu", due_date:"2026-06-29", client_sub_date:"2026-06-29" },
  { project:"Sports complex",  title:"SC-P1-LEVEL-2",                       status:"In Process", priority:"High", assignee:"siva",  detailer:"siva",  checker:"Naidu", due_date:"2026-06-29", client_sub_date:"2026-06-29" },
  { project:"LRC Building",    title:"LRC Building GA & Details",           status:"In Process", priority:"High", assignee:"Akash", detailer:"Akash", checker:"Naidu", due_date:"2026-06-29", client_sub_date:"2026-06-29" },
  { project:"LRC Building",    title:"LRC Building GA & Details (Checking)",status:"In Process", priority:"High", assignee:"Naidu", detailer:"Naidu", checker:"Naidu", due_date:"2026-06-29", client_sub_date:"2026-06-29" },
];

function mapStatus(s) {
  if (!s) return "Not Yet Started";
  const v = s.trim().toLowerCase();
  if (v === "completed") return "Completed";
  if (v.includes("progress") || v.includes("process") || v === "inprogress") return "In Progress";
  return "Not Yet Started";
}

const COLORS = ["#6366f1","#f59e0b","#06b6d4","#10b981","#ef4444","#8b5cf6"];
let colorIdx = 0;
const nextColor = () => COLORS[colorIdx++ % COLORS.length];

function toUsername(name) {
  return name.trim().toLowerCase().replace(/\s+/g,'_').replace(/[^a-z0-9_]/g,'');
}

async function safeInsert(table, payload, label) {
  let data = { ...payload };
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data: res, error } = await sb.from(table).insert(data).select().single();
    if (!error) { console.log(`  ✓ ${label}`); return res; }
    const colMatch = error.message?.match(/column "([^"]+)" of relation/);
    if (colMatch) {
      const col = colMatch[1];
      console.log(`  ⚠ Column "${col}" not in ${table} — removing & retrying`);
      delete data[col]; continue;
    }
    console.log(`  ❌ ${label}: ${error.message}`);
    return null;
  }
  return null;
}

async function main() {
  console.log("═══════════════════════════════════════════════");
  console.log(" KS&P Limited — Import Script");
  console.log("═══════════════════════════════════════════════\n");

  // STEP 1: Fetch all existing users
  console.log("STEP 1: Fetching existing users…");
  const { data: existingUsers, error: ue } = await sb.from("users").select("*");
  if (ue) { console.log("❌ Cannot fetch users:", ue.message); process.exit(1); }
  console.log(`  Found ${existingUsers.length} existing users`);
  existingUsers.forEach(u => console.log(`    - name:"${u.name}" username:"${u.username}"`));

  // STEP 2: Collect unique people names from Excel
  console.log("\nSTEP 2: Collecting unique names from Excel…");
  const nameSet = new Set();
  for (const t of RAW_TASKS) {
    if (t.assignee) nameSet.add(t.assignee.trim());
    if (t.detailer) nameSet.add(t.detailer.trim());
    if (t.checker)  nameSet.add(t.checker.trim());
  }
  console.log("  People needed:", [...nameSet].join(", "));

  // STEP 3: Create missing users — match by EXACT NAME only
  console.log("\nSTEP 3: Creating missing users…");
  let usersCreated = 0;

  // name (lowercase) → username mapping for project assignment
  const nameToUsername = {};
  for (const u of existingUsers) {
    if (u.name) nameToUsername[u.name.toLowerCase()] = u.username;
  }

  // Collect all taken usernames
  const takenUsernames = new Set(existingUsers.map(u => u.username?.toLowerCase()).filter(Boolean));

  for (const name of nameSet) {
    const key = name.toLowerCase();

    // Only skip if EXACT name already exists
    if (nameToUsername[key]) {
      console.log(`  ↩ "${name}" exact name match found → @${nameToUsername[key]} — skipping`);
      continue;
    }

    // Name doesn't exist — create new user
    let username = toUsername(name);

    // Handle username collision (could belong to a DIFFERENT person)
    if (takenUsernames.has(username)) {
      username = username + "_ksp";
      console.log(`  ⚠ Username "${toUsername(name)}" taken by another user — using "${username}"`);
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
        if (nue2) { console.log(`  ❌ "${name}": ${nue2.message}`); continue; }
        console.log(`  ✓ Created "${name}" → @${username} | pw: RDSTechserv@2026`);
        nameToUsername[key] = username;
        takenUsernames.add(username);
        usersCreated++;
      } else {
        console.log(`  ❌ "${name}": ${nue.message}`);
      }
    } else {
      console.log(`  ✓ Created "${name}" → @${username} | pw: RDSTechserv@2026`);
      nameToUsername[key] = username;
      takenUsernames.add(username);
      usersCreated++;
    }
  }

  // STEP 4: Safety test insert
  console.log("\nSTEP 4: Safety test insert…");
  const testProj = await safeInsert("projects", {
    name:"__TEST_IMPORT__", client:CLIENT_NAME, color:"#cccccc",
    description:"test", assigned_users:[], deadline:"2099-01-01",
  }, "test project");
  if (!testProj) { console.log("❌ ABORTING — test project failed."); process.exit(1); }

  const testTask = await safeInsert("tasks", {
    project_id:testProj.id, title:"__TEST_TASK__", status:"Not Yet Started",
    priority:"Low", assignee:"", detailer:"", checker:"", scope:"",
    due_date:"2099-01-01", client_sub_date:"2099-01-01",
    client:CLIENT_NAME, tags:[], files:[],
  }, "test task");
  if (!testTask) {
    await sb.from("projects").delete().eq("id", testProj.id);
    console.log("❌ ABORTING — test task failed. Project cleaned up.");
    process.exit(1);
  }
  await sb.from("tasks").delete().eq("id", testTask.id);
  await sb.from("projects").delete().eq("id", testProj.id);
  console.log("  ✓ Test passed — cleaned up\n");

  // STEP 5: Delete existing KS&P data
  console.log("STEP 5: Removing existing KS&P Limited projects & tasks…");
  const { data: oldProjs } = await sb.from("projects").select("id, name, client");
  const toDelete = (oldProjs || []).filter(p => {
    const c = (p.client || "").toLowerCase().replace(/[\s\-&]+/g,"");
    return c.includes("ks") && c.includes("plimited");
  });
  console.log(`  Found ${toDelete.length} existing KS&P project(s)`);
  for (const p of toDelete) {
    await sb.from("tasks").delete().eq("project_id", p.id);
    await sb.from("projects").delete().eq("id", p.id);
    console.log(`  ✓ Deleted "${p.name}" and its tasks`);
  }

  // STEP 6: Insert projects and tasks
  console.log("\nSTEP 6: Inserting projects and tasks…");
  const grouped = {};
  for (const t of RAW_TASKS) {
    if (!grouped[t.project]) grouped[t.project] = [];
    grouped[t.project].push(t);
  }

  let projectsInserted=0, tasksInserted=0, tasksFailed=0;

  for (const [projName, tasks] of Object.entries(grouped)) {
    console.log(`\n  📁 "${projName}" — ${tasks.length} task(s)`);

    // assigned_users = unique usernames for this project
    const memberKeys = new Set();
    for (const t of tasks) {
      if (t.assignee) memberKeys.add(t.assignee.trim().toLowerCase());
      if (t.detailer) memberKeys.add(t.detailer.trim().toLowerCase());
      if (t.checker)  memberKeys.add(t.checker.trim().toLowerCase());
    }
    const assigned_users = [...memberKeys].map(n => nameToUsername[n]).filter(Boolean);
    const dates = tasks.map(t=>t.due_date).filter(Boolean).sort();
    const deadline = dates[dates.length-1] || null;

    const proj = await safeInsert("projects", {
      name:projName, client:CLIENT_NAME, color:nextColor(),
      description:"", assigned_users, deadline,
    }, `project "${projName}"`);
    if (!proj) { tasksFailed+=tasks.length; continue; }
    projectsInserted++;

    for (const t of tasks) {
      // assignee stored as display name (how app renders it)
      const ok = await safeInsert("tasks", {
        project_id: proj.id,
        title:      t.title,
        status:     mapStatus(t.status),
        priority:   t.priority || "Medium",
        assignee:   t.assignee || "",
        detailer:   t.detailer || "",
        checker:    t.checker  || "",
        scope:      t.scope    || "",
        due_date:       t.due_date       || null,
        client_sub_date:t.client_sub_date|| null,
        client: CLIENT_NAME,
        tags:[], files:[],
      }, `task "${t.title}" → assignee:${t.assignee}`);
      if (ok) tasksInserted++; else tasksFailed++;
    }
  }

  // SUMMARY
  console.log("\n═══════════════════════════════════════════════");
  console.log(" IMPORT COMPLETE");
  console.log("═══════════════════════════════════════════════");
  console.log(`  ✓ Projects inserted : ${projectsInserted}`);
  console.log(`  ✓ Tasks inserted    : ${tasksInserted}`);
  console.log(`  ✓ Users created     : ${usersCreated}`);
  console.log(`  ❌ Failed           : ${tasksFailed}`);
  if (usersCreated > 0) {
    console.log("\n  New users (password: RDSTechserv@2026):");
    for (const name of nameSet) {
      const un = nameToUsername[name.toLowerCase()];
      if (un) console.log(`    ${name} → @${un}`);
    }
  }
  console.log("═══════════════════════════════════════════════\n");
}

main().catch(e => { console.error("Fatal:", e.message); process.exit(1); });
