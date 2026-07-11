// update_formcrete_dates.cjs — Read Formcrete Excel and update due_date + client_sub_date
// Updates BOTH Supabase AND local PostgreSQL.

const { createClient } = require("@supabase/supabase-js");
const { Pool }         = require("pg");
const XLSX             = require("xlsx");

const SUPA_URL = "https://xypcbioltukahipkqqzc.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGNiaW9sdHVrYWhpcGtxcXpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTQxMTE1OCwiZXhwIjoyMDYwOTg3MTU4fQ.pHMr7KQSD5V-7BQKV_LZEWbFmfFsXUbOJx7LUr8BPho";
const supabase = createClient(SUPA_URL, SUPA_KEY);

const pool = new Pool({
  host: "localhost", port: 5432, database: "rds_local",
  user: "postgres", password: "rds2026",
  options: "-c timezone=UTC"
});

const EXCEL_FILE = "C:\\Users\\HP\\Documents\\Claude\\Projects\\RDS PROJECTS HUB\\Formcrete Projects Tracker_2026.xlsx";

const RDS_MEMBERS = [
  "nanaji","narayana","chandra mouli","chandramouli","balaram","dhanush","danush",
  "jagadeesh","sai","swathi","sridevi","trisha","eswar","kameshwari","praveena","praveen"
];

function isRDSMember(name) {
  if (!name) return false;
  const n = name.toLowerCase();
  return RDS_MEMBERS.some(m => n.includes(m));
}

// Fixed: use local date parts (IST on Windows) to avoid UTC midnight shift
function excelDateToISO(val) {
  if (!val) return null;
  if (val instanceof Date) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, "0");
    const d = String(val.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  if (typeof val === "number") {
    // Excel serial → UTC date (numbers are timezone-agnostic)
    const ms = Math.round((val - 25569) * 86400 * 1000);
    const dt = new Date(ms);
    const y = dt.getUTCFullYear();
    const m = String(dt.getUTCMonth() + 1).padStart(2, "0");
    const d = String(dt.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  if (typeof val === "string" && val.trim()) {
    // Already a string — slice to YYYY-MM-DD in case it's a full timestamp
    return val.trim().slice(0, 10);
  }
  return null;
}

function normalize(str) {
  return (str || "").toString().trim().toLowerCase().replace(/\s+/g, " ");
}

async function main() {
  console.log("=== Formcrete Date Fix: Excel -> Supabase + Local ===");
  console.log("Reading Excel:", EXCEL_FILE);

  const wb = XLSX.readFile(EXCEL_FILE, { cellDates: true });
  const ws = wb.Sheets["PROJECTS"];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

  // Excel columns (row 4 = header):
  // col 5  = COMPONENTS OF WORK (task title)
  // col 8  = SUB. DATE          (client_sub_date)
  // col 9  = CUST. REQ. DATE    (due_date)
  // col 14 = DETAILER
  // col 15 = CHECKER

  const excelData = rows.slice(5)
    .filter(r => r.some(v => v))
    .map(r => ({
      title:    (r[5] || "").toString().trim(),
      sub_date: excelDateToISO(r[8]),
      due_date: excelDateToISO(r[9]),
      detailer: (r[14] || "").toString().trim(),
      checker:  (r[15] || "").toString().trim(),
    }))
    .filter(r => r.title && (isRDSMember(r.detailer) || isRDSMember(r.checker)));

  console.log("Excel rows for RDS members:", excelData.length);

  // Sample to verify dates look correct
  console.log("Sample dates (first 3 rows):");
  excelData.slice(0, 3).forEach(r =>
    console.log(`  "${r.title.slice(0,40)}" | sub:${r.sub_date} | due:${r.due_date}`)
  );

  // Fetch all Formcrete tasks from Supabase
  const { data: tasks, error } = await supabase
    .from("tasks")
    .select("id,title,assignee,detailer,checker,due_date,client_sub_date")
    .eq("client", "Formcrete");

  if (error) { console.error("Supabase fetch error:", error); await pool.end(); return; }
  console.log("\nFormcrete tasks in Supabase:", tasks.length);

  let updated = 0, skipped = 0, notFound = 0;

  for (const row of excelData) {
    const match = tasks.find(t =>
      normalize(t.title) === normalize(row.title) ||
      normalize(t.title).includes(normalize(row.title)) ||
      normalize(row.title).includes(normalize(t.title))
    );

    if (!match) { notFound++; continue; }

    const updates = {};
    if (row.due_date)  updates.due_date        = row.due_date;
    if (row.sub_date)  updates.client_sub_date = row.sub_date;
    if (row.detailer)  updates.detailer        = row.detailer;
    if (row.checker)   updates.checker         = row.checker;

    if (!Object.keys(updates).length) { skipped++; continue; }

    // 1. Update Supabase
    const { error: supErr } = await supabase.from("tasks").update(updates).eq("id", match.id);
    if (supErr) {
      console.error(`  x Supabase "${match.title}":`, supErr.message);
      continue;
    }

    // 2. Update local DB
    const setClauses = [];
    const vals = [];
    let idx = 1;
    if (updates.due_date)        { setClauses.push(`due_date=$${idx++}::date`);        vals.push(updates.due_date); }
    if (updates.client_sub_date) { setClauses.push(`client_sub_date=$${idx++}::date`); vals.push(updates.client_sub_date); }
    if (updates.detailer)        { setClauses.push(`detailer=$${idx++}`);              vals.push(updates.detailer); }
    if (updates.checker)         { setClauses.push(`checker=$${idx++}`);               vals.push(updates.checker); }
    vals.push(match.id);
    await pool.query(`UPDATE tasks SET ${setClauses.join(",")} WHERE id=$${idx}`, vals);

    console.log(`  ok "${match.title.slice(0,45)}" | sub:${updates.client_sub_date||"-"} | due:${updates.due_date||"-"}`);
    updated++;
  }

  await pool.end();
  console.log(`\n=== Done: Updated ${updated} | Skipped ${skipped} | Not found ${notFound} ===`);
}

main().catch(e => { console.error(e); process.exit(1); });
