/**
 * WhiteCap Excel → RDS App Sync Script
 * Run: node sync-whitecap.js
 * Requires: npm install @supabase/supabase-js
 */

const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

const SUPABASE_URL = "https://xypcbioltukahipkqqzc.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGNiaW9sdHVrYWhpcGtxcXpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0MzEzNjUsImV4cCI6MjA5NTAwNzM2NX0.DG5sv2bpx8j3Mmz0mqIsoDVaCMP2TmWqh-OQUfSZFRw";
const WHITECAP_CLIENT = "White Cap"; // Adjust if different in app

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── Helpers ────────────────────────────────────────────────────────────────

function norm(s) {
  return (s || "").toLowerCase().replace(/\s+/g, " ").trim();
}

function matchName(excelName, users) {
  if (!excelName) return "";
  const n = norm(excelName);
  // Exact match first
  let u = users.find((u) => norm(u.name) === n || norm(u.username) === n);
  if (u) return u.name;
  // First name match
  const firstName = n.split(" ")[0];
  u = users.find((u) => norm(u.name).startsWith(firstName));
  if (u) return u.name;
  return excelName; // Return original if no match — report later
}

// For multi-name fields like "Pavan sai/Eswar"
function matchMultiName(excelName, users) {
  if (!excelName) return "";
  const parts = excelName.split(/[/,&]+/).map((s) => s.trim()).filter(Boolean);
  if (parts.length === 1) return matchName(parts[0], users);
  return parts.map((p) => matchName(p, users)).join("/");
}

