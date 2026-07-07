// ============================================================
// RDS Project Hub — Sync Agent
// Direction: BIDIRECTIONAL (Supabase ↔ Local PostgreSQL)
//   Phase 1: Supabase → Local  (pull / download)
//   Phase 2: Local → Supabase  (push / upload)
// Runs automatically at 2 AM IST every night via server.cjs
// Can also be run manually: node sync.cjs
// ============================================================

const { Pool }        = require("pg");
const { createClient} = require("@supabase/supabase-js");
const fs              = require("fs");
const path            = require("path");

// ── Supabase credentials ─────────────────────────────────────
const SUPA_URL  = "https://xypcbioltukahipkqqzc.supabase.co";
const SUPA_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGNiaW9sdHVrYWhpcGtxcXpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0MzEzNjUsImV4cCI6MjA5NTAwNzM2NX0.DG5sv2bpx8j3Mmz0mqIsoDVaCMP2TmWqh-OQUfSZFRw";

// ── Load service key from sync-config.json if available ──────
let SUPA_KEY = SUPA_ANON;
const CFG_PATH = path.join(__dirname, "sync-config.json");
if (fs.existsSync(CFG_PATH)) {
  try {
    const cfg = JSON.parse(fs.readFileSync(CFG_PATH, "utf8"));
    if (cfg.service_key) { SUPA_KEY = cfg.service_key; console.log("🔑 Using service key from sync-config.json"); }
  } catch {}
}

const supabase = createClient(SUPA_URL, SUPA_KEY);

// ── Local PostgreSQL ─────────────────────────────────────────
const pool = new Pool({
  host: "localhost", port: 5432,
  database: "rds_local", user: "postgres", password: "rds2026",
});

// ── Table sync config ────────────────────────────────────────
// conflict       = column(s) for ON CONFLICT upsert
// excludeFromRow = columns to strip when pushing TO Supabase
// excludeFromPull= columns to strip when pulling FROM Supabase
//                  (defaults to excludeFromRow if not set)
const TABLE_CONFIG = [
  { table: "users",              conflict: "id" },
  { table: "clients",            conflict: "id" },
  { table: "projects",           conflict: "id" },
  { table: "tasks",              conflict: "id" },
  { table: "task_files",         conflict: "id" },
  { table: "task_comments",      conflict: "id" },
  { table: "notifications",      conflict: "id" },
  { table: "announcements",      conflict: "id" },
  { table: "workflows",          conflict: "id" },
  { table: "war_room_messages",  conflict: "id" },
  { table: "war_room_pins",      conflict: "id" },
  { table: "war_room_reactions", conflict: "id" },
  { table: "war_room_reads",     conflict: "client_id,user_username" },
  { table: "war_room_scheduled", conflict: "id" },
  { table: "settings",           conflict: "key", excludeFromRow: ["id"], excludeFromPull: ["id"] },
  { table: "attendance",         conflict: "id" },
  { table: "breaks",             conflict: "id" },
  { table: "time_logs",          conflict: "id" },
];

// ── Phase 1: Pull FROM Supabase → Local ─────────────────────
async function pullTable({ table, conflict, excludeFromRow = [], excludeFromPull }) {
  const skipCols = excludeFromPull !== undefined ? excludeFromPull : excludeFromRow;
  const conflictCols = conflict.split(",").map(c => c.trim());

  // Fetch all rows from Supabase (paginated)
  let allRows = [];
  const PAGE = 1000;
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`Supabase fetch: ${error.message}`);
    if (!data || data.length === 0) break;
    allRows = allRows.concat(data);
    if (data.length < PAGE) break;
    from += PAGE;
  }

  if (!allRows.length) {
    return { table, pulled: 0, failed: 0, total: 0, note: "empty" };
  }

  let pulled = 0, failed = 0;
  const BATCH = 100;

  // Determine columns from first row (excluding skipped columns)
  const sampleFiltered = {};
  for (const [k] of Object.entries(allRows[0])) {
    if (!skipCols.includes(k)) sampleFiltered[k] = true;
  }
  const cols = Object.keys(sampleFiltered);
  if (!cols.length) return { table, pulled: 0, failed: 0, total: allRows.length };

  const sets = cols
    .filter(c => !conflictCols.includes(c))
    .map(c => `"${c}" = EXCLUDED."${c}"`);

  const conflictClause = `ON CONFLICT (${conflictCols.map(c => `"${c}"`).join(", ")})`;
  const updateClause   = sets.length ? `DO UPDATE SET ${sets.join(", ")}` : "DO NOTHING";

  for (let i = 0; i < allRows.length; i += BATCH) {
    const batch = allRows.slice(i, i + BATCH);
    try {
      // Build multi-row INSERT: ($1,$2,...),($n+1,$n+2,...), ...
      const values  = [];
      const rowPhs  = [];
      let   counter = 1;

      for (const row of batch) {
        const ph = [];
        for (const c of cols) {
          const v = row[c];
          values.push(v instanceof Date ? v.toISOString() : v);
          ph.push(`$${counter++}`);
        }
        rowPhs.push(`(${ph.join(", ")})`);
      }

      const sql = `
        INSERT INTO "${table}" (${cols.map(c => `"${c}"`).join(", ")})
        VALUES ${rowPhs.join(", ")}
        ${conflictClause} ${updateClause}
      `;

      await pool.query(sql, values);
      pulled += batch.length;
    } catch (e) {
      console.log(`   ⚠️  ${table} pull batch ${Math.floor(i/BATCH)+1}: ${e.message.slice(0, 100)}`);
      failed += batch.length;
    }
  }

  const icon = failed === 0 ? "✅" : (pulled > 0 ? "⚠️ " : "❌");
  console.log(`   ${icon} ← ${table.padEnd(24)} ${pulled}/${allRows.length} pulled${failed ? `, ${failed} failed` : ""}`);
  return { table, pulled, failed, total: allRows.length };
}

