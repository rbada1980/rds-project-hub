// ══════════════════════════════════════════════════════════════
// KS&P Limited — Client Import Script
// Run: cd C:\Users\HP\rds-project-hub && node import_client.cjs
// ══════════════════════════════════════════════════════════════
const { createClient } = require('@supabase/supabase-js');

const SUPA_URL = "https://xypcbioltukahipkqqzc.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGNiaW9sdHVrYWhpcGtxcXpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0MzEzNjUsImV4cCI6MjA5NTAwNzM2NX0.DG5sv2bpx8j3Mmz0mqIsoDVaCMP2TmWqh-OQUfSZFRw";
const sb = createClient(SUPA_URL, SUPA_KEY);

const CLIENT_NAME = "KS&P Limited";
const DEFAULT_PASSWORD = "RDSTechserv@2026";
const COLORS = ["#6366f1","#f59e0b","#06b6d4","#10b981","#ef4444","#8b5cf6","#ec4899","#14b8a6"];
let colorIdx = 0;
const nextColor = () => COLORS[colorIdx++ % COLORS.length];

// ── Parsed from Excel ──────────────────────────────────────────
const RAW_TASKS = [
  { project:"Sports complex", title:"SC-P1-LEVEL-1",                        status:"In Process", priority:"High", assignee:"Divya", detailer:"Divya", checker:"Naidu", scope:"", due_date:"2026-06-29", client_sub_date:"2026-06-29" },
  { project:"Sports complex", title:"SC-P1-LEVEL-2",                        status:"In Process", priority:"High", assignee:"siva",  detailer:"siva",  checker:"Naidu", scope:"", due_date:"2026-06-29", client_sub_date:"2026-06-29" },
  { project:"LRC Building",   title:"LRC Building GA & Details",            status:"In Process", priority:"High", assignee:"Akash", detailer:"Akash", checker:"Naidu", scope:"", due_date:"2026-06-29", client_sub_date:"2026-06-29" },
  { project:"LRC Building",   title:"LRC Building GA & Details (Checking)", status:"In Process", priority:"High", assignee:"Naidu", detailer:"Naidu", checker:"Naidu", scope:"", due_date:"2026-06-29", client_sub_date:"2026-06-29" },
];

function mapStatus(s) {
  if (!s) return "Not Yet Started";
  const v = s.trim().toLowerCase();
  if (v === "completed") return "Completed";
  if (v.includes("progress") || v.includes("process") || v === "inprogress") return "In Progress";
  return "Not Yet Started";
}

function toUsername(name) {
  return name.trim().toLowerCase().replace(/\s+/g,'_').replace(/[^a-z0-9_]/g,'');
}

// Insert one record — auto-removes unknown columns and retries
async function safeInsert(table, payload, label) {
  let data = { ...payload };
  for (let attempt = 0; attempt < 6; attempt++) {
    const { data: res, error } = await sb.from(table).insert(data).select().single();
    if (!error) { console.log(`  ✓ ${label}`); return res; }
    const col = error.message?.match(/column "([^"]+)" of relation/)?.[1];
    if (col) { console.log(`  ⚠ Column "${col}" not found — removing & retrying`); delete data[col]; continue; }
    console.log(`  ❌ ${label} — ${error.message}`);
    return null;
  }
  console.log(`  ❌ ${label} — max retries reached`);
  return null;
}

