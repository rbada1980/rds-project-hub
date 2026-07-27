// ============================================================
// RDS Project Hub — Realtime Sync Daemon
// Bidirectional real-time sync: Local PG ↔ Supabase
//
//   • Local PG → Supabase:  polls every 5s for changed rows
//   • Supabase → Local PG:  Supabase Realtime subscription
//
// Start:  pm2 start realtime-sync.cjs --name rds-realtime-sync
// Logs:   pm2 logs rds-realtime-sync
// ============================================================

const { Pool }        = require("pg");
const { createClient} = require("@supabase/supabase-js");
const fs              = require("fs");
const path            = require("path");

// ── Credentials ──────────────────────────────────────────────
const SUPA_URL  = "https://xypcbioltukahipkqqzc.supabase.co";
const SUPA_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGNiaW9sdHVrYWhpcGtxcXpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0MzEzNjUsImV4cCI6MjA5NTAwNzM2NX0.DG5sv2bpx8j3Mmz0mqIsoDVaCMP2TmWqh-OQUfSZFRw";

let SUPA_KEY = SUPA_ANON;
const CFG_PATH = path.join(__dirname, "sync-config.json");
if (fs.existsSync(CFG_PATH)) {
  try {
    const cfg = JSON.parse(fs.readFileSync(CFG_PATH, "utf8"));
    if (cfg.service_key) {
      SUPA_KEY = cfg.service_key;
      console.log("🔑 Using service key from sync-config.json");
    }
  } catch {}
}

// ── Supabase client ───────────────────────────────────────────
const supabase = createClient(SUPA_URL, SUPA_KEY);

// ── Local PostgreSQL ──────────────────────────────────────────
const pool = new Pool({
  host: "localhost", port: 5432,
  database: "rds_local", user: "postgres", password: "rds2026",
  options: "-c timezone=UTC",
});

// ── Tables to sync ────────────────────────────────────────────
const SYNC_TABLES = ["tasks", "projects", "users", "clients"];

// Date-only columns (serialize without time component to avoid IST offset)
const DATE_COLS = new Set(["due_date", "client_sub_date", "deadline", "date_of_joining", "date_of_birth"]);

// ── Loop prevention ───────────────────────────────────────────
// When we push local → Supabase, Realtime fires an event back.
// We skip those re-applies to prevent infinite loops.
const recentlyPushed = new Map(); // "table:id" → timestamp (ms)
const LOOP_WINDOW_MS = 20 * 1000; // 20 seconds

function markPushed(table, id) {
  recentlyPushed.set(`${table}:${id}`, Date.now());
}

function wasRecentlyPushed(table, id) {
  const ts = recentlyPushed.get(`${table}:${id}`);
  return ts && (Date.now() - ts) < LOOP_WINDOW_MS;
}

function cleanPushCache() {
  const cutoff = Date.now() - LOOP_WINDOW_MS;
  for (const [k, ts] of recentlyPushed)
    if (ts < cutoff) recentlyPushed.delete(k);
}

// ── Value serializer ──────────────────────────────────────────
function serializeVal(key, val) {
  if (val === null || val === undefined) return val;
  if (val instanceof Date) {
    return DATE_COLS.has(key)
      ? `${val.getFullYear()}-${String(val.getMonth()+1).padStart(2,"0")}-${String(val.getDate()).padStart(2,"0")}`
      : val.toISOString();
  }
  return val;
}

// ── Local column schema cache ─────────────────────────────────
const schemaCache = {};