// ── Phase 2: Push FROM Local → Supabase ─────────────────────
async function pushTable({ table, conflict, excludeFromRow = [] }) {
  const r = await pool.query(`SELECT * FROM "${table}"`);
  const rows = r.rows;

  if (!rows.length) {
    return { table, synced: 0, failed: 0, total: 0, note: "empty" };
  }

  const cleaned = rows.map(row => {
    const out = {};
    for (const [k, v] of Object.entries(row)) {
      if (excludeFromRow.includes(k)) continue;
      out[k] = v instanceof Date ? v.toISOString() : v;
    }
    return out;
  });

  let synced = 0, failed = 0;
  const BATCH = 100;

  for (let i = 0; i < cleaned.length; i += BATCH) {
    const batch = cleaned.slice(i, i + BATCH);
    const { error } = await supabase
      .from(table)
      .upsert(batch, { onConflict: conflict, ignoreDuplicates: false });

    if (error) {
      console.log(`   ⚠️  ${table} push batch ${Math.floor(i/BATCH)+1}: ${error.message.slice(0, 100)}`);
      failed += batch.length;
    } else {
      synced += batch.length;
    }
  }

  const icon = failed === 0 ? "✅" : (synced > 0 ? "⚠️ " : "❌");
  console.log(`   ${icon} → ${table.padEnd(24)} ${synced}/${rows.length} pushed${failed ? `, ${failed} failed` : ""}`);
  return { table, synced, failed, total: rows.length };
}

// ── Main sync function ───────────────────────────────────────
async function runSync() {
  const start = new Date();
  const istStr = new Date(start.getTime() + 5.5*60*60*1000)
    .toISOString().replace("T"," ").slice(0,19) + " IST";

  console.log(`\n${"═".repeat(52)}`);
  console.log(`🔄  RDS Bidirectional Sync — ${istStr}`);
  console.log(`${"═".repeat(52)}`);

  await pool.query("SELECT 1");
  console.log("✅  Local DB connected\n");

  // ── Phase 1: Pull Supabase → Local ──────────────────────────
  console.log("📥  Phase 1: Supabase → Local (pull)\n");
  let totalPulled = 0, pullFailed = 0;
  const pullResults = [];

  for (const cfg of TABLE_CONFIG) {
    try {
      const res = await pullTable(cfg);
      totalPulled += res.pulled;
      pullFailed  += res.failed;
      pullResults.push(res);
    } catch (e) {
      console.log(`   ❌ ${cfg.table}: ${e.message}`);
      pullResults.push({ table: cfg.table, pulled: 0, failed: 0, total: 0, error: e.message });
    }
  }

  // ── Phase 2: Push Local → Supabase ──────────────────────────
  console.log(`\n📤  Phase 2: Local → Supabase (push)\n`);
  let totalSynced = 0, totalFailed = 0;
  const tableResults = [];

  for (const cfg of TABLE_CONFIG) {
    try {
      const res = await pushTable(cfg);
      totalSynced += res.synced;
      totalFailed += res.failed;
      // Merge pull stats into the table result
      const pull = pullResults.find(p => p.table === cfg.table) || {};
      tableResults.push({ ...res, pulled: pull.pulled || 0 });
    } catch (e) {
      console.log(`   ❌ ${cfg.table}: ${e.message}`);
      tableResults.push({ table: cfg.table, synced: 0, failed: 0, total: 0, pulled: 0, error: e.message });
    }
  }

  const duration = ((new Date() - start) / 1000).toFixed(1);

  console.log(`\n${"─".repeat(52)}`);
  console.log(`🎉  Sync complete in ${duration}s`);
  console.log(`    ↓ Pulled  ${totalPulled} records from Supabase`);
  console.log(`    ↑ Pushed  ${totalSynced} records to Supabase`);
  if (totalFailed + pullFailed > 0)
    console.log(`    ⚠️  ${totalFailed + pullFailed} failures total`);
  console.log(`${"─".repeat(52)}\n`);

  const report = {
    timestamp:     start.toISOString(),
    ist_time:      istStr,
    duration_sec:  parseFloat(duration),
    total_synced:  totalSynced + totalPulled,   // combined for dashboard badge
    total_pushed:  totalSynced,
    total_pulled:  totalPulled,
    total_failed:  totalFailed + pullFailed,
    status:        (totalFailed + pullFailed) === 0 ? "success"
                   : (totalSynced + totalPulled > 0 ? "partial" : "failed"),
    tables:        tableResults,
  };

  const reportPath = path.join(__dirname, "last-sync-report.json");
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`📄  Report saved → last-sync-report.json\n`);

  return report;
}

// ── Run directly (node sync.cjs) ─────────────────────────────
if (require.main === module) {
  runSync()
    .then(() => pool.end())
    .catch(e => { console.error("Fatal:", e.message); pool.end(); process.exit(1); });
}

module.exports = { runSync };
