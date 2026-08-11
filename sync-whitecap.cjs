// sync-whitecap.cjs
// Full sync of White Cap Excel → Supabase + local PostgreSQL
// ─────────────────────────────────────────────────────────
// Rules:
//  1. Read LATEST White Cap Excel from project folder
//  2. Map project name aliases/typos → canonical DB names
//  3. Projects  → upsert (find by canonical name, create if truly new)
//  4. Tasks     → UPDATE all fields if task exists; INSERT if new
//  5. Detailer/Checker come ONLY from Excel
//  6. Verify final count vs Excel row count
// Run: node sync-whitecap.cjs

const XLSX   = require("xlsx");
const { createClient } = require("@supabase/supabase-js");
const { Pool }         = require("pg");
const path   = require("path");
const fs     = require("fs");

// ── Supabase (service role) ───────────────────────────────
const sb = createClient(
  "https://xypcbioltukahipkqqzc.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGNiaW9sdHVrYWhpcGtxcXpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTQzMTM2NSwiZXhwIjoyMDk1MDA3MzY1fQ.AoLxjBk3MR3_qjsCP50xzbyx7cp_kaQlVmN_eP_xuYU"
);

// ── Local PostgreSQL ──────────────────────────────────────
const pool = new Pool({ host:"localhost", port:5432, database:"rds_local", user:"postgres", password:"rds2026" });

const CLIENT = "White Cap";

// ── Project name alias map ────────────────────────────────
// Excel name (lowercase) → canonical DB name
// Used for barlist section at bottom of Excel where project names differ
const PROJ_ALIAS = {
  "6024 le lac rd"                              : "6024 Lelac Rd",
  "5900 powerline garage"                       : "5900 Powerline Garag",
  "2651 se 10th court"                          : "2651 Southcast 10th court",
  "515 lido drive"                              : "Custom Residence (515 lido drive)",
  "1042 palm way road"                          : "1042 Palm Way rd NPB Pinsonnault Residence",
};

// ── File discovery: WhiteCap_latest.xlsx first, else newest match ────────
function findNewestFile() {
  // Priority: WhiteCap_Aug7_2026.xlsx first, then WhiteCap_latest.xlsx
  const priority1 = path.join(__dirname, "WhiteCap_Aug7_2026.xlsx");
  if (fs.existsSync(priority1)) return priority1;
  const priority2 = path.join(__dirname, "WhiteCap_latest.xlsx");
  if (fs.existsSync(priority2)) return priority2;

  const dirs = [
    __dirname,
    "/sessions/gracious-nifty-brahmagupta/mnt/uploads",
    "C:\\Users\\HP\\AppData\\Local\\Packages\\Claude_pzs8sxrjxfjjc\\LocalCache\\Roaming\\Claude\\local-agent-mode-sessions\\919964d4-cd92-4eb6-b494-6c7ad2c02d36\\4c052105-2aba-4ec0-9a90-013070bec645\\local_d0d6e4a5-acfb-4c98-8222-e8da51f65329\\uploads",
  ];
  const candidates = [];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    fs.readdirSync(dir).forEach(f => {
      if (/white.?cap/i.test(f) && /\.xlsx$/i.test(f)) {
        const fp = path.join(dir, f);
        candidates.push({ fp, mtime: fs.statSync(fp).mtimeMs });
      }
    });
  }
  if (!candidates.length) return null;
  candidates.sort((a, b) => b.mtime - a.mtime);
  return candidates[0].fp;
}

// ── Status normalisation ──────────────────────────────────
const STATUS_MAP = {
  "COMPLETED":"Completed","IN PROGRESS":"In Progress","IN PROCESS":"In Progress",
  "NOT YET STARTED":"Not Yet Started","TO BE STARTED":"Not Yet Started",
  "HOLD":"Not Yet Started","Hold":"Not Yet Started",
  "Completed":"Completed","In Progress":"In Progress","Not Yet Started":"Not Yet Started",
};

