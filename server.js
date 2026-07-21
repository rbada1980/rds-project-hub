// ============================================================
// RDS Project Hub — Local LAN Server
// Runs on: http://192.168.0.159:3000
// Serves: React app + REST API backed by local PostgreSQL
//
// Usage: node server.js
// ============================================================

const express  = require("express");
const pg       = require("pg");
const { Pool } = pg;
const cors     = require("cors");

// Return DATE columns as plain "YYYY-MM-DD" strings (not JS Date objects).
// Without this, pg converts DATE → JS Date → UTC ISO string → 1-day shift in IST.
pg.types.setTypeParser(1082, val => val);
const path     = require("path");
const multer   = require("multer");
const fs       = require("fs");
const { v4: uuidv4 } = require("uuid");
const cron     = require("node-cron");
const PDFDocument = require("pdfkit");
const { runSync } = require("./sync.cjs");

// ── Web Push (VAPID) ─────────────────────────────────────────
// Keys generated once — shared between offline + online
const VAPID_PUBLIC_KEY  = "BMTLOA2w7j72nZQd64u_WR2dNKpDcdDiAP92vs_BJY7l2v23qQaw9Xbwimu4Y62U2rjJ9A0rSNM1SYS_6wBDHq4";
const VAPID_PRIVATE_KEY = "BUB44kF8h_b_PYPOJCJrt9fv2InIsV4C1hN67zGqhiE";
const VAPID_EMAIL       = "mailto:admin@rdsgroup.biz";

let webpush = null;
try {
  webpush = require("web-push");
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  console.log("✓ Web Push (VAPID) ready");
} catch (e) {
  console.warn("⚠ web-push not installed — run: npm install web-push");
}

const app  = express();
const PORT = 3000;

// ── PostgreSQL pool ──────────────────────────────────────────
const pool = new Pool({
  host:     "localhost",
  port:     5432,
  database: "rds_local",
  user:     "postgres",
  password: "rds2026",
});

// ── DB Migration: add new columns safely on startup ─────────
async function runMigrations() {
  const migrations = [
    `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS client_approval TEXT DEFAULT 'Pending Review'`,
    `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS client_comment  TEXT`,
    `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS det_weight      NUMERIC`,
    `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS notes           TEXT`,
    // ── Audit Log table ──────────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS audit_logs (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      actor_id     UUID,
      actor_name   TEXT,
      actor_role   TEXT,
      entity_type  TEXT NOT NULL DEFAULT 'task',
      entity_id    UUID,
      entity_label TEXT,
      action       TEXT NOT NULL,
      field        TEXT,
      old_value    TEXT,
      new_value    TEXT,
      project_id   UUID
    )`,
    `CREATE INDEX IF NOT EXISTS audit_logs_entity_idx  ON audit_logs (entity_id)`,
    `CREATE INDEX IF NOT EXISTS audit_logs_project_idx ON audit_logs (project_id)`,
    `CREATE INDEX IF NOT EXISTS audit_logs_created_idx ON audit_logs (created_at DESC)`,
    // ── HR Dashboard schema ──────────────────────────────────────
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS employee_id    VARCHAR(50)`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS date_of_joining DATE`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS date_of_birth   DATE`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS leave_balance   JSONB DEFAULT '{"annual":15,"sick":6,"casual":6,"annual_used":0,"sick_used":0,"casual_used":0}'::jsonb`,
    `CREATE TABLE IF NOT EXISTS holidays (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name       TEXT NOT NULL,
      date       DATE NOT NULL,
      type       TEXT DEFAULT 'public',
      year       INTEGER NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now()
    )`,
    `CREATE INDEX IF NOT EXISTS holidays_year_idx ON holidays (year)`,
    `CREATE INDEX IF NOT EXISTS holidays_date_idx ON holidays (date)`,
  ];
  for (const sql of migrations) {
    try { await pool.query(sql); } catch(e) { console.warn("Migration skipped:", e.message); }
  }
  console.log("✓ DB migrations applied");
}
runMigrations();

// ── File storage (uploads go to ./uploads/) ─────────────────
const UPLOAD_DIR = path.join(__dirname, "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename:    (req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${Date.now()}_${safe}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

// ── Middleware ───────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// Serve uploaded files
app.use("/uploads", express.static(UPLOAD_DIR));

// Serve React build (must be built first: npm run build)
const DIST = path.join(__dirname, "dist");
if (fs.existsSync(DIST)) {
  app.use(express.static(DIST));
}

// ── Helper: wrap pg result as Supabase-style {data, error} ───
function ok(data)  { return { data, error: null }; }
function err(e)    { return { data: null, error: { message: e.message || String(e) } }; }

// ── Helper: IST now string ───────────────────────────────────
function nowIST() {
  return new Date(new Date().getTime() + 5.5 * 60 * 60 * 1000).toISOString();
}

// ═════════════════════════════════════════════════════════════
// AUTH
// ═════════════════════════════════════════════════════════════

// POST /api/auth/login
app.post("/api/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const r = await pool.query(
      `SELECT * FROM users WHERE username=$1 AND password=$2 LIMIT 1`,
      [username?.trim().toLowerCase(), password]
    );
    if (!r.rows.length) return res.json(err(new Error("Invalid credentials")));
    res.json(ok(r.rows[0]));
  } catch (e) { res.json(err(e)); }
});

// ═════════════════════════════════════════════════════════════
// USERS
// ═════════════════════════════════════════════════════════════

// GET /api/users?full=true  (full=true returns all columns)
app.get("/api/users", async (req, res) => {
  try {
    const cols = req.query.full === "true" ? "*" : "id,name,username,role,email,client_name";
    const r = await pool.query(`SELECT ${cols} FROM users ORDER BY name`);
    res.json(ok(r.rows));
  } catch (e) { res.json(err(e)); }
});

// POST /api/users
app.post("/api/users", async (req, res) => {
  try {
    const f = req.body;
    const r = await pool.query(
      `INSERT INTO users (name,username,password,role,client_name,email)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [f.name, f.username?.toLowerCase(), f.password, f.role, f.client_name||"", f.email||""]
    );
    res.json(ok(r.rows[0]));
  } catch (e) { res.json(err(e)); }
});

// PUT /api/users/:id
app.put("/api/users/:id", async (req, res) => {
  try {
    const f = req.body;
    const sets = ["name=$1","username=$2","role=$3","client_name=$4","email=$5"];
    const vals = [f.name, f.username?.toLowerCase(), f.role, f.client_name||"", f.email||""];
    if (f.password?.trim()) { sets.push(`password=$${vals.length+1}`); vals.push(f.password.trim()); }
    vals.push(req.params.id);
    const r = await pool.query(
      `UPDATE users SET ${sets.join(",")} WHERE id=$${vals.length} RETURNING *`, vals
    );
    res.json(ok(r.rows[0]));
  } catch (e) { res.json(err(e)); }
});

// DELETE /api/users/:id
app.delete("/api/users/:id", async (req, res) => {
  try {
    await pool.query(`DELETE FROM users WHERE id=$1`, [req.params.id]);
    res.json(ok(null));
  } catch (e) { res.json(err(e)); }
});

// ═════════════════════════════════════════════════════════════
// CLIENTS
// ═════════════════════════════════════════════════════════════

app.get("/api/clients", async (req, res) => {
  try {
    const r = await pool.query(`SELECT * FROM clients ORDER BY name`);
    res.json(ok(r.rows));
  } catch (e) { res.json(err(e)); }
});

app.post("/api/clients", async (req, res) => {
  try {
    const f = req.body;
    const r = await pool.query(
      `INSERT INTO clients (name,email,phone,address) VALUES ($1,$2,$3,$4) RETURNING *`,
      [f.name, f.email||"", f.phone||"", f.address||""]
    );
    res.json(ok(r.rows[0]));
  } catch (e) { res.json(err(e)); }
});

app.put("/api/clients/:id", async (req, res) => {
  try {
    const f = req.body;
    const r = await pool.query(
      `UPDATE clients SET name=$1,email=$2,phone=$3,address=$4 WHERE id=$5 RETURNING *`,
      [f.name, f.email||"", f.phone||"", f.address||"", req.params.id]
    );
    res.json(ok(r.rows[0]));
  } catch (e) { res.json(err(e)); }
});

app.delete("/api/clients/:id", async (req, res) => {
  try {
    await pool.query(`DELETE FROM clients WHERE id=$1`, [req.params.id]);
    res.json(ok(null));
  } catch (e) { res.json(err(e)); }
});

// ═════════════════════════════════════════════════════════════
// PROJECTS
// ═════════════════════════════════════════════════════════════

app.get("/api/projects", async (req, res) => {
  try {
    const r = await pool.query(`SELECT * FROM projects ORDER BY name`);
    res.json(ok(r.rows));
  } catch (e) { res.json(err(e)); }
});

