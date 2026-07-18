// KS&P Limited — import script
// Run with: node import_ksp_limited.cjs
// Creates 2 projects + 4 tasks in Supabase AND local PostgreSQL (localhost:3000)

const SUPA_URL  = "https://xypcbioltukahipkqqzc.supabase.co";
const SUPA_KEY  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGNiaW9sdHVrYWhpcGtxcXpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0MzEzNjUsImV4cCI6MjA5NTAwNzM2NX0.DG5sv2bpx8j3Mmz0mqIsoDVaCMP2TmWqh-OQUfSZFRw";
const LOCAL_URL = "http://localhost:3000";
const CLIENT    = "KS&P Limited";

const HEADERS = {
  "apikey":        SUPA_KEY,
  "Authorization": `Bearer ${SUPA_KEY}`,
  "Content-Type":  "application/json",
  "Prefer":        "return=representation",
};

// ── helpers ──────────────────────────────────────────────────────────────────

async function supaPost(table, body) {
  const res = await fetch(`${SUPA_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`Supabase POST /${table} → ${res.status}: ${JSON.stringify(json)}`);
  return Array.isArray(json) ? json[0] : json;
}

async function supaGet(table, queryString) {
  const res = await fetch(`${SUPA_URL}/rest/v1/${table}?${queryString}`, { headers: HEADERS });
  const json = await res.json();
  if (!res.ok) throw new Error(`Supabase GET /${table} → ${res.status}: ${JSON.stringify(json)}`);
  return json;
}

async function localPost(path, body) {
  try {
    const res = await fetch(`${LOCAL_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(`Local POST ${path} → ${res.status}: ${JSON.stringify(json)}`);
    return json;
  } catch (e) {
    // Local server optional — warn but don't abort
    console.warn(`  ⚠️  Local server not reached for ${path}: ${e.message}`);
    return null;
  }
}

// ── project definitions ───────────────────────────────────────────────────────

const PROJECTS = [
  { name: "Sports complex", deadline: "2026-07-29", color: "#14b8a6" },
  { name: "LRC Building",   deadline: "2026-06-29", color: "#f59e0b" },
];

// ── task definitions (project resolved by name after creation) ────────────────

const TASKS_RAW = [
  {
    project: "Sports complex",
    title:   "SC-P1-LEVEL-1",
    status:  "In Progress",
    priority:"Low",
    assignee:"Divya",
    detailer:"Divya",
    checker: "Naidu",
    due_date:"2026-07-29",
  },
  {
    project: "Sports complex",
    title:   "SC-P1-LEVEL-2",
    status:  "In Progress",
    priority:"Low",
    assignee:"siva",   // siva (Tekla team) — different from sivakumar (Rebar team)
    detailer:"siva",
    checker: "Naidu",
    due_date:"2026-07-29",
  },
  {
    project: "LRC Building",
    title:   "LRC Building GA & Details",
    status:  "In Progress",
    priority:"Low",
    assignee:"Akash",
    detailer:"Akash",
    checker: "Naidu",
    due_date:"2026-06-29",
  },
  {
    project: "LRC Building",
    title:   "LRC Building GA & Details (Checking)",
    status:  "In Progress",
    priority:"Low",
    assignee:"Naidu",
    detailer:"Naidu",
    checker: "Naidu",
    due_date:"2026-06-29",
  },
];

// ── main ─────────────────────────────────────────────────────────────────────

(async () => {
  console.log("═══════════════════════════════════════");
  console.log("  KS&P Limited Import  —  " + new Date().toLocaleString());
  console.log("═══════════════════════════════════════\n");

  const projectIdMap = {}; // name → id

  // ── 1. Projects ──────────────────────────────────────────────────────────

  for (const proj of PROJECTS) {
    // Check if already exists in Supabase
    const existing = await supaGet(
      "projects",
      `name=eq.${encodeURIComponent(proj.name)}&client=eq.${encodeURIComponent(CLIENT)}&select=id,name`
    );

    if (existing.length > 0) {
      console.log(`✅ Project already exists: "${proj.name}" (id=${existing[0].id})`);
      projectIdMap[proj.name] = existing[0].id;
    } else {
      const body = {
        name:     proj.name,
        client:   CLIENT,
        color:    proj.color,
        deadline: proj.deadline,
        description: "",
        assigned_users: [],
        group_name: "",
      };

      console.log(`📁 Creating project: "${proj.name}" …`);
      const created = await supaPost("projects", body);
      projectIdMap[proj.name] = created.id;
      console.log(`   Supabase → id=${created.id} ✔`);

      // Local PostgreSQL
      const local = await localPost("/api/projects", { ...body });
      if (local) console.log(`   Local PG  → id=${local.id||local.rows?.[0]?.id||"ok"} ✔`);
    }
  }

  console.log();

  // ── 2. Tasks ─────────────────────────────────────────────────────────────

  for (const t of TASKS_RAW) {
    const project_id = projectIdMap[t.project];
    if (!project_id) {
      console.error(`❌ No project_id found for "${t.project}" — skipping task "${t.title}"`);
      continue;
    }

    // Check if task already exists
    const existing = await supaGet(
      "tasks",
      `title=eq.${encodeURIComponent(t.title)}&project_id=eq.${project_id}&select=id,title`
    );

    if (existing.length > 0) {
      console.log(`✅ Task already exists: "${t.title}" (id=${existing[0].id})`);
      continue;
    }

    const body = {
      project_id,
      title:          t.title,
      client:         CLIENT,
      status:         t.status,
      priority:       t.priority,
      assignee:       t.assignee,
      detailer:       t.detailer,
      checker:        t.checker,
      due_date:       t.due_date,
      client_sub_date:null,
      scope:          "",
      tags:           [],
      files:          [],
    };

    console.log(`📝 Creating task: "${t.title}" [${t.project}] …`);
    const created = await supaPost("tasks", body);
    console.log(`   Supabase → id=${created.id} ✔`);

    const local = await localPost("/api/tasks", body);
    if (local) console.log(`   Local PG  → id=${local.id||local.rows?.[0]?.id||"ok"} ✔`);
  }

  console.log("\n═══════════════════════════════════════");
  console.log("  Import complete! Refresh the app.");
  console.log("═══════════════════════════════════════");
})().catch(e => {
  console.error("\n❌ Fatal error:", e.message);
  process.exit(1);
});
