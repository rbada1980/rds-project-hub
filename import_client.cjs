// import_client.cjs — White Cap full import
// Run: node import_client.cjs
'use strict';
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPA_URL = "https://xypcbioltukahipkqqzc.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGNiaW9sdHVrYWhpcGtxcXpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0MzEzNjUsImV4cCI6MjA5NTAwNzM2NX0.DG5sv2bpx8j3Mmz0mqIsoDVaCMP2TmWqh-OQUfSZFRw";
const supabase = createClient(SUPA_URL, SUPA_KEY);

const CLIENT_NAME = "White Cap";
const CLIENT_VARIANTS = ["white cap", "whitecap", "white-cap"];
const PASSWORD = "RDSTechserv@2026";

const COLORS = [
  "#6366f1","#14b8a6","#f59e0b","#ef4444","#8b5cf6",
  "#06b6d4","#10b981","#f97316","#ec4899","#3b82f6",
  "#84cc16","#a855f7","#0ea5e9","#22c55e","#eab308",
];

// Load parsed data
const dataPath = path.join(__dirname, 'wc_data.json');
if (!fs.existsSync(dataPath)) {
  console.error('wc_data.json not found. Run the Python parser first.');
  process.exit(1);
}
const DATA = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

function toUsername(name) {
  return name.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
}

function isWhiteCap(clientField) {
  if (!clientField) return false;
  const lc = String(clientField).toLowerCase().replace(/[-\s]/g, '');
  return CLIENT_VARIANTS.some(v => lc.includes(v.replace(/[-\s]/g, '')));
}

async function safeInsert(table, row, label) {
  const fields = { ...row };
  while (true) {
    const { data, error } = await supabase.from(table).insert([fields]).select().single();
    if (!error) {
      process.stdout.write('  OK ' + label + '\n');
      return data;
    }
    const colMatch = error.message.match(/column "([^"]+)" of relation/);
    if (colMatch) {
      const badCol = colMatch[1];
      process.stdout.write('  SKIP column ' + badCol + ' not in ' + table + ' - retrying\n');
      delete fields[badCol];
      continue;
    }
    process.stderr.write('  FAIL ' + label + ': ' + error.message + '\n');
    return null;
  }
}

