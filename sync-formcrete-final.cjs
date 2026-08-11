// sync-formcrete-final.cjs — applies diff to Supabase (1 INSERT + real content updates)
const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

const sb = createClient(
  "https://xypcbioltukahipkqqzc.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGNiaW9sdHVrYWhpcGtxcXpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTQzMTM2NSwiZXhwIjoyMDk1MDA3MzY1fQ.AoLxjBk3MR3_qjsCP50xzbyx7cp_kaQlVmN_eP_xuYU"
);

// Map to Title Case values that match DB CHECK constraint
function mapStatus(s) {
  const u = (s || "").toLowerCase();
  if (u === "completed") return "Completed";
  if (u === "in_progress" || u.includes("progress")) return "In Progress";
  if (u === "not_yet_started" || u.includes("not yet")) return "Not Yet Started";
  if (u.includes("hold")) return "On Hold";
  return null; // unknown — don't update
}

// Extract the DB-side status value from a changes entry like: status: "Completed" → "completed"
function dbStatusFromChange(changes) {
  const sc = changes.find(c => c.startsWith("status:"));
  if (!sc) return null;
  const m = sc.match(/"([^"]*)" → "([^"]*)"/);
  return m ? m[1] : null;
}

async function main() {
  const reportPath = path.join(__dirname, "formcrete-diff-report.json");
  const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));

  console.log("=== FORMCRETE SYNC (v2 — fixed status mapping) ===");
  console.log(`Diff generated: ${report.generated}`);
  console.log(`To INSERT: ${report.to_insert}, To UPDATE: ${report.to_update}`);
  console.log("");

  let insertOK = 0, insertFail = 0;
  let updateOK = 0, updateSkip = 0, updateFail = 0;
  const errors = [];

  // ── 1. INSERT new tasks ──────────────────────────────────────────────────
  for (const t of report.insert_detail) {
    if (!t.project_id) {
      console.log(`SKIP INSERT (no project_id): ${t.title}`);
      insertFail++;
      continue;
    }
    const st = mapStatus(t.status);
    const payload = {
      project_id: t.project_id,
      title: t.title,
      status: st || "Not Yet Started",
    };
    if (t.sub_date)      payload.client_sub_date = t.sub_date;
    if (t.cust_req_date) payload.due_date         = t.cust_req_date;
    if (t.detailer)      payload.detailer          = t.detailer;
    if (t.checker)       payload.checker           = t.checker;
    if (t.scope)         payload.scope             = t.scope;

    const { error } = await sb.from("tasks").insert(payload);
    if (error) {
      console.log(`FAIL INSERT: ${t.title} — ${error.message}`);
      errors.push({ op: "insert", title: t.title, error: error.message });
      insertFail++;
    } else {
      console.log(`OK INSERT: ${t.title}`);
      insertOK++;
    }
  }

  // ── 2. UPDATE existing tasks ──────────────────────────────────────────────
  console.log(`\nProcessing ${report.update_detail.length} update candidates...`);
  let i = 0;
  for (const t of report.update_detail) {
    if (!t.db_id) {
      updateFail++;
      errors.push({ op: "update", title: t.title, error: "missing db_id" });
      continue;
    }

    const payload = {};

    // STATUS: only update if there's a real change (not just case mismatch)
    const dbSt = dbStatusFromChange(t.changes);
    if (dbSt !== null) {
      const exSt = mapStatus(t.status);
      if (exSt && dbSt !== exSt) {
        payload.status = exSt; // real status change (e.g. "Not Yet Started" → "In Progress")
      }
      // if dbSt === exSt, it was just a case artifact in the diff — skip status update
    }

    // OTHER FIELDS: always apply when Excel has a value
    if (t.sub_date)      payload.client_sub_date = t.sub_date;
    if (t.cust_req_date) payload.due_date         = t.cust_req_date;
    if (t.detailer)      payload.detailer          = t.detailer;
    if (t.checker)       payload.checker           = t.checker;

    if (Object.keys(payload).length === 0) {
      updateSkip++;  // status-only case mismatch with no real content changes
      i++;
      continue;
    }

    const { error } = await sb.from("tasks").update(payload).eq("id", t.db_id);
    if (error) {
      console.log(`FAIL UPDATE [${t.db_id}]: ${t.title} — ${error.message}`);
      errors.push({ op: "update", title: t.title, error: error.message });
      updateFail++;
    } else {
      updateOK++;
    }

    i++;
    if (i % 50 === 0) console.log(`  ... ${i}/${report.update_detail.length} processed`);
  }

  // ── 3. Summary ────────────────────────────────────────────────────────────
  console.log("\n========== SYNC RESULT ==========");
  console.log(`INSERT:  ${insertOK} OK  ${insertFail} FAIL`);
  console.log(`UPDATE:  ${updateOK} OK  ${updateFail} FAIL  ${updateSkip} skipped (status-case-only)`);
  if (errors.length > 0) {
    console.log(`\nErrors (${errors.length}):`);
    errors.forEach(e => console.log(`  [${e.op}] ${e.title}: ${e.error}`));
  } else {
    console.log("\nAll operations succeeded.");
  }

  const resultPath = path.join(__dirname, "sync-formcrete-result.txt");
  const lines = [
    `Sync run: ${new Date().toISOString()}`,
    `INSERT: ${insertOK} OK / ${insertFail} FAIL`,
    `UPDATE: ${updateOK} OK / ${updateFail} FAIL / ${updateSkip} skipped (status-case-only, no real change)`,
    errors.length > 0
      ? `Errors (${errors.length}):\n${errors.map(e => `  [${e.op}] ${e.title}: ${e.error}`).join("\n")}`
      : "All succeeded."
  ];
  fs.writeFileSync(resultPath, lines.join("\n"));
  console.log(`\nResult saved to sync-formcrete-result.txt`);
}

main().catch(e => { console.error("FATAL:", e.message); process.exit(1); });
