// diff-whitecap.cjs
// Compares Aug7 White Cap Excel vs Supabase DB and shows what will change
// Run: node diff-whitecap.cjs
// ─────────────────────────────────────────────────────────────────────────

const XLSX = require("xlsx");
const { createClient } = require("@supabase/supabase-js");
const path = require("path");
const fs   = require("fs");

const sb = createClient(
  "https://xypcbioltukahipkqqzc.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGNiaW9sdHVrYWhpcGtxcXpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTQzMTM2NSwiZXhwIjoyMDk1MDA3MzY1fQ.AoLxjBk3MR3_qjsCP50xzbyx7cp_kaQlVmN_eP_xuYU"
);

const CLIENT = "White Cap";

const STATUS_MAP = {
  "COMPLETED":"Completed","IN PROGRESS":"In Progress","IN PROCESS":"In Progress",
  "NOT YET STARTED":"Not Yet Started","TO BE STARTED":"Not Yet Started",
  "HOLD":"Not Yet Started","Inprogress":"In Progress",
  "Completed":"Completed","In Progress":"In Progress","Not Yet Started":"Not Yet Started",
};
const NAME_MAP = {
  "swathi":"Swathi","sai":"Sai","dhanush":"Dhanush","danush":"Dhanush",
  "sridevi":"Sridevi","balaram":"Balaram","jagadeesh":"Jagadeesh",
  "nanaji":"Nanaji","praveena":"Praveena",
  "sri lalitha":"Sri Lalitha","srilalitha":"Sri Lalitha",
  "chandra mouli":"Chandra Mouli","kameshwari":"Kameshwari","kameswari":"Kameswari",
  "anji reddy":"Anji Reddy","pradeep":"Pradeep","jeswanth":"Jeswanth",
  "sivakumar":"Sivakumar","siva kumar":"Sivakumar","sivkumar":"Sivakumar",
  "shiva":"Sivakumar","siav_kumar":"Sivakumar","siav kumar":"Sivakumar",
  "vaishnavi":"Vaishnavi","lokesh":"Lokesh","lokesh reddy":"Lokesh Reddy",
  "eswar":"Eswar","kunal":"Kunal","narayana":"Narayana",
  "allu sai":"Allu Sai","pavan sai":"Pavan Sai",
};
const PROJ_ALIAS = {
  "6024 le lac rd":"6024 Lelac Rd",
  "5900 powerline garage":"5900 Powerline Garag",
  "2651 se 10th court":"2651 Southcast 10th court",
  "515 lido drive":"Custom Residence (515 lido drive)",
  "1042 palm way road":"1042 Palm Way rd NPB Pinsonnault Residence",
};

