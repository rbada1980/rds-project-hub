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
  options: '-c timezone=UTC'  // Read/write dates as UTC to avoid IST timezone shift
});

// ── Table sync config ────────────────────────────────────────
// conflict       = column(s) for ON CONFLICT upsert
// excludeFromRow = columns to strip when pushing TO Supabase
// excludeFromPull= columns to strip when pulling FROM Supabase
//                  (defaults to excludeFromRow if not set)
const TABLE_CONFIG = [
  { table: "users",              conflict: "id", deleteOrphans: true },
  { table: "clients",            conflict: "id", deleteOrphans: true },
  { table: "projects",           conflict: "id", deleteOrphans: true },
  { table: "tasks",              conflict: "id", deleteOrphans: true },
  { table: "task_files",         conflict: "id" },
  { table: "task_comments",      conflict: "id" },
  { table: "notifications",      conflict: "id", skipPush: true },
  // ↑ skipPush: local notifications use user_id from local DB which may not
  //   match Supabase FK constraints. We pull Supabase notifications in,
  //   but don't push local-only rows back up.
  { table: "announcements",      conflict: "id" },
  { table: "workflows",          conflict: "id" },
  { table: "war_room_messages",  conflict: "id", skipPush: true },
  // ↑ skipPush: both Supabase and local use the client username slug as client_id.
  //   Pull-only: messages sent on local offline stay local (don't overwrite Supabase).
  { table: "war_room_pins",      conflict: "id" },
  { table: "war_room_reactions", conflict: "id" },
  { table: "war_room_reads",     conflict: "client_id,user_username" },
  { table: "war_room_scheduled", conflict: "id" },
  { table: "settings",           conflict: "key", excludeFromRow: ["id"], excludeFromPull: ["id"] },
  { table: "attendance",         conflict: "id", pushConflict: "user_id,date", skipPull: true },
  { table: "breaks",             conflict: "id", excludeFromRow: ["created_at"], skipPull: true },
  { table: "time_logs",          conflict: "id" },
];

// ── Helper: get local column names & types ───────────────────
async function getLocalSchema(table) {
  try {
    const r = await pool.query(
      `SELECT column_name, data_type FROM information_schema.columns
       WHERE table_schema='public' AND table_name=$1`, [table]
    );
    const schema = {};
    for (const row of r.rows) schema[row.column_name] = row.data_type;
    return schema;
  } catch { return null; }
}