app.post("/api/projects", async (req, res) => {
  try {
    const f = req.body;
    const r = await pool.query(
      `INSERT INTO projects (name,client,color,deadline,description,assigned_users,group_name)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [f.name, f.client||"", f.color||"#14b8a6", f.deadline||null,
       f.description||"", JSON.stringify(f.assigned_users||[]), f.group_name||null]
    );
    res.json(ok(r.rows[0]));
  } catch (e) { res.json(err(e)); }
});

app.put("/api/projects/:id", async (req, res) => {
  try {
    const f = req.body;
    const r = await pool.query(
      `UPDATE projects SET name=$1,client=$2,color=$3,deadline=$4,description=$5,
       assigned_users=$6,group_name=$7 WHERE id=$8 RETURNING *`,
      [f.name, f.client||"", f.color||"#14b8a6", f.deadline||null,
       f.description||"", JSON.stringify(f.assigned_users||[]), f.group_name||null, req.params.id]
    );
    res.json(ok(r.rows[0]));
  } catch (e) { res.json(err(e)); }
});

app.delete("/api/projects/:id", async (req, res) => {
  try {
    await pool.query(`DELETE FROM tasks WHERE project_id=$1`, [req.params.id]);
    await pool.query(`DELETE FROM projects WHERE id=$1`, [req.params.id]);
    res.json(ok(null));
  } catch (e) { res.json(err(e)); }
});

// ═════════════════════════════════════════════════════════════
// TASKS
// ═════════════════════════════════════════════════════════════

app.get("/api/tasks", async (req, res) => {
  try {
    const r = await pool.query(`SELECT * FROM tasks ORDER BY created_at`);
    res.json(ok(r.rows));
  } catch (e) { res.json(err(e)); }
});

app.post("/api/tasks", async (req, res) => {
  try {
    const f = req.body;
    const r = await pool.query(
      `INSERT INTO tasks
         (project_id,title,client,status,priority,assignee,detailer,checker,
          due_date,client_sub_date,scope,tags,files)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [f.project_id||null, f.title, f.client||"",
       f.status||"Not Yet Started", f.priority||"Medium",
       f.assignee||"", f.detailer||"", f.checker||"",
       f.due_date||null, f.client_sub_date||null, f.scope||"",
       JSON.stringify(f.tags||[]), JSON.stringify(f.files||[])]
    );
    res.json(ok(r.rows[0]));
  } catch (e) { res.json(err(e)); }
});

app.put("/api/tasks/:id", async (req, res) => {
  try {
    const f = req.body;
    const now = new Date().toISOString();
    const r = await pool.query(
      `UPDATE tasks SET
         project_id=$1,title=$2,client=$3,status=$4,priority=$5,
         assignee=$6,detailer=$7,checker=$8,due_date=$9,client_sub_date=$10,
         scope=$11,tags=$12,files=$13,updated_at=$14
       WHERE id=$15 RETURNING *`,
      [f.project_id||null, f.title, f.client||"",
       f.status||"Not Yet Started", f.priority||"Medium",
       f.assignee||"", f.detailer||"", f.checker||"",
       f.due_date||null, f.client_sub_date||null, f.scope||"",
       JSON.stringify(f.tags||[]), JSON.stringify(f.files||[]),
       now, req.params.id]
    );
    res.json(ok(r.rows[0]));
  } catch (e) { res.json(err(e)); }
});

// PATCH /api/tasks/:id — partial update (status, assignee, etc.)
app.patch("/api/tasks/:id", async (req, res) => {
  try {
    const updates = req.body;
    const keys = Object.keys(updates);
    if (!keys.length) return res.json(ok(null));
    const sets = keys.map((k, i) => `"${k}"=$${i+1}`);
    const vals = keys.map(k => {
      const v = updates[k];
      if (v !== null && typeof v === "object") return JSON.stringify(v);
      return v;
    });
    vals.push(req.params.id);
    const r = await pool.query(
      `UPDATE tasks SET ${sets.join(",")} WHERE id=$${vals.length} RETURNING *`, vals
    );
    res.json(ok(r.rows[0] || null));
  } catch (e) { res.json(err(e)); }
});

app.delete("/api/tasks/:id", async (req, res) => {
  try {
    await pool.query(`DELETE FROM tasks WHERE id=$1`, [req.params.id]);
    res.json(ok(null));
  } catch (e) { res.json(err(e)); }
});

// DELETE /api/tasks/bulk  — body: { ids: [...] }
app.delete("/api/tasks/bulk", async (req, res) => {
  try {
    const { ids, project_ids } = req.body;
    if (ids?.length)         await pool.query(`DELETE FROM tasks WHERE id=ANY($1::uuid[])`, [ids]);
    if (project_ids?.length) await pool.query(`DELETE FROM tasks WHERE project_id=ANY($1::uuid[])`, [project_ids]);
    res.json(ok(null));
  } catch (e) { res.json(err(e)); }
});

// PATCH /api/tasks/bulk — body: { ids:[...], field:"status"|"assignee"|"priority", value:"..." }
app.patch("/api/tasks/bulk", async (req, res) => {
  try {
    const { ids, field, value } = req.body;
    const allowed = ["status","assignee","priority"];
    if (!allowed.includes(field)) return res.json(err(new Error("Invalid field")));
    await pool.query(
      `UPDATE tasks SET "${field}"=$1 WHERE id=ANY($2::uuid[])`,
      [value, ids]
    );
    res.json(ok(null));
  } catch (e) { res.json(err(e)); }
});

// ═════════════════════════════════════════════════════════════
// TASK FILES
// ═════════════════════════════════════════════════════════════

app.get("/api/task-files", async (req, res) => {
  try {
    if (req.query.ids_only === "true") {
      const r = await pool.query(`SELECT task_id FROM task_files`);
      res.json(ok(r.rows));
    } else {
      const r = await pool.query(
        `SELECT * FROM task_files WHERE task_id=$1 ORDER BY created_at DESC`,
        [req.query.task_id]
      );
      res.json(ok(r.rows));
    }
  } catch (e) { res.json(err(e)); }
});

// POST /api/task-files — multipart upload
app.post("/api/task-files", upload.single("file"), async (req, res) => {
  try {
    const { task_id, project_id, uploaded_by } = req.body;
    const file = req.file;
    if (!file) return res.json(err(new Error("No file")));
    const public_url = `/uploads/${file.filename}`;
    const r = await pool.query(
      `INSERT INTO task_files
         (task_id,project_id,file_name,file_size,file_type,storage_path,public_url,uploaded_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [task_id, project_id||null, file.originalname, file.size,
       file.mimetype, file.filename, public_url, uploaded_by||""]
    );
    res.json(ok(r.rows[0]));
  } catch (e) { res.json(err(e)); }
});

app.delete("/api/task-files/:id", async (req, res) => {
  try {
    // Also delete the physical file
    const r = await pool.query(`SELECT storage_path FROM task_files WHERE id=$1`, [req.params.id]);
    if (r.rows[0]) {
      const fp = path.join(UPLOAD_DIR, r.rows[0].storage_path);
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
    }
    await pool.query(`DELETE FROM task_files WHERE id=$1`, [req.params.id]);
    res.json(ok(null));
  } catch (e) { res.json(err(e)); }
});

// ═════════════════════════════════════════════════════════════
// TASK COMMENTS
// ═════════════════════════════════════════════════════════════

app.get("/api/task-comments", async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT * FROM task_comments WHERE task_id=$1 ORDER BY created_at`,
      [req.query.task_id]
    );
    res.json(ok(r.rows));
  } catch (e) { res.json(err(e)); }
});

app.post("/api/task-comments", async (req, res) => {
  try {
    const f = req.body;
    const r = await pool.query(
      `INSERT INTO task_comments (task_id,user_name,comment) VALUES ($1,$2,$3) RETURNING *`,
      [f.task_id, f.user_name, f.comment]
    );
    res.json(ok(r.rows[0]));
  } catch (e) { res.json(err(e)); }
});

// ═════════════════════════════════════════════════════════════
// NOTIFICATIONS
// ═════════════════════════════════════════════════════════════

app.get("/api/notifications", async (req, res) => {
  try {
    const { user_id, since, types } = req.query;
    let q = `SELECT * FROM notifications WHERE user_id=$1`;
    const vals = [user_id];
    if (since) { q += ` AND created_at > $${vals.length+1}`; vals.push(since); }
    if (types) {
      const arr = types.split(",");
      q += ` AND type=ANY($${vals.length+1}::text[])`;
      vals.push(arr);
    }
    q += ` ORDER BY created_at DESC`;
    if (req.query.limit) { q += ` LIMIT $${vals.length+1}`; vals.push(parseInt(req.query.limit)); }
    const r = await pool.query(q, vals);
    res.json(ok(r.rows));
  } catch (e) { res.json(err(e)); }
});