async function getLocalCols(table) {
  if (schemaCache[table]) return schemaCache[table];
  const r = await pool.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema='public' AND table_name=$1`, [table]
  );
  schemaCache[table] = new Set(r.rows.map(row => row.column_name));
  return schemaCache[table];
}

// ── Push cursor persistence ───────────────────────────────────
// Saved to disk so the cursor survives daemon restarts
const CURSOR_FILE = path.join(__dirname, "realtime-sync-cursor.json");
const lastPushTime = {}; // table → ISO string

function loadCursors() {
  try {
    const data = JSON.parse(fs.readFileSync(CURSOR_FILE, "utf8"));
    Object.assign(lastPushTime, data);
    console.log("📂 Loaded push cursors:", JSON.stringify(lastPushTime));
  } catch { /* first run */ }
}

function saveCursors() {
  try { fs.writeFileSync(CURSOR_FILE, JSON.stringify(lastPushTime, null, 2)); }
  catch {}
}

// ═══════════════════════════════════════════════════════════════
// PUSH: Local PG → Supabase (every 5 seconds)
// Finds rows with updated_at newer than last push cursor.
// ═══════════════════════════════════════════════════════════════
async function pushChanges() {
  for (const table of SYNC_TABLES) {
    try {
      // On first run per table: look back 60s to catch up after a restart
      const since = lastPushTime[table] || new Date(Date.now() - 60000).toISOString();

      const result = await pool.query(
        `SELECT * FROM "${table}" WHERE updated_at > $1 ORDER BY updated_at LIMIT 200`,
        [since]
      );
      if (!result.rows.length) continue;

      // Serialize rows (exclude daemon-internal columns)
      const rows = result.rows.map(row => {
        const out = {};
        for (const [k, v] of Object.entries(row)) {
          if (k === "last_synced_at") continue; // internal only
          out[k] = serializeVal(k, v);
        }
        return out;
      });

      const { error } = await supabase
        .from(table)
        .upsert(rows, { onConflict: "id", ignoreDuplicates: false });

      if (error) {
        console.error(`❌ [Push→Supa] ${table}: ${error.message}`);
      } else {
        console.log(`↑  [Push→Supa] ${table}: ${rows.length} row(s) pushed`);
        // Mark these IDs so Realtime doesn't bounce them back
        for (const row of rows) markPushed(table, row.id);
        // Advance cursor to latest updated_at in this batch
        const latestRow = rows[rows.length - 1];
        const ts = latestRow.updated_at;
        if (ts) lastPushTime[table] = typeof ts === "string" ? ts : new Date(ts).toISOString();
      }
    } catch (e) {
      console.error(`❌ [Push→Supa] ${table} exception: ${e.message}`);
    }
  }
  cleanPushCache();
}

// ═══════════════════════════════════════════════════════════════
// SUBSCRIBE: Supabase Realtime → Local PG
// Listens for online changes and applies them instantly to local.
// ═══════════════════════════════════════════════════════════════
function startRealtime() {
  for (const table of SYNC_TABLES) {
    supabase
      .channel(`rt-sync-${table}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        async (payload) => {
          const { eventType, new: newRow, old: oldRow } = payload;
          const id = newRow?.id || oldRow?.id;
          if (!id) return;

          // Skip if we just pushed this row (loop prevention)
          if (wasRecentlyPushed(table, id)) {
            // Uncomment for debug: console.log(`⏭  [Realtime←] ${table} ${eventType} ${id} — own push, skipped`);
            return;
          }

          try {
            if (eventType === "DELETE") {
              await pool.query(`DELETE FROM "${table}" WHERE id=$1`, [id]);
              console.log(`🗑  [Realtime←] ${table} DELETE ${id}`);
              return;
            }

            // INSERT or UPDATE: upsert to local PG
            const localCols = await getLocalCols(table);

            // Only use columns that exist locally to avoid schema mismatch
            const cols = Object.keys(newRow).filter(
              k => localCols.has(k) && k !== "last_synced_at"
            );
            if (!cols.length) return;

            const vals = cols.map(k => {
              const v = newRow[k];
              // Serialize JS objects → JSON string for JSONB columns
              if (v !== null && v !== undefined && typeof v === "object" && !(v instanceof Date))
                return JSON.stringify(v);
              return v;
            });

            const conflictSets = cols
              .filter(k => k !== "id")
              .map(k => `"${k}"=EXCLUDED."${k}"`);

            await pool.query(
              `INSERT INTO "${table}" (${cols.map(k => `"${k}"`).join(",")})
               VALUES (${cols.map((_, i) => `$${i+1}`).join(",")})
               ON CONFLICT (id) DO UPDATE SET ${conflictSets.join(",")}`,
              vals
            );

            console.log(`↓  [Realtime←] ${table} ${eventType} ${id}`);
          } catch (e) {
            console.error(`❌ [Realtime←] ${table} apply error: ${e.message}`);
          }
        }
      )
      .subscribe((status, err) => {
        if (err) console.error(`❌ [Subscribe] ${table}: ${err.message}`);
        else     console.log(`📡 [Subscribe] ${table}: ${status}`);
      });
  }
}

