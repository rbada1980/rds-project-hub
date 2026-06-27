// KS&P Limited — Import Script
// Run: cd C:\Users\HP\rds-project-hub && node import_client.cjs
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(
  "https://xypcbioltukahipkqqzc.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGNiaW9sdHVrYWhpcGtxcXpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0MzEzNjUsImV4cCI6MjA5NTAwNzM2NX0.DG5sv2bpx8j3Mmz0mqIsoDVaCMP2TmWqh-OQUfSZFRw"
);

const CLIENT_NAME = "KS&P Limited";
const COLORS = ["#6366f1","#f59e0b","#06b6d4","#10b981"];
let ci = 0;

const USERS_TO_CREATE = [
  { name:"Divya", username:"divya", password:"RDSTechserv@2026", role:"User", client_name:"", email:"" },
  { name:"siva",  username:"siva",  password:"RDSTechserv@2026", role:"User", client_name:"", email:"" },
  { name:"Akash", username:"akash", password:"RDSTechserv@2026", role:"User", client_name:"", email:"" },
  { name:"Naidu", username:"naidu", password:"RDSTechserv@2026", role:"User", client_name:"", email:"" },
];

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
  if (v.includes("progress") || v.includes("process")) return "In Progress";
  return "Not Yet Started";
}

async function safeInsert(table, payload, label) {
  let data = { ...payload };
  for (let i = 0; i < 6; i++) {
    const { data: res, error } = await sb.from(table).insert(data).select().single();
    if (!error) { console.log(`  ✓ ${label}`); return res; }
    const col = error.message?.match(/column "([^"]+)" of relation/)?.[1];
    if (col) { console.log(`  ⚠ Removing unknown column "${col}" — retrying`); delete data[col]; continue; }
    console.log(`  ❌ ${label}: ${error.message}`);
    return null;
  }
  return null;
}

