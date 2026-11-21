// Migration: Merge "Lalitha" into "Sri Lalitha", then deactivate "Lalitha"
// Run from: C:\Users\HP\rds-project-hub
// Command:  node merge-lalitha.js

import { createClient } from '@supabase/supabase-js';

const SUPA_URL = "https://xypcbioltukahipkqqzc.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGNiaW9sdHVrYWhpcGtxcXpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0MzEzNjUsImV4cCI6MjA5NTAwNzM2NX0.DG5sv2bpx8j3Mmz0mqIsoDVaCMP2TmWqh-OQUfSZFRw";

const supabase = createClient(SUPA_URL, SUPA_KEY);

async function run() {
  // 1. Find both users
  const { data: users } = await supabase.from('users').select('id,name,username,role,is_active');
  const lalitha    = users.find(u => u.name === 'Lalitha');
  const sriLalitha = users.find(u => u.name === 'Sri Lalitha');

  if (!lalitha)    { console.log('❌ User "Lalitha" not found');    process.exit(1); }
  if (!sriLalitha) { console.log('❌ User "Sri Lalitha" not found'); process.exit(1); }

  console.log('Found Lalitha:', lalitha);
  console.log('Found Sri Lalitha:', sriLalitha);

  // 2. Re-assign tasks: assignee "Lalitha" → "Sri Lalitha"
  const { count: a1 } = await supabase.from('tasks')
    .update({ assignee: 'Sri Lalitha' })
    .eq('assignee', 'Lalitha');
  console.log(`✅ Updated assignee on tasks: ${a1 ?? '?'}`);

  // 3. Re-assign tasks: detailer "Lalitha" → "Sri Lalitha"
  const { count: a2 } = await supabase.from('tasks')
    .update({ detailer: 'Sri Lalitha' })
    .eq('detailer', 'Lalitha');
  console.log(`✅ Updated detailer on tasks: ${a2 ?? '?'}`);

  // 4. Re-assign tasks: checker "Lalitha" → "Sri Lalitha"
  const { count: a3 } = await supabase.from('tasks')
    .update({ checker: 'Sri Lalitha' })
    .eq('checker', 'Lalitha');
  console.log(`✅ Updated checker on tasks: ${a3 ?? '?'}`);

  // 5. Deactivate "Lalitha" user
  const { error } = await supabase.from('users')
    .update({ is_active: false })
    .eq('id', lalitha.id);
  if (error) console.log('❌ Failed to deactivate:', error.message);
  else console.log(`✅ Deactivated user "Lalitha" (id: ${lalitha.id})`);

  console.log('\n✅ Done! All Lalitha tasks moved to Sri Lalitha. Lalitha is now inactive.');
}

run().catch(console.error);