// POST /api/notifications — insert one or many
app.post("/api/notifications", async (req, res) => {
  try {
    const rows = Array.isArray(req.body) ? req.body : [req.body];
    const inserted = [];
    for (const n of rows) {
      const r = await pool.query(
        `INSERT INTO notifications
           (user_id,type,title,description,entity_type,entity_id,created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [n.user_id, n.type||"", n.title||"", n.description||"",
         n.entity_type||"", n.entity_id||"", n.created_by||""]
      );
      inserted.push(r.rows[0]);

      // ── Push notification to recipient ──────────────────────
      if (n.recipient_username) {
        const url = n.entity_type === "task" ? "/task-list"
                  : n.entity_type === "message" ? "/message"
                  : "/";
        await pushToUsers([n.recipient_username], pushPayload({
          title:    "🔔 " + (n.title || "New Notification"),
          body:     n.description || "",
          employee: n.created_by || "",
          type:     n.type || "Notification",
          url,
          tag:      "notif-" + (n.entity_id || Date.now()),
        }));
      }
    }
    res.json(ok(inserted.length === 1 ? inserted[0] : inserted));
  } catch (e) { res.json(err(e)); }
});

// PATCH /api/notifications/:id
app.patch("/api/notifications/:id", async (req, res) => {
  try {
    const updates = req.body;
    const keys = Object.keys(updates);
    const sets = keys.map((k, i) => `"${k}"=$${i+1}`);
    const vals = [...keys.map(k => updates[k]), req.params.id];
    const r = await pool.query(
      `UPDATE notifications SET ${sets.join(",")} WHERE id=$${vals.length} RETURNING *`, vals
    );
    res.json(ok(r.rows[0]));
  } catch (e) { res.json(err(e)); }
});

// PATCH /api/notifications/bulk-read  — body: { ids: [...] }
app.patch("/api/notifications/bulk-read", async (req, res) => {
  try {
    await pool.query(
      `UPDATE notifications SET is_read=true WHERE id=ANY($1::uuid[])`,
      [req.body.ids]
    );
    res.json(ok(null));
  } catch (e) { res.json(err(e)); }
});

app.delete("/api/notifications/:id", async (req, res) => {
  try {
    await pool.query(`DELETE FROM notifications WHERE id=$1`, [req.params.id]);
    res.json(ok(null));
  } catch (e) { res.json(err(e)); }
});

// ═════════════════════════════════════════════════════════════
// ANNOUNCEMENTS
// ═════════════════════════════════════════════════════════════

app.get("/api/announcements", async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT * FROM announcements ORDER BY pinned DESC, created_at DESC LIMIT 100`
    );
    res.json(ok(r.rows));
  } catch (e) { res.json(err(e)); }
});

app.post("/api/announcements", async (req, res) => {
  try {
    const f = req.body;
    const r = await pool.query(
      `INSERT INTO announcements (title,body,scope,project_id,author,author_name,pinned)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [f.title, f.body, f.scope||"all", f.project_id||null,
       f.author||"", f.author_name||"", false]
    );
    res.json(ok(r.rows[0]));
  } catch (e) { res.json(err(e)); }
});

app.patch("/api/announcements/:id", async (req, res) => {
  try {
    const r = await pool.query(
      `UPDATE announcements SET pinned=$1 WHERE id=$2 RETURNING *`,
      [req.body.pinned, req.params.id]
    );
    res.json(ok(r.rows[0]));
  } catch (e) { res.json(err(e)); }
});

app.delete("/api/announcements/:id", async (req, res) => {
  try {
    await pool.query(`DELETE FROM announcements WHERE id=$1`, [req.params.id]);
    res.json(ok(null));
  } catch (e) { res.json(err(e)); }
});

// ═════════════════════════════════════════════════════════════
// WORKFLOWS
// ═════════════════════════════════════════════════════════════

app.get("/api/workflows", async (req, res) => {
  try {
    const r = await pool.query(`SELECT * FROM workflows ORDER BY created_at`);
    res.json(ok(r.rows));
  } catch (e) { res.json(err(e)); }
});

app.post("/api/workflows", async (req, res) => {
  try {
    const f = req.body;
    const r = await pool.query(
      `INSERT INTO workflows
         (name,trigger_event,trigger_value,action_type,action_target,
          escalate_hours,escalate_to,is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [f.name, f.trigger_event||"", f.trigger_value||"",
       f.action_type||"", f.action_target||"",
       f.escalate_hours||null, f.escalate_to||"", f.is_active!==false]
    );
    res.json(ok(r.rows[0]));
  } catch (e) { res.json(err(e)); }
});

app.put("/api/workflows/:id", async (req, res) => {
  try {
    const f = req.body;
    const r = await pool.query(
      `UPDATE workflows SET name=$1,trigger_event=$2,trigger_value=$3,
       action_type=$4,action_target=$5,escalate_hours=$6,escalate_to=$7,is_active=$8
       WHERE id=$9 RETURNING *`,
      [f.name, f.trigger_event||"", f.trigger_value||"",
       f.action_type||"", f.action_target||"",
       f.escalate_hours||null, f.escalate_to||"", f.is_active!==false, req.params.id]
    );
    res.json(ok(r.rows[0]));
  } catch (e) { res.json(err(e)); }
});

app.patch("/api/workflows/:id", async (req, res) => {
  try {
    const r = await pool.query(
      `UPDATE workflows SET is_active=$1 WHERE id=$2 RETURNING *`,
      [req.body.is_active, req.params.id]
    );
    res.json(ok(r.rows[0]));
  } catch (e) { res.json(err(e)); }
});

app.delete("/api/workflows/:id", async (req, res) => {
  try {
    await pool.query(`DELETE FROM workflows WHERE id=$1`, [req.params.id]);
    res.json(ok(null));
  } catch (e) { res.json(err(e)); }
});

// ═════════════════════════════════════════════════════════════
// WAR ROOM — MESSAGES
// ═════════════════════════════════════════════════════════════

// GET /api/war-room/messages?client_id=X
// GET /api/war-room/messages?client_id=X&since=ISO&limit=50
// GET /api/war-room/messages?unread_preview=true&user_id=X
app.get("/api/war-room/messages", async (req, res) => {
  try {
    const { client_id, since, limit, unread_preview, user_id } = req.query;

    if (unread_preview === "true") {
      // For unread badge: all messages not from this user
      const r = await pool.query(
        `SELECT client_id,body,author_name,created_at,author
         FROM war_room_messages WHERE is_deleted IS NOT TRUE
         ORDER BY created_at DESC LIMIT 500`
      );
      return res.json(ok(r.rows));
    }

    let q = `SELECT * FROM war_room_messages WHERE client_id=$1 AND (is_deleted IS NOT TRUE OR is_deleted IS NULL)`;
    const vals = [client_id];
    if (since) { q += ` AND created_at > $${vals.length+1}`; vals.push(since); }
    q += ` ORDER BY created_at ASC`;
    q += ` LIMIT $${vals.length+1}`;
    vals.push(since ? 50 : (limit ? parseInt(limit) : 300));
    const r = await pool.query(q, vals);
    res.json(ok(r.rows));
  } catch (e) { res.json(err(e)); }
});

app.post("/api/war-room/messages", async (req, res) => {
  try {
    const f = req.body;
    const r = await pool.query(
      `INSERT INTO war_room_messages
         (client_id,author,author_name,body,mentions,video_url,
          reply_to_id,reply_to_body,reply_to_author)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [f.client_id, f.author||"", f.author_name||"", f.body||"",
       JSON.stringify(f.mentions||[]), f.video_url||null,
       f.reply_to_id||null, f.reply_to_body||null, f.reply_to_author||null]
    );
    res.json(ok(r.rows[0]));

    // ── Push notification to all other subscribed users ──────
    const mentions = f.mentions || [];
    const clientRes = await pool.query(`SELECT name FROM clients WHERE id=$1`, [f.client_id]).catch(()=>({rows:[]}));
    const clientName = clientRes.rows[0]?.name || "War Room";
    const payload = pushPayload({
      title:    `💬 ${clientName}`,
      body:     f.body || "(new message)",
      employee: f.author_name || f.author,
      type:     mentions.length ? `Mentioned you` : "New Message",
      url:      "/message",
      tag:      "wr-" + f.client_id,
    });
    // Send to mentioned users first; if none, send to all subscribers except sender
    if (mentions.length) {
      await pushToUsers(mentions, payload);
    } else {
      const { rows: subs } = await pool.query(
        `SELECT DISTINCT username FROM push_subscriptions WHERE username != $1`, [f.author||""]
      );
      await pushToUsers(subs.map(s => s.username), payload);
    }

    // ── Insert into notifications table so frontend polling picks it up ──
    // (Realtime is a stub in local mode; this is the reliable fallback)
    const msgId = r.rows[0].id;
    const notifTitle  = `💬 ${clientName}`;
    const notifBody   = f.body || "(new message)";
    const notifAuthor = f.author || "";
    const { rows: recipients } = await pool.query(
      `SELECT id FROM users WHERE username != $1`,
      [notifAuthor]
    ).catch(() => ({ rows: [] }));
    for (const u of recipients) {
      pool.query(
        `INSERT INTO notifications (user_id, type, title, description, entity_type, entity_id, created_by)
         VALUES ($1, 'war_room_message', $2, $3, 'message', $4, $5)`,
        [u.id, notifTitle, notifBody, String(msgId), notifAuthor]
      ).catch(() => {});
    }
  } catch (e) { res.json(err(e)); }
});

// PATCH /api/war-room/messages/:id — edit, soft-delete, status_tag
app.patch("/api/war-room/messages/:id", async (req, res) => {
  try {
    const updates = req.body;
    const keys = Object.keys(updates);
    const sets = keys.map((k, i) => `"${k}"=$${i+1}`);
    const vals = [...keys.map(k => updates[k]), req.params.id];
    const r = await pool.query(
      `UPDATE war_room_messages SET ${sets.join(",")} WHERE id=$${vals.length} RETURNING *`, vals
    );
    res.json(ok(r.rows[0]));
  } catch (e) { res.json(err(e)); }
});

// ═════════════════════════════════════════════════════════════
// WAR ROOM — VIDEO UPLOAD
// ═════════════════════════════════════════════════════════════

const videoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(UPLOAD_DIR, "videos");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `warroom_${Date.now()}${ext}`);
  },
});
const videoUpload = multer({ storage: videoStorage, limits: { fileSize: 100 * 1024 * 1024 } });

app.post("/api/war-room/video-upload", videoUpload.single("video"), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.json(err(new Error("No file")));
    res.json(ok({ video_url: `/uploads/videos/${file.filename}` }));
  } catch (e) { res.json(err(e)); }
});

// ═════════════════════════════════════════════════════════════
// WAR ROOM — REACTIONS
// ═════════════════════════════════════════════════════════════

// GET /api/war-room/reactions?ids=id1,id2,...
app.get("/api/war-room/reactions", async (req, res) => {
  try {
    const ids = (req.query.ids || "").split(",").filter(Boolean);
    if (!ids.length) return res.json(ok([]));
    const r = await pool.query(
      `SELECT message_id,emoji,user_username FROM war_room_reactions
       WHERE message_id=ANY($1::uuid[])`,
      [ids]
    );
    res.json(ok(r.rows));
  } catch (e) { res.json(err(e)); }
});

app.post("/api/war-room/reactions", async (req, res) => {
  try {
    const f = req.body;
    const r = await pool.query(
      `INSERT INTO war_room_reactions (message_id,user_username,emoji) VALUES ($1,$2,$3) RETURNING *`,
      [f.message_id, f.user_username, f.emoji]
    );
    res.json(ok(r.rows[0]));
  } catch (e) { res.json(err(e)); }
});

// DELETE /api/war-room/reactions — body: { message_id, user_username, emoji }
app.delete("/api/war-room/reactions", async (req, res) => {
  try {
    const { message_id, user_username, emoji } = req.body;
    await pool.query(
      `DELETE FROM war_room_reactions WHERE message_id=$1 AND user_username=$2 AND emoji=$3`,
      [message_id, user_username, emoji]
    );
    res.json(ok(null));
  } catch (e) { res.json(err(e)); }
});

// ═════════════════════════════════════════════════════════════
// WAR ROOM — PINS
// ═════════════════════════════════════════════════════════════

app.get("/api/war-room/pins", async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT * FROM war_room_pins WHERE client_id=$1 ORDER BY created_at ASC`,
      [req.query.client_id]
    );
    res.json(ok(r.rows));
  } catch (e) { res.json(err(e)); }
});

app.post("/api/war-room/pins", async (req, res) => {
  try {
    const f = req.body;
    const r = await pool.query(
      `INSERT INTO war_room_pins
         (client_id,message_id,message_body,message_author,pinned_by)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [f.client_id, f.message_id, f.message_body||"", f.message_author||"", f.pinned_by||""]
    );
    res.json(ok(r.rows[0]));
  } catch (e) { res.json(err(e)); }
});

app.delete("/api/war-room/pins/:id", async (req, res) => {
  try {
    await pool.query(`DELETE FROM war_room_pins WHERE id=$1`, [req.params.id]);
    res.json(ok(null));
  } catch (e) { res.json(err(e)); }
});

// ═════════════════════════════════════════════════════════════
// WAR ROOM — READS
// ═════════════════════════════════════════════════════════════

app.get("/api/war-room/reads", async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT * FROM war_room_reads WHERE client_id=$1`,
      [req.query.client_id]
    );
    res.json(ok(r.rows));
  } catch (e) { res.json(err(e)); }
});

// POST /api/war-room/reads — upsert
app.post("/api/war-room/reads", async (req, res) => {
  try {
    const f = req.body;
    const r = await pool.query(
      `INSERT INTO war_room_reads (client_id,user_username,last_read_msg_id,last_read_at)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (client_id,user_username)
       DO UPDATE SET last_read_msg_id=EXCLUDED.last_read_msg_id,
                     last_read_at=EXCLUDED.last_read_at
       RETURNING *`,
      [f.client_id, f.user_username, f.last_read_msg_id, f.last_read_at||new Date().toISOString()]
    );
    res.json(ok(r.rows[0]));
  } catch (e) { res.json(err(e)); }
});

// ═════════════════════════════════════════════════════════════
// WAR ROOM — SCHEDULED
// ═════════════════════════════════════════════════════════════

app.get("/api/war-room/scheduled", async (req, res) => {
  try {
    const { client_id, due } = req.query;
    let q = `SELECT * FROM war_room_scheduled WHERE client_id=$1 AND sent=false`;
    const vals = [client_id];
    if (due === "true") { q += ` AND send_at <= $${vals.length+1}`; vals.push(new Date().toISOString()); }
    q += ` ORDER BY send_at`;
    const r = await pool.query(q, vals);
    res.json(ok(r.rows));
  } catch (e) { res.json(err(e)); }
});

app.post("/api/war-room/scheduled", async (req, res) => {
  try {
    const f = req.body;
    const r = await pool.query(
      `INSERT INTO war_room_scheduled (client_id,author,author_name,body,send_at)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [f.client_id, f.author||"", f.author_name||"", f.body||"",
       new Date(f.send_at).toISOString()]
    );
    res.json(ok(r.rows[0]));
  } catch (e) { res.json(err(e)); }
});

app.patch("/api/war-room/scheduled/:id", async (req, res) => {
  try {
    await pool.query(`UPDATE war_room_scheduled SET sent=true WHERE id=$1`, [req.params.id]);
    res.json(ok(null));
  } catch (e) { res.json(err(e)); }
});

app.delete("/api/war-room/scheduled/:id", async (req, res) => {
  try {
    await pool.query(`DELETE FROM war_room_scheduled WHERE id=$1`, [req.params.id]);
    res.json(ok(null));
  } catch (e) { res.json(err(e)); }
});

// ═════════════════════════════════════════════════════════════
// ═════════════════════════════════════════════════════════════
// HR MIGRATE — ensures holidays table + HR columns exist on
// local PG (auto on startup) AND on Supabase (called from
// runHRSetup button; uses Supabase direct pg if password set)
// ═════════════════════════════════════════════════════════════

// Fill this in from: Supabase Dashboard → Settings → Database
// → Connection string → password field (one-time setup)
const SUPA_DB_PASS = process.env.SUPA_DB_PASS || "";

const HR_MIGRATIONS = [
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS employee_id    VARCHAR(50)`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS date_of_joining DATE`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS date_of_birth   DATE`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS leave_balance   JSONB DEFAULT '{"annual":15,"sick":6,"casual":6,"annual_used":0,"sick_used":0,"casual_used":0}'::jsonb`,
  `CREATE TABLE IF NOT EXISTS holidays (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name       TEXT NOT NULL,
    date       DATE NOT NULL,
    type       TEXT DEFAULT 'public',
    year       INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS holidays_year_idx ON holidays (year)`,
  `CREATE INDEX IF NOT EXISTS holidays_date_idx ON holidays (date)`,
];

app.post("/api/hr-migrate", async (req, res) => {
  const results = { localPg: [], supabase: "skipped" };
  // Local PG (always)
  for (const sql of HR_MIGRATIONS) {
    try { await pool.query(sql); results.localPg.push("ok"); }
    catch(e) { results.localPg.push("skip: " + e.message.split("\n")[0]); }
  }
  // Supabase direct pg (only if SUPA_DB_PASS configured)
  if (SUPA_DB_PASS) {
    const { Pool: SPool } = require("pg");
    const sPool = new SPool({
      host: "aws-0-ap-south-1.pooler.supabase.com",
      port: 5432,
      database: "postgres",
      user: `postgres.xypcbioltukahipkqqzc`,
      password: SUPA_DB_PASS,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 8000,
    });
    const sResults = [];
    try {
      for (const sql of HR_MIGRATIONS) {
        try { await sPool.query(sql); sResults.push("ok"); }
        catch(e) { sResults.push("skip: " + e.message.split("\n")[0]); }
      }
      results.supabase = sResults;
    } catch(e) { results.supabase = "connect failed: " + e.message; }
    finally { sPool.end().catch(()=>{}); }
  }
  res.json({ ok: true, results });
});

// SETTINGS
// ═════════════════════════════════════════════════════════════

// ── Email via Resend ──────────────────────────────────────────
app.post("/api/send-email", async (req, res) => {
  const RESEND_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_KEY) return res.status(500).json({ error: "RESEND_API_KEY not configured in environment" });
  const { to, subject, html, fromName, fromEmail } = req.body;
  if (!to || !subject || !html) return res.status(400).json({ error: "Missing to/subject/html" });
  const from = `${fromName || "RDS Projects"} <${fromEmail || "noreply@hub-rdsprojects.com"}>`;
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + RESEND_KEY },
      body: JSON.stringify({ from, to: Array.isArray(to) ? to : [to], subject, html })
    });
    const data = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: data.message || "Resend error", data });
    res.json({ ok: true, id: data.id });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ═════════════════════════════════════════════════════════════

app.post("/api/settings/upsert", async (req, res) => {
  try {
    const { key, value } = req.body;
    const r = await pool.query(
      `INSERT INTO settings (key,value) VALUES ($1,$2)
       ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value
       RETURNING *`,
      [key, value]
    );
    res.json(ok(r.rows[0]));
  } catch (e) { res.json(err(e)); }
});

app.get("/api/settings", async (req, res) => {
  try {
    const r = await pool.query(`SELECT * FROM settings`);
    res.json(ok(r.rows));
  } catch (e) { res.json(err(e)); }
});

// ═════════════════════════════════════════════════════════════
// WEB PUSH — subscription management + send helpers
// ═════════════════════════════════════════════════════════════

// GET /install-cert — serves RDS CA cert for employee PCs to download and trust
app.get("/install-cert", (req, res) => {
  const caFile = path.join(__dirname, "certs", "RDS-Local-CA.crt");
  if (!fs.existsSync(caFile)) return res.status(404).send("CA cert not found");
  res.setHeader("Content-Disposition", "attachment; filename=RDS-Local-CA.crt");
  res.setHeader("Content-Type", "application/x-x509-ca-cert");
  res.sendFile(caFile);
});

// GET /api/push/vapid-public-key — frontend reads this to subscribe
app.get("/api/push/vapid-public-key", (req, res) => {
  res.json({ key: VAPID_PUBLIC_KEY });
});

// POST /api/push/subscribe — browser sends subscription object after permission granted
app.post("/api/push/subscribe", async (req, res) => {
  try {
    const { username, subscription } = req.body;
    if (!username || !subscription?.endpoint) return res.json(ok(null));
    await pool.query(`
      INSERT INTO push_subscriptions (username, endpoint, p256dh, auth, origin)
      VALUES ($1,$2,$3,$4,'offline')
      ON CONFLICT (username, endpoint) DO UPDATE SET p256dh=$3, auth=$4
    `, [username, subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth]);
    res.json(ok({ subscribed: true }));
  } catch (e) { res.json(err(e)); }
});

// DELETE /api/push/unsubscribe
app.delete("/api/push/unsubscribe", async (req, res) => {
  try {
    await pool.query(`DELETE FROM push_subscriptions WHERE endpoint=$1`, [req.body.endpoint]);
    res.json(ok(null));
  } catch (e) { res.json(err(e)); }
});

// POST /api/push/send — internal: send push to one or more usernames
// Accepts same format as Vercel api/push/send.js:
// { usernames, title, body, employee, type, url, tag, extra }
// Also accepts legacy { usernames, payload } format for backward compat
app.post("/api/push/send", async (req, res) => {
  try {
    const { usernames, payload, title, body, employee, type, url, tag, extra } = req.body;
    const users = Array.isArray(usernames) ? usernames : [usernames];
    const msg = payload || pushPayload({ title, body, employee, type, url, tag, extra });
    await pushToUsers(users, msg);
    res.json(ok({ sent: true }));
  } catch (e) { res.json(err(e)); }
});

// Helper: send push notification to list of usernames
async function pushToUsers(usernames, payload) {
  if (!webpush || !usernames?.length) return;
  try {
    const { rows } = await pool.query(
      `SELECT * FROM push_subscriptions WHERE username = ANY($1::text[])`,
      [usernames]
    );
    const msg = JSON.stringify(payload);
    await Promise.allSettled(rows.map(async sub => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          msg,
          { TTL: 86400, urgency: "high" }
        );
      } catch (e) {
        if (e.statusCode === 410 || e.statusCode === 404) {
          // Expired subscription — clean up
          await pool.query(`DELETE FROM push_subscriptions WHERE endpoint=$1`, [sub.endpoint]).catch(() => {});
        }
      }
    }));
  } catch (e) { console.error("[push]", e.message); }
}

// Helper: build notification payload
function pushPayload({ title, body, employee, type, url, tag, extra }) {
  const now = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" });
  return {
    title:    title || "RDS Project Hub",
    body:     body  || "",
    employee: employee || "",
    type:     type  || "",
    time:     now,
    url:      url   || "/",
    tag:      tag   || ("rds-" + Date.now()),
    extra:    extra || "",
  };
}

// ═════════════════════════════════════════════════════════════
// DATE FIX — pg may return DATE columns as JS Date objects
// (setTypeParser doesn't always fire). When that happens,
// JSON.stringify calls toISOString() → UTC midnight → IST shows
// previous day. We detect midnight-time Date objects and convert
// using LOCAL date getters instead.
// ═════════════════════════════════════════════════════════════
function fixPgDates(rows) {
  if (!Array.isArray(rows)) {
    return rows && typeof rows === 'object' ? fixPgDates([rows])[0] : rows;
  }
  return rows.map(row => {
    if (!row || typeof row !== 'object') return row;
    const out = {};
    for (const [k, v] of Object.entries(row)) {
      if (v instanceof Date) {
        const h = v.getHours(), m = v.getMinutes(), s = v.getSeconds(), ms = v.getMilliseconds();
        if (h === 0 && m === 0 && s === 0 && ms === 0) {
          // DATE-only column — use local components to avoid UTC shift
          out[k] = v.getFullYear() + '-' +
                   String(v.getMonth() + 1).padStart(2, '0') + '-' +
                   String(v.getDate()).padStart(2, '0');
        } else {
          out[k] = v.toISOString();
        }
      } else {
        out[k] = v;
      }
    }
    return out;
  });
}

// ═════════════════════════════════════════════════════════════
// GENERIC RPC — used by localApi.js (supabase.from() shim)
// ═════════════════════════════════════════════════════════════

app.post("/api/rpc", async (req, res) => {
  const { table, op, columns = "*", filters = [], order = [], limit: limitN, data, single } = req.body;

  const RPC_TABLES = new Set([
    "users","clients","projects","tasks","task_files","task_comments",
    "notifications","announcements","workflows",
    "war_room_messages","war_room_pins","war_room_reactions",
    "war_room_reads","war_room_scheduled","settings","attendance","breaks","time_logs","audit_logs","holidays"
  ]);
  if (!RPC_TABLES.has(table)) return res.json({ data: null, error: { message: "Unknown table: " + table } });

  try {
    // Build WHERE clause from filters array
    function buildWhere(vals) {
      if (!filters.length) return "";
      const clauses = filters.map(f => {
        if (f.op === "in") {
          const arr = Array.isArray(f.val) ? f.val : [f.val];
          const phs = arr.map(v => { vals.push(v); return `$${vals.length}`; });
          return `"${f.col}" IN (${phs.join(",")})`;
        }
        if (f.op === "is") {
          if (f.val === null)  return `"${f.col}" IS NULL`;
          if (f.val === true)  return `"${f.col}" IS TRUE`;
          if (f.val === false) return `"${f.col}" IS FALSE`;
        }
        vals.push(f.val);
        const ph = `$${vals.length}`;
        if (f.op === "eq")  return `"${f.col}"=${ph}`;
        if (f.op === "neq") return `"${f.col}"!=${ph}`;
        if (f.op === "gt")  return `"${f.col}">${ph}`;
        if (f.op === "gte") return `"${f.col}">=${ph}`;
        if (f.op === "lt")  return `"${f.col}"<${ph}`;
        if (f.op === "lte") return `"${f.col}"<=${ph}`;
        return null;
      }).filter(Boolean);
      return clauses.length ? " WHERE " + clauses.join(" AND ") : "";
    }

    function buildOrder() {
      if (!order.length) return "";
      return " ORDER BY " + order.map(o => `"${o.col}" ${o.ascending === false ? "DESC" : "ASC"}`).join(", ");
    }

    function buildLimit() {
      return limitN ? ` LIMIT ${parseInt(limitN)}` : "";
    }

    // ── SELECT ──
    if (op === "select") {
      const vals = [];
      const cols = columns === "*" ? "*" : columns.split(",").map(c => `"${c.trim()}"`).join(", ");
      const q = `SELECT ${cols} FROM "${table}"${buildWhere(vals)}${buildOrder()}${buildLimit()}`;
      const r = await pool.query(q, vals);
      const fixed = fixPgDates(r.rows);
      return res.json({ data: single ? (fixed[0] || null) : fixed, error: null });
    }

    // ── INSERT ──
    if (op === "insert") {
      const rows = Array.isArray(data) ? data : [data];
      const inserted = [];
      for (const row of rows) {
        const rowVals = [];
        const keys = Object.keys(row).filter(k => row[k] !== undefined);
        const phs = keys.map(k => { rowVals.push(row[k]); return `$${rowVals.length}`; });
        const r = await pool.query(
          `INSERT INTO "${table}" (${keys.map(k=>`"${k}"`).join(",")}) VALUES (${phs.join(",")}) RETURNING *`,
          rowVals
        );
        inserted.push(fixPgDates([r.rows[0]])[0]);
      }
      const out = (single || rows.length === 1) ? inserted[0] : inserted;
      return res.json({ data: out, error: null });
    }

    // ── UPDATE ──
    if (op === "update") {
      const vals = [];
      const keys = Object.keys(data).filter(k => data[k] !== undefined);
      const sets = keys.map(k => { vals.push(data[k]); return `"${k}"=$${vals.length}`; });
      // Auto-stamp updated_at so LAN changes are always marked as newer than last pull
      const TABLES_WITH_UPDATED_AT = new Set(["tasks","projects","users","clients"]);
      if (TABLES_WITH_UPDATED_AT.has(table) && !data.hasOwnProperty("updated_at")) {
        vals.push(new Date().toISOString());
        sets.push(`"updated_at"=$${vals.length}`);
      }
      const where = buildWhere(vals);
      const r = await pool.query(`UPDATE "${table}" SET ${sets.join(",")}${where} RETURNING *`, vals);
      const fixedU = fixPgDates(r.rows);
      return res.json({ data: single ? fixedU[0] : fixedU, error: null });
    }

    // ── DELETE ──
    if (op === "delete") {
      const vals = [];
      const r = await pool.query(`DELETE FROM "${table}"${buildWhere(vals)} RETURNING *`, vals);
      return res.json({ data: fixPgDates(r.rows), error: null });
    }

    // ── UPSERT ──
    if (op === "upsert") {
      const rows = Array.isArray(data) ? data : [data];
      const inserted = [];
      for (const row of rows) {
        const rowVals = [];
        const keys = Object.keys(row).filter(k => row[k] !== undefined);
        const phs = keys.map(k => { rowVals.push(row[k]); return `$${rowVals.length}`; });
        const updateSets = keys.filter(k => k !== "id").map(k => `"${k}"=EXCLUDED."${k}"`).join(",");
        const r = await pool.query(
          `INSERT INTO "${table}" (${keys.map(k=>`"${k}"`).join(",")}) VALUES (${phs.join(",")})
           ON CONFLICT (id) DO UPDATE SET ${updateSets} RETURNING *`,
          rowVals
        );
        inserted.push(fixPgDates([r.rows[0]])[0]);
      }
      const out = (single || rows.length === 1) ? inserted[0] : inserted;
      return res.json({ data: out, error: null });
    }

    return res.json({ data: null, error: { message: "Unknown op: " + op } });
  } catch (e) {
    console.error("[/api/rpc]", e.message);
    return res.json({ data: null, error: { message: e.message } });
  }
});

// ════════════════════════════════════════════════════════════
// ADMIN — BACKUP & RESTORE
// ════════════════════════════════════════════════════════════

const ALL_TABLES = [
  "users","clients","projects","tasks","task_files","task_comments",
  "notifications","announcements","workflows",
  "war_room_messages","war_room_pins","war_room_reactions",
  "war_room_reads","war_room_scheduled","settings","attendance","breaks","time_logs"
];

// GET /api/admin/backup — download full DB as JSON
app.get("/api/admin/backup", async (req, res) => {
  try {
    const backup = { createdAt: new Date().toISOString(), tables: {} };
    for (const t of ALL_TABLES) {
      const r = await pool.query(`SELECT * FROM "${t}"`);
      backup.tables[t] = r.rows;
    }
    res.setHeader("Content-Disposition", `attachment; filename="RDS_Local_Backup_${Date.now()}.json"`);
    res.json(backup);
  } catch (e) { res.json(err(e)); }
});

// POST /api/admin/restore — restore from JSON backup
app.post("/api/admin/restore", async (req, res) => {
  try {
    const { tables } = req.body;
    for (const [table, rows] of Object.entries(tables)) {
      if (!ALL_TABLES.includes(table) || !rows.length) continue;
      const cols = Object.keys(rows[0]);
      for (const row of rows) {
        const vals = cols.map(c => {
          const v = row[c];
          if (v !== null && typeof v === "object") return JSON.stringify(v);
          return v;
        });
        const phs = cols.map((_, i) => `$${i+1}`).join(",");
        const colList = cols.map(c => `"${c}"`).join(",");
        await pool.query(
          `INSERT INTO "${table}" (${colList}) VALUES (${phs}) ON CONFLICT (id) DO NOTHING`,
          vals
        );
      }
    }
    res.json(ok({ message: "Restore complete" }));
  } catch (e) { res.json(err(e)); }
});

// ════════════════════════════════════════════════════════════
// SYNC — report + manual trigger
// ════════════════════════════════════════════════════════════

// GET /api/sync-report — last sync status (for dashboard)
app.get("/api/sync-report", (req, res) => {
  const p = path.join(__dirname, "last-sync-report.json");
  if (!fs.existsSync(p)) return res.json({ status: "no_sync_yet" });
  try { res.json(JSON.parse(fs.readFileSync(p, "utf8"))); }
  catch { res.json({ status: "error" }); }
});

// POST /api/sync-now — manual trigger (admin only)
let _syncRunning = false;
app.post("/api/sync-now", async (req, res) => {
  if (_syncRunning) return res.json({ ok: false, error: "Sync already running" });
  _syncRunning = true;
  console.log("[Sync] Manual trigger via /api/sync-now");
  try {
    const report = await runSync();
    res.json({ ok: true, report });
  } catch (e) {
    res.json({ ok: false, error: e.message });
  } finally {
    _syncRunning = false;
  }
});

// ════════════════════════════════════════════════════════════
// HEALTH CHECK
// ════════════════════════════════════════════════════════════

app.get("/api/health", async (req, res) => {
  try {
    const r = await pool.query("SELECT NOW() as time, current_database() as db");
    res.json({ status: "ok", db: r.rows[0].db, time: r.rows[0].time, server: "RDS Local v1.0" });
  } catch (e) {
    res.status(500).json({ status: "error", message: e.message });
  }
});

// ── Audit Logs ───────────────────────────────────────────────
app.post("/api/audit-logs", async (req, res) => {
  try {
    const rows = Array.isArray(req.body) ? req.body : [req.body];
    const inserted = [];
    for (const r of rows) {
      const result = await pool.query(
        `INSERT INTO audit_logs
           (actor_id, actor_name, actor_role, entity_type, entity_id, entity_label,
            action, field, old_value, new_value, project_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         RETURNING *`,
        [r.actor_id||null, r.actor_name||null, r.actor_role||null,
         r.entity_type||"task", r.entity_id||null, r.entity_label||null,
         r.action||"update", r.field||null, r.old_value||null, r.new_value||null,
         r.project_id||null]
      );
      inserted.push(result.rows[0]);
    }
    res.json({ data: inserted });
  } catch (e) { res.json({ error: e.message }); }
});

app.get("/api/audit-logs", async (req, res) => {
  try {
    const { task_id, project_id, limit = 100 } = req.query;
    let q = `SELECT * FROM audit_logs WHERE 1=1`;
    const vals = [];
    if (task_id)    { vals.push(task_id);    q += ` AND entity_id=$${vals.length}`; }
    if (project_id) { vals.push(project_id); q += ` AND project_id=$${vals.length}`; }
    q += ` ORDER BY created_at DESC LIMIT $${vals.length+1}`;
    vals.push(parseInt(limit));
    const r = await pool.query(q, vals);
    res.json({ data: r.rows });
  } catch (e) { res.json({ error: e.message }); }
});


// ═════════════════════════════════════════════════════════════
// INVOICE PDF GENERATOR — POST /api/invoice-pdf
// Accepts structured billing data, returns a real .pdf file
// ═════════════════════════════════════════════════════════════
app.post("/api/invoice-pdf", express.json({ limit: "2mb" }), (req, res) => {
  try {
    const { title, subtitle, note, period, date, rows, totTons, totAmt, filename, hideProject } = req.body;

    const doc = new PDFDocument({ margin: 50, size: "A4", autoFirstPage: true });
    const safeName = (filename || "RDS_Invoice").replace(/[^a-z0-9_\-]/gi, "_");
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${safeName}.pdf"`);
    doc.pipe(res);

    // ── HEADER ──────────────────────────────────────────────
    const logoPath = path.join(__dirname, "public", "logo.png");
    let logoW = 0;
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 50, 38, { width: 75 });
      logoW = 85;
    }
    doc.font("Helvetica-Bold").fontSize(15).fillColor("#1e3a8a")
       .text("RDS Techserv Pvt Ltd", 50 + logoW, 42);
    doc.font("Helvetica").fontSize(9.5).fillColor("#64748b")
       .text("Billing & Invoice Management", 50 + logoW, 60);

    // Invoice meta — right side
    doc.font("Helvetica-Bold").fontSize(17).fillColor("#1e3a8a")
       .text("BILLING SUMMARY", 300, 42, { width: 245, align: "right" });
    doc.font("Helvetica").fontSize(10).fillColor("#64748b")
       .text(period || "", 300, 65, { width: 245, align: "right" });
    doc.font("Helvetica").fontSize(9).fillColor("#94a3b8")
       .text(date || "", 300, 79, { width: 245, align: "right" });

    // Divider
    doc.moveTo(50, 108).lineTo(545, 108).lineWidth(2).strokeColor("#1e3a8a").stroke();

    // ── TITLE STRIP ─────────────────────────────────────────
    doc.rect(50, 116, 495, 36).fillColor("#1e3a8a").fill();
    doc.font("Helvetica-Bold").fontSize(13).fillColor("#ffffff")
       .text(title || "", 62, 123, { width: 470 });
    if (subtitle) {
      doc.font("Helvetica").fontSize(9).fillColor("#bfdbfe")
         .text(subtitle, 62, 137, { width: 470 });
    }

    // Note box
    let y = 162;
    if (note) {
      doc.rect(50, y, 495, 24).fillColor("#f0f9ff").fill();
      doc.moveTo(50, y).lineTo(50, y + 24).lineWidth(3).strokeColor("#0ea5e9").stroke();
      doc.font("Helvetica").fontSize(9).fillColor("#0c4a6e")
         .text("Note: " + note, 58, y + 7, { width: 480 });
      y += 32;
    }

    // ── TABLE ───────────────────────────────────────────────
    const colDefs = hideProject
      ? [
          { label: "Task",      x: 50,  w: 160, align: "left"  },
          { label: "Assignee",  x: 210, w: 90,  align: "left"  },
          { label: "Sub Date",  x: 300, w: 75,  align: "left"  },
          { label: "Tons",      x: 375, w: 55,  align: "right" },
          { label: "Rate",      x: 430, w: 50,  align: "right" },
          { label: "Amount",    x: 480, w: 65,  align: "right" },
        ]
      : [
          { label: "Project",   x: 50,  w: 100, align: "left"  },
          { label: "Task",      x: 150, w: 120, align: "left"  },
          { label: "Assignee",  x: 270, w: 75,  align: "left"  },
          { label: "Sub Date",  x: 345, w: 65,  align: "left"  },
          { label: "Tons",      x: 410, w: 45,  align: "right" },
          { label: "Rate",      x: 455, w: 40,  align: "right" },
          { label: "Amount",    x: 495, w: 50,  align: "right" },
        ];

    // Table header row
    doc.rect(50, y, 495, 20).fillColor("#1d4ed8").fill();
    doc.font("Helvetica-Bold").fontSize(8).fillColor("#ffffff");
    colDefs.forEach(c => {
      doc.text(c.label.toUpperCase(), c.x + (c.align === "right" ? 0 : 2), y + 6,
               { width: c.w, align: c.align });
    });
    y += 20;

    // Table body
    (rows || []).forEach((r, i) => {
      const rowH = 20;
      if (y + rowH > doc.page.height - 80) { doc.addPage(); y = 50; }
      if (i % 2 === 0) doc.rect(50, y, 495, rowH).fillColor("#f8faff").fill();
      doc.moveTo(50, y + rowH).lineTo(545, y + rowH).lineWidth(0.4).strokeColor("#e2e8f0").stroke();

      const vals = hideProject
        ? [r.task, r.assignee, r.subDate, r.tons, r.rate, r.amount]
        : [r.project, r.task, r.assignee, r.subDate, r.tons, r.rate, r.amount];

      doc.font("Helvetica").fontSize(8.5).fillColor("#1e293b");
      colDefs.forEach((c, ci) => {
        doc.text(String(vals[ci] || "—"), c.x + (c.align === "right" ? 0 : 2), y + 6,
                 { width: c.w, align: c.align, ellipsis: true });
      });
      y += rowH;
    });

    // Total row
    doc.rect(50, y, 495, 24).fillColor("#0f172a").fill();
    doc.font("Helvetica-Bold").fontSize(10).fillColor("#ffffff")
       .text("TOTAL", 52, y + 7, { width: 350, align: "left" });
    const lastCol = colDefs[colDefs.length - 1];
    const tonsCol = colDefs[colDefs.length - 3];
    doc.fillColor("#e2e8f0").text(totTons || "", tonsCol.x, y + 7, { width: tonsCol.w, align: "right" });
    doc.fillColor("#4ade80").text(totAmt || "", lastCol.x, y + 7, { width: lastCol.w, align: "right" });
    y += 24;

    // ── SUMMARY BOX ─────────────────────────────────────────
    y += 16;
    const boxX = 350, boxW = 195, boxH = 72;
    doc.rect(boxX, y, boxW, boxH).fillColor("#f8faff").fill();
    doc.rect(boxX, y, boxW, boxH).lineWidth(1).strokeColor("#dbeafe").stroke();
    doc.font("Helvetica").fontSize(10).fillColor("#475569")
       .text("Total Tasks:", boxX + 10, y + 10);
    doc.font("Helvetica-Bold").fillColor("#1e293b")
       .text(String((rows || []).length), boxX + 10, y + 10, { width: boxW - 20, align: "right" });
    doc.font("Helvetica").fillColor("#475569")
       .text("Total Tonnage:", boxX + 10, y + 28);
    doc.font("Helvetica-Bold").fillColor("#1e293b")
       .text(totTons || "", boxX + 10, y + 28, { width: boxW - 20, align: "right" });
    doc.moveTo(boxX + 10, y + 46).lineTo(boxX + boxW - 10, y + 46).lineWidth(1).strokeColor("#1e3a8a").stroke();
    doc.font("Helvetica-Bold").fontSize(11).fillColor("#1e3a8a")
       .text("Grand Total:", boxX + 10, y + 52);
    doc.font("Helvetica-Bold").fontSize(13).fillColor("#15803d")
       .text(totAmt || "", boxX + 10, y + 49, { width: boxW - 20, align: "right" });

    // ── FOOTER ──────────────────────────────────────────────
    const footY = doc.page.height - 55;
    doc.moveTo(50, footY).lineTo(545, footY).lineWidth(1).strokeColor("#e2e8f0").stroke();
    doc.font("Helvetica-Bold").fontSize(10).fillColor("#1e3a8a")
       .text("RDS Techserv Pvt Ltd", 50, footY + 8);
    doc.font("Helvetica").fontSize(8).fillColor("#4b5563")
       .text("CONFIDENTIAL — FOR INTERNAL USE", 50, footY + 22);
    doc.font("Helvetica").fontSize(9).fillColor("#374151")
       .text(date || "", 300, footY + 12, { width: 245, align: "right" });

    doc.end();
  } catch(e) {
    console.error("[invoice-pdf]", e.message);
    if (!res.headersSent) res.status(500).json({ error: e.message });
  }
});

// ═════════════════════════════════════════════════════════════
// DAILY SUBMISSION EMAIL — /api/cron-daily
// Single path for ALL sends (scheduled + manual "Send Now")
// ══════════════════════════════════════════════════════════════

// In-memory lock — prevents concurrent double-sends even if two
// requests arrive at the exact same millisecond (e.g. laptop wake)
let _digestSending = false;

const SUPA_URL = "https://xypcbioltukahipkqqzc.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGNiaW9sdHVrYWhpcGtxcXpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0MzEzNjUsImV4cCI6MjA5NTAwNzM2NX0.DG5sv2bpx8j3Mmz0mqIsoDVaCMP2TmWqh-OQUfSZFRw";

function supaGet(p) {
  return fetch(SUPA_URL + p, {
    headers: { "apikey": SUPA_KEY, "Authorization": "Bearer " + SUPA_KEY, "Content-Type": "application/json" }
  }).then(r => r.json());
}

function statusBadgeInline(s) {
  if (s === "Completed")   return '<span style="background:#d1fae5;color:#065f46;font-size:10px;font-weight:700;padding:3px 10px;border-radius:20px;">Completed</span>';
  if (s === "In Progress") return '<span style="background:#fef3c7;color:#92400e;font-size:10px;font-weight:700;padding:3px 10px;border-radius:20px;">In Progress</span>';
  return '<span style="background:#fee2e2;color:#991b1b;font-size:10px;font-weight:700;padding:3px 10px;border-radius:20px;">' + (s || "Not Started") + '</span>';
}

function buildDigestHtml(recipientName, tasks, projMap, dateLabel) {
  const total  = tasks.length;
  const done   = tasks.filter(t => t.status === "Completed").length;
  const inProg = tasks.filter(t => t.status === "In Progress").length;
  const ns     = total - done - inProg;
  const year   = new Date().getFullYear();

  let rows = "";
  if (!tasks.length) {
    rows = '<tr><td colspan="6" style="padding:20px;text-align:center;color:#9ca3af;font-style:italic;">No submissions planned for today.</td></tr>';
  } else {
    for (const t of tasks) {
      const proj = projMap[t.project_id] || {};
      rows += "<tr>" +
        '<td style="padding:9px 12px;border-bottom:1px solid #e5e7eb;font-size:12px;color:#374151;">' + (t.client || proj.client || "—") + "</td>" +
        '<td style="padding:9px 12px;border-bottom:1px solid #e5e7eb;font-size:12px;color:#374151;">' + (proj.name || "—") + "</td>" +
        '<td style="padding:9px 12px;border-bottom:1px solid #e5e7eb;font-size:12px;font-weight:600;color:#111827;">' + t.title + "</td>" +
        '<td style="padding:9px 12px;border-bottom:1px solid #e5e7eb;text-align:center;">' + statusBadgeInline(t.status) + "</td>" +
        '<td style="padding:9px 12px;border-bottom:1px solid #e5e7eb;font-size:12px;color:#374151;">' + (t.assignee || "—") + "</td>" +
        '<td style="padding:9px 12px;border-bottom:1px solid #e5e7eb;font-size:12px;text-align:center;color:#374151;">' + (t.client_sub_date || "—") + "</td>" +
        "</tr>";
    }
  }

  return "<!DOCTYPE html><html><head><meta charset='UTF-8'></head>" +
    "<body style='margin:0;padding:20px 0;background:#f4f6f9;font-family:Arial,sans-serif;'>" +
    "<table width='100%' cellpadding='0' cellspacing='0' style='max-width:680px;margin:0 auto;'><tr><td>" +

    // HEADER
    "<table width='100%' cellpadding='0' cellspacing='0' style='background:#1a3a6b;border-radius:10px 10px 0 0;'>" +
    "<tr><td style='padding:20px 28px;'>" +
    "<div style='font-size:18px;font-weight:700;color:#fff;'>&#128236; Daily Submission List</div>" +
    "<div style='font-size:12px;color:rgba(255,255,255,.7);margin-top:3px;'>" + dateLabel + "</div>" +
    "</td></tr></table>" +

    // BODY
    "<table width='100%' cellpadding='0' cellspacing='0' style='background:#fff;border-left:1px solid #dde3ef;border-right:1px solid #dde3ef;'>" +
    "<tr><td style='padding:26px 28px;'>" +
    "<p style='font-size:14px;color:#374151;margin:0 0 18px;'>Dear " + recipientName + ",</p>" +
    "<p style='font-size:14px;color:#374151;margin:0 0 20px;line-height:1.7;'>Here are the <strong>" + total + " submission(s)</strong> due today.</p>" +

    // Stats strip
    "<table width='100%' cellpadding='0' cellspacing='0' style='background:#f8fafc;border-radius:8px;margin-bottom:20px;border-left:4px solid #1a3a6b;'><tr>" +
    "<td width='25%' style='padding:14px 0;text-align:center;border-right:1px solid #e5e7eb;'><div style='font-size:22px;font-weight:700;color:#1a3a6b;'>" + total + "</div><div style='font-size:11px;color:#6b7280;margin-top:2px;'>TOTAL</div></td>" +
    "<td width='25%' style='padding:14px 0;text-align:center;border-right:1px solid #e5e7eb;'><div style='font-size:22px;font-weight:700;color:#059669;'>" + done + "</div><div style='font-size:11px;color:#6b7280;margin-top:2px;'>COMPLETED</div></td>" +
    "<td width='25%' style='padding:14px 0;text-align:center;border-right:1px solid #e5e7eb;'><div style='font-size:22px;font-weight:700;color:#d97706;'>" + inProg + "</div><div style='font-size:11px;color:#6b7280;margin-top:2px;'>IN PROGRESS</div></td>" +
    "<td width='25%' style='padding:14px 0;text-align:center;'><div style='font-size:22px;font-weight:700;color:#ef4444;'>" + ns + "</div><div style='font-size:11px;color:#6b7280;margin-top:2px;'>NOT STARTED</div></td>" +
    "</tr></table>" +

    // Task table
    "<table width='100%' cellpadding='0' cellspacing='0' style='border-collapse:collapse;border:1px solid #e5e7eb;'>" +
    "<thead><tr style='background:#1a3a6b;'>" +
    "<th style='padding:10px 12px;text-align:left;color:#fff;font-size:11px;'>CLIENT</th>" +
    "<th style='padding:10px 12px;text-align:left;color:#fff;font-size:11px;'>PROJECT</th>" +
    "<th style='padding:10px 12px;text-align:left;color:#fff;font-size:11px;'>TASK</th>" +
    "<th style='padding:10px 12px;text-align:center;color:#fff;font-size:11px;'>STATUS</th>" +
    "<th style='padding:10px 12px;text-align:left;color:#fff;font-size:11px;'>ASSIGNEE</th>" +
    "<th style='padding:10px 12px;text-align:center;color:#fff;font-size:11px;'>SUB DATE</th>" +
    "</tr></thead><tbody>" + rows + "</tbody></table>" +

    "<div style='margin-top:22px;padding-top:18px;border-top:1px solid #f3f4f6;font-size:13px;color:#1a3a6b;font-weight:700;'>RDS TechServ Team</div>" +
    "</td></tr></table>" +

    // FOOTER
    "<table width='100%' cellpadding='0' cellspacing='0' style='background:#1a3a6b;border-radius:0 0 10px 10px;'>" +
    "<tr><td style='padding:14px 28px;font-size:11px;color:rgba(255,255,255,.5);'>&copy; " + year + " RDS TechServ &mdash; Automated digest, do not reply.</td></tr>" +
    "</table>" +

    "</td></tr></table></body></html>";
}

// ── /api/cron-daily — proxy to Vercel (single sender, never fires locally) ────
// The Vercel function at hub-rdsprojects.com/api/cron-daily is the ONLY sender.
// It holds the service_role key and the proper date guard.
// Local servers (port 3000 / 8080) must NEVER send emails themselves —
// they proxy here so PC startup, manual triggers, etc. all go through one path.
app.get("/api/cron-daily", async (req, res) => {
  try {
    const qs = req.query.force === "true" ? "?force=true" : "";
    const upstream = await fetch("https://hub-rdsprojects.com/api/cron-daily" + qs, {
      headers: { "x-forwarded-from": "local-server" }
    });
    const data = await upstream.json();
    return res.json(data);
  } catch(e) {
    return res.status(502).json({ error: "Could not reach Vercel: " + e.message });
  }
});
// ── OLD local sender (disabled — causes duplicate emails) ─────────────────────
// eslint-disable-next-line no-unused-vars
async function _old_cron_daily_DISABLED(req, res) {
  try {
    const force = req.query.force === "true";

    // ── In-memory lock: block concurrent sends ──────────────────
    if (_digestSending) {
      return res.json({ message: "Send already in progress — skipped" });
    }
    _digestSending = true;

    // ── Date guard: check BOTH local PG and Supabase ────────────
    const today = new Date(Date.now() + 5.5*60*60*1000).toISOString().slice(0,10);
    if (!force) {
      try {
        // Check local PG
        const rows = await pool.query("SELECT value FROM settings WHERE key='last_digest_date' LIMIT 1");
        if (rows.rows.length && rows.rows[0].value === today) {
          _digestSending = false;
          return res.json({ message: "Already sent today (local DB)" });
        }
      } catch(_) {}
      try {
        // Check Supabase (catches sends triggered from App.jsx frontend)
        const sbRows = await supaGet("/rest/v1/settings?key=eq.last_digest_date&select=value&limit=1");
        if (Array.isArray(sbRows) && sbRows.length && sbRows[0].value === today) {
          _digestSending = false;
          return res.json({ message: "Already sent today (Supabase)" });
        }
      } catch(_) {}
    }

    const dateLabel = new Date().toLocaleDateString("en-GB", { weekday:"long", year:"numeric", month:"long", day:"numeric" });

    // Get today's tasks
    const tasks = await supaGet(
      "/rest/v1/tasks?or=(client_sub_date.eq." + today + ",due_date.eq." + today + ")&select=id,title,client,status,assignee,client_sub_date,due_date,project_id&order=client_sub_date.asc"
    );
    const projects = await supaGet("/rest/v1/projects?select=id,name,client");
    const projMap  = {};
    for (const p of (projects || [])) projMap[p.id] = p;

    // Recipients: Admin, Manager, Team Leader with email — dedup by email address
    const users = await supaGet("/rest/v1/users?select=name,email,role&role=in.(Admin,Manager,Team Leader)");
    const seenEmails = new Set();
    const recipients = (users || []).filter(u => {
      if (!u.email || !u.email.includes("@")) return false;
      const key = u.email.trim().toLowerCase();
      if (seenEmails.has(key)) return false;
      seenEmails.add(key);
      return true;
    });

    if (!recipients.length) {
      _digestSending = false;
      return res.json({ error: "No recipients found — add email addresses to Admin/Manager/Team Leader accounts" });
    }

    // ── Stamp local PG BEFORE sending so any concurrent request is blocked ──
    try {
      await pool.query(
        "INSERT INTO settings(key,value) VALUES('last_digest_date',$1) ON CONFLICT(key) DO UPDATE SET value=$1",
        [today]
      );
    } catch(_) {}

    let sent = 0;
    for (const u of recipients) {
      const html = buildDigestHtml(u.name || u.email, tasks || [], projMap, dateLabel);
      const payload = {
        type: "submission_digest",
        data: {
          taskName:       "Daily Submission List — " + today,
          projectName:    (tasks || []).length + " submission(s) planned for today",
          completedBy:    "RDS TechServ Automated Digest",
          completedAt:    dateLabel,
          recipientEmail: u.email,
          subject:        "📬 RDS Daily Submission List — " + dateLabel,
          htmlBody:       html
        }
      };
      try {
        await fetch(SUPA_URL + "/functions/v1/notify", {
          method: "POST",
          headers: { "apikey": SUPA_KEY, "Authorization": "Bearer " + SUPA_KEY, "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        sent++;
      } catch(e) { console.warn("[cron-daily] Email failed for", u.email, e.message); }
    }

    // ── Save guard to BOTH stores so either path sees it ────────
    try {
      await pool.query(
        "INSERT INTO settings(key,value) VALUES('last_digest_date',$1) ON CONFLICT(key) DO UPDATE SET value=$1",
        [today]
      );
    } catch(_) {}
    try {
      await fetch(SUPA_URL + "/rest/v1/settings?key=eq.last_digest_date", {
        method: "PATCH",
        headers: { "apikey": SUPA_KEY, "Authorization": "Bearer " + SUPA_KEY, "Content-Type": "application/json", "Prefer": "return=minimal" },
        body: JSON.stringify({ value: today })
      });
      // If row doesn't exist yet, insert it
      await fetch(SUPA_URL + "/rest/v1/settings", {
        method: "POST",
        headers: { "apikey": SUPA_KEY, "Authorization": "Bearer " + SUPA_KEY, "Content-Type": "application/json", "Prefer": "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify({ key: "last_digest_date", value: today })
      });
    } catch(_) {}

    _digestSending = false;
    console.log("[cron-daily] Sent digest to", sent, "recipients |", (tasks||[]).length, "tasks for", today);
    res.json({ sent, tasks: (tasks || []).length, date: today });
  } catch(e) {
    _digestSending = false;
    console.error("[cron-daily] Error:", e.message);
    res.status(500).json({ error: e.message });
  }
} // end _old_cron_daily_DISABLED

// ═════════════════════════════════════════════════════════════
// SPA FALLBACK — serve React app for all other routes
// ══════════════════════════════════════════════════════════════

app.get(/.*/, (req, res) => {
  const index = path.join(DIST, "index.html");
  if (fs.existsSync(index)) {
    res.sendFile(index);
  } else {
    res.json({ message: "RDS Local API running. React build not found — run npm run build first." });
  }
});

// ══════════════════════════════════════════════════════════════
// START — HTTPS on 8443 (primary); HTTP fallback on 3000 if no cert
// ══════════════════════════════════════════════════════════════

const HTTPS_PORT = 8443;
const certPath   = path.join(__dirname, "certs", "cert.pem");
const keyPath    = path.join(__dirname, "certs",  "key.pem");

if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
  try {
    require("https").createServer({
      key:  fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath),
    }, app).listen(HTTPS_PORT, "0.0.0.0", () => {
      console.log(`\n🔒 RDS Local Server running at:`);
      console.log(`   https://192.168.0.159:${HTTPS_PORT}  ← Office LAN`);
      console.log(`\n📦 Database: rds_local (PostgreSQL 16)`);
      console.log(`📁 Uploads:  ${UPLOAD_DIR}\n`);

      let _syncBusy = false;
      async function doSync(label) {
        if (_syncBusy) { console.log(`[Sync] ${label} — skipped (already running)`); return; }
        _syncBusy = true;
        try { await runSync(); }
        catch (e) { console.error(`[Sync] ${label} error:`, e.message); }
        finally { _syncBusy = false; }
      }
      setInterval(() => doSync("10s"), 10000);
      cron.schedule("0 2 * * *", () => doSync("2AM"), { timezone: "Asia/Kolkata" });
      console.log("🔄 Auto-sync: every 10s + 2:00 AM IST daily\n");
      setTimeout(() => doSync("startup"), 30000);
    });
  } catch (e) {
    console.error("HTTPS failed:", e.message);
    process.exit(1);
  }
} else {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`\n⚠️  No SSL cert — running HTTP fallback at:`);
    console.log(`   http://192.168.0.159:${PORT}`);
    console.log(`\nRun 'node generate-cert.cjs' to enable HTTPS on :${HTTPS_PORT}`);
    console.log(`📦 Database: rds_local (PostgreSQL 16)`);
    console.log(`📁 Uploads:  ${UPLOAD_DIR}\n`);
  });
}