async function main() {
  console.log("═══════════════════════════════════════════════");
  console.log("  KS&P Limited — Import Script");
  console.log("═══════════════════════════════════════════════\n");

  // ── STEP 1: Check each user individually by username ──────────
  console.log("STEP 1: Checking & creating users one by one…\n");
  let usersCreated = 0;
  const nameToUsername = {}; // display name (lower) → username

  for (const u of USERS_TO_CREATE) {
    console.log(`  Checking @${u.username} (name: "${u.name}")…`);

    // Check by exact username
    const { data: byU } = await sb.from("users").select("id,name,username").eq("username", u.username);
    if (byU && byU.length > 0) {
      const existing = byU[0];
      if (existing.name.toLowerCase() === u.name.toLowerCase()) {
        console.log(`    → Already exists with same name. Skipping.`);
        nameToUsername[u.name.toLowerCase()] = existing.username;
        continue;
      } else {
        // Different person owns this username
        console.log(`    → @${u.username} is taken by "${existing.name}" (different person)`);
        console.log(`    → Will create @${u.username}_ksp for "${u.name}"`);
        const alt = { ...u, username: u.username + "_ksp" };
        const { data: nu, error: nue } = await sb.from("users").insert(alt).select().single();
        if (nue) { console.log(`    ❌ Failed: ${nue.message}`); }
        else { console.log(`    ✓ Created "${u.name}" → @${alt.username} | pw: ${u.password}`); nameToUsername[u.name.toLowerCase()] = alt.username; usersCreated++; }
        continue;
      }
    }

    // Check by exact name
    const { data: byN } = await sb.from("users").select("id,name,username").ilike("name", u.name);
    if (byN && byN.length > 0) {
      console.log(`    → Name "${u.name}" exists as @${byN[0].username}. Skipping.`);
      nameToUsername[u.name.toLowerCase()] = byN[0].username;
      continue;
    }

    // Not found at all — create with exact credentials
    const { data: nu, error: nue } = await sb.from("users").insert(u).select().single();
    if (nue) {
      console.log(`    ❌ Failed to create "${u.name}": ${nue.message}`);
    } else {
      console.log(`    ✓ Created "${u.name}" → @${u.username} | pw: ${u.password}`);
      nameToUsername[u.name.toLowerCase()] = u.username;
      usersCreated++;
    }
  }

  console.log(`\n  → ${usersCreated} user(s) created`);

  // ── STEP 2: Safety test ────────────────────────────────────────
  console.log("\nSTEP 2: Safety test insert…");
  const tp = await safeInsert("projects", { name:"__TEST__", client:CLIENT_NAME, color:"#ccc", description:"", assigned_users:[], deadline:"2099-01-01" }, "test project");
  if (!tp) { console.log("❌ ABORTED"); process.exit(1); }
  const tt = await safeInsert("tasks", { project_id:tp.id, title:"__TEST__", status:"Not Yet Started", priority:"Low", assignee:"", detailer:"", checker:"", scope:"", due_date:"2099-01-01", client_sub_date:"2099-01-01", client:CLIENT_NAME, tags:[], files:[] }, "test task");
  if (!tt) { await sb.from("projects").delete().eq("id", tp.id); console.log("❌ ABORTED"); process.exit(1); }
  await sb.from("tasks").delete().eq("id", tt.id);
  await sb.from("projects").delete().eq("id", tp.id);
  console.log("  ✓ Test passed\n");

  // ── STEP 3: Delete existing KS&P data ─────────────────────────
  console.log("STEP 3: Removing existing KS&P projects & tasks…");
  const { data: oldProjs } = await sb.from("projects").select("id,name,client");
  const toDelete = (oldProjs||[]).filter(p => {
    const c = (p.client||"").toLowerCase().replace(/[\s\-&]+/g,"");
    return c.includes("ks") && c.includes("plimited");
  });
  for (const p of toDelete) {
    await sb.from("tasks").delete().eq("project_id", p.id);
    await sb.from("projects").delete().eq("id", p.id);
    console.log(`  ✓ Deleted "${p.name}" + tasks`);
  }
  console.log(`  → ${toDelete.length} project(s) removed\n`);

  // ── STEP 4: Insert projects + tasks ───────────────────────────
  console.log("STEP 4: Inserting projects and tasks…");
  const grouped = {};
  for (const t of RAW_TASKS) { if (!grouped[t.project]) grouped[t.project]=[]; grouped[t.project].push(t); }

  let projCount=0, taskCount=0, failCount=0;

  for (const [projName, tasks] of Object.entries(grouped)) {
    console.log(`\n  📁 "${projName}" — ${tasks.length} task(s)`);

    const memberSet = new Set();
    for (const t of tasks) {
      [t.assignee, t.detailer, t.checker].filter(Boolean).forEach(n => {
        const un = nameToUsername[n.trim().toLowerCase()];
        if (un) memberSet.add(un);
      });
    }
    const assigned_users = [...memberSet];
    const deadline = tasks.map(t=>t.due_date).filter(Boolean).sort().pop() || null;

    console.log(`     assigned_users: [${assigned_users.join(", ")}]`);

    const proj = await safeInsert("projects", {
      name:projName, client:CLIENT_NAME, color:COLORS[ci++%COLORS.length],
      description:"", assigned_users, deadline,
    }, `project "${projName}"`);
    if (!proj) { failCount+=tasks.length; continue; }
    projCount++;

    for (const t of tasks) {
      const ok = await safeInsert("tasks", {
        project_id:      proj.id,
        title:           t.title,
        status:          mapStatus(t.status),
        priority:        t.priority||"Medium",
        assignee:        t.assignee||"",
        detailer:        t.detailer||"",
        checker:         t.checker||"",
        scope:           t.scope||"",
        due_date:        t.due_date||null,
        client_sub_date: t.client_sub_date||null,
        client:          CLIENT_NAME,
        tags:[], files:[],
      }, `task "${t.title}" [assignee:${t.assignee} detailer:${t.detailer} checker:${t.checker}]`);
      if (ok) taskCount++; else failCount++;
    }
  }

  // ── SUMMARY ───────────────────────────────────────────────────
  console.log("\n═══════════════════════════════════════════════");
  console.log("  IMPORT COMPLETE");
  console.log("═══════════════════════════════════════════════");
  console.log(`  ✓ Users created     : ${usersCreated}`);
  console.log(`  ✓ Projects inserted : ${projCount}`);
  console.log(`  ✓ Tasks inserted    : ${taskCount}`);
  console.log(`  ❌ Failed           : ${failCount}`);
  console.log("═══════════════════════════════════════════════\n");
}

main().catch(e => { console.error("❌ Fatal:", e.message); process.exit(1); });
