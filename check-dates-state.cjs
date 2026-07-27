// Check current date state vs expected, and fix over-shifted dates
// fix-dates.cjs shifted 774 tasks +1, then fix-all-dates.cjs shifted ALL 845 tasks +1 again
// → 774 tasks are now +2 from original (need -1 back)
// → Alton Delray (68) was also shifted by fix-dates2.cjs (+1 extra) = +3 total (need -2 back)
// → White Cap dates were re-imported from Excel correctly (don't touch)

const { createClient } = require("@supabase/supabase-js");
const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

const supabase = createClient(
  "https://xypcbioltukahipkqqzc.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGNiaW9sdHVrYWhpcGtxcXpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTQzMTM2NSwiZXhwIjoyMDk1MDA3MzY1fQ.AoLxjBk3MR3_qjsCP50xzbyx7cp_kaQlVmN_eP_xuYU"
);

const pool = new Pool({ host:"localhost", port:5432, database:"rds_local", user:"postgres", password:"rds2026" });

const lines = [];
function log(msg) { process.stdout.write(msg + "\n"); lines.push(msg); }

async function shiftDate(dateStr, days) {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

async function main() {
  try {
    // 1. Get all project IDs by client
    log("=== Checking projects by client ===");
    const { data: projects } = await supabase.from("projects").select("id,name,client");
    const whitecapIds = (projects||[]).filter(p=>p.client==="White Cap").map(p=>p.id);
    const altonId = (projects||[]).find(p=>(p.name||"").toLowerCase().includes("alton"))?.id;
    log("White Cap project count: " + whitecapIds.length);
    log("Alton Delray project ID: " + altonId);

    // 2. Check today's tasks
    log("\n=== Tasks due 2026-07-27 (should exist) ===");
    const { data: t27 } = await supabase.from("tasks").select("id,title,client_sub_date,project_id").eq("client_sub_date","2026-07-27").limit(20);
    log("Count: " + (t27?.length||0));

    log("\n=== Tasks due 2026-07-28 (likely over-shifted from today) ===");
    const { data: t28 } = await supabase.from("tasks").select("id,title,client_sub_date,project_id").eq("client_sub_date","2026-07-28").limit(20);
    log("Count: " + (t28?.length||0));
    (t28||[]).slice(0,5).forEach(t=>log("  "+t.title+" (proj:"+t.project_id+")"));

    log("\n=== Tasks due 2026-07-29 (3x shifted Alton Delray) ===");
    const { data: t29 } = await supabase.from("tasks").select("id,title,client_sub_date,project_id").eq("client_sub_date","2026-07-29").limit(20);
    log("Count: " + (t29?.length||0));

    // 3. Apply fix: shift non-White-Cap tasks back -1 day
    log("\n=== Fetching all non-White-Cap tasks with client_sub_date ===");
    let nonWC = [];
    let from = 0;
    while(true) {
      const { data, error } = await supabase.from("tasks")
        .select("id,client_sub_date,project_id")
        .not("client_sub_date","is",null)
        .not("project_id","in","("+whitecapIds.map(id=>`"${id}"`).join(",")+")")
        .range(from, from+999);
      if(error || !data || data.length===0) break;
      nonWC = nonWC.concat(data);
      if(data.length<1000) break;
      from+=1000;
    }
    log("Non-White-Cap tasks with date: " + nonWC.length);

    // Group by date
    const byDate = {};
    for(const t of nonWC) {
      const d = String(t.client_sub_date).slice(0,10);
      if(!byDate[d]) byDate[d]=[];
      byDate[d].push(t.id);
    }
    log("Unique dates: " + Object.keys(byDate).length);

    // Shift back -1 day for all non-White-Cap
    log("\n=== Shifting non-White-Cap dates back -1 day ===");
    let fixed = 0;
    for(const [cur, ids] of Object.entries(byDate).sort()) {
      const newDate = await shiftDate(cur, -1);
      const { error } = await supabase.from("tasks").update({client_sub_date:newDate}).in("id",ids);
      if(error) log("ERR "+cur+": "+error.message);
      else { log("  "+cur+" → "+newDate+"  ("+ids.length+" tasks)"); fixed+=ids.length; }
    }
    log("Supabase fixed: " + fixed);

    // 4. Shift Alton Delray back another -1 day (it was shifted 3x total, now at 2x, need 1x)
    if(altonId) {
      log("\n=== Shifting Alton Delray back another -1 day ===");
      const { data: altonTasks } = await supabase.from("tasks")
        .select("id,client_sub_date").eq("project_id",altonId).not("client_sub_date","is",null);
      const altonByDate = {};
      for(const t of (altonTasks||[])) {
        const d = String(t.client_sub_date).slice(0,10);
        if(!altonByDate[d]) altonByDate[d]=[];
        altonByDate[d].push(t.id);
      }
      let altonFixed = 0;
      for(const [cur, ids] of Object.entries(altonByDate).sort()) {
        const newDate = await shiftDate(cur, -1);
        const { error } = await supabase.from("tasks").update({client_sub_date:newDate}).in("id",ids);
        if(error) log("ERR Alton "+cur+": "+error.message);
        else { log("  Alton: "+cur+" → "+newDate+" ("+ids.length+" tasks)"); altonFixed+=ids.length; }
      }
      log("Alton fixed: " + altonFixed);
    }

    // 5. Fix local PostgreSQL: same -1 day for non-White-Cap
    // (local PG doesn't have client column on tasks, so fix via project join)
    log("\n=== Fixing local PostgreSQL ===");
    const pg1 = await pool.query(`
      UPDATE tasks t
      SET client_sub_date = (t.client_sub_date::date - INTERVAL '1 day')::date,
          updated_at = NOW()
      WHERE t.client_sub_date IS NOT NULL
        AND t.project_id NOT IN (
          SELECT p.id FROM projects p WHERE p.client = 'White Cap'
        )
      RETURNING t.id
    `);
    log("Local PG non-White-Cap fixed: " + pg1.rowCount);

    // Alton Delray in local PG: shift back another -1 day
    const pg2 = await pool.query(`
      UPDATE tasks t
      SET client_sub_date = (t.client_sub_date::date - INTERVAL '1 day')::date,
          updated_at = NOW()
      WHERE t.client_sub_date IS NOT NULL
        AND t.project_id IN (
          SELECT p.id FROM projects p WHERE LOWER(p.name) LIKE '%alton%'
        )
      RETURNING t.id
    `);
    log("Local PG Alton fixed: " + pg2.rowCount);

    // 6. Verify
    log("\n=== Final verification ===");
    const { data: final27 } = await supabase.from("tasks").select("id,title").eq("client_sub_date","2026-07-27");
    log("Tasks due 2026-07-27: " + (final27?.length||0));
    (final27||[]).slice(0,5).forEach(t=>log("  "+t.title));

  } catch(err) {
    log("FATAL: " + err.message + "\n" + err.stack);
  } finally {
    await pool.end();
  }
  fs.writeFileSync(path.join(__dirname, "check-dates-result.txt"), lines.join("\n")+"\n");
}
main();