// ── Date parsing (White Cap uses MM/DD/YYYY or serial number) ──
function parseDate(v) {
  if (!v) return null;
  if (typeof v === "number") {
    const d = new Date(Math.round((v - 25569) * 86400 * 1000));
    return d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  }
  const s = String(v).trim();
  // MM/DD/YYYY
  let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[1].padStart(2,"0")}-${m[2].padStart(2,"0")}`;
  // MM-DD-YYYY
  m = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (m) return `${m[3]}-${m[1].padStart(2,"0")}-${m[2].padStart(2,"0")}`;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return null;
}

// ── Name normalisation ────────────────────────────────────
const NAME_MAP = {
  "swathi":"Swathi","swa":"Swathi","sai":"Sai","dhanush":"Dhanush","danush":"Dhanush",
  "sridevi":"Sridevi","balaram":"Balaram","blm":"Balaram","jagadeesh":"Jagadeesh","jgd":"Jagadeesh",
  "nanaji":"Nanaji","trisha":"Trisha","praveena":"Praveena",
  "sri lalitha":"Sri Lalitha","sri_lalitha":"Sri Lalitha","srilalitha":"Sri Lalitha",
  "chandra mouli":"Chandra Mouli","chandra":"Chandra Mouli","chandra mouli":"Chandra Mouli",
  "kameshwari":"Kameshwari","kameswari":"Kameswari",
  "anji reddy":"Anji Reddy","pradeep":"Pradeep","jeswanth":"Jeswanth",
  "sivakumar":"Sivakumar","siva kumar":"Sivakumar","sivkumar":"Sivakumar",
  "shiva":"Sivakumar","siav_kumar":"Sivakumar","siav kumar":"Sivakumar",
  "vaishnavi":"Vaishnavi","lokesh":"Lokesh","lokesh reddy":"Lokesh Reddy",
  "eswar":"Eswar","kunal":"Kunal","narayana":"Narayana",
  "allu sai":"Allu Sai","pavan sai":"Pavan Sai",
  "out source (kumaran)":"Out Source (Kumaran)","out source":"Out Source (Kumaran)",
};
function normName(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!s) return null;
  const first = s.split(/[&,\/]/)[0].trim();
  return NAME_MAP[first.toLowerCase()] || first || null;
}

// ── Supabase paginated fetch ──────────────────────────────
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
  // ── 1. Find file ──────────────────────────────────────
  const FILE = findNewestFile();
  if (!FILE) { console.error("❌ No White Cap Excel file found."); process.exit(1); }
  console.log("📂 Reading Excel:", FILE);
  console.log("   Modified:", new Date(fs.statSync(FILE).mtimeMs).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }));

  // ── 2. Parse Excel ────────────────────────────────────
  const wb = XLSX.readFile(FILE, { cellDates: false });
  const sheetName = wb.SheetNames.includes("White Cap Work Schedule")
    ? "White Cap Work Schedule"
    : wb.SheetNames[0];
  console.log("   Sheet:", sheetName);
  const raw = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: null });
  console.log("   Total rows:", raw.length);

  // Find header row and detect column layout
  const headerIdx = raw.findIndex(r =>
    r && String(r[0] || "").toUpperCase().includes("PROJECT NAME")
  );
  const dataStart = headerIdx >= 0 ? headerIdx + 1 : 3;
  console.log(`   Header at row ${headerIdx + 1}, data from row ${dataStart + 1}`);

  // Detect layout: Aug7 file has SCOPE at col1 → title at col2, det at col6, chk at col7
  //                Old format: no SCOPE → title at col1, det at col4, chk at col5
  const hdrRow = headerIdx >= 0 ? raw[headerIdx] : [];
  const hasScope = String(hdrRow[1] || "").toUpperCase().includes("SCOPE");
  const COL = hasScope
    ? { proj: 0, title: 2, status: 3, sub: 4, det: 6, chk: 7 }   // Aug7 format
    : { proj: 0, title: 1, status: 2, sub: 3, det: 4, chk: 5 };   // old format
  console.log(`   Column layout: ${hasScope ? "Aug7 (SCOPE column present)" : "Classic (no SCOPE column)"}`);

  // ── 3. Extract rows ───────────────────────────────────
  const rawTasks = [];
  let curProj = null;
  for (let i = dataStart; i < raw.length; i++) {
    const r = raw[i];
    if (!r) continue;
    if (r[COL.proj] && String(r[COL.proj]).trim()) curProj = String(r[COL.proj]).trim();
    const title = r[COL.title] ? String(r[COL.title]).trim() : null;
    if (!curProj || !title) continue;
    if (["COMPONENTS OF WORK","TASKS","STATUS","SCOPE"].includes(title.toUpperCase())) continue;
    if (curProj.toUpperCase() === "PROJECT NAME") continue;

    const statusRaw = String(r[COL.status] || "").trim();
    const status = STATUS_MAP[statusRaw] || STATUS_MAP[statusRaw.toUpperCase()] || "Not Yet Started";

    // Resolve alias: normalize Excel project name → canonical DB name
    const projKey = curProj.toLowerCase().trim();
    const canonicalProj = PROJ_ALIAS[projKey] || curProj;

    rawTasks.push({
      excelProject : curProj,
      project      : canonicalProj,   // use canonical name for DB lookup/create
      title,
      status,
      sub  : parseDate(r[COL.sub]),
      det  : normName(r[COL.det]),
      chk  : normName(r[COL.chk]),
    });
  }
  console.log(`\n📄 Raw rows read: ${rawTasks.length}`);

  // ── 4. Deduplicate: last row wins per canonical project+title ──
  const deduped = new Map();
  for (const t of rawTasks) {
    const key = t.project.toLowerCase() + "|||" + t.title.toLowerCase();
    deduped.set(key, t);
  }
  const excelTasks = [...deduped.values()];
  console.log(`📄 Unique tasks after dedup: ${excelTasks.length}`);

  // Per-project summary
  const stats = {};
  excelTasks.forEach(t => {
    if (!stats[t.project]) stats[t.project] = { C:0, I:0, N:0, total:0 };
    stats[t.project].total++;
    if (t.status === "Completed")        stats[t.project].C++;
    else if (t.status === "In Progress") stats[t.project].I++;
    else                                 stats[t.project].N++;
  });
  console.log("\n📋 Excel summary by project:");
  Object.entries(stats).forEach(([p, s]) =>
    console.log(`   ${p}: ${s.total} tasks (C:${s.C} I:${s.I} N:${s.N})`)
  );

  // ── 5. Upsert projects ────────────────────────────────
  console.log("\n🗂  Upserting projects...");
  const existingProjects = await fetchAll("projects", { client: CLIENT });
  const projById   = new Map(existingProjects.map(p => [p.id, p]));
  const projByName = new Map(existingProjects.map(p => [p.name.toLowerCase().trim(), p]));

  const projSet = new Set(excelTasks.map(t => t.project));
  for (const name of projSet) {
    const key = name.toLowerCase().trim();
    if (!projByName.has(key)) {
      const { data: np, error } = await sb.from("projects").insert({ name, client: CLIENT }).select("id,name").single();
      if (error) { console.error(`  ❌ Create project "${name}":`, error.message); process.exit(1); }
      projByName.set(key, np);
      projById.set(np.id, np);
      try {
        await pool.query(
          `INSERT INTO projects(id,name,client,created_at) VALUES($1,$2,$3,NOW()) ON CONFLICT(id) DO NOTHING`,
          [np.id, name, CLIENT]
        );
      } catch (_) {}
      console.log(`  ✅ Created project: ${name} (${np.id})`);
    } else {
      console.log(`  ✔  Existing project: ${name}`);
    }
  }

  // ── 6. Fetch all existing tasks for these projects ────
  console.log("\n🔍 Fetching existing tasks from Supabase...");
  const projIds = [...projByName.values()].map(p => p.id);
  let existingTasks = [];
  for (let i = 0; i < projIds.length; i += 100) {
    const chunk = projIds.slice(i, i + 100);
    const { data, error } = await sb.from("tasks").select("id,project_id,title").in("project_id", chunk);
    if (!error && data) existingTasks = existingTasks.concat(data);
  }
  console.log(`   Found ${existingTasks.length} existing tasks in DB`);

  const taskKey    = t => t.project_id + "|||" + t.title.toLowerCase().trim();
  const taskByKey  = new Map(existingTasks.map(t => [taskKey(t), t]));

  // ── 7. Upsert each Excel task ─────────────────────────
  console.log("\n📥 Syncing tasks (insert new / update existing)...");
  let inserted = 0, updated = 0, errors = 0;

  for (const et of excelTasks) {
    const proj = projByName.get(et.project.toLowerCase().trim());
    if (!proj) { console.log(`  ⚠ No project for "${et.project}"`); errors++; continue; }

    const payload = {
      project_id      : proj.id,
      client          : CLIENT,
      title           : et.title,
      status          : et.status,
      client_sub_date : et.sub  || null,
      assignee        : et.det  || null,
      detailer        : et.det  || null,
      checker         : et.chk  || null,
      priority        : "Medium",
    };

    const lk = proj.id + "|||" + et.title.toLowerCase().trim();
    const existing = taskByKey.get(lk);

    if (existing) {
      const { error } = await sb.from("tasks").update(payload).eq("id", existing.id);
      if (error) { console.log(`  ❌ Update "${et.title}": ${error.message}`); errors++; }
      else {
        updated++;
        try {
          await pool.query(
            `UPDATE tasks SET status=$1, client_sub_date=$2, assignee=$3, detailer=$4, checker=$5 WHERE id=$6`,
            [et.status, et.sub||null, et.det||null, et.det||null, et.chk||null, existing.id]
          );
        } catch (_) {}
      }
    } else {
      const { data: nt, error } = await sb.from("tasks").insert(payload).select("id").single();
      if (error) { console.log(`  ❌ Insert "${et.title}" [${et.project}]: ${error.message}`); errors++; }
      else {
        inserted++;
        taskByKey.set(lk, { id: nt.id, project_id: proj.id, title: et.title });
        try {
          await pool.query(
            `INSERT INTO tasks(id,project_id,client,title,status,client_sub_date,assignee,detailer,checker,priority,created_at)
             VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW()) ON CONFLICT(id) DO NOTHING`,
            [nt.id, proj.id, CLIENT, et.title, et.status, et.sub||null, et.det||null, et.det||null, et.chk||null, "Medium"]
          );
        } catch (_) {}
      }
    }
  }

  // ── 8. Verification ───────────────────────────────────
  console.log("\n═══════════════════════════════════════════");
  console.log("✅  SYNC COMPLETE");
  console.log("───────────────────────────────────────────");
  console.log(`   Excel unique tasks : ${excelTasks.length}`);
  console.log(`   Inserted (new)     : ${inserted}`);
  console.log(`   Updated (existing) : ${updated}`);
  console.log(`   Errors             : ${errors}`);
  console.log(`   Total processed    : ${inserted + updated}`);

  if (inserted + updated === excelTasks.length) {
    console.log("✅  COUNT MATCH — all Excel tasks synced successfully");
  } else {
    console.log(`⚠️  COUNT MISMATCH — expected ${excelTasks.length}, got ${inserted + updated}`);
  }
  console.log("═══════════════════════════════════════════");

  await pool.end();
}

main().catch(e => { console.error("FATAL:", e.message); process.exit(1); });