// ═══════════════════════════════════════════════════════════════
// LOCAL DB MIGRATIONS
// Adds updated_at column + auto-update trigger to all sync tables.
// (tasks already has updated_at set explicitly in PUT endpoint)
// ═══════════════════════════════════════════════════════════════
async function runLocalMigrations() {
  // Add updated_at column (tasks already has it)
  const colMigrations = [
    `ALTER TABLE projects ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()`,
    `ALTER TABLE users    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()`,
    `ALTER TABLE clients  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()`,
  ];
  for (const sql of colMigrations) {
    try { await pool.query(sql); }
    catch (e) { console.warn(`⚠  Migration: ${e.message.slice(0, 80)}`); }
  }

  // Create trigger function
  try {
    await pool.query(`
      CREATE OR REPLACE FUNCTION _rds_set_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
      $$ LANGUAGE plpgsql
    `);
  } catch (e) {
    console.warn(`⚠  Trigger fn: ${e.message.slice(0, 80)}`);
  }

  // Create per-table triggers
  for (const table of SYNC_TABLES) {
    try {
      await pool.query(
        `DROP TRIGGER IF EXISTS _rds_trg_${table}_updated_at ON "${table}"`
      );
      await pool.query(`
        CREATE TRIGGER _rds_trg_${table}_updated_at
          BEFORE UPDATE ON "${table}"
          FOR EACH ROW EXECUTE FUNCTION _rds_set_updated_at()
      `);
    } catch (e) {
      console.warn(`⚠  Trigger ${table}: ${e.message.slice(0, 80)}`);
    }
  }

  // Invalidate schema cache (new columns added)
  for (const t of SYNC_TABLES) delete schemaCache[t];

  console.log("✅ Local DB migrations + triggers applied");
}

// ═══════════════════════════════════════════════════════════════
// START
// ═══════════════════════════════════════════════════════════════
async function start() {
  console.log("═".repeat(54));
  console.log("🔄  RDS Realtime Sync Daemon");
  console.log("    Local PG ↔ Supabase  (bidirectional, ~5s lag)");
  console.log("═".repeat(54));

  // Test DB connection
  await pool.query("SELECT 1");
  console.log("✅  Local PostgreSQL connected");

  // Apply local migrations
  await runLocalMigrations();

  // Load saved push cursors (survive restarts)
  loadCursors();

  // Subscribe to Supabase Realtime (Supabase → Local)
  startRealtime();

  // Push daemon: Local → Supabase, every 5 seconds
  await pushChanges(); // immediate first run
  const pushInterval = setInterval(pushChanges, 5000);

  // Save cursors to disk every 60 seconds
  setInterval(saveCursors, 60000);

  console.log("⏱   Push daemon:     every 5 seconds");
  console.log("📡  Realtime listen: subscribed to tasks/projects/users/clients");
  console.log("═".repeat(54));

  // Graceful shutdown
  process.on("SIGINT",  () => shutdown(pushInterval));
  process.on("SIGTERM", () => shutdown(pushInterval));
}

async function shutdown(interval) {
  console.log("\n🛑 Shutting down realtime sync...");
  clearInterval(interval);
  saveCursors();
  await pool.end();
  process.exit(0);
}

start().catch(e => {
  console.error("Fatal:", e.message);
  process.exit(1);
});
