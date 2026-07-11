// Fix: White Cap tasks currently have client_sub_date = due_date (set by wrong import)
// Reset to null — staff will set real submission dates manually via the UI

const { Pool } = require('pg');
const pool = new Pool({
  host: 'localhost', port: 5432, database: 'rds_local',
  user: 'postgres', password: 'rds2026',
  options: '-c timezone=UTC'
});

const SUPABASE_URL = 'https://xypcbioltukahipkqqzc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGNiaW9sdHVrYWhpcGtxcXpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTQxMTE1OCwiZXhwIjoyMDYwOTg3MTU4fQ.pHMr7KQSD5V-7BQKV_LZEWbFmfFsXUbOJx7LUr8BPho';

async function supaFetch(method, path, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Supabase ${method} ${path}: ${res.status} ${text}`);
  return text ? JSON.parse(text) : null;
}

async function main() {
  console.log('=== Fix White Cap client_sub_date → null ===');

  // 1. Local DB
  const r = await pool.query(`
    UPDATE tasks SET client_sub_date = NULL
    WHERE LOWER(COALESCE(client,'')) LIKE '%white cap%'
    AND client_sub_date IS NOT NULL
    AND client_sub_date = due_date
  `);
  console.log(`Local: reset ${r.rowCount} tasks where client_sub_date = due_date`);

  // 2. Supabase — update where client_sub_date = due_date
  // Use a direct REST filter: client_sub_date equals due_date isn't directly filterable,
  // so we fetch affected IDs first
  const tasks = await supaFetch('GET', `tasks?client=eq.White+Cap&select=id,client_sub_date,due_date&limit=1000`);
  const toFix = tasks.filter(t => t.client_sub_date && t.due_date && t.client_sub_date.slice(0,10) === t.due_date.slice(0,10));
  console.log(`Supabase: ${toFix.length} tasks to fix`);

  for (const t of toFix) {
    await supaFetch('PATCH', `tasks?id=eq.${t.id}`, { client_sub_date: null });
  }
  console.log('Supabase: done');

  await pool.end();
  console.log('\n✅ Done — client_sub_date cleared for White Cap tasks. Staff can now set real dates via the UI.');
}

main().catch(e => { console.error(e); process.exit(1); });