// ── Phase 1: Pull FROM Supabase → Local ─────────────────────
async function pullTable({ table, conflict, pullConflict, excludeFromRow = [], excludeFromPull, deleteOrphans = false, skipPull = false }) {
  if (skipPull) {
    console.log(`   ⏭  ← ${table.padEnd(24)} skipped (push-only table)`);
    return { table, pulled: 0, failed: 0, total: 0, note: "push-only" };
  }
  const skipCols    = excludeFromPull !== undefined ? excludeFromPull : excludeFromRow;
  const effectivePullConflict = pullConflict || conflict;
  const conflictCols = effectivePullConflict.split(",").map(c => c.trim());

  // Check local table exists
  const localSchema = await getLocalSchema(table);
  if (!localSchema || Object.keys(localSchema).length === 0) {
    console.log(`   ⏭  ← ${table.padEnd(24)} not in local DB, skipping`);
    return { table, pulled: 0, failed: 0, total: 0, note: "no local table" };
  }

  // Fetch all rows via direct REST API
  let allRows = [];
  const PAGE = 1000;
  let offset = 0;
  while (true) {
    const url = `${SUPA_URL}/rest/v1/${table}?select=*&limit=${PAGE}&offset=${offset}`;
    const res = await fetch(url, {
      headers: { "apikey": SUPA_KEY, "Authorization": `Bearer ${SUPA_KEY}` }
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`HTTP ${res.status}: ${txt.slice(0, 120)}`);
    }
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) break;
    allRows = allRows.concat(data);
    if (data.length < PAGE) break;
    offset += PAGE;
  }

  if (!allRows.length) {
    return { table, pulled: 0, failed: 0, total: 0, note: "empty" };
  }

  // Only use columns that exist in BOTH Supabase response AND local table
  const supabaseCols = Object.keys(allRows[0]);
  const cols = supabaseCols.filter(c => !skipCols.includes(c) && localSchema.hasOwnProperty(c));

  if (!cols.length) return { table, pulled: 0, failed: 0, total: allRows.length, note: "no matching cols" };

  // When conflict is NOT on "id", never overwrite the local primary key in the SET clause
  const neverUpdate = conflictCols.includes("id") ? [] : ["id"];
  const sets = cols
    .filter(c => !conflictCols.includes(c) && !neverUpdate.includes(c))
    .map(c => `"${c}" = EXCLUDED."${c}"`);
  const conflictClause = `ON CONFLICT (${conflictCols.map(c => `"${c}"`).join(", ")})`;
  const updateClause   = sets.length ? `DO UPDATE SET ${sets.join(", ")}` : "DO NOTHING";

  let pulled = 0, failed = 0;
  const BATCH = 100;

  for (let i = 0; i < allRows.length; i += BATCH) {
    const batch = allRows.slice(i, i + BATCH);
    try {
      const values = [], rowPhs = [];
      let counter = 1;

      for (const row of batch) {
        const ph = [];
        for (const c of cols) {
          let v = row[c];
          // Convert JS arrays/objects → JSON string (avoids pg sending as PG array literal)
          if (v !== null && v !== undefined && typeof v === "object" && !(v instanceof Date)) {
            v = JSON.stringify(v);
          } else if (v instanceof Date) {
            // For date-only columns, use local date to avoid IST→UTC shift
            const DATE_COLS_L = ['due_date', 'client_sub_date', 'deadline'];
            v = DATE_COLS_L.includes(c)
              ? `${v.getFullYear()}-${String(v.getMonth()+1).padStart(2,'0')}-${String(v.getDate()).padStart(2,'0')}`
              : v.toISOString();
          }
          values.push(v);
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
      console.log(`   ⚠️  ${table} pull batch ${Math.floor(i/BATCH)+1}: ${e.message.slice(0, 120)}`);
      failed += batch.length;
    }
  }

  // ── Delete local orphans (rows deleted from Supabase) ──────
  let deleted = 0;
  if (deleteOrphans && allRows.length > 0 && conflictCols.length === 1 && conflictCols[0] === "id") {
    try {
      const supabaseIds = allRows.map(r => r.id).filter(Boolean);
      const result = await pool.query(
        `DELETE FROM "${table}" WHERE id <> ALL($1::uuid[])`,
        [supabaseIds]
      );
      deleted = result.rowCount || 0;
      if (deleted > 0)
        console.log(`   🗑  ← ${table.padEnd(24)} ${deleted} orphan(s) deleted (no longer in Supabase)`);
    } catch (e) {
      console.log(`   ⚠️  ${table} orphan delete: ${e.message.slice(0, 100)}`);
    }
  }

  const icon = failed === 0 ? "✅" : (pulled > 0 ? "⚠️ " : "❌");
  console.log(`   ${icon} ← ${table.padEnd(24)} ${pulled}/${allRows.length} pulled`
    + (failed ? `, ${failed} failed` : "")
    + (deleted ? `, ${deleted} orphans removed` : ""));
  return { table, pulled, failed, total: allRows.length, deleted };
}

// ── Phase 2: Push FROM Local → Supabase ─────────────────────
async function pushTable({ table, conflict, pushConflict, excludeFromRow = [], skipPush = false }) {
  const effectiveConflict = pushConflict || conflict;
  if (skipPush) {
    console.log(`   ⏭  → ${table.padEnd(24)} skipped (pull-only table)`);
    return { table, synced: 0, failed: 0, total: 0, note: "pull-only" };
  }
  const r = await pool.query(`SELECT * FROM "${table}"`);
  const rows = r.rows;

  if (!rows.length) {
    return { table, synced: 0, failed: 0, total: 0, note: "empty" };
  }

  const cleaned = rows.map(row => {
    const out = {};
    for (const [k, v] of Object.entries(row)) {
      if (excludeFromRow.includes(k)) continue;
      // For date-only columns, use local date (getFullYear/getDate) to avoid IST→UTC shift
      const DATE_COLS = ['due_date', 'client_sub_date', 'deadline'];
      out[k] = v instanceof Date
        ? (DATE_COLS.includes(k)
            ? `${v.getFullYear()}-${String(v.getMonth()+1).padStart(2,'0')}-${String(v.getDate()).padStart(2,'0')}`
            : v.toISOString())
        : v;
    }
    return out;
  });

  let synced = 0, failed = 0;
  const BATCH = 100;

  for (let i = 0; i < cleaned.length; i += BATCH) {
    const batch = cleaned.slice(i, i + BATCH);
    const { error } = await supabase
      .from(table)
      .upsert(batch, { onConflict: effectiveConflict, ignoreDuplicates: false });

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
                   : (totalSynced + totalPulled > 0 ? 