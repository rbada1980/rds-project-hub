// ══════════════════════════════════════════════════════════════
// import_client.cjs — White Cap project/task importer
// Run: node import_client.cjs
// ══════════════════════════════════════════════════════════════
"use strict";
const https  = require("https");
const path   = require("path");
const XLSX   = require("xlsx");
const fs     = require("fs");

// ── Credentials ─────────────────────────────────────────────
const SUPA_URL = "https://xypcbioltukahipkqqzc.supabase.co";
const cfg      = JSON.parse(fs.readFileSync(path.join(__dirname, "sync-config.json"), "utf8"));
const SUPA_KEY = cfg.service_key;   // service role — bypasses RLS
const CLIENT   = "White Cap";

const EXCEL_CANDIDATES = [
  path.join(__dirname, "White Cap Projects Tracker2_2026.xlsx"),
  "C:\\Users\\HP\\AppData\\Roaming\\Claude\\local-agent-mode-sessions\\919964d4-cd92-4eb6-b494-6c7ad2c02d36\\4c052105-2aba-4ec0-9a90-013070bec645\\local_d0d6e4a5-acfb-4c98-8222-e8da51f65329\\uploads\\White Cap Projects Tracker2_2026.xlsx",
];

const PALETTE = [
  "#6366f1","#0ea5e9","#8b5cf6","#10b981","#f59e0b",
  "#ef4444","#ec4899","#14b8a6","#f97316","#a78bfa",
  "#22d3ee","#84cc16","#fb7185","#fdba74","#a3e635",
];

// ── Supabase REST helper ─────────────────────────────────────
function supa(method, endpoint, body) {
  return new Promise((resolve, reject) => {
    const data   = body ? JSON.stringify(body) : null;
    const parsed = new URL(SUPA_URL + endpoint);
    const opts   = {
      hostname: parsed.hostname,
      path:     parsed.pathname + parsed.search,
      method,
      headers: {
        "apikey":        SUPA_KEY,
        "Authorization": `Bearer ${SUPA_KEY}`,
        "Content-Type":  "application/json",
        "Prefer":        "return=representation",
      },
    };
    if (data) opts.headers["Content-Length"] = Buffer.byteLength(data);
    const req = https.request(opts, res => {
      let raw = "";
      res.on("data", c => raw += c);
      res.on("end", () => {
        try {
          const out = raw ? JSON.parse(raw) : null;
          if (res.statusCode >= 200 && res.statusCode < 300) resolve({ data: out, status: res.statusCode });
          else reject(new Error(`HTTP ${res.statusCode}: ${raw.slice(0, 400)}`));
        } catch (e) { reject(new Error(`Parse: ${e.message} raw=${raw.slice(0,200)}`)); }
      });
    });
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

// ── Excel date serial → YYYY-MM-DD ──────────────────────────
function toISO(val) {
  if (!val && val !== 0) return null;
  if (typeof val === "number") {
    const d = new Date((val - 25569) * 86400 * 1000);
    return d.toISOString().slice(0, 10);
  }
  const s = val.toString().trim();
  if (!s) return null;
  // MM-DD-YYYY or MM/DD/YYYY
  const m1 = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/);
  if (m1) {
    let [, mm, dd, yy] = m1;
    if (yy.length === 2) yy = "20" + yy;
    return `${yy}-${mm.padStart(2,"0")}-${dd.padStart(2,"0")}`;
  }
  // YYYY-MM-DD already
  const m2 = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m2) return s;
  return null;
}

// ── Status mapping ───────────────────────────────────────────
function mapStatus(raw) {
  const s = (raw || "").toString().trim().toLowerCase().replace(/\s+/g, "");
  if (s === "completed")  return "Completed";
  if (s === "inprogress") return "In Progress";
  return "Not Yet Started";
}

// ── Parse Excel ──────────────────────────────────────────────
function parseExcel() {
  let xlPath = null;
  for (const c of EXCEL_CANDIDATES) { if (fs.existsSync(c)) { xlPath = c; break; } }
  if (!xlPath) throw new Error("Excel not found. Tried:\n" + EXCEL_CANDIDATES.join("\n"));
  console.log("📂 Reading:", xlPath);

  const wb   = XLSX.readFile(xlPath);
  const sn   = wb.SheetNames.find(n => n.toLowerCase().includes("white cap work")) || wb.SheetNames[1];
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[sn], { defval: "", header: 1 });

  const projects = {};   // projName → { tasks[], detailers:Set, checkers:Set, dates[] }
  const order    = [];
  let curProj    = "";

  for (let i = 4; i < rows.length; i++) {
    const r         = rows[i];
    const pn        = (r[0] || "").toString().trim();
    const taskTitle = (r[1] || "").toString().trim();

    if (pn) curProj = pn;
    if (!curProj || !taskTitle) continue;

    const clientSubDate = toISO(r[3]);
    const detailer      = (r[4] || "").toString().trim();
    const checker       = (r[5] || "").toString().trim();
    const status        = mapStatus(r[2]);

    if (!projects[curProj]) {
      projects[curProj] = { tasks: [], detailers: new Set(), checkers: new Set(), dates: [] };
      order.push(curProj);
    }
    const p = projects[curProj];
    detailer.split("/").map(n => n.trim()).filter(Boolean).forEach(n => p.detailers.add(n));
    checker.split("/").map(n => n.trim()).filter(Boolean).forEach(n => p.checkers.add(n));
    if (clientSubDate) p.dates.push(clientSubDate);

    p.tasks.push({ title: taskTitle, status, priority: "Medium", assignee: detailer, detailer, checker, scope: "", due_date: null, client_sub_date: clientSubDate, client: CLIENT, tags: [], files: [] });
  }
  return { projects, order };
}

