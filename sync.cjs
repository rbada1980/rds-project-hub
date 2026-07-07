// ============================================================
// RDS Project Hub — Sync Agent
// Direction: Local PostgreSQL → Supabase (one-way)
// Runs automatically at 2 AM IST every night via server.cjs
// Can also be run manually: node sync.cjs
// ============================================================

const { Pool }        = require("pg");
const { createClient} = require("@supabase/supabase-js");
const fs              = require("fs");
const path            = require("path");

// ── Supabase credentials (from App.jsx) ─────────────────────
const SUPA_URL  = "https://xypcbioltukahipkqqzc.supabase.co";
const SUPA_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGNiaW9sdHVrYWhpcGtxcXpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0MzEzNjUsImV4cCI6MjA5NTAwNzM2NX0.DG5sv2bpx8j3Mmz0mqIsoDVaCMP2TmWqh-OQUfSZFRw";

// ── Load service key from sync-config.json if available ──────
// (Service key bypasses RLS — needed for settings table writes)
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
// conflict = column(s) used for ON CONFLICT upsert
// excludeFromRow = columns to strip before sending to Supabase
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
  { table: "settings",           conflict: "key", excludeFromRow: ["id"] }, // id is SERIAL — skip it
  { table: "attendance",         conflict: "id" },
  { table: "breaks",             conflict: "id" },
  { table: "time_logs",          conflict: "id" },
];

// ── Sync one table ───────────────────────────────────────────
async function syncTable({ table, conflict, excludeFromRow = [] }) {
  const r = await pool.query(`SELECT * FROM "${table}"`);
  const rows = r.rows;

  if (!rows.length) {
    return { table, synced: 0, failed: 0, total: 0, note: "empty" };
  }

  // Clean rows: convert Date objects → ISO strings, strip excluded cols
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
      console.log(`   ⚠️  ${table} batch ${Math.floor(i/BATCH)+1}: ${error.message.slice(0,100)}`);
      failed += batch.length;
    } else {
      synced += batch.length;
    }
  }

  const icon = failed === 0 ? "✅" : (synced > 0 ? "⚠️ " : "❌");
  console.log(`   ${icon} ${table.padEnd(24)} ${synced}/${rows.length} synced${failed ? `, ${failed} failed` : ""}`);
  return { table, synced, failed, total: rows.length };
}

// ── Main sync function ───────────────────────────────────────
async function runSync() {
  const start = new Date();
  const istStr = new Date(start.getTime() + 5.5*60*60*1000)
    .toISOString().replace("T"," ").slice(0,19) + " IST";

  console.log(`\n${"═".repeat(52)}`);
  console.log(`🔄  RDS Sync — ${istStr}`);
  console.log(`${"═".repeat(52)}`);

  // Verify DB connection
  await pool.query("SELECT 1");
  console.log("✅  Local DB connected\n");

  let totalSynced = 0, totalFailed = 0;
  const tableResults = [];

  for (const cfg of TABLE_CONFIG) {
    try {
      const res = await syncTable(cfg);
      totalSynced += res.synced;
      totalFailed += res.failed;
      tableResults.push(res);
    } catch (e) {
      console.log(`   ❌ ${cfg.table}: ${e.message}`);
      tableResults.push({ table: cfg.table, synced: 0, failed: 0, total: 0, error: e.message });
    }
  }

  const duration = ((new Date() - start) / 1000).toFixed(1);

  console.log(`\n${"─".repeat(52)}`);
  console.log(`🎉  Sync complete in ${duration}s`);
  console.log(`    ${totalSynced} records synced  |  ${totalFailed} failed`);
  console.log(`${"─".repeat(52)}\n`);

  // Save report for Session 6 dashboard
  const report = {
    timestamp:     start.toISOString(),
    ist_time:      istStr,
    duration_sec:  parseFloat(duration),
    total_synced:  totalSynced,
    total_failed:  totalFailed,
    status:        totalFailed === 0 ? "success" : (totalSynced > 0 ? "partial" : "failed"),
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
