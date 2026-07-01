// merge_user.cjs — merge Shiva + siav kumar → Siva kumar, then delete duplicates
'use strict';
const { createClient } = require('@supabase/supabase-js');
const SUPA_URL = "https://xypcbioltukahipkqqzc.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGNiaW9sdHVrYWhpcGtxcXpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0MzEzNjUsImV4cCI6MjA5NTAwNzM2NX0.DG5sv2bpx8j3Mmz0mqIsoDVaCMP2TmWqh-OQUfSZFRw";
const supabase = createClient(SUPA_URL, SUPA_KEY);

// All spellings that should map to the canonical name
const DUPES = ["Shiva", "siav kumar"];
const KEEP_NAME = "Siva kumar";

// Case-insensitive match
const DUPE_LOWER = DUPES.map(d => d.toLowerCase());
function isDupe(name) {
  return name && DUPE_LOWER.includes(name.trim().toLowerCase());
}

async function main() {
  console.log('=== User Merge: ' + DUPES.join(' + ') + ' -> ' + KEEP_NAME + ' ===\n');

  // 1. Fetch all users
  const { data: users, error: uErr } = await supabase.from('users').select('*');
  if (uErr) { console.error('Cannot fetch users:', uErr.message); process.exit(1); }

  const canonical = users.find(u => u.name.trim().toLowerCase() === KEEP_NAME.toLowerCase());
  if (!canonical) { console.error('Canonical user "' + KEEP_NAME + '" not found!'); process.exit(1); }
  const dupeUsers = users.filter(u => isDupe(u.name));
  console.log('Keep   : ' + canonical.name + ' (id=' + canonical.id + ', username=' + canonical.username + ')');
  dupeUsers.forEach(u => console.log('Delete : ' + u.name + ' (id=' + u.id + ', username=' + u.username + ')'));
  console.log('');

  const dupeUsernames = dupeUsers.map(u => u.username).filter(Boolean);
  const dupeIds = dupeUsers.map(u => u.id);
  const dupeNames = dupeUsers.map(u => u.name);

  // 2. Fetch all projects
  console.log('[1] Fixing projects.assigned_users...');
  const { data: projects } = await supabase.from('projects').select('id, name, assigned_users');
  let projFixed = 0;
  for (const p of (projects || [])) {
    const arr = p.assigned_users || [];
    // Check if any dupe username is in assigned_users
    const hasDupe = dupeUsernames.some(du => arr.includes(du));
    const hasDupeId = dupeIds.some(di => arr.includes(di));
    if (!hasDupe && !hasDupeId) continue;

    // Build new array: replace dupe usernames/ids with canonical username, deduplicate
    const newArr = [...arr.map(u => {
      if (dupeUsernames.includes(u) || dupeIds.includes(u)) return canonical.username;
      return u;
    })];
    // Deduplicate
    const deduped = [...new Set(newArr)];
    // Also add canonical if canonical.username not there (edge case)
    if (!deduped.includes(canonical.username)) deduped.push(canonical.username);

    const { error } = await supabase.from('projects').update({ assigned_users: deduped }).eq('id', p.id);
    if (error) console.error('  FAIL project ' + p.name + ': ' + error.message);
    else { console.log('  Fixed project: ' + p.name); projFixed++; }
  }
  console.log('  Projects fixed: ' + projFixed + '\n');

  // 3. Fix tasks - assignee, detailer, checker fields
  console.log('[2] Fixing tasks (assignee, detailer, checker)...');
  const { data: tasks } = await supabase.from('tasks').select('id, title, assignee, detailer, checker');
  let taskFixed = 0;
  for (const t of (tasks || [])) {
    const updates = {};
    if (t.assignee && isDupe(t.assignee)) updates.assignee = KEEP_NAME;
    if (t.detailer && isDupe(t.detailer)) updates.detailer = KEEP_NAME;
    if (t.checker  && isDupe(t.checker))  updates.checker  = KEEP_NAME;
    if (Object.keys(updates).length === 0) continue;

    const { error } = await supabase.from('tasks').update(updates).eq('id', t.id);
    if (error) console.error('  FAIL task ' + t.title + ': ' + error.message);
    else {
      const changed = Object.keys(updates).join(', ');
      console.log('  Fixed task: ' + t.title.slice(0,50) + ' [' + changed + ']');
      taskFixed++;
    }
  }
  console.log('  Tasks fixed: ' + taskFixed + '\n');

  // 4. Delete duplicate users
  console.log('[3] Deleting duplicate users...');
  for (const du of dupeUsers) {
    const { error } = await supabase.from('users').delete().eq('id', du.id);
    if (error) console.error('  FAIL delete ' + du.name + ': ' + error.message);
    else console.log('  Deleted: ' + du.name + ' (@' + du.username + ')');
  }

  console.log('\n=== DONE ===');
  console.log('Projects updated : ' + projFixed);
  console.log('Tasks updated    : ' + taskFixed);
  console.log('Users deleted    : ' + dupeUsers.length);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