// ── Main ─────────────────────────────────────────────────────
async function main() {
  console.log("\n══════════════════════════════════════════");
  console.log("  White Cap Importer");
  console.log("══════════════════════════════════════════\n");

  // STEP 1: Parse
  const { projects, order } = parseExcel();
  const totalProjects = order.length;
  const totalTasks    = order.reduce((s, n) => s + projects[n].tasks.length, 0);
  console.log(`✓ Parsed ${totalProjects} projects, ${totalTasks} tasks\n`);

  // STEP 2: Fetch existing users
  console.log("🔍 Fetching existing users...");
  const { data: existingUsers } = await supa("GET", "/rest/v1/users?select=name,username&limit=2000");
  const userMap = new Map();
  (existingUsers || []).forEach(u => {
    userMap.set(u.name.toLowerCase(), u.username);
    userMap.set(u.username.toLowerCase(), u.username);
  });
  console.log(`   Found ${existingUsers?.length || 0} users`);

  // STEP 3: Collect all unique person names
  const allNames = new Set();
  order.forEach(pn => {
    projects[pn].detailers.forEach(n => n.split("/").forEach(p => { const t = p.trim(); if (t) allNames.add(t); }));
    projects[pn].checkers.forEach(n => n.split("/").forEach(p => { const t = p.trim(); if (t) allNames.add(t); }));
  });

  // STEP 4: Create missing users
  let usersCreated = 0;
  console.log(`\n👤 Checking ${allNames.size} unique names...`);
  for (const name of allNames) {
    const key = name.toLowerCase();
    if (userMap.has(key)) { console.log(`   ↷ ${name} (exists)`); continue; }
    const uname = key.replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
    try {
      await supa("POST", "/rest/v1/users", { name, username: uname, password: "RDSTechserv@2026", role: "Rebar" });
      userMap.set(key, uname); userMap.set(uname, uname); usersCreated++;
      console.log(`   ✓ Created: ${name} (@${uname})`);
    } catch (e) {
      try {
        const u2 = uname + "_2";
        await supa("POST", "/rest/v1/users", { name, username: u2, password: "RDSTechserv@2026", role: "Rebar" });
        userMap.set(key, u2); userMap.set(u2, u2); usersCreated++;
        console.log(`   ✓ Created: ${name} (@${u2})`);
      } catch (e2) { console.log(`   ❌ Cannot create ${name}: ${e2.message}`); }
    }
  }

  function resolveUser(raw) {
    if (!raw) return "";
    const first = raw.split("/")[0].trim();
    return userMap.get(first.toLowerCase()) || 