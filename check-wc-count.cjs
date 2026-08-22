const {createClient}=require('@supabase/supabase-js');
const sb=createClient('https://xypcbioltukahipkqqzc.supabase.co','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGNiaW9sdHVrYWhpcGtxcXpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTQzMTM2NSwiZXhwIjoyMDk1MDA3MzY1fQ.AoLxjBk3MR3_qjsCP50xzbyx7cp_kaQlVmN_eP_xuYU');
async function f(){
  const {data:p}=await sb.from('projects').select('id').eq('client','White Cap');
  const ids=p.map(x=>x.id);
  const {count}=await sb.from('tasks').select('*',{count:'exact',head:true}).in('project_id',ids);
  console.log('Projects:',ids.length,'Tasks:',count);
}
f().catch(console.error);
