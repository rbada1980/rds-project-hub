// ============================================================
//  migrate_done_to_completed.cjs
//  Changes all tasks with status "Done" → "Completed" in Supabase
//  Run: node migrate_done_to_completed.cjs
// ============================================================
"use strict";
const https = require("https");

const SUPA_URL = "https://xypcbioltukahipkqqzc.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGNiaW9sdHVrYWhpcGtxcXpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0MzEzNjUsImV4cCI6MjA5NTAwNzM2NX0.DG5sv2bpx8j3Mmz0mqIsoDVaCMP2TmWqh-OQUfSZFRw";

function req(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname: new URL(SUPA_URL).hostname,
      path: "/rest/v1/" + path,
      method,
      headers: {
        "apikey": SUPA_KEY,
        "Authorization": "Bearer " + SUPA_KEY,
        "Content-Type": "application/json",
        "Prefer": "return=representation",
        ...(data ? { "Content-Length": Buffer.byteLength(data) } : {})
      }
    };
    const r = https.request(options, res => {
      let d = "";
      res.on("data", c => d += c);
      res.on("end", () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(d) }); }
        catch { resolve({ status: res.statusCode, body: d }); }
      });
    });
    r.on("error", reject);
    if (data) r.write(data);
    r.end();
  });
}

async function main() {
  console.log("=".repeat(50));
  console.log("  Migrate: Done → Completed");
  console.log("=".repeat(50));

  // Count tasks with status "Done"
  const countRes = await req("GET", "tasks?status=eq.Done&select=id");
  const count = Array.isArray(countRes.body) ? countRes.body.length : 0;
  console.log(`\n Found ${count} task(s) with status "Done"`);

  if (count === 0) {
    console.log("  Nothing to migrate. All tasks already use 'Completed'.");
    console.log("\n" + "=".repeat(50));
    return;
  }

  // Patch all Done → Completed
  const patchRes = await req("PATCH", "tasks?status=eq.Done", { status: "Completed" });
  if (patchRes.status >= 200 && patchRes.status < 300) {
    console.log(`✓ Successfully updated ${count} task(s) from "Done" → "Completed"`);
  } else {
    console.error("✗ Update failed:", patchRes.status, patchRes.body);
  }

  console.log("\n" + "=".repeat(50));
  console.log("  Done! Press any key to close.");
  console.log("=".repeat(50));
}

main().catch(e => { console.error("Error:", e.message); });
