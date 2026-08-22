// fix-whitecap-t1-cleanup.cjs
// Removes projects and tasks that came from Tracker1 (not in Tracker2/latest Excel)
// Usage:
//   node fix-whitecap-t1-cleanup.cjs          ← dry-run
//   node fix-whitecap-t1-cleanup.cjs --apply  ← delete

const XLSX   = require("xlsx");
const path   = require("path");
const fs     = require("fs");
const { createClient } = require("@supabase/supabase-js");

const DRY = !process.argv.includes("--apply");
const sb  = createClient(
  "https://xypcbioltukahipkqqzc.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGNiaW9sdHVrYWhpcGtxcXpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTQzMTM2NSwiZXhwIjoyMDk1MDA3MzY1fQ.AoLxjBk3MR3_qjsCP50xzbyx7cp_kaQlVmN_eP_xuYU"
);

function norm(s) { return (s || "").trim().toLowerCase().replace(/\s+/g, " "); }

// ── Get all project names from Tracker2 ──────────────────────────
function getT2ProjectNames(filePath) {
  const wb   = XLSX.readFile(filePath);
  const ws   = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
  const names = new Set();
  for (let i = 3; i < rows.length; i++) {
    const col0 = (rows[i][0] || "").toString().trim();
    if (!col0) continue;
    if (col0.toUpperCase() === "PROJECT NAME" || col0.toUpperCase() === "OLD PROJECTS MODIFICATIONS") continue;
    names.add(norm(col0));
  }
  return names;
}

// ── Find Tracker2 file ────────────────────────────────────────────
function findFile(name) {
  const dirs = [__dirname];
  try {
    const base = path.join(require("os").homedir(), "AppData","Roaming","Claude","local-agent-mode-sessions");
    function scan(d, depth) {
      if (depth > 5) return;
      try { fs.readdirSync(d).forEach(f => {
        const fp = path.join(d, f);
        if (f === "uploads") dirs.push(fp);
        else if (fs.statSync(fp).isDirectory()) scan(fp, depth+1);
      }); } catch {}
    }
    scan(base, 0);
  } catch {}
  for (const dir of dirs) {
    const exact = path.join(dir, name);
    if (fs.existsSync(exact)) return exact;
    try {
      const match = fs.readdirSync(dir).find(f => f.startsWith(name.replace(".xlsx","")) && f.endsWith(".xlsx"));
      if (match) return path.join(dir, match);
    } catch {}
  }
  return null;
}

async function main() {
  console.log(`\n=== White Cap T1 Cleanup — ${DRY ? "DRY RUN" : "⚠ LIVE DELETE"} ===\n`);

  const t2Path = findFile("White Cap Projects Tracker2_2026.xlsx");
  if (!t2Path) { console.error("Cannot find Tracker2 file"); process.exit(1); }
  console.log(`Tracker2: ${path.basename(t2Path)}`);

  const t2Names = getT2ProjectNames(t2Path);
  console.log(`Tracker2 unique project names: ${t2Names.size}`);

  // Load all White Cap projects from DB
  const { data: allProjects } = await sb.from("projects").select("id,name,client").eq("client","White Cap");
  console.log(`DB White Cap projects: ${(allProjects||[]).length}`);

  // Split: projects IN T2 vs T1-only
  const t2Projects  = (allProjects||[]).filter(p => t2Names.has(norm(p.name)));
  const t1Projects  = (allProjects||[]).filter(p => !t2Names.has(norm(p.name)));
  console.log(`Projects matching T2: ${t2Projects.length}`);
  console.log(`Projects T1-only (to remove): ${t1Projects.length}`);

  if (t1Projects.length > 0) {
    console.log(`\nT1-only projects:`);
    t1Projects.forEach(p => console.log(`  "${p.name}" (id: ${p.id})`));
  }

  const t1ProjIds = t1Projects.map(p => p.id);

  // Count tasks in T1-only projects
  let t1Tasks = [];
  for (let i = 0; i < t1ProjIds.length; i += 50) {
    const chunk = t1ProjIds.slice(i, i + 50);
    if (!chunk.length) continue;
    const { data } = await sb.from("tasks").select("id,title,project_id").in("project_id", chunk);
    if (data) t1Tasks = t1Tasks.concat(data);
  }
  console.log(`\nT1-only tasks (to delete): ${t1Tasks.length}`);

  if (DRY) {
    console.log(`\nDRY RUN — nothing deleted.`);
    console.log(`After cleanup: ~${(allProjects||[]).length - t1Projects.length} projects, tasks will reduce by ${t1Tasks.length}`);
    return;
  }

  // Delete T1-only tasks first
  let tasksDel = 0;
  for (let i = 0; i < t1ProjIds.length; i += 50) {
    const chunk = t1ProjIds.slice(i, i + 50);
    if (!chunk.length) continue;
    const { error } = await sb.from("tasks").delete().in("project_id", chunk);
    if (error) console.error(`Task delete error: ${error.message}`);
    else tasksDel += t1Tasks.filter(t => chunk.includes(t.project_id)).length;
  }
  console.log(`Deleted ${tasksDel} tasks`);

  // Delete T1-only projects
  let projsDel = 0;
  for (let i = 0; i < t1ProjIds.length; i += 50) {
    const chunk = t1ProjIds.slice(i, i + 50);
    if (!chunk.length) continue;
    const { error } = await sb.from("projects").delete().in("id", chunk);
    if (error) console.error(`Project delete error: ${error.message}`);
    else projsDel += chunk.length;
  }
  console.log(`Deleted ${projsDel} projects`);

  // Final count
  const { data: remaining } = await sb.from("projects").select("id").eq("client","White Cap");
  console.log(`\nRemaining White Cap projects: ${(remaining||[]).length}`);
}

main().catch(console.error);
