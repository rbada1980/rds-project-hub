// fix_formcrete_dates.cjs
// Step 1: Clear wrong dates (year < 2025) from ALL Formcrete tasks
// Step 2: Re-populate correct dates from Excel
// Updates BOTH local PostgreSQL AND Supabase

const { Pool } = require("pg");
const XLSX     = require("xlsx");

const SUPABASE_URL = "https://xypcbioltukahipkqqzc.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGNiaW9sdHVrYWhpcGtxcXpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0MzEzNjUsImV4cCI6MjA5NTAwNzM2NX0.DG5sv2bpx8j3Mmz0mqIsoDVaCMP2TmWqh-OQUfSZFRw";

const pool = new Pool({
  host: "localhost", port: 5432, database: "rds_local",
  user: "postgres", password: "rds2026",
  options: "-c timezone=UTC"
});

const EXCEL_FILE = "C:\\Users\\HP\\Documents\\Claude\\Projects\\RDS PROJECTS HUB\\Formcrete Projects Tracker_2026.xlsx";

async function supaFetch(method, path, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
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
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, "0");
    const d = String(val.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  if (typeof val === "number") {
    const ms = Math.round((val - 25569) * 86400 * 1000);
    const dt = new Date(ms);
    return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth()+1).padStart(2,"0")}-${String(dt.getUTCDate()).padStart(2,"0")}`;
  }
  if (typeof val === "string" && val.trim()) {
    const s = val.trim();
    // Already YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    // Try parsing "Tuesday, June 10, 2026" or similar long strings
    const parsed = new Date(s);
    if (!isNaN(parsed.getTime())) {
      const y = parsed.getFullYear();
      const m = String(parsed.getMonth() + 1).padStart(2, "0");
      const d = String(parsed.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
    return null; // unparseable — skip rather than send garbage
  }
  return null;
}

function normalize(str) {
  return (str || "").toString().trim().toLowerCase().replace(/\s+/g, " ");
}

async function main() {
  console.log("=== Formcrete Date Fix ===\n");

  // ── STEP 1a: Clear bad dates (year < 2025) from local DB ──
  const localClear = await pool.query(`
    UPDATE tasks SET
      due_date        = CASE WHEN due_date IS NOT NULL        AND EXTRACT(YEAR FROM due_date::date)        < 2025 THEN NULL ELSE due_date END,
      client_sub_date = CASE WHEN client_sub_date IS NOT NULL AND EXTRACT(YEAR FROM client_sub_date::date) < 2025 THEN NULL ELSE client_sub_date END
    WHERE LOWER(COALESCE(client,'')) LIKE '%formcrete%'
      AND (
        (due_date IS NOT NULL        AND EXTRACT(YEAR FROM due_date::date)        < 2025) OR
        (client_sub_date IS NOT NULL AND EXTRACT(YEAR FROM client_sub_date::date) < 2025)
      )
  `);
  console.log(`Step 1 Local: cleared ${localClear.rowCount} tasks with bad dates`);

  // ── STEP 1b: Clear bad dates from Supabase ──
  const allTasks = await supaFetch("GET", "tasks?client=eq.Formcrete&select=id,title,due_date,client_sub_date&limit=2000");
  console.log(`Formcrete tasks in Supabase: ${allTasks.length}`);

  let supaCleared = 0;
  for (const t of allTasks) {
    const dy = t.due_date        ? parseInt(String(t.due_date).slice(0,4))        : 9999;
    const sy = t.client_sub_date ? parseInt(String(t.client_sub_date).slice(0,4)) : 9999;
    if (dy >= 2025 && sy >= 2025) continue;

    const patch = {};
    if (dy < 2025) patch.due_date        = null;
    if (sy < 2025) patch.client_sub_date = null;
    await supaFetch("PATCH", `tasks?id=eq.${t.id}`, patch);
    supaCleared++;
  }
  console.log(`Step 1 Supabase: cleared ${supaCleared} tasks with bad dates\n`);

  // ── STEP 2: Read Excel and update correct dates ──
  console.log("Step 2: Loading correct dates from Excel...");
  const wb = XLSX.readFile(EXCEL_FILE, { cellDates: true });
  const ws = wb.Sheets["PROJECTS"];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

  // col[5]=title  col[8]=sub_date  col[9]=due_date  col[14]=detailer  col[15]=checker
  const excelData = rows.slice(5)
    .filter(r => r.some(v => v) && (r[5] || "").toString().trim())
    .map(r => ({
      title:    (r[5] || "").toString().trim(),
      sub_date: excelDateToISO(r[8]),
      due_date: excelDateToISO(r[9]),
      detailer: (r[14] || "").toString().trim(),
      checker:  (r[15] || "").toString().trim(),
    }))
    .filter(r => r.due_date || r.sub_date);

  console.log(`Excel rows with dates: ${excelData.length}`);

  // Re-fetch fresh task list (after clearing)
  const tasks = await supaFetch("GET", "tasks?client=eq.Formcrete&select=id,title&limit=2000");

  let updated = 0, notFound = 0;
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

    // Update Supabase
    await supaFetch("PATCH", `tasks?id=eq.${match.id}`, updates);

    // Update local DB
    const setClauses = [], vals = [];
    let idx = 1;
    if (updates.due_date)        { setClauses.push(`due_date=$${idx++}::date`);        vals.push(updates.due_date); }
    if (updates.client_sub_date) { setClauses.push(`client_sub_date=$${idx++}::date`); vals.push(updates.client_sub_date); }
    if (updates.detailer)        { setClauses.push(`detailer=$${idx++}`);              vals.push(updates.detailer); }
    if (updates.checker)         { setClauses.push(`checker=$${idx++}`);               vals.push(updates.checker); }
    vals.push(match.id);
    await pool.query(`UPDATE tasks SET ${setClauses.join(",")} WHERE id=$${idx}`, vals);

    updated++;
  }

  await pool.end();
  console.log(`Step 2 Done: Updated ${updated} | Not matched: ${notFound}`);
  console.log("\n=== Done! Now run: .\\build_and_restart.bat ===");
}

main().catch(e => { console.error(e); pool.end(); process.exit(1); });
