// Diagnostic: check client_sub_date sync status
// Run: node check-sync.cjs
const { Pool } = require('pg');
const https   = require('https');
const cfg     = require('./sync-config.json');

const pool = new Pool({ host:'localhost', port:5432, database:'rds_local', user:'postgres', password:'rds2026' });

async function fetchSupabase(path) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      `https://xypcbioltukahipkqqzc.supabase.co${path}`,
      { headers: { apikey: cfg.service_key, Authorization: 'Bearer ' + cfg.service_key } },
      res => {
        let d = '';
        res.on('data', c => d += c);
        res.on('end', () => resolve(JSON.parse(d)));
      }
    );
    req.on('error', reject);
    req.end();
  });
}

async function main() {
  // 1. Check if client_sub_date column exists locally
  const colCheck = await pool.query(
    `SELECT column_name, data_type FROM information_schema.columns
     WHERE table_name='tasks' AND column_name='client_sub_date'`
  );

  if (colCheck.rows.length === 0) {
    console.log('❌ client_sub_date column MISSING from local tasks table!');
    console.log('   Fix: adding it now...');
    await pool.query(`ALTER TABLE tasks ADD COLUMN client_sub_date DATE`);
    console.log('   ✅ Column added. Re-run sync to populate data.');
  } else {
    console.log(`✅ client_sub_date column EXISTS locally (type: ${colCheck.rows[0].data_type})`);
  }

  // 2. Count local tasks with/without client_sub_date
  const counts = await pool.query(
    `SELECT COUNT(*) total, COUNT(client_sub_date) with_value FROM tasks`
  );
  console.log(`\nLocal tasks: ${counts.rows[0].total} total, ${counts.rows[0].with_value} have client_sub_date set`);

  // 3. Show local tasks due tomorrow
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);
  console.log(`\nTomorrow = ${tomorrowStr}`);

  const localTomorrow = await pool.query(
    `SELECT id, title, due_date, client_sub_date FROM tasks
     WHERE due_date=$1 OR client_sub_date=$1 ORDER BY title`, [tomorrowStr]
  );
  console.log(`\nLocal tasks matching tomorrow:`);
  if (localTomorrow.rows.length === 0) console.log('  (none)');
  localTomorrow.rows.forEach(t =>
    console.log(`  [${t.id.slice(0,8)}] "${t.title}" due=${t.due_date||'null'} client_sub=${t.client_sub_date||'null'}`)
  );

  // 4. Fetch Supabase tasks due tomorrow
  console.log('\nSupabase tasks matching tomorrow:');
  try {
    const supaRows = await fetchSupabase(
      `/rest/v1/tasks?or=(due_date.eq.${tomorrowStr},client_sub_date.eq.${tomorrowStr})&select=id,title,due_date,client_sub_date`
    );
    if (!Array.isArray(supaRows) || supaRows.length === 0) {
      console.log('  (none) — or client_sub_date column not in Supabase');
      console.log('  Raw:', JSON.stringify(supaRows).slice(0, 200));
    } else {
      supaRows.forEach(t =>
        console.log(`  [${t.id.slice(0,8)}] "${t.title}" due=${t.due_date||'null'} client_sub=${t.client_sub_date||'null'}`)
      );
    }
  } catch(e) {
    console.log('  Error fetching from Supabase:', e.message);
  }

  // 5. Check if client_sub_date exists in Supabase at all
  console.log('\nChecking Supabase tasks schema...');
  try {
    const sample = await fetchSupabase('/rest/v1/tasks?select=*&limit=1');
    if (Array.isArray(sample) && sample[0]) {
      const cols = Object.keys(sample[0]);
      console.log('client_sub_date in Supabase?', cols.includes('client_sub_date') ? '✅ YES' : '❌ NO');
      if (!cols.includes('client_sub_date')) {
        console.log('\n⚠️  client_sub_date column does NOT exist in Supabase tasks table!');
        console.log('   This means the column needs to be added via Supabase SQL editor:');
        console.log('   ALTER TABLE tasks ADD COLUMN client_sub_date DATE;');
      }
    }
  } catch(e) {
    console.log('  Error:', e.message);
  }

  pool.end();
}

main().catch(e => { console.error('Fatal:', e.message); pool.end(); });