async function main() {
  console.log('=== White Cap Import Starting ===\n');

  // 1. Fetch existing users
  console.log('[1] Fetching existing users...');
  const { data: existingUsers, error: uErr } = await supabase.from('users').select('*');
  if (uErr) { console.error('Cannot fetch users:', uErr.message); process.exit(1); }
  console.log('  Found ' + existingUsers.length + ' existing users\n');

  // 2. Collect unique names from Detailer + Checker
  console.log('[2] Collecting unique names...');
  const nameSet = new Set();
  for (const proj of DATA.projects) {
    for (const t of proj.tasks) {
      if (t.detailer) t.detailer.split(/[,&\/]+/).map(s => s.trim()).filter(Boolean).forEach(n => nameSet.add(n));
      if (t.checker)  t.checker.split(/[,&\/]+/).map(s => s.trim()).filter(Boolean).forEach(n => nameSet.add(n));
    }
  }
  const uniqueNames = [...nameSet].filter(Boolean);
  console.log('  ' + uniqueNames.length + ' unique names: ' + uniqueNames.join(', ') + '\n');

  // 3. Create missing users
  console.log('[3] Creating missing users...');
  let usersCreated = 0;
  const userMap = {};
  for (const u of existingUsers) {
    userMap[u.name.toLowerCase()] = u.username;
    if (u.username) userMap[u.username.toLowerCase()] = u.username;
  }

  for (const name of uniqueNames) {
    const lc = name.toLowerCase();
    if (userMap[lc]) {
      console.log('  Skip (exists): ' + name);
      continue;
    }
    let username = toUsername(name);
    const exists = existingUsers.find(u => u.username === username);
    if (exists) username = username + '_2';

    const newUser = { name, username, password: PASSWORD, role: 'Rebar' };
    const { data: created, error: cErr } = await supabase.from('users').insert([newUser]).select().single();
    if (cErr) {
      if (cErr.message.includes('duplicate') || cErr.message.includes('unique')) {
        username = username + '_2';
        const { data: retry, error: rErr } = await supabase.from('users').insert([{ ...newUser, username }]).select().single();
        if (rErr) { console.error('  FAIL User ' + name + ': ' + rErr.message); continue; }
        userMap[lc] = username;
        usersCreated++;
        console.log('  Created user: ' + name + ' (@' + username + ') [retried]');
      } else {
        console.error('  FAIL User ' + name + ': ' + cErr.message);
        continue;
      }
    } else {
      userMap[lc] = username;
      usersCreated++;
      console.log('  Created user: ' + name + ' (@' + username + ')');
    }
  }
  console.log('');

  // 4. TEST INSERT
  console.log('[4] Running test insert...');
  const testProj = { name: '__TEST_WC_IMPORT__', client: CLIENT_NAME, color: '#000000', description: 'test', assigned_users: [] };
  const { data: tProj, error: tProjErr } = await supabase.from('projects').insert([testProj]).select().single();
  if (tProjErr) {
    console.error('Test project insert FAILED:', tProjErr.message);
    process.exit(1);
  }
  console.log('  Test project inserted');

  const testTask = { project_id: tProj.id, title: '__TEST_TASK__', status: 'Not Yet Started', client: CLIENT_NAME, tags: [] };
  const { data: tTask, error: tTaskErr } = await supabase.from('tasks').insert([testTask]).select().single();
  if (tTaskErr) {
    await supabase.from('projects').delete().eq('id', tProj.id);
    console.error('Test task insert FAILED:', tTaskErr.message);
    process.exit(1);
  }
  console.log('  Test task inserted\n');

  // 5. Delete test records
  console.log('[5] Deleting test records...');
  await supabase.from('tasks').delete().eq('id', tTask.id);
  await supabase.from('projects').delete().eq('id', tProj.id);
  console.log('  Test records cleaned\n');

  // 6. Delete existing White Cap data
  console.log('[6] Deleting existing White Cap projects & tasks...');
  const { data: existingProjs } = await supabase.from('projects').select('id, client, name');
  const wcProjs = (existingProjs || []).filter(p => isWhiteCap(p.client) || isWhiteCap(p.name));
  console.log('  Found ' + wcProjs.length + ' existing White Cap projects to remove');

  for (const p of wcProjs) {
    await supabase.from('tasks').delete().eq('project_id', p.id);
    await supabase.from('projects').delete().eq('id', p.id);
    console.log('  Deleted: ' + p.name);
  }
  console.log('');

  // 7. Insert all projects & tasks
  console.log('[7] Inserting projects and tasks...');
  let projInserted = 0, taskInserted = 0, taskFailed = 0;

  for (let pi = 0; pi < DATA.projects.length; pi++) {
    const proj = DATA.projects[pi];
    const tasks = proj.tasks;

    const usernames = new Set();
    for (const t of tasks) {
      if (t.detailer) t.detailer.split(/[,&\/]+/).map(s=>s.trim()).filter(Boolean)
        .forEach(n => { const u = userMap[n.toLowerCase()]; if (u) usernames.add(u); });
      if (t.checker) t.checker.split(/[,&\/]+/).map(s=>s.trim()).filter(Boolean)
        .forEach(n => { const u = userMap[n.toLowerCase()]; if (u) usernames.add(u); });
    }

    const dates = tasks.map(t => t.client_sub_date).filter(Boolean).sort();
    const deadline = dates.length ? dates[dates.length - 1] : null;

    const projRow = {
      name: proj.name,
      client: CLIENT_NAME,
      color: COLORS[pi % COLORS.length],
      description: '',
      assigned_users: [...usernames],
      deadline,
    };

    console.log('\nProject [' + (pi+1) + '/' + DATA.projects.length + ']: ' + proj.name);
    const pData = await safeInsert('projects', projRow, proj.name);
    if (!pData) continue;
    projInserted++;

    for (const t of tasks) {
      const taskRow = {
        project_id: pData.id,
        title: t.title,
        status: t.status,
        detailer: t.detailer || null,
        checker: t.checker || null,
        client_sub_date: t.client_sub_date || null,
        client: CLIENT_NAME,
        tags: [],
        priority: 'Medium',
        assignee: t.detailer || null,
      };

      const tData = await safeInsert('tasks', taskRow, t.title.slice(0, 60));
      if (tData) taskInserted++;
      else taskFailed++;
    }
  }

  // 8. Summary
  console.log('\n=== IMPORT COMPLETE ===');
  console.log('Projects inserted : ' + projInserted);
  console.log('Tasks inserted    : ' + taskInserted);
  console.log('Tasks failed      : ' + taskFailed);
  console.log('Users created     : ' + usersCreated);
  console.log('=======================\n');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