async function main() {
  console.log("═══════════════════════════════════════════════════");
  console.log("  KS&P Limited — Import Script");
  console.log("═══════════════════════════════════════════════════\n");

  // ── STEP 1: Fetch existing users ──────────────────────────────
  console.log("STEP 1: Fetching existing users from DB…");
  const { data: existingUsers, error: fetchErr } = await sb.from("users").select("id,name,username");
  if (fetchErr) { console.log("❌ Cannot fetch users:", fetchErr.message); process.exit(1); }
  console.log(`  Found ${existingUsers.length} existing users in DB`);

  // ── STEP 2: Collect unique names from Detailer + Checker + Assignee ──
  console.log("\nSTEP 2: Collecting unique people names from Excel…");
  const nameSet = new Set();
  for (const t of RAW_TASKS) {
    if (t.detailer) nameSet.add(t.detailer.trim());
    if (t.checker)  nameSet.add(t.checker.trim());
    if (t.assignee) nameSet.add(t.assignee.trim());
  }
  console.log("  People needed:", [...nameSet].join(", "));

  // ── STEP 3: Create missing users ─────────────────────────────
  console.log("\nSTEP 3: Creating missing users…");
  let usersCreated = 0;

  // Build lookup: lowercase name → username
  const nameToUsername = {};
  for (const u of existingUsers) {
    if (u.name)     nameToUsername[u.name.toLowerCase()]     = u.username;
    if (u.username) nameToUsername[u.username.toLowerCase()] = u.username;
  }

  for (const name of nameSet) {
    const key = name.toLowerCase();
    const uname = toUsername(name);

    // Check: does exact name OR exact username already exist?
    const nameExists = !!nameToUsername[key];
    const unameExists = !!nameToUsername[uname];

    if (nameExists) {
      console.log(`  ↩ "${name}" already exists as @${nameToUsername[key]} — skipping`);
      continue;
    }

    // Username conflict with a DIFFERENT person → use _2
    let username = uname;
    if (unameExists) {
      username = uname + "_2";
      console.log(`  ⚠ @${uname} taken by different user — will use @${username}`);
    }

    const payload = { name, username, password: DEFAULT_PASSWORD, role: "User", client_name: "", email: "" };
    const { data: nu, error: nue } = await sb.from("users").insert(payload).select().single();
    if (nue) {
      // Still duplicate? Try _2 one more time
      if (nue.message?.includes("duplicate") || nue.message?.includes("unique")) {
        payload.username = username + "_2";
        const { data: nu2, error: nue2 } = await sb.from("users").insert(payload).select().single();
        if (nue2) { console.log(`  ❌ "${name}": ${nue2.message}`); continue; }
        console.log(`  ✓ Created "${name}" → @${payload.username} | pw: ${DEFAULT_PASSWORD}`);
        nameToUsername[key] = payload.username; usersCreated++;
      } else {
        console.log(`  ❌ "${name}": ${nue.message}`);
      }
    } else {
      console.log(`  ✓ Created "${name}" → @${username} | pw: ${DEFAULT_PASSWORD}`);
      nameToUsername[key] = username;
      nameToUsername[username] = username;
      usersCreated++;
    }
  }

  // ── STEP 4: Safety test insert ────────────────────────────────
  console.log("\nSTEP 4: Safety test insert…");
  const testProj = await safeInsert("projects", {
    name:"__TEST_IMPORT__", client:CLIENT_NAME, color:"#cccccc",
    description:"test", assigned_users:[], deadline:"2099-01-01",
  }, "test project");
  if (!testProj) { console.log("\n❌ ABORTED — test project insert failed. No real data was changed."); process.exit(1); }

  const testTask = await safeInsert("tasks", {
    project_id:testProj.id, title:"__TEST_TASK__", status:"Not Yet Started",
    priority:"Low", assignee:"", detailer:"", checker:"", scope:"",
    due_date:"2099-01-01", client_sub_date:"2099-01-01",
    client:CLIENT_NAME, tags:[], files:[],
  }, "test task");
  if (!testTask) {
    await sb.from("projects").delete().eq("id", testProj.id);
    console.log("\n❌ ABORTED — test task insert failed. Test project cleaned up. No real data was changed.");
    process.exit(1);
  }

  // Clean up test records
  await sb.from("tasks").delete().eq("id", testTask.id);
  await sb.from("projects").delete().eq("id", testProj.id);
  console.log("  ✓ Test passed — test records deleted\n");

  // ── STEP 5: Delete existing KS&P data ────────────────────────
  console.log("STEP 5: Removing existing KS&P Limited projects & tasks…");
  const { data: allProjs } = await sb.from("projects").select("id,name,client");
  const toDelete = (allProjs || []).filter(p => {
    const c = (p.client || "").toLowerCase().replace(/[\s\-&]+/g, "");
    return c.includes("ks") && c.includes("plimited");
  });
  console.log(`  Found ${toDelete.length} existing KS&P project(s) to remove`);
  for (const p of toDelete) {
    await sb.from("tasks").delete().eq("project_id", p.id);
    await sb.from("projects").delete().eq("id", p.id);
    console.log(`  ✓ Deleted project "${p.name}" and all its tasks`);
  }

  // ── STEP 6: Group tasks by project and insert ─────────────────
  console.log("\nSTEP 6: Inserting projects and tasks…");
  const grouped = {};
  for (const t of RAW_TASKS) {
    if (!grouped[t.project]) grouped[t.project] = [];
    grouped[t.project].push(t);
  }

  let projCount = 0, taskCount = 0, failCount = 0;

  for (const [projName, tasks] of Object.entries(grouped)) {
    console.log(`\n  📁 "${projName}" — ${tasks.length} task(s)`);

    // Build assigned_users list (usernames) for this project
    const memberSet = new Set();
    for (const t of tasks) {
      if (t.assignee) memberSet.add(t.assignee.trim().toLowerCase());
      if (t.detailer) memberSet.add(t.detailer.trim().toLowerCase());
      if (t.checker)  memberSet.add(t.checker.trim().toLowerCase());
    }
    const assigned_users = [...memberSet].map(n => nameToUsername[n]).filter(Boolean);

    // Deadline = latest due_date among tasks
    const deadline = tasks.map(t => t.due_date).filter(Boolean).sort().pop() || null;

    const proj = await safeInsert("projects", {
      name: projName,
      client: CLIENT_NAME,
      color: nextColor(),
      description: "",
      assigned_users,
      deadline,
    }, `project "${projName}"`);

    if (!proj) { failCount += tasks.length; continue; }
    projCount++;

    for (const t of tasks) {
      const ok = await safeInsert("tasks", {
        project_id:      proj.id,
        title:           t.title,
        status:          mapStatus(t.status),
        priority:        t.priority || "Medium",
        assignee:        t.assignee || "",
        detailer:        t.detailer || "",
        checker:         t.checker  || "",
        scope:           t.scope    || "",
        due_date:        t.due_date        || null,
        client_sub_date: t.client_sub_date || null,
        client:          CLIENT_NAME,
        tags:  [],
        files: [],
      }, `task "${t.title}" [assignee:${t.assignee} detailer:${t.detailer} checker:${t.checker}]`);
      if (ok) taskCount++; else failCount++;
    }
  }

  // ── SUMMARY ───────────────────────────────────────────────────
  console.log("\n═══════════════════════════════════════════════════");
  console.log("  IMPORT COMPLETE");
  console.log("═══════════════════════════════════════════════════");
  console.log(`  ✓ Users created     : ${usersCreated}`);
  console.log(`  ✓ Projects inserted : ${projCount}`);
  console.log(`  ✓ Tasks inserted    : ${taskCount}`);
  console.log(`  ❌ Failed           : ${failCount}`);
  console.log("═══════════════════════════════════════════════════");
  if (usersCreated > 0) {
    console.log(`\n  All new users have password: ${DEFAULT_PASSWORD}`);
  }
  console.log("  Refresh admin dashboard to see changes.\n");
}

main().catch(e => { console.error("\n❌ Fatal error:", e.message); process.exit(1); });
