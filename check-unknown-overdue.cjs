const{createClient}=require('@supabase/supabase-js');
const sb=createClient('https://xypcbioltukahipkqqzc.supabase.co','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGNiaW9sdHVrYWhpcGtxcXpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTQzMTM2NSwiZXhwIjoyMDk1MDA3MzY1fQ.AoLxjBk3MR3_qjsCP50xzbyx7cp_kaQlVmN_eP_xuYU');
const today=new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Kolkata'});
(async()=>{
  const{data:projects}=await sb.from('projects').select('id,name,client');
  const pm={};(projects||[]).forEach(p=>pm[p.id]=p);
  const{data:tasks}=await sb.from('tasks').select('id,title,project_id,client,status,due_date').lt('due_date',today).not('status','in','(Completed,Done)');
  const unknown=(tasks||[]).filter(t=>!t.client||!['Formcrete','White Cap'].includes(t.client));
  console.log('Unknown/other client overdue tasks: '+unknown.length);
  unknown.forEach(t=>{
    const p=pm[t.project_id];
    console.log('  client='+JSON.stringify(t.client)+' | proj='+JSON.stringify(p?.name)+' | '+t.title+' | due='+t.due_date);
  });
})();
