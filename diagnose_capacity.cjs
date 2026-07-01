'use strict';
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  "https://xypcbioltukahipkqqzc.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGNiaW9sdHVrYWhpcGtxcXpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0MzEzNjUsImV4cCI6MjA5NTAwNzM2NX0.DG5sv2bpx8j3Mmz0mqIsoDVaCMP2TmWqh-OQUfSZFRw"
);

async function main() {
  // Fetch tasks with only safe columns (no deadline)
  const tRes = await supabase.from('tasks').select('*').limit(500);
  if (tRes.error) { console.error('TASKS ERROR:', tRes.error.message); process.exit(1); }
  const tasks = tRes.data || [];
  console.log('Total tasks in DB:', tasks.length);

  if (tasks.length === 0) { console.log('NO TASKS IN DATABASE AT ALL'); return; }

  // Show all column names from first task
  console.log('\nTask columns:', Object.keys(tasks[0]).join(', '));

  // Check key fields
  const hasDetailer = 'detailer' in tasks[0];
  const hasChecker  = 'checker'  in tasks[0];
  const hasAssignee = 'assignee' in tasks[0];
  const hasDueDate  = 'due_date' in tasks[0];
  const hasClientSub = 'client_sub_date' in tasks[0];
  console.log('\nColumn exists check:');
  console.log('  assignee:', hasAssignee);
  console.log('  detailer:', hasDetailer);
  console.log('  checker:', hasChecker);
  console.log('  due_date:', hasDueDate);
  console.log('  client_sub_date:', hasClientSub);

  // Sample 3 tasks with people fields
  const withPeople = tasks.filter(t => t.assignee || t.detailer || t.checker);
  console.log('\nTasks with any person field:', withPeople.length, '/', tasks.length);
  withPeople.slice(0, 5).forEach(t => {
    console.log('  title:', t.title?.slice(0, 40));
    console.log('    assignee:', JSON.stringify(t.assignee), '| detailer:', JSON.stringify(t.detailer), '| checker:', JSON.stringify(t.checker));
    console.log('    due_date:', t.due_date, '| client_sub_date:', t.client_sub_date, '| status:', t.status);
  });

  // Per-person counts
  const CHECK = ['anji','eswar','kamesh','kunal','narayana','lalitha','sridevi','lokesh','siva'];
  const active = tasks.filter(t => t.status !== 'Completed');
  console.log('\nActive (non-completed) tasks:', active.length);
  console.log('\n--- Per-person active task counts ---');
  CHECK.forEach(kw => {
    const kl = kw.toLowerCase();
    const a = active.filter(t => t.assignee?.toLowerCase().includes(kl)).length;
    const d = hasDetailer ? active.filter(t => t.detailer?.toLowerCase().includes(kl)).length : 'N/A';
    const c = hasChecker  ? active.filter(t => t.checker?.toLowerCase().includes(kl)).length  : 'N/A';
    console.log(kw.padEnd(12), '| assignee:'+a, 'detailer:'+d, 'checker:'+c);
  });
}
main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
