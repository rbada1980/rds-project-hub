'use strict';
// Patch: insert 2 "Out Source" tasks from Custom Residence (134 Worth CTN)
// that failed due to tasks_status_check constraint.
// Maps "Out Source" → "In Progress" (no "Out Source" in Supabase allowed statuses)

const { Pool } = require('pg');
const { v4: uuid } = require('uuid');

const SUPA_URL = 'https://xypcbioltukahipkqqzc.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGNiaW9sdHVrYWhpcGtxcXpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0MzEzNjUsImV4cCI6MjA5NTAwNzM2NX0.DG5sv2bpx8j3Mmz0mqIsoDVaCMP2TmWqh-OQUfSZFRw';

const pool = new Pool({ host:'localhost', port:5432, database:'rds_local', user:'postgres', password:'rds2026' });

async function supa(method, path, body) {
  const r = await fetch(SUPA_URL + path, {
    method, headers: {
      'Content-Type':'application/json',
      'apikey': SUPA_KEY,
      'Authorization': 'Bearer ' + SUPA_KEY,
      'Prefer': 'return=minimal'
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await r.text();
  return { ok: r.ok, status: r.status, text };
}

const TASKS = [
  { title:'Lift - 1 verticals and beams', assignee:'Jagadeesh', detailer:'Jagadeesh', checker:'', priority:'Medium', client_sub_date:'2026-07-17' },
  { title:'Lift - 2 verticals and beams', assignee:'',         detailer:'',          checker:'', priority:'Medium', client_sub_date:'2026-07-17' },
];

async function run() {
  try {
    // Find the project in Supabase
    const r = await fetch(SUPA_URL + `/rest/v1/projects?client=eq.White Cap&name=eq.Custom Residence (134 Worth CTN)&select=id`, {
      headers: { 'apikey': SUPA_KEY, 'Authorization': 'Bearer ' + SUPA_KEY }
    });
    const projects = await r.json();
    if (!projects.length) { console.error('Project not found in Supabase!'); process.exit(1); }
    const supaProjectId = projects[0].id;
    console.log('Supabase project_id:', supaProjectId);

    // Find in local PG
    const pgRes = await pool.query(`SELECT id FROM projects WHERE client='White Cap' AND name='Custom Residence (134 Worth CTN)'`);
    if (!pgRes.rows.length) { console.error('Project not found in local PG!'); process.exit(1); }
    const pgProjectId = pgRes.rows[0].id;
    console.log('Local PG project_id:', pgProjectId);

    for (const t of TASKS) {
      const id = uuid();
      const now = new Date().toISOString();
      const taskData = {
        id, project_id: supaProjectId,
        title: t.title, client: 'White Cap',
        status: 'In Progress',   // "Out Source" not in constraint; use In Progress
        priority: t.priority,
        assignee: t.assignee, detailer: t.detailer, checker: t.checker,
        client_sub_date: t.client_sub_date,
        tags: [], files: [], notes: '',
        created_at: now, updated_at: now
      };

      // Supabase insert
      const sr = await supa('POST', '/rest/v1/tasks', [taskData]);
      if (sr.ok || sr.status === 201) {
        console.log(`✓ Supabase: ${t.title}`);
      } else {
        console.error(`✗ Supabase: ${t.title} → ${sr.status} ${sr.text}`);
      }

      // Local PG insert
      try {
        await pool.query(
          `INSERT INTO tasks (id,project_id,title,client,status,priority,assignee,detailer,checker,client_sub_date,tags,files,notes,created_at,updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
           ON CONFLICT (id) DO NOTHING`,
          [id, pgProjectId, t.title, 'White Cap', 'In Progress', t.priority,
           t.assignee, t.detailer, t.checker, t.client_sub_date,
           '{}', '[]', '', now, now]
        );
        console.log(`✓ LocalPG: ${t.title}`);
      } catch(e) {
        console.error(`✗ LocalPG: ${t.title} → ${e.message}`);
      }
    }

    console.log('\n=== PATCH DONE ===');
  } catch(e) {
    console.error('Fatal:', e.message);
  } finally {
    await pool.end();
  }
}

run();
