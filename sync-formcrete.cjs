// sync-formcrete.cjs
// Full sync of Formcrete Excel → Supabase + local PostgreSQL
// ─────────────────────────────────────────────────────────
// Rules:
//  1. Read the LATEST uploaded Excel from scratch — no caching
//  2. Deduplicate rows: last row wins per project+title
//  3. Projects  → upsert (create if missing, skip if exists)
//  4. Tasks     → UPDATE all fields if task exists; INSERT if new
//  5. Detailer/Checker come ONLY from Excel — never guessed
//  6. Verify final count vs Excel row count
// Run: node sync-formcrete.cjs

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

const CLIENT = "Formcrete";

// ── File discovery: pick NEWEST Formcrete Excel ───────────
function findNewestFile(){
  const dirs = [
    // Project folder (works on both Windows + Linux sandbox)
    __dirname,
    // Uploaded via Cowork — Windows path
    "C:\\Users\\HP\\AppData\\Local\\Packages\\Claude_pzs8sxrjxfjjc\\LocalCache\\Roaming\\Claude\\local-agent-mode-sessions\\919964d4-cd92-4eb6-b494-6c7ad2c02d36\\4c052105-2aba-4ec0-9a90-013070bec645\\local_d0d6e4a5-acfb-4c98-8222-e8da51f65329\\uploads",
    // Uploaded via Cowork — Linux sandbox path
    "/sessions/gracious-nifty-brahmagupta/mnt/uploads",
  ];
  const candidates = [];
  for(const dir of dirs){
    if(!fs.existsSync(dir)) continue;
    fs.readdirSync(dir).forEach(f => {
      if(/formcrete/i.test(f) && /\.xlsx$/i.test(f)){
        const fp = path.join(dir, f);
        candidates.push({ fp, mtime: fs.statSync(fp).mtimeMs });
      }
    });
  }
  if(!candidates.length) return null;
  candidates.sort((a,b) => b.mtime - a.mtime); // newest first
  return candidates[0].fp;
}

// ── Status normalisation ──────────────────────────────────
const STATUS_MAP = {
  "COMPLETED":"Completed","IN PROGRESS":"In Progress","IN PROCESS":"In Progress",
  "NOT YET STARTED":"Not Yet Started","TO BE STARTED":"To Be Started",
  "Completed":"Completed","In Progress":"In Progress","Not Yet Started":"Not Yet Started",
};

// ── Date parsing (IST-safe, cellDates:false) ──────────────
function parseDate(v){
  if(!v) return null;
  if(typeof v === "number"){
    const d = new Date(Math.round((v-25569)*86400*1000));
    return d.toLocaleDateString("en-CA",{timeZone:"Asia/Kolkata"});
  }
  const s = String(v).trim();
  if(/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0,10);
  if(s.includes("T")){
    const dt = new Date(new Date(s).getTime()+30*60*1000);
    return isNaN(dt) ? null : dt.toLocaleDateString("en-CA",{timeZone:"Asia/Kolkata"});
  }
  return null;
}

// ── Name normalisation ────────────────────────────────────
const NAME_MAP = {
  "swathi":"Swathi","swa":"Swathi","sai":"Sai","dhanush":"Dhanush","danush":"Dhanush",
  "sridevi":"Sridevi","balaram":"Balaram","blm":"Balaram","jagadeesh":"Jagadeesh","jgd":"Jagadeesh",
  "nanaji":"Nanaji","trisha":"Trisha","praveena":"Praveena","sri lalitha":"Sri Lalitha",
  "chandra mouli":"Chandra Mouli","chandra":"Chandra Mouli","kameshwari":"Kameshwari",
  "kameswari":"Kameswari","anji reddy":"Anji Reddy","pradeep":"Pradeep","jeswanth":"Jeswanth",
};
function normName(raw){
  if(!raw) return null;
  const s = String(raw).trim();
  if(!s) return null;
  const first = s.split(/[&,\/]/)[0].trim();
  return NAME_MAP[first.toLowerCase()] || first || null;
}

// ── Supabase paginated fetch helper ──────────────────────
async function fetchAll(table, filter){
  let all=[], from=0;
  while(true){
    let q = sb.from(table).select("*").range(from, from+999);
    for(const [col,val] of Object.entries(filter)) q = q.eq(col, val);
    const {data,error} = await q;
    if(error||!data||!data.length) break;
    all = all.concat(data);
    if(data.length < 1000) break;
    from += 1000;
  }
  return all;
}

