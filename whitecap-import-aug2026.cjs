// ================================================================
// White Cap Excel → RDS Project Hub (Import/Update)
// Usage:
//   node whitecap-import-aug2026.cjs          ← dry-run (default)
//   node whitecap-import-aug2026.cjs --apply  ← write to DB
//
// Sources (in priority order — T2 wins on conflicts):
//   Tracker2: White Cap Projects Tracker2_2026.xlsx  (Aug 19, latest)
//   Tracker1: White Cap Projects Tracker1_2026.xlsx  (Jun 29, supplemental)
//
// Rules:
//   • Date format in Excel: MM-DD-YYYY or YYYY-MM-DD → stored as YYYY-MM-DD
//   • Status normalisation: Inprogress → In Progress, job canceled → On Hold
//   • Section-header rows (col2 has content but no status/date) → skipped
//   • Dedup: project + section + title (case-insensitive)
//   • INSERT new tasks; UPDATE status/detailer/dates on existing
//   • NEVER delete DB-only tasks
//   • Null Excel fields skip update (preserve existing DB value)
// ================================================================

const XLSX    = require("xlsx");
const path    = require("path");
const fs      = require("fs");
const { createClient } = require("@supabase/supabase-js");

const SUPA_URL  = "https://xypcbioltukahipkqqzc.supabase.co";
const SUPA_KEY  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGNiaW9sdHVrYWhpcGtxcXpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTQzMTM2NSwiZXhwIjoyMDk1MDA3MzY1fQ.AoLxjBk3MR3_qjsCP50xzbyx7cp_kaQlVmN_eP_xuYU";
const supabase  = createClient(SUPA_URL, SUPA_KEY);
const CLIENT    = "White Cap";
const DRY_RUN   = !process.argv.includes("--apply");

// ── Status map ───────────────────────────────────────────────────
const STATUS_MAP = {
  "completed":        "Completed",
  "inprogress":       "In Progress",
  "in progress":      "In Progress",
  "in process":       "In Progress",
  "not yet started":  "Not Yet Started",
  "to be started":    "Not Yet Started",
  "on hold":          "On Hold",
  "job canceled":     "On Hold",
};
function normStatus(s) {
  if (!s) return "Not Yet Started";
  return STATUS_MAP[(s || "").toLowerCase().trim()] || s.trim() || "Not Yet Started";
}

