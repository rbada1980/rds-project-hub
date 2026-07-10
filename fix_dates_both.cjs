// fix_dates_both.cjs
// Updates Formcrete task dates in BOTH local PostgreSQL AND Supabase
// so the sync doesn't revert the changes.

const { createClient } = require("@supabase/supabase-js");
const { Pool }         = require("pg");
const XLSX             = require("xlsx");

const SUPA_URL  = "https://xypcbioltukahipkqqzc.supabase.co";
const SUPA_KEY  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGNiaW9sdHVrYWhpcGtxcXpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0MzEzNjUsImV4cCI6MjA5NTAwNzM2NX0.DG5sv2bpx8j3Mmz0mqIsoDVaCMP2TmWqh-OQUfSZFRw";
const supabase  = createClient(SUPA_URL, SUPA_KEY);
const pool      = new Pool({ host:"localhost", port:5432, database:"rds_local", user:"postgres", password:"rds2026" });

const EXCEL_FILE = "C:\\Users\\HP\\Documents\\Claude\\Projects\\RDS PROJECTS HUB\\Formcrete Projects Tracker_2026.xlsx";

const RDS_MEMBERS = ["nanaji","narayana","chandra mouli","chandramouli","balaram","dhanush","danush",
  "jagadeesh","sai","swathi","sridevi","trisha","eswar","kameshwari","praveena","vaishnavi",
  "sri lalitha","pradeep","anji reddy","lokesh","kunal","siva kumar","danush"];

function isRDSMember(name) {
  if (!name) return false;
  const n = name.toLowerCase();
  return RDS_MEMBERS.some(m => n.includes(m));
}

function excelDateToISO(val) {
  if (!val) return null;
  if (val instanceof Date) return val.toISOString().split("T")[0];
  if (typeof val === "number") {
    const d = new Date(Math.round((val - 25569) * 86400 * 1000));
    return d.toISOString().split("T")[0];
  }
  if (typeof val === "string" && val.trim()) return val.trim();
  return null;
}

function normalize(str) { return (str||"").toString().trim().toLowerCase().replace(/\s+/g," "); }

async function main() {
  console.log("Reading Excel...");
  const wb   = XLSX.readFile(EXCEL_FILE, { cellDates: true });
  const ws   = wb.Sheets["PROJECTS"];
  const rows = XLSX.utils.sheet_to_json(ws, { header:1, defval:null });

  const excelData = rows.slice(5)
    .filter(r => r.some(v => v))
    .map(r => ({
      title:    (r[5]  || "").toString().trim(),
      sub_date: excelDateToISO(r[8]),
      cust_req: excelDateToISO(r[9]),
      detailer: (r[14] || "").toString().trim(),
      checker:  (r[15] || "").toString().trim(),
    }))
    .filter(r => r.title && (isRDSMember(r.detailer) || isRDSMember(r.checker)));

  console.log(`Excel rows for RDS members: ${excelData.length}`);

  // ── Fetch all Formcrete tasks from Supabase ──
  const { data: supaTasks, error } = await supabase
    .from("tasks").select("id,title,client_sub_date,due_date").eq("client","Formcrete");
  if (error) { console.error("Supabase fetch error:", error); return; }
  console.log(`Formcrete tasks in Supabase: ${supaTasks.length}`);

  // ── Build update list ──
  const updates = []; // { id, sub_date, cust_req }
  for (const row of excelData) {
    const match = supaTasks.find(t =>
      normalize(t.title) === normalize(row.title) ||
      normalize(t.title).includes(normalize(row.title)) ||
      normalize(row.title).includes(normalize(t.title))
    );
    if (!match) continue;
    if (!row.sub_date && !row.cust_req) continue;
    updates.push({ id: match.id, sub_date: row.sub_date, due_date: row.cust_req });
  }

  console.log(`Tasks to update: ${updates.length}`);

  // ── Update Supabase ──
  console.log("\n--- Updating Supabase ---");
  let supaOk = 0, supaFail = 0;
  for (const u of updates) {
    const patch = {};
    if (u.sub_date) patch.client_sub_date = u.sub_date;
    if (u.due_date) patch.due_date        = u.due_date;
    const { error: e } = await supabase.from("tasks").update(patch).eq("id", u.id);
    if (e) { console.error(`  x id=${u.id}:`, e.message); supaFail++; }
    else supaOk++;
  }
  console.log(`Supabase: ${supaOk} updated, ${supaFail} failed`);

  // ── Update local PostgreSQL (same IDs) ──
  console.log("\n--- Updating local PostgreSQL ---");
  let localOk = 0, localFail = 0;
  for (const u of updates) {
    try {
      const sets = [];
      const vals = [];
      if (u.sub_date) { sets.push(`client_sub_date=$${vals.length+1}`); vals.push(u.sub_date); }
      if (u.due_date) { sets.push(`due_date=$${vals.length+1}`);        vals.push(u.due_date); }
      if (!sets.length) continue;
      vals.push(u.id);
      await pool.query(`UPDATE tasks SET ${sets.join(",")} WHERE id=$${vals.length}`, vals);
      localOk++;
    } catch(e) { console.error(`  x id=${u.id}:`, e.message); localFail++; }
  }
  console.log(`Local PostgreSQL: ${localOk} updated, ${localFail} failed`);

  await pool.end();
  console.log("\n=== DONE — both Supabase and local PostgreSQL updated ===");
}

main().catch(console.error);