const PROJECT_COLORS = [
  "#6366f1","#f59e0b","#10b981","#3b82f6","#ec4899",
  "#8b5cf6","#14b8a6","#f97316","#06b6d4","#84cc16",
];

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log("═══════════════════════════════════════════════════");
  console.log("  WhiteCap Excel → RDS App Sync");
  console.log("═══════════════════════════════════════════════════\n");

  // Load Excel data
  const excelTasks = JSON.parse(
    fs.readFileSync(path.join(__dirname, "whitecap-data.json"), "utf8")
  );
  console.log(`✓ Loaded ${excelTasks.length} tasks from Excel\n`);

  // Fetch users
  const { data: users, error: ue } = await supabase
    .from("users")
    .select("id,name,username,role");
  if (ue) { console.error("Failed to fetch users:", ue.message); process.exit(1); }
  console.log(`✓ Fetched ${users.length} users from app`);

  // Fetch all existing projects for WhiteCap client
  const { data: allProjects, error: pe } = await supabase
    .from("projects")
    .select("id,name,client,color,assigned_users,deadline,description,group_name");
  if (pe) { console.error("Failed to fetch projects:", pe.message); process.exit(1); }

  // Filter WhiteCap projects (case-insensitive match on client field)
  const wcProjects = allProjects.filter(
    (p) => norm(p.client).includes("white cap") || norm(p.client).includes("whitecap")
  );
  console.log(`✓ Found ${wcProjects.length} existing WhiteCap projects in app`);

  // Fetch all tasks for WhiteCap projects
  const wcProjectIds = wcProjects.map((p) => p.id);
  let existingTasks = [];
  if (wcProjectIds.length > 0) {
    const { data: et, error: te } = await supabase
      .from("tasks")
      .select("id,project_id,title,status,assignee,detailer,checker,due_date,client_sub_date,det_weight,scope,priority,client")
      .in("project_id", wcProjectIds);
    if (te) { console.error("Failed to fetch tasks:", te.message); process.exit(1); }
    existingTasks = et || [];
  }
  console.log(`✓ Found ${existingTasks.length} existing WhiteCap tasks in app\n`);

  // Build lookup maps
  const projectByName = new Map(wcProjects.map((p) => [norm(p.name), p]));
  const tasksByProjectId = new Map();
  for (const t of existingTasks) {
    if (!tasksByProjectId.has(t.project_id)) tasksByProjectId.set(t.project_id, []);
    tasksByProjectId.get(t.project_id).push(t);
  }

  // Stats
  const stats = {
    projectsCreated: 0,
    tasksCreated: 0,
    tasksUpdated: 0,
    tasksSkipped: 0,
    statusFixed: 0,
    assigneeFixed: 0,
    dateFixed: 0,
    canceledSkipped: 0,
    errors: [],
    unmatchedUsers: new Set(),
  };

  // Group Excel tasks by project
  const byProject = new Map();
  for (const t of excelTasks) {
    const pn = t.project || "Unknown";
    if (!byProject.has(pn)) byProject.set(pn, []);
    byProject.get(pn).push(t);
  }

  console.log(`Processing ${byProject.size} projects...\n`);

  for (const [projName, projTasks] of byProject.entries()) {
    // Find or create project
    let project = projectByName.get(norm(projName));

    if (!project) {
      // Try fuzzy: substring match
      for (const [key, p] of projectByName.entries()) {
        if (key.includes(norm(projName)) || norm(projName).includes(key)) {
          project = p;
          break;
        }
      }
    }

    if (!project) {
      // Create project
      const colorIdx = stats.projectsCreated % PROJECT_COLORS.length;
      const { data: newProj, error: cpe } = await supabase
        .from("projects")
        .insert({
          name: projName,
          client: WHITECAP_CLIENT,
          color: PROJECT_COLORS[colorIdx],
          description: "",
          assigned_users: [],
          group_name: "White Cap",
        })
        .select()
        .single();

      if (cpe) {
        stats.errors.push(`[Project Create] "${projName}": ${cpe.message}`);
        console.log(`  ✗ Could not create project "${projName}": ${cpe.message}`);
        continue;
      }

      project = newProj;
      projectByName.set(norm(projName), project);
      stats.projectsCreated++;
      console.log(`  ✚ Created project: ${projName}`);
    }

    // Get existing tasks for this project
    const existingForProj = tasksByProjectId.get(project.id) || [];
    const taskByTitle = new Map(existingForProj.map((t) => [norm(t.title), t]));

    for (const et of projTasks) {
      // Skip canceled tasks — no matching status in app; log and skip
      if (et.status === "CANCELED") {
        stats.canceledSkipped++;
        stats.errors.push(
          `[CANCELED - SKIPPED] Row ${et.row}: "${projName}" | "${et.title}" (Excel: "${et.status_raw}")`
        );
        continue;
      }

      const detailerName = matchMultiName(et.detailer, users);
      const checkerName = matchMultiName(et.checker, users);

      // Track unmatched names
      if (et.detailer && detailerName !== et.detailer) {
        // Different means we matched — OK
      }
      // Check if any name part couldn't be matched
      const allUserNames = new Set(users.map((u) => norm(u.name)));
      const detParts = (et.detailer || "").split(/[/,&]+/).map((s) => s.trim()).filter(Boolean);
      for (const dp of detParts) {
        if (dp && !users.find((u) => norm(u.name).startsWith(norm(dp).split(" ")[0]))) {
          stats.unmatchedUsers.add(dp);
        }
      }
      const chkParts = (et.checker || "").split(/[/,&]+/).map((s) => s.trim()).filter(Boolean);
      for (const cp of chkParts) {
        if (cp && !users.find((u) => norm(u.name).startsWith(norm(cp).split(" ")[0]))) {
          stats.unmatchedUsers.add(cp);
        }
      }

      const payload = {
        project_id: project.id,
        title: et.title,
        client: WHITECAP_CLIENT,
        status: et.status,
        priority: "Medium",
        assignee: detailerName || "",
        detailer: detailerName || "",
        checker: checkerName || "",
        scope: et.scope || "",
        due_date: et.rec_date || null,
        client_sub_date: et.client_sub_date || null,
        det_weight: et.det_weight !== null ? et.det_weight : null,
        tags: [],
        files: [],
      };

      const existing = taskByTitle.get(norm(et.title));

      if (!existing) {
        // Create new task
        const { data: newTask, error: cte } = await supabase
          .from("tasks")
          .insert(payload)
          .select()
          .single();

        if (cte) {
          stats.errors.push(
            `[Task Create] Row ${et.row} "${projName}" | "${et.title}": ${cte.message}`
          );
        } else {
          stats.tasksCreated++;
          // Add to lookup to prevent duplicates within same run
          if (!tasksByProjectId.has(project.id)) tasksByProjectId.set(project.id, []);
          tasksByProjectId.get(project.id).push(newTask);
          taskByTitle.set(norm(et.title), newTask);
        }
      } else {
        // Check if update needed
        const changes = {};
        let needsUpdate = false;

        if (existing.status !== et.status) {
          changes.status = et.status;
          needsUpdate = true;
          stats.statusFixed++;
        }
        if (norm(existing.detailer || "") !== norm(detailerName)) {
          changes.detailer = detailerName;
          changes.assignee = detailerName; // keep in sync
          needsUpdate = true;
          stats.assigneeFixed++;
        }
        if (norm(existing.checker || "") !== norm(checkerName)) {
          changes.checker = checkerName;
          needsUpdate = true;
        }
        if (existing.due_date !== et.rec_date && et.rec_date) {
          changes.due_date = et.rec_date;
          needsUpdate = true;
          stats.dateFixed++;
        }
        if (existing.client_sub_date !== et.client_sub_date && et.client_sub_date) {
          changes.client_sub_date = et.client_sub_date;
          needsUpdate = true;
        }
        if (
          et.det_weight !== null &&
          parseFloat(existing.det_weight) !== et.det_weight
        ) {
          changes.det_weight = et.det_weight;
          needsUpdate = true;
        }
        if (norm(existing.scope || "") !== norm(et.scope || "")) {
          changes.scope = et.scope;
          needsUpdate = true;
        }

        if (needsUpdate) {
          const { error: ute } = await supabase
            .from("tasks")
            .update(changes)
            .eq("id", existing.id);

          if (ute) {
            stats.errors.push(
              `[Task Update] Row ${et.row} "${projName}" | "${et.title}": ${ute.message}`
            );
          } else {
            stats.tasksUpdated++;
          }
        } else {
          stats.tasksSkipped++;
        }
      }
    }
  }

  // ── Final Report ───────────────────────────────────────────────────────

  console.log("\n═══════════════════════════════════════════════════");
  console.log("  SYNC COMPLETE — FINAL REPORT");
  console.log("═══════════════════════════════════════════════════");
  console.log(`Total Excel tasks:       ${excelTasks.length}`);
  console.log(`Projects created:        ${stats.projectsCreated}`);
  console.log(`Tasks created:           ${stats.tasksCreated}`);
  console.log(`Tasks updated:           ${stats.tasksUpdated}`);
  console.log(`Tasks already correct:   ${stats.tasksSkipped}`);
  console.log(`Status corrections:      ${stats.statusFixed}`);
  console.log(`Assignee corrections:    ${stats.assigneeFixed}`);
  console.log(`Date corrections:        ${stats.dateFixed}`);
  console.log(`Canceled (skipped):      ${stats.canceledSkipped}`);

  if (stats.unmatchedUsers.size > 0) {
    console.log(`\n⚠ Unmatched user names (used as-is):`);
    for (const u of stats.unmatchedUsers) {
      console.log(`    "${u}"`);
    }
  }

  if (stats.errors.length > 0) {
    console.log(`\n✗ Issues / Exceptions (${stats.errors.length}):`);
    for (const e of stats.errors) {
      console.log(`    ${e}`);
    }
  } else {
    console.log(`\n✓ No errors — all tasks synced successfully.`);
  }

  console.log("\n═══════════════════════════════════════════════════\n");

  // Save report to file
  const report = {
    timestamp: new Date().toISOString(),
    stats: { ...stats, unmatchedUsers: [...stats.unmatchedUsers] },
    errors: stats.errors,
  };
  fs.writeFileSync(
    path.join(__dirname, "whitecap-sync-report.json"),
    JSON.stringify(report, null, 2)
  );
  console.log("Report saved to whitecap-sync-report.json");
}

main().catch((e) => { console.error("Fatal error:", e); process.exit(1); });