// ── Date parser ──────────────────────────────────────────────────
function toISO(val) {
  if (!val) return null;
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return null;
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, "0");
    const d = String(val.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  if (typeof val === "number") {
    const d = XLSX.SSF.parse_date_code(val);
    return `${d.y}-${String(d.m).padStart(2,"0")}-${String(d.d).padStart(2,"0")}`;
  }
  if (typeof val === "string") {
    const s = val.trim();
    // YYYY-MM-DD or YYYY-MM-DD HH:MM:SS
    let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[1]}-${m[2]}-${m[3]}`;
    // MM-DD-YYYY or MM/DD/YYYY (possibly 2-digit year)
    m = s.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{2,4})$/);
    if (m) {
      let [, mo, dy, yr] = m;
      if (yr.length === 2) yr = "20" + yr;
      return `${yr}-${mo.padStart(2,"0")}-${dy.padStart(2,"0")}`;
    }
  }
  return null;
}

function str(v) {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s || null;
}
function toFloat(v) {
  if (v === null || v === undefined) return null;
  const f = parseFloat(String(v).replace(/,/g, ""));
  return isNaN(f) ? null : f;
}
function normKey(s) { return (s || "").toLowerCase().trim().replace(/\s+/g, " "); }

// ── Parse Tracker2 (col0=project, col1=scope, col2=title, col3=status, col4=date, col5=det_wt, col6=det, col7=chk) ──
function parseTracker2(filePath) {
  const wb   = XLSX.readFile(filePath, { cellDates: true });
  const ws   = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: false });

  const tasks  = [];
  const seen   = new Set();  // project|||section|||title
  let curProj  = null;
  let curScope = null;
  let curSect  = null;       // section sub-heading within project

  for (let i = 2; i < rows.length; i++) {   // i=2 → Excel row 3 (row 2 is header)
    const row  = rows[i];
    const col0 = str(row[0]);
    const col1 = str(row[1]);
    const col2 = str(row[2]);
    const col3 = str(row[3]);  // status
    const col4 = row[4];       // date (may be Date object or string)
    const col5 = row[5];       // det weight
    const col6 = str(row[6]);  // detailer
    const col7 = str(row[7]);  // checker

    if (!col0 && !col2) continue;
    const col0up = (col0 || "").toUpperCase();
    if (col0up === "PROJECT NAME" || col0up === "OLD PROJECTS MODIFICATIONS") {
      if (col0up === "OLD PROJECTS MODIFICATIONS") curSect = null;
      continue;
    }

    if (col0) { curProj = col0; curScope = null; curSect = null; }
    if (col1) curScope = col1;
    if (!col2 || !curProj) continue;

    // Section-header detection: col2 has content but no status AND no date
    const hasStatus = col3 && col3.trim() !== "";
    const hasDate   = col4 !== null && col4 !== undefined && col4 !== "" && String(col4).trim() !== "";
    if (!hasStatus && !hasDate) {
      curSect = col2;   // record section, skip as task
      continue;
    }

    // Effective scope: base scope + section if present
    let effScope = curScope;
    if (curSect) effScope = curScope ? `${curScope} | ${curSect}` : curSect;

    const key = `${normKey(curProj)}|||${normKey(curSect||"")}|||${normKey(col2)}`;
    if (seen.has(key)) continue;
    seen.add(key);

    tasks.push({
      source: "T2",
      project: curProj,
      scope:   effScope,
      title:   col2,
      status:  normStatus(col3),
      sub_date: toISO(col4),
      det_weight: toFloat(col5),
      detailer:   col6,
      checker:    col7,
    });
  }
  return tasks;
}

// ── Parse Tracker1 (col2=project, col3=scope, col4=title, col6=status, col7=date, col10=det_wt, col17=det, col19=chk) ──
function parseTracker1(filePath) {
  const wb   = XLSX.readFile(filePath, { cellDates: true });
  // Use "White Cap Work Schedule" sheet
  const shName = wb.SheetNames.find(n => n === "White Cap Work Schedule") || wb.SheetNames[0];
  const ws   = wb.Sheets[shName];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: false });

  const tasks  = [];
  const seen   = new Set();
  let curProj  = null;

  // Header at row 5 (index 4), data from row 7 (index 6)
  for (let i = 6; i < rows.length; i++) {
    const row  = rows[i];
    const col2 = str(row[2]);   // PROJECT NAME
    const col4 = str(row[4]);   // COMPONENTS OF WORK (title)
    if (!col4 || col4.toLowerCase() === "components of work") continue;
    if (col2 && col2.toLowerCase() !== "project name") curProj = col2;
    if (!curProj) continue;
    const col6 = str(row[6]);   // STATUS

    const key = `${normKey(curProj)}|||${normKey(col4)}`;
    if (seen.has(key)) continue;
    seen.add(key);

    tasks.push({
      source: "T1",
      project: curProj,
      scope:   str(row[3]),
      title:   col4,
      status:  normStatus(col6),
      sub_date: toISO(row[7]),
      det_weight: toFloat(row[10]),
      detailer:   str(row[17]),
      checker:    str(row[19]),
    });
  }
  return tasks;
}

// ── Merge: T2 wins; add T1 tasks not already in T2 ──────────────
// Also exclude Tracker1 "Gallery at Somi Parc Phase X" sub-phase entries (X>1)
// because Tracker2 already consolidates them under Phase 1
function mergeTasks(t2Tasks, t1Tasks) {
  const t2Keys = new Set(t2Tasks.map(t => `${normKey(t.project)}|||${normKey(t.title)}`));

  const t1Unique = t1Tasks.filter(t => {
    const k = `${normKey(t.project)}|||${normKey(t.title)}`;
    if (t2Keys.has(k)) return false;
    // Skip "Gallery at Somi Parc Phase X" where X > 1 (sub-phases consolidated in T2)
    if (/gallery at somi parc phase\s+[2-9]\d*/i.test(t.project)) return false;
    return true;
  });

  return [...t2Tasks, ...t1Unique];
}

// ── Find Excel files ─────────────────────────────────────────────
function findFile(names) {
  const searchDirs = [
    __dirname,
    path.join(__dirname, "..", "uploads"),
    // Cowork uploads UUID path (find newest match)
    ...(() => {
      try {
        const base = path.join(require("os").homedir(),
          "AppData","Roaming","Claude","local-agent-mode-sessions");
        const dirs = [];
        function scan(d, depth) {
          if (depth > 5) return;
          try {
            fs.readdirSync(d).forEach(f => {
              const fp = path.join(d, f);
              if (f === "uploads" && fs.statSync(fp).isDirectory()) dirs.push(fp);
              else if (fs.statSync(fp).isDirectory()) scan(fp, depth+1);
            });
          } catch {}
        }
        scan(base, 0);
        return dirs;
      } catch { return []; }
    })(),
  ];

  for (const name of names) {
    for (const dir of searchDirs) {
      try {
        // Exact name
        const exact = path.join(dir, name);
        if (fs.existsSync(exact)) return exact;
        // Pattern match (name with UUID suffix)
        const base  = path.basename(name, ".xlsx");
        const files = fs.readdirSync(dir).filter(f => f.startsWith(base) && f.endsWith(".xlsx"));
        if (files.length) {
          // Pick newest
          const newest = files.sort((a,b) => {
            try { return fs.statSync(path.join(dir,b)).mtimeMs - fs.statSync(path.join(dir,a)).mtimeMs; }
            catch { return 0; }
          })[0];
          return path.join(dir, newest);
        }
      } catch {}
    }
  }
  return null;
}

// ── Main ─────────────────────────────────────────────────────────
async function run() {
  console.log(`\n${"═".repeat(60)}`);
  console.log(` White Cap Import — ${DRY_RUN ? "DRY RUN (no DB writes)" : "⚠ LIVE APPLY"}`);
  console.log(`${"═".repeat(60)}\n`);

  // Locate files
  const t2Path = findFile(["White Cap Projects Tracker2_2026.xlsx"]);
  const t1Path = findFile(["White Cap Projects Tracker1_2026.xlsx"]);

  if (!t2Path) { console.error("ERROR: Cannot find Tracker2 file. Place it next to this script."); process.exit(1); }
  console.log(`Tracker2: ${path.basename(t2Path)}`);
  if (t1Path) console.log(`Tracker1: ${path.basename(t1Path)}`);
  else console.log(`Tracker1: not found (skipping supplemental tasks)`);

  const t2Tasks = parseTracker2(t2Path);
  const t1Tasks = t1Path ? parseTracker1(t1Path) : [];
  const allTasks = mergeTasks(t2Tasks, t1Tasks);

  const t1Added = allTasks.filter(t => t.source === "T1").length;
  console.log(`\nParsed: ${t2Tasks.length} from T2, ${t1Added} unique from T1 → ${allTasks.length} total\n`);

  // Per-project summary
  const byProj = {};
  allTasks.forEach(t => { if (!byProj[t.project]) byProj[t.project]=0; byProj[t.project]++; });
  console.log(`Projects: ${Object.keys(byProj).length}`);
  Object.entries(byProj).sort((a,b)=>b[1]-a[1]).slice(0,10).forEach(([p,c])=>console.log(`  ${p}: ${c}`));
  if (Object.keys(byProj).length > 10) console.log(`  ... and ${Object.keys(byProj).length-10} more`);

  // Status summary
  const byStat = {};
  allTasks.forEach(t => { if(!byStat[t.status]) byStat[t.status]=0; byStat[t.status]++; });
  console.log(`\nStatuses:`);
  Object.entries(byStat).forEach(([s,c])=>console.log(`  ${s}: ${c}`));

  if (DRY_RUN) {
    console.log(`\n${"─".repeat(60)}`);
    console.log(`DRY RUN COMPLETE — ${allTasks.length} tasks ready to import.`);
    console.log(`Run with --apply to write to DB.`);
    return;
  }

  // ── Live apply ────────────────────────────────────────────────
  // Ensure client exists
  const { data: clients } = await supabase.from("clients").select("id,name");
  const clientExists = (clients||[]).some(c => c.name.toLowerCase() === CLIENT.toLowerCase());
  if (!clientExists) {
    console.log(`Creating client: ${CLIENT}`);
    await supabase.from("clients").insert({ name: CLIENT });
  } else {
    console.log(`Client: ${CLIENT} ✓`);
  }

  // Load all projects for this client
  const { data: allProjects } = await supabase.from("projects").select("id,name,client");
  const projCache = {};
  const projList  = [...(allProjects||[])];

  async function getOrCreateProject(name) {
    if (projCache[name]) return projCache[name];
    const existing = projList.find(
      p => normKey(p.name) === normKey(name) && normKey(p.client||"") === normKey(CLIENT)
    );
    if (existing) { projCache[name] = existing.id; return existing.id; }
    console.log(`  → Creating project: "${name}"`);
    const { data, error } = await supabase.from("projects")
      .insert({ name, client: CLIENT, color: "#0ea5e9" })
      .select("id").single();
    if (error) { console.error(`    ERROR: ${error.message}`); return null; }
    projList.push({ id: data.id, name, client: CLIENT });
    projCache[name] = data.id;
    return data.id;
  }

  let inserted = 0, updated = 0, unchanged = 0, errors = 0;

  for (const t of allTasks) {
    const project_id = await getOrCreateProject(t.project);
    if (!project_id) { errors++; continue; }

    // Check existing task (match by project_id + title, case-insensitive)
    const { data: existing } = await supabase.from("tasks")
      .select("id,status,detailer,checker,client_sub_date,det_weight,scope")
      .eq("project_id", project_id)
      .ilike("title", t.title)
      .maybeSingle();

    if (existing) {
      // Build update payload — only overwrite non-null Excel values
      const payload = { status: t.status };   // always update status
      if (t.detailer   !== null) payload.detailer        = t.detailer;
      if (t.checker    !== null) payload.checker         = t.checker;
      if (t.sub_date   !== null) payload.client_sub_date = t.sub_date;
      if (t.det_weight !== null) payload.det_weight      = t.det_weight;
      if (t.scope      !== null) payload.scope           = t.scope;

      // Check if anything actually changed
      const changed =
        existing.status !== payload.status ||
        (payload.detailer    !== undefined && normKey(existing.detailer||"")    !== normKey(payload.detailer||"")) ||
        (payload.checker     !== undefined && normKey(existing.checker||"")     !== normKey(payload.checker||""))  ||
        (payload.client_sub_date !== undefined && existing.client_sub_date     !== payload.client_sub_date)       ||
        (payload.det_weight  !== undefined && existing.det_weight               !== payload.det_weight);

      if (!changed) { unchanged++; continue; }

      const { error } = await supabase.from("tasks").update(payload).eq("id", existing.id);
      if (error) {
        console.error(`  ✗ UPDATE: "${t.title}" (${t.project}) — ${error.message}`);
        errors++;
      } else {
        console.log(`  ↺ UPDATED: "${t.title}" | ${t.project} | ${t.status}${t.detailer ? ` | ${t.detailer}` : ""}`);
        updated++;
      }
    } else {
      const { error } = await supabase.from("tasks").insert({
        title:           t.title,
        project_id,
        client:          CLIENT,
        status:          t.status,
        scope:           t.scope,
        assignee:        null,
        detailer:        t.detailer,
        checker:         t.checker,
        client_sub_date: t.sub_date,
        det_weight:      t.det_weight,
      });
      if (error) {
        console.error(`  ✗ INSERT: "${t.title}" (${t.project}) — ${error.message}`);
        errors++;
      } else {
        console.log(`  ✚ CREATED: "${t.title}" | ${t.project} | ${t.status}${t.detailer ? ` | ${t.detailer}` : ""}`);
        inserted++;
      }
    }
  }

  console.log(`\n${"═".repeat(60)}`);
  console.log(`DONE — ${inserted} inserted, ${updated} updated, ${unchanged} unchanged, ${errors} errors`);
}

run().catch(e => { console.error(e); process.exit(1); });
