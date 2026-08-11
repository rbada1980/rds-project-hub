// fix-null-client-tasks.cjs
// Finds ALL tasks where client=null and sets it from their parent project
const{createClient}=require('@supabase/supabase-js');
const{Pool}=require('pg');
const sb=createClient('https://xypcbioltukahipkqqzc.supabase.co','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGNiaW9sdHVrYWhpcGtxcXpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTQzMTM2NSwiZXhwIjoyMDk1MDA3MzY1fQ.AoLxjBk3MR3_qjsCP50xzbyx7cp_kaQlVmN_eP_xuYU');
const pool=new Pool({host:'localhost',port:5432,database:'rds_local',user:'postgres',password:'rds2026'});

async function main(){
  const{data:projects}=await sb.from('projects').select('id,name,client');
  const pm={};(projects||[]).forEach(p=>pm[p.id]=p);

  // Fetch all tasks with null client
  const{data:tasks}=await sb.from('tasks').select('id,title,project_id,client').is('client',null);
  console.log(`Found ${(tasks||[]).length} tasks with null client`);

  let fixed=0,skipped=0;
  for(const t of(tasks||[])){
    const proj=pm[t.project_id];
    if(!proj?.client){console.log(`  ⚠ No client on project for task "${t.title}"`);skipped++;continue;}
    const{error}=await sb.from('tasks').update({client:proj.client}).eq('id',t.id);
    if(error){console.log(`  ❌ "${t.title}": ${error.message}`);}
    else{
      try{await pool.query('UPDATE tasks SET client=$1 WHERE id=$2',[proj.client,t.id]);}catch(_){}
      fixed++;
    }
  }
  console.log(`\n✅ Done — fixed: ${fixed} | skipped: ${skipped}`);
  await pool.end();
}
main().catch(e=>{console.error('FATAL:',e.message);process.exit(1);});
