// nuclear_clear_dates.cjs
// Forcefully clears ALL Formcrete tasks with bad dates (year < 2025)
// Uses reliable methods: LEFT(text,4)::int for local, lt filter for Supabase
// Then repopulates from Excel

const { Pool } = require("pg");
const XLSX     = require("xlsx");

const SUPABASE_URL = "https://xypcbioltukahipkqqzc.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGNiaW9sdHVrYWhpcGtxcXpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0MzEzNjUsImV4cCI6MjA5NTAwNzM2NX0.DG5sv2bpx8j3Mmz0mqIsoDVaCMP2TmWqh-OQUfSZFRw";
const EXCEL_FILE   = "C:\\Users\\HP\\Documents\\Claude\\Projects\\RDS PROJECTS HUB\\Formcrete Projects Tracker_2026.xlsx";

const pool = new Pool({
  host:"localhost", port:5432, database:"rds_local",
  user:"postgres", password:"rds2026",
  options:"-c timezone=UTC"
});

async function supaFetch(method, path, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Supabase ${method} ${path}: ${res.status} ${text}`);
  return text ? JSON.parse(text) : null;
}

function excelDateToISO(val) {
  if (!val) return null;
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return null;
    return `${val.getFullYear()}-${String(val.getMonth()+1).padStart(2,"0")}-${String(val.getDate()).padStart(2,"0")}`;
  }
  if (typeof val === "number") {
    const dt = new Date(Math.round((val - 25569) * 86400 * 1000));
    return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth()+1).padStart(2,"0")}-${String(dt.getUTCDate()).padStart(2,"0")}`;
  }
  if (typeof val === "string" && val.trim()) {
    const s = val.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    const d = new Date(s);
    if (!isNaN(d.getTime()))
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    return null;
  }
  return null;
}

function normalize(s) { return (s||"").toString().trim().toLowerCase().replace(/\s+/g," "); }

async function main() {
  console.log("=== Nuclear Formcrete Date Fix ===\n");

  // ── STEP 1: Clear bad dates from LOCAL DB (reliable method) ──
  const r1 = await pool.query(`
    UPDATE tasks SET due_date = NULL
    WHERE client = 'Formcrete'
      AND due_date IS NOT NULL
      AND LEFT(due_date::text, 4)::int < 2025
  `);
  console.log(`Local: cleared ${r1.rowCount} bad due_date rows`);

  const r2 = await pool.query(`
    UPDATE tasks SET client_sub_date = NULL
    WHERE client = 'Formcrete'
      AND client_sub_date IS NOT NULL
      AND LEFT(client_sub_date::text, 4)::int < 2025
  `);
  console.log(`Local: cleared ${r2.rowCount} bad client_sub_date rows`);

  // ── STEP 2: Clear bad dates from SUPABASE (using lt filter — server-side) ──
  await supaFetch("PATCH", "tasks?client=eq.Formcrete&due_date=lt.2025-01-01", { due_date: null });
  console.log("Supabase: cleared bad due_date (lt 2025-01-01)");

  await supaFetch("PATCH", "tasks?client=eq.Formcrete&client_sub_date=lt.2025-01-01", { client_sub_date: null });
  console.log("Supabase: cleared bad client_sub_date (lt 2025-01-01)\n");

  // ── STEP 3: Repopulate from Excel ──
  console.log("Step 3: Loading dates from Excel...");
  const wb = XLSX.readFile(EXCEL_FILE, { cellDates: true });
  const rows = XLSX.utils.sheet_to_json(wb.Sheets["PROJECTS"], { header:1, defval:null });

  const excelData = rows.slice(5)
    .filter(r => r.some(v=>v) && (r[5]||"").toString().trim())
    .map(r => ({
      title:    (r[5]||"").toString().trim(),
      sub_date: excelDateToISO(r[8]),
      due_date: excelDateToISO(r[9]),
      detailer: (r[14]||"").toString().trim(),
      checker:  (r[15]||"").toString().trim(),
    }))
    .filter(r => r.due_date || r.sub_date);

  console.log(`Excel rows with dates: ${excelData.length}`);

  // Fetch Supabase task list
  const res = await fetch(`${SUPABASE_URL}/rest/v1/tasks?client=eq.Formcrete&select=id,title&limit=2000`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
  });
  const tasks = await res.json();
  console.log(`Supabase Formcrete tasks: ${tasks.length}`);

  let updated = 0, notFound = 0;
  for (const row of excelData) {
    const match = tasks.find(t =>
      normalize(t.title) === normalize(row.title) ||
      normalize(t.title).includes(normalize(row.title)) ||
      normalize(row.title).includes(normalize(t.title))
    );
    if (!match) { notFound++; continue; }

    const upd = {};
    if (row.due_date)  upd.due_date        = row.due_date;
    if (row.sub_date)  upd.client_sub_date = row.sub_date;
    if (row.detailer)  upd.detailer        = row.detailer;
    if (row.checker)   upd.checker         = row.checker;

    // Supabase
    await supaFetch("PATCH", `tasks?id=eq.${match.id}`, upd);

    // Local DB
    const cols = [], vals = [];
    let i = 1;
    if (upd.due_date)        { cols.push(`due_date=$${i++}::date`);        vals.push(upd.due_date); }
    if (upd.client_sub_date) { cols.push(`client_sub_date=$${i++}::date`); vals.push(upd.client_sub_date); }
    if (upd.detailer)        { cols.push(`detailer=$${i++}`);              vals.push(upd.detailer); }
    if (upd.checker)         { cols.push(`checker=$${i++}`);               vals.push(upd.checker); }
    vals.push(match.id);
    if (cols.length) await pool.query(`UPDATE tasks SET ${cols.join(",")} WHERE id=$${i}`, vals);

    updated++;
  }

  await pool.end();
  console.log(`\nStep 3 Done: Updated ${updated} | Not matched in Excel: ${notFound}`);

  // ── Verify ──
  console.log("\n=== Verifying Supabase ===");
  const vres = await fetch(`${SUPABASE_URL}/rest/v1/tasks?client=eq.Formcrete&select=due_date&limit=2000`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
  });
  const vtasks = await vres.json();
  const yrs = {};
  vtasks.forEach(t => { if(t.due_date) { const y=String(t.due_date).slice(0,4); yrs[y]=(yrs[y]||0)+1; } });
  const bad = Object.entries(yrs).filter(([y])=>parseInt(y)<2025);
  console.log("Year distribution:", JSON.stringify(yrs));
  console.log(bad.length === 0 ? "✓ No bad dates remaining!" : `⚠ Still has bad years: ${JSON.stringify(bad)}`);
  console.log("\nDone! No build needed.");
}

main().catch(e => { console.error(e.message); pool.end(); process.exit(1); });