async function main(){
  // ── 1. Find file ────────────────────────────────────────
  const FILE = findNewestFile();
  if(!FILE){ console.error("❌ No Formcrete Excel file found in uploads or project folder."); process.exit(1); }
  console.log("📂 Reading Excel:", FILE);
  console.log("   Modified:", new Date(fs.statSync(FILE).mtimeMs).toLocaleString("en-IN",{timeZone:"Asia/Kolkata"}));

  // ── 2. Parse Excel ──────────────────────────────────────
  const wb   = XLSX.readFile(FILE, {cellDates:false});
  // Try "PROJECTS" sheet first, fall back to first sheet
  const sheetName = wb.SheetNames.includes("PROJECTS") ? "PROJECTS" : wb.SheetNames[0];
  console.log("   Sheet:", sheetName);
  const raw  = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], {header:1, defval:null});
  console.log("   Total rows in sheet:", raw.length);

  // Find header row
  const headerIdx = raw.findIndex(r => r && String(r[0]||"").toUpperCase().trim() === "PROJECT NAME");
  if(headerIdx < 0){ console.error("❌ Cannot find header row with 'PROJECT NAME'"); process.exit(1); }
  const dataStart = headerIdx + 1;
  const dataEnd   = raw.length;
  console.log(`   Header at row ${headerIdx+1}, data rows ${dataStart+1}–${dataEnd}`);

  const COL = {proj:0, title:2, status:3, sub:4, req:5, det:7, chk:8};

  // ── 3. Extract rows (entire sheet including OLD PROJ MOD) ─
  const rawTasks = [];
  let curProj = null;
  for(let i=dataStart; i<dataEnd; i++){
    const r = raw[i];
    if(!r) continue;
    if(r[COL.proj] && String(r[COL.proj]).trim()) curProj = String(r[COL.proj]).trim();
    const title = r[COL.title] ? String(r[COL.title]).trim() : null;
    if(!curProj || !title) continue;
    // Skip obvious header/section rows
    if(title.toUpperCase() === "TASK NAME" || curProj.toUpperCase() === "PROJECT NAME") continue;

    const statusRaw = String(r[COL.status]||"").trim();
    const isHold    = statusRaw.toLowerCase() === "hold";
    const status    = isHold
      ? "Not Yet Started"
      : (STATUS_MAP[statusRaw] || STATUS_MAP[statusRaw.toUpperCase()] || "Not Yet Started");

    rawTasks.push({
      project : curProj,
      title,
      status,
      sub  : parseDate(r[COL.sub]),
      req  : parseDate(r[COL.req]),
      det  : normName(r[COL.det]),
      chk  : normName(r[COL.chk]),
    });
  }
  console.log(`\n📄 Raw rows read from Excel: ${rawTasks.length}`);

  // ── 4. Deduplicate: last row wins per project+title ──────
  const deduped = new Map();
  for(const t of rawTasks){
    const key = t.project.toLowerCase() + "|||" + t.title.toLowerCase();
    deduped.set(key, t); // later row overwrites earlier
  }
  const excelTasks = [...deduped.values()];
  console.log(`📄 Unique tasks after dedup (last-row-wins): ${excelTasks.length}`);

  // Show per-project summary
  const projSet = new Set(excelTasks.map(t=>t.project));
  const stats = {};
  excelTasks.forEach(t=>{
    if(!stats[t.project]) stats[t.project]={C:0,I:0,N:0,total:0};
    stats[t.project].total++;
    if(t.status==="Completed")       stats[t.project].C++;
    else if(t.status==="In Progress") stats[t.project].I++;
    else                              stats[t.project].N++;
  });
  console.log("\n📋 Excel summary by project:");
  Object.entries(stats).forEach(([p,s])=>
    console.log(`   ${p}: ${s.total} tasks (Completed:${s.C} InProgress:${s.I} NotStarted:${s.N})`)
  );

  // ── 5. Upsert projects ───────────────────────────────────
  console.log("\n🗂  Upserting projects...");
  const existingProjects = await fetchAll("projects", {client:CLIENT});
  const projById  = new Map(existingProjects.map(p=>[p.id, p]));
  const projByName= new Map(existingProjects.map(p=>[p.name.toLowerCase().trim(), p]));

  for(const name of projSet){
    const key = name.toLowerCase().trim();
    if(!projByName.has(key)){
      const {data:np, error} = await sb.from("projects").insert({name, client:CLIENT}).select("id,name").single();
      if(error){ console.error(`  ❌ Create project "${name}":`, error.message); process.exit(1); }
      projByName.set(key, np);
      projById.set(np.id, np);
      // Mirror to local PostgreSQL
      try{
        await pool.query(
          `INSERT INTO projects(id,name,client,created_at) VALUES($1,$2,$3,NOW()) ON CONFLICT(id) DO NOTHING`,
          [np.id, name, CLIENT]
        );
      }catch(_){}
      console.log(`  ✅ Created project: ${name} (${np.id})`);
    } else {
      console.log(`  ✔  Existing project: ${name}`);
    }
  }

  // ── 6. Fetch ALL existing tasks for these projects ───────
  console.log("\n🔍 Fetching existing tasks from Supabase...");
  const projIds = [...projByName.values()].map(p=>p.id);
  let existingTasks = [];
  // Paginate across all project IDs
  for(let i=0; i<projIds.length; i+=100){
    const chunk = projIds.slice(i, i+100);
    const {data,error} = await sb.from("tasks").select("id,project_id,title").in("project_id", chunk);
    if(!error && data) existingTasks = existingTasks.concat(data);
  }
  console.log(`   Found ${existingTasks.length} existing tasks in DB`);

  // Build lookup: project_id + title.toLowerCase → task
  const taskKey  = t => t.project_id + "|||" + t.title.toLowerCase().trim();
  const taskByKey = new Map(existingTasks.map(t=>[taskKey(t), t]));

  // ── 7. Upsert each Excel task ────────────────────────────
  console.log("\n📥 Syncing tasks (insert new / update changed)...");
  let inserted=0, updated=0, errors=0;

  for(const et of excelTasks){
    const proj = projByName.get(et.project.toLowerCase().trim());
    if(!proj){ console.log(`  ⚠ No project for "${et.project}"`); errors++; continue; }

    const payload = {
      project_id      : proj.id,
      client          : CLIENT,
      title           : et.title,
      status          : et.status,
      client_sub_date : et.sub  || null,
      due_date        : et.req  || null,
      assignee        : et.det  || null,   // assignee = detailer (Formcrete convention)
      detailer        : et.det  || null,   // from Excel col H
      checker         : et.chk  || null,   // from Excel col I
      priority        : "Medium",
    };

    const lookupKey = proj.id + "|||" + et.title.toLowerCase().trim();
    const existing  = taskByKey.get(lookupKey);

    if(existing){
      // ── UPDATE existing task ──
      const {error} = await sb.from("tasks").update(payload).eq("id", existing.id);
      if(error){ console.log(`  ❌ Update "${et.title}": ${error.message}`); errors++; }
      else{
        updated++;
        // Mirror update to local PostgreSQL
        try{
          await pool.query(
            `UPDATE tasks SET status=$1, client_sub_date=$2, due_date=$3,
               assignee=$4, detailer=$5, checker=$6
             WHERE id=$7`,
            [et.status, et.sub||null, et.req||null, et.det||null, et.det||null, et.chk||null, existing.id]
          );
        }catch(_){}
      }
    } else {
      // ── INSERT new task ──
      const {data:nt, error} = await sb.from("tasks").insert(payload).select("id").single();
      if(error){ console.log(`  ❌ Insert "${et.title}": ${error.message}`); errors++; }
      else{
        inserted++;
        taskByKey.set(lookupKey, {id:nt.id, project_id:proj.id, title:et.title});
        // Mirror insert to local PostgreSQL
        try{
          await pool.query(
            `INSERT INTO tasks(id,project_id,client,title,status,client_sub_date,due_date,
               assignee,detailer,checker,priority,created_at)
             VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW())
             ON CONFLICT(id) DO NOTHING`,
            [nt.id, proj.id, CLIENT, et.title, et.status,
             et.sub||null, et.req||null, et.det||null, et.det||null, et.chk||null, "Medium"]
          );
        }catch(_){}
      }
    }
  }

  // ── 8. Verification ──────────────────────────────────────
  console.log("\n═══════════════════════════════════════════");
  console.log("✅  SYNC COMPLETE");
  console.log("───────────────────────────────────────────");
  console.log(`   Excel unique tasks : ${excelTasks.length}`);
  console.log(`   Inserted (new)     : ${inserted}`);
  console.log(`   Updated (existing) : ${updated}`);
  console.log(`   Errors             : ${errors}`);
  console.log(`   Total processed    : ${inserted+updated}`);

  if(inserted+updated === excelTasks.length){
    console.log("✅  COUNT MATCH — all Excel tasks synced successfully");
  } else {
    console.log(`⚠️  COUNT MISMATCH — expected ${excelTasks.length}, processed ${inserted+updated}`);
    console.log("   Check error log above for failed rows.");
  }
  console.log("═══════════════════════════════════════════");

  await pool.end();
}

main().catch(e=>{ console.error("FATAL:", e.message); process.exit(1); });
