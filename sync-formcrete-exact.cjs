// READ-ONLY DIFF — compares Excel tasks vs Supabase DB. Makes ZERO DB changes.
const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

const sb = createClient(
  "https://xypcbioltukahipkqqzc.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGNiaW9sdHVrYWhpcGtxcXpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTQzMTM2NSwiZXhwIjoyMDk1MDA3MzY1fQ.AoLxjBk3MR3_qjsCP50xzbyx7cp_kaQlVmN_eP_xuYU"
);

function normalize(s) { return (s||"").trim().toLowerCase().replace(/\s+/g," "); }

async function main() {
  // 1. Load Excel tasks (pre-extracted to JSON)
  const excelPath = path.join(__dirname, "formcrete-excel-tasks.json");
  const excelTasks = JSON.parse(fs.readFileSync(excelPath, "utf8"));
  console.log("Excel tasks loaded:", excelTasks.length);

  // 2. Fetch Formcrete projects from DB
  console.log("Fetching projects from Supabase...");
  const { data: projects, error: pe } = await sb
    .from("projects").select("id,name").eq("client","Formcrete").order("name");
  if (pe) { console.error("Error:", pe.message); process.exit(1); }
  console.log("DB projects:", projects.length);

  const projByName = {};
  projects.forEach(p => { projByName[normalize(p.name)] = p; });
  const projIdToName = {};
  projects.forEach(p => { projIdToName[p.id] = p.name; });

  // 3. Fetch all Formcrete tasks
  let dbTasks = [];
  const ids = projects.map(p => p.id);
  for (let i=0; i<ids.length; i+=50) {
    const chunk = ids.slice(i,i+50);
    let from=0;
    while(true){
      const {data,error} = await sb.from("tasks")
        .select("id,project_id,title,status,detailer,checker,client_sub_date,due_date")
        .in("project_id",chunk).range(from,from+999);
      if(error||!data||!data.length) break;
      dbTasks=dbTasks.concat(data);
      if(data.length<1000) break;
      from+=1000;
    }
  }
  console.log("DB tasks total:", dbTasks.length);

  // 4. Build DB lookup
  const dbLookup = {};
  dbTasks.forEach(t => {
    const key = normalize(projIdToName[t.project_id]||"") + "||" + normalize(t.title);
    dbLookup[key] = t;
  });

  // 5. Diff
  const toInsert=[], toUpdate=[], unchanged=[];
  const missingProjects=new Set();

  function mapStatus(s){
    const u=(s||"").toLowerCase();
    if(u==="completed") return "completed";
    if(u==="in_progress"||u.includes("progress")) return "in_progress";
    if(u==="not_yet_started"||u.includes("not yet")) return "not_yet_started";
    return s||"";
  }

  for(const et of excelTasks){
    const key = normalize(et.project)+"||"+normalize(et.title);
    const dbProj = projByName[normalize(et.project)];
    if(!dbProj){ missingProjects.add(et.project); toInsert.push({...et,_reason:"new_project"}); continue; }
    const dbT = dbLookup[key];
    if(!dbT){ toInsert.push({...et,project_id:dbProj.id,_reason:"new_task"}); continue; }
    const exSt=mapStatus(et.status);
    const changes=[];
    if(exSt&&dbT.status!==exSt) changes.push(`status:"${dbT.status}"→"${exSt}"`);
    if(et.sub_date&&dbT.client_sub_date!==et.sub_date) changes.push(`sub_date:"${dbT.client_sub_date}"→"${et.sub_date}"`);
    if(et.cust_req_date&&dbT.due_date!==et.cust_req_date) changes.push(`due_date:"${dbT.due_date}"→"${et.cust_req_date}"`);
    if(et.detailer&&normalize(dbT.detailer)!==normalize(et.detailer)) changes.push(`detailer:"${dbT.detailer}"→"${et.detailer}"`);
    if(et.checker&&normalize(dbT.checker)!==normalize(et.checker)) changes.push(`checker:"${dbT.checker}"→"${et.checker}"`);
    if(changes.length>0) toUpdate.push({...et,db_id:dbT.id,changes});
    else unchanged.push(et);
  }

  const excelKeys=new Set(excelTasks.map(et=>normalize(et.project)+"||"+normalize(et.title)));
  const dbOnly=dbTasks.filter(t=>!excelKeys.has(normalize(projIdToName[t.project_id]||"")+"||"+normalize(t.title)));

  // 6. Print summary
  console.log("\n========== DIFF SUMMARY ==========");
  console.log("Excel tasks:    ",excelTasks.length);
  console.log("DB tasks:       ",dbTasks.length);
  console.log("To INSERT:      ",toInsert.length);
  console.log("To UPDATE:      ",toUpdate.length);
  console.log("Unchanged:      ",unchanged.length);
  console.log("DB-only (skip): ",dbOnly.length);
  if(missingProjects.size>0) console.log("Missing projects:",[...missingProjects].join(", "));

  if(toInsert.length>0){
    console.log("\n--- NEW TASKS TO INSERT ---");
    const byP={};
    toInsert.forEach(t=>{if(!byP[t.project])byP[t.project]=[];byP[t.project].push(t.title);});
    Object.entries(byP).forEach(([p,ts])=>{
      console.log(" ",p+":",ts.length,"new");
      ts.slice(0,3).forEach(t=>console.log("   +",t));
      if(ts.length>3)console.log("   ...and",ts.length-3,"more");
    });
  }
  if(toUpdate.length>0){
    console.log("\n--- TASKS TO UPDATE ---");
    const byP={};
    toUpdate.forEach(t=>{if(!byP[t.project])byP[t.project]=[];byP[t.project].push(t);});
    Object.entries(byP).forEach(([p,ts])=>{
      console.log(" ",p+":",ts.length,"updates");
      ts.slice(0,3).forEach(t=>console.log("   ~",t.title,":",t.changes.join(", ")));
      if(ts.length>3)console.log("   ...and",ts.length-3,"more");
    });
  }
  if(dbOnly.length>0){
    console.log("\n--- DB-ONLY (not in Excel, left alone) ---");
    const byP={};
    dbOnly.forEach(t=>{const p=projIdToName[t.project_id]||"?";if(!byP[p])byP[p]=[];byP[p].push(t.title);});
    Object.entries(byP).forEach(([p,ts])=>console.log(" ",p+":",ts.length,"tasks"));
  }

  // 7. Save JSON report
  const report={
    generated:new Date().toISOString(),
    excel_count:excelTasks.length, db_count:dbTasks.length,
    to_insert:toInsert.length, to_update:toUpdate.length,
    unchanged:unchanged.length, db_only:dbOnly.length,
    missing_projects:[...missingProjects],
    insert_detail:toInsert, update_detail:toUpdate,
    db_only_detail:dbOnly.map(t=>({id:t.id,project:projIdToName[t.project_id],title:t.title,status:t.status}))
  };
  const outFile=path.join(__dirname,"formcrete-diff-report.json");
  fs.writeFileSync(outFile,JSON.stringify(report,null,2));
  console.log("\nSaved: formcrete-diff-report.json");
}

main().catch(e=>{console.error("FATAL:",e.message);process.exit(1);});
