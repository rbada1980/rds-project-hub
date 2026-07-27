// Re-sync Alton Delray dates from source Excel (Formcrete Projects.xlsx)
// Ensures dates are 100% correct from ground truth

const { createClient } = require("@supabase/supabase-js");
const { Pool } = require("pg");
const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");

const supabase = createClient(
  "https://xypcbioltukahipkqqzc.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGNiaW9sdHVrYWhpcGtxcXpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTQzMTM2NSwiZXhwIjoyMDk1MDA3MzY1fQ.AoLxjBk3MR3_qjsCP50xzbyx7cp_kaQlVmN_eP_xuYU"
);
const pool = new Pool({ host:"localhost", port:5432, database:"rds_local", user:"postgres", password:"rds2026" });

const lines = [];
function log(msg) { process.stdout.write(msg + "\n"); lines.push(msg); }

// IST-safe date parser (Date objects use local methods, not toISOString)
function excelDateToISO(val) {
  try {
    if (!val) return null;
    if (val instanceof Date) {
      if (isNaN(val)) return null;
      const y = val.getFullYear(), m = String(val.getMonth()+1).padStart(2,"0"), d = String(val.getDate()).padStart(2,"0");
      return `${y}-${m}-${d}`;
    }
    if (typeof val === "number") {
      const dt = new Date(Math.round((val - 25569) * 86400 * 1000));
      return isNaN(dt) ? null : dt.toISOString().slice(0, 10);
    }
    const s = String(val).trim();
    if (/^\d{2}-\d{2}-\d{4}$/.test(s)) return `${s.slice(6)}-${s.slice(3,5)}-${s.slice(0,2)}`; // DD-MM-YYYY (Indian)
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    return null;
  } catch { return null; }
}

function normalize(s) { return (s||"").toString().trim().toLowerCase().replace(/\s+/g," "); }

async function main() {
  try {
    const ALTON_PROJECT_ID = "6f915efb-e314-423c-adc8-99a16b79fa7d";

    // 1. Read Excel dates for Alton Delray tasks
    const xlsxPath = path.join(__dirname, "Formcrete Projects.xlsx");
    if (!fs.existsSync(xlsxPath)) { log("ERROR: Formcrete Projects.xlsx not found"); return; }
    log("Reading: " + xlsxPath);

    const wb = XLSX.readFile(xlsxPath, { cellDates: true });
    // Find the Alton Delray sheet
    const sheetName = wb.SheetNames.find(s => s.toLowerCase().includes("alton")) || wb.SheetNames[0];
    log("Sheet: " + sheetName);
    const ws = wb.Sheets[sheetName];
    const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

    // Find header row
    let hr = 0;
    for (let i = 0; i < Math.min(10, raw.length); i++) {
      const r = (raw[i]||[]).map(c=>(c||"").toString().trim().toUpperCase());
      if (r.some(h => h.includes("TASK") || h.includes("COMPONENT") || h.includes("WORK"))) { hr = i; break; }
    }
    const headers = (raw[hr]||[]).map(c=>(c||"").toString().trim());
    const COL = {}; headers.forEach((h,i)=>{ if(h) COL[h]=i; });
    log("Columns: " + Object.keys(COL).join(", "));

    // Find title and date columns
    const titleKey = Object.keys(COL).find(k => /task|component|work/i.test(k));
    const dateKey = Object.keys(COL).find(k => /sub.*date|client.*date|date/i.test(k));
    log(`Title col: "${titleKey}", Date col: "${dateKey}"`);

    const excelTasks = {};
    for (let i = hr + 1; i < raw.length; i++) {
      const r = raw[i];
      if (!r) continue;
      const title = r[COL[titleKey]] ? String(r[COL[titleKey]]).trim() : null;
      const date = dateKey ? excelDateToISO(r[COL[dateKey]]) : null;
      if (title) excelTasks[normalize(title)] = date;
    }
    log("Excel tasks found: " + Object.keys(excelTasks).length);

    // 2. Fetch Alton Delray tasks from Supabase
    const { data: dbTasks } = await supabase.from("tasks")
      .select("id,title,client_sub_date").eq("project_id", ALTON_PROJECT_ID);
    log("Alton DB tasks: " + (dbTasks?.length||0));

    // 3. Update dates from Excel
    let updated = 0, skipped = 0, notFound = 0;
    for (const t of (dbTasks||[])) {
      const key = normalize(t.title);
      const excelDate = excelTasks[key];
      if (excelDate === undefined) { notFound++; continue; }
      const curDate = t.client_sub_date ? String(t.client_sub_date).slice(0,10) : null;
      if (curDate === excelDate) { skipped++; continue; }
      const { error } = await supabase.from("tasks").update({ client_sub_date: excelDate }).eq("id", t.id);
      if (error) log("ERR ["+t.title+"]: "+error.message);
      else { log(`  "${t.title}": ${curDate} → ${excelDate}`); updated++; }
    }
    log(`\nAlton Supabase: Updated=${updated}, Skipped=${skipped}, NotFound=${notFound}`);

    // 4. Sync local PG for Alton Delray
    log("\n=== Syncing Alton Delray in local PG ===");
    const { data: finalTasks } = await supabase.from("tasks")
      .select("id,client_sub_date").eq("project_id", ALTON_PROJECT_ID);
    const byDate = {};
    for (const t of (finalTasks||[])) {
      const d = t.client_sub_date ? String(t.client_sub_date).slice(0,10) : null;
      if (!byDate[d]) byDate[d]=[];
      byDate[d].push(t.id);
    }
    let pgFixed = 0;
    for (const [date, ids] of Object.entries(byDate)) {
      if (!date || date === "null") {
        await pool.query(`UPDATE tasks SET client_sub_date=NULL WHERE id=ANY($1::uuid[])`, [ids]);
      } else {
        const r = await pool.query(`UPDATE tasks SET client_sub_date=$1, updated_at=NOW() WHERE id=ANY($2::uuid[]) RETURNING id`,[date,ids]);
        pgFixed += r.rowCount;
      }
    }
    log("Local PG Alton synced: " + pgFixed + " rows");

    // 5. Verify final state
    log("\n=== Final: tasks due today 2026-07-27 ===");
    const { data: today } = await supabase.from("tasks").select("title,project_id").eq("client_sub_date","2026-07-27");
    log("Count: " + (today?.length||0));
    (today||[]).forEach(t => log("  "+t.title));

  } catch(err) {
    log("FATAL: "+err.message+"\n"+err.stack);
  } finally {
    await pool.end();
  }
  try { fs.writeFileSync(path.join(__dirname,"alton-dates-fix-result.txt"), lines.join("\n")+"\n"); } catch(e){}
}
main();