function normName(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!s) return null;
  const first = s.split(/[&,\/]/)[0].trim();
  return NAME_MAP[first.toLowerCase()] || first || null;
}
function parseDate(v) {
  if (!v) return null;
  if (typeof v === "number") {
    const d = new Date(Math.round((v - 25569) * 86400 * 1000));
    return d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  }
  const s = String(v).trim();
  let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[1].padStart(2,"0")}-${m[2].padStart(2,"0")}`;
  m = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (m) return `${m[3]}-${m[1].padStart(2,"0")}-${m[2].padStart(2,"0")}`;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0,10);
  return null;
}

async function fetchAll(table, filter) {
  let all = [], from = 0;
  while (true) {
    let q = sb.from(table).select("*").range(from, from + 999);
    for (const [col, val] of Object.entries(filter)) q = q.eq(col, val);
    const { data, error } = await q;
    if (error || !data || !data.length) break;
    all = all.concat(data);
    if (data.length < 1000) break;
    from += 1000;
  }
  return all;
}

async function main() {
  // 1. Read Excel
  const FILE = path.join(__dirname, "WhiteCap_Aug7_2026.xlsx");
  if (!fs.existsSync(FILE)) { console.error("❌ WhiteCap_Aug7_2026.xlsx not found"); process.exit(1); }
  console.log("📂 Reading:", FILE);

  const wb  = XLSX.readFile(FILE, { cellDates: false });
  const ws  = wb.Sheets["White Cap Work Schedule"];
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

  // Aug7 format: SCOPE col at B → proj=0, title=2, status=3, sub=4, det=6, chk=7
  const COL = { proj:0, title:2, status:3, sub:4, det:6, chk:7 };

  const tasks = [];
  let curProj = null;
  for (let i = 4; i < raw.length; i++) {
    const r = raw[i];
    if (!r) continue;
    if (r[COL.proj] && String(r[COL.proj]).trim() && String(r[COL.proj]).toUpperCase() !== "PROJECT NAME")
      curProj = String(r[COL.proj]).trim();
    const title = r[COL.title] ? String(r[COL.title]).trim() : null;
    if (!curProj || !title) continue;
    if (["COMPONENTS OF WORK","TASKS","STATUS","SCOPE"].includes(title.toUpperCase())) continue;
    const statusRaw = String(r[COL.status] || "").trim();
    const status = STATUS_MAP[statusRaw] || STATUS_MAP[statusRaw.toUpperCase()] || "Not Yet Started";
    const canonical = PROJ_ALIAS[curProj.toLowerCase().trim()] || curProj;
    tasks.push({ proj: canonical, title, status, det: normName(r[COL.det]), chk: normName(r[COL.chk]), sub: parseDate(r[COL.sub]) });
  }

  const deduped = new Map();
  tasks.forEach(t => deduped.set(t.proj.toLowerCase()+"|||"+t.title.toLowerCase(), t));
  const excelTasks = [...deduped.values()];
  console.log(`✅ Excel: ${excelTasks.length} unique tasks\n`);

  // 2. Fetch DB
  console.log("🔍 Fetching DB...");
  const dbProjects = await fetchAll("projects", { client: CLIENT });
  const projByName = new Map(dbProjects.map(p => [p.name.toLowerCase().trim(), p]));
  const projById   = new Map(dbProjects.map(p => [p.id, p]));

  const projIds = dbProjects.map(p => p.id);
  let dbTasks = [];
  for (let i = 0; i < projIds.length; i += 100) {
    const chunk = projIds.slice(i, i+100);
    const { data } = await sb.from("tasks").select("id,project_id,title,status,detailer,checker").in("project_id", chunk);
    if (data) dbTasks = dbTasks.concat(data);
  }
  console.log(`✅ DB: ${dbTasks.length} tasks, ${dbProjects.length} projects\n`);

  const dbMap = new Map();
  dbTasks.forEach(t => {
    const projName = (projById.get(t.project_id) || {}).name || "?";
    const k = projName.toLowerCase()+"|||"+t.title.toLowerCase().trim();
    dbMap.set(k, { ...t, projName });
  });

  // 3. Compare
  const newTasks      = [];
  const statusChanged = [];
  const detChanged    = [];
  const newProjects   = [];

  for (const et of excelTasks) {
    const pKey = et.proj.toLowerCase().trim();
    const tKey = pKey + "|||" + et.title.toLowerCase();
    const dbT  = dbMap.get(tKey);

    if (!projByName.has(pKey)) {
      if (!newProjects.includes(et.proj)) newProjects.push(et.proj);
    }

    if (!dbT) {
      newTasks.push(et);
    } else {
      const chg = [];
      if (dbT.status !== et.status) chg.push(`status: "${dbT.status}" → "${et.status}"`);
      if ((dbT.detailer||null) !== (et.det||null)) chg.push(`detailer: "${dbT.detailer||''}" → "${et.det||''}"`);
      if ((dbT.checker||null) !== (et.chk||null)) chg.push(`checker: "${dbT.checker||''}" → "${et.chk||''}"`);
      if (chg.length) statusChanged.push({ proj: et.proj, title: et.title, changes: chg });
    }
  }

  // 4. Report
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  WHITE CAP — DIFF REPORT (Excel Aug7 vs Supabase DB)");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log(`  New projects to create : ${newProjects.length}`);
  console.log(`  New tasks to INSERT    : ${newTasks.length}`);
  console.log(`  Tasks to UPDATE        : ${statusChanged.length}`);
  console.log(`  Tasks unchanged        : ${excelTasks.length - newTasks.length - statusChanged.length}`);
  console.log("───────────────────────────────────────────────────────────────");

  if (newProjects.length) {
    console.log("\n🆕 NEW PROJECTS:");
    newProjects.forEach(p => console.log(`   + ${p}`));
  }

  if (newTasks.length) {
    console.log(`\n🆕 NEW TASKS (${newTasks.length}):`);
    const byProj = {};
    newTasks.forEach(t => { if (!byProj[t.proj]) byProj[t.proj] = []; byProj[t.proj].push(t); });
    Object.entries(byProj).forEach(([p, ts]) => {
      console.log(`\n  [${p}]`);
      ts.forEach(t => console.log(`    + ${t.title} | ${t.status} | det:${t.det||'-'} | chk:${t.chk||'-'}`));
    });
  }

  if (statusChanged.length) {
    console.log(`\n✏️  TASKS WITH CHANGES (${statusChanged.length}):`);
    statusChanged.forEach(t => {
      console.log(`\n  [${t.proj}] ${t.title}`);
      t.changes.forEach(c => console.log(`    → ${c}`));
    });
  }

  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("  Run  node sync-whitecap.cjs  to apply these changes.");
  console.log("═══════════════════════════════════════════════════════════════\n");
}

main().catch(e => { console.error("FATAL:", e.message); process.exit(1); });
