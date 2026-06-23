// update_formcrete_dates.js
// Reads Formcrete Projects Tracker_2026.xlsx and updates Supabase tasks
// with due_date (CUST. REQ. DATE) and client_sub_date (SUB. DATE)
// Only updates tasks assigned to RDS team members

const { createClient } = require("@supabase/supabase-js");
const XLSX = require("xlsx");
const path = require("path");

const SUPA_URL = "https://xypcbioltukahipkqqzc.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGNiaW9sdHVrYWhpcGtxcXpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0MzEzNjUsImV4cCI6MjA5NTAwNzM2NX0.DG5sv2bpx8j3Mmz0mqIsoDVaCMP2TmWqh-OQUfSZFRw";

const supabase = createClient(SUPA_URL, SUPA_KEY);

const EXCEL_FILE = path.join("C:\\Users\\HP\\Documents\\Claude\\Projects\\RDS PROJECTS HUB", "Formcrete Projects Tracker_2026.xlsx");

// RDS team member names (all lower-cased for matching)
const RDS_MEMBERS = [
  "nanaji","narayana","chandra mouli","chandramouli","balaram","dhanush","danush",
  "jagadeesh","sai","swathi","sridevi","trisha","eswar","kameshwari"
];

function isRDSMember(name) {
  if (!name) return false;
  const n = name.toLowerCase();
  return RDS_MEMBERS.some(m => n.includes(m));
}

function excelDateToISO(val) {
  if (!val) return null;
  if (val instanceof Date) return val.toISOString().split("T")[0];
  if (typeof val === "number") {
    // Excel serial date
    const d = new Date(Math.round((val - 25569) * 86400 * 1000));
    return d.toISOString().split("T")[0];
  }
  if (typeof val === "string" && val.trim()) return val.trim();
  return null;
}

function normalize(str) {
  return (str || "").toString().trim().toLowerCase().replace(/\s+/g, " ");
}

async function main() {
  console.log("Reading Excel file...");
  const wb = XLSX.readFile(EXCEL_FILE, { cellDates: true });
  const ws = wb.Sheets["PROJECTS"];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

  // Header is row index 4 (row 5 in Excel)
  const dataRows = rows.slice(5).filter(r => r.some(v => v));

  const excelData = dataRows.map(r => ({
    project:      (r[2] || "").toString().trim(),
    scope:        (r[3] || "").toString().trim(),
    title:        (r[5] || "").toString().trim(),
    status:       (r[7] || "").toString().trim(),
    sub_date:     excelDateToISO(r[8]),
    cust_req:     excelDateToISO(r[9]),
    detailer:     (r[14] || "").toString().trim(),
    checker:      (r[15] || "").toString().trim(),
  })).filter(r => r.title && (isRDSMember(r.detailer) || isRDSMember(r.checker)));

  console.log(`Excel rows for RDS members: ${excelData.length}`);

  // Fetch all Formcrete tasks from Supabase
  console.log("Fetching Formcrete tasks from Supabase...");
  const { data: tasks, error } = await supabase
    .from("tasks")
    .select("id,title,scope,assignee,detailer,checker,due_date,client_sub_date")
    .eq("client", "Formcrete");

  if (error) { console.error("Supabase error:", error); return; }
  console.log(`Found ${tasks.length} Formcrete tasks in Supabase`);

  let updated = 0, skipped = 0, notFound = 0;

  for (const row of excelData) {
    // Match by normalized title (and optionally scope)
    const match = tasks.find(t =>
      normalize(t.title) === normalize(row.title) ||
      normalize(t.title).includes(normalize(row.title)) ||
      normalize(row.title).includes(normalize(t.title))
    );

    if (!match) {
      notFound++;
      continue;
    }

    // Only update tasks assigned to RDS team members
    if (!isRDSMember(match.assignee) && !isRDSMember(match.detailer) && !isRDSMember(match.checker)) {
      skipped++;
      continue;
    }

    const updates = {};
    if (row.cust_req)  updates.due_date         = row.cust_req;
    if (row.sub_date)  updates.client_sub_date   = row.sub_date;
    if (row.detailer)  updates.detailer          = row.detailer;
    if (row.checker)   updates.checker           = row.checker;

    if (Object.keys(updates).length === 0) { skipped++; continue; }

    const { error: upErr } = await supabase
      .from("tasks")
      .update(updates)
      .eq("id", match.id);

    if (upErr) {
      console.error(`  ✗ Failed to update "${match.title}":`, upErr.message);
    } else {
      console.log(`  ✓ Updated "${match.title}" | due: ${updates.due_date} | sub: ${updates.client_sub_date}`);
      updated++;
    }
  }

  console.log(`\n=== Done ===`);
  console.log(`Updated:   ${updated}`);
  console.log(`Skipped:   ${skipped}`);
  console.log(`Not found: ${notFound}`);
}

main().catch(console.error);
