// check_all_clients.cjs — Review all clients/tasks for date issues

const SUPA_URL = "https://xypcbioltukahipkqqzc.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGNiaW9sdHVrYWhpcGtxcXpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0MzEzNjUsImV4cCI6MjA5NTAwNzM2NX0.DG5sv2bpx8j3Mmz0mqIsoDVaCMP2TmWqh-OQUfSZFRw";

async function main() {
  const res = await fetch(`${SUPA_URL}/rest/v1/tasks?select=client,due_date,client_sub_date&limit=5000`, {
    headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` }
  });
  const tasks = await res.json();
  console.log(`Total tasks: ${tasks.length}\n`);

  const clients = {};
  for (const t of tasks) {
    const c = t.client || "(null)";
    if (!clients[c]) clients[c] = {
      total: 0, hasDue: 0, hasSub: 0, nullSub: 0,
      subEquDue: 0, badDue: [], badSub: []
    };
    const s = clients[c];
    s.total++;

    if (t.due_date) {
      s.hasDue++;
      const y = parseInt(String(t.due_date).slice(0, 4));
      if (y < 2025) s.badDue.push(t.due_date);
    }

    if (t.client_sub_date) {
      s.hasSub++;
      const y = parseInt(String(t.client_sub_date).slice(0, 4));
      if (y < 2025) s.badSub.push(t.client_sub_date);
      // Check if client_sub_date == due_date (suspicious — means old import set it = due_date)
      if (t.due_date && String(t.client_sub_date).slice(0,10) === String(t.due_date).slice(0,10))
        s.subEquDue++;
    } else {
      s.nullSub++;
    }
  }

  console.log("=== CLIENT SUMMARY ===\n");
  for (const [c, s] of Object.entries(clients).sort((a,b) => b[1].total - a[1].total)) {
    const issues = [];
    if (s.badDue.length)   issues.push(`❌ ${s.badDue.length} bad due_date (year<2025)`);
    if (s.badSub.length)   issues.push(`❌ ${s.badSub.length} bad client_sub_date (year<2025)`);
    if (s.subEquDue > 0)   issues.push(`⚠  ${s.subEquDue}/${s.hasSub} client_sub_date == due_date (old import)`);
    if (s.nullSub === s.total) issues.push(`✓  client_sub_date all null (correct)`);
    else if (s.nullSub > 0)    issues.push(`ℹ  ${s.nullSub} tasks have null client_sub_date`);

    console.log(`${c.padEnd(22)} | ${s.total} tasks | due:${s.hasDue} sub:${s.hasSub} nullSub:${s.nullSub} subEqDue:${s.subEquDue}`);
    issues.forEach(i => console.log("    " + i));
    console.log("");
  }
}

main().catch(e => { console.error(e.message); process.exit(1); });
