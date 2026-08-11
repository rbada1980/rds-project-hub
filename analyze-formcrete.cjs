// analyze-formcrete.cjs
// READ-ONLY: Analyzes Formcrete Excel and shows full summary
// Makes ZERO changes to any database
// Run: node analyze-formcrete.cjs

const XLSX=require("xlsx");
const path=require("path");
const fs=require("fs");

const CANDIDATES=[
  "C:\\Users\\HP\\AppData\\Local\\Packages\\Claude_pzs8sxrjxfjjc\\LocalCache\\Roaming\\Claude\\local-agent-mode-sessions\\919964d4-cd92-4eb6-b494-6c7ad2c02d36\\4c052105-2aba-4ec0-9a90-013070bec645\\local_d0d6e4a5-acfb-4c98-8222-e8da51f65329\\uploads\\Formcrete Projects.xlsx",
  path.join(__dirname,"Formcrete_latest.xlsx"),
  path.join(__dirname,"Formcrete Projects.xlsx"),
];
const FILE=CANDIDATES.find(f=>fs.existsSync(f));
if(!FILE){console.error("❌ No Formcrete Excel file found.");process.exit(1);}

const STATUS_MAP={
  "COMPLETED":"Completed","IN PROGRESS":"In Progress","IN PROCESS":"In Progress",
  "NOT YET STARTED":"Not Yet Started",
  "Completed":"Completed","In Progress":"In Progress","Not Yet Started":"Not Yet Started",
};

async function main(){
  console.log("📂 Reading:",FILE);
  const wb=XLSX.readFile(FILE,{cellDates:true});
  const raw=XLSX.utils.sheet_to_json(wb.Sheets["PROJECTS"],{header:1,defval:null});
  console.log("📄 Total rows in file:",raw.length);

  const headerIdx=raw.findIndex(r=>r&&String(r[0]||"").toUpperCase()==="PROJECT NAME");
  const dataStart=headerIdx+1;
  const COL={proj:0,title:2,status:3,sub:4,req:5,det:7,chk:8};

  const excelTasks=[];
  let curProj=null;
  for(let i=dataStart;i<raw.length;i++){
    const r=raw[i];
    if(!r) continue;
    if(r[COL.proj]&&String(r[COL.proj]).trim()) curProj=String(r[COL.proj]).trim();
    const title=r[COL.title]?String(r[COL.title]).trim():null;
    if(!curProj||!title) continue;
    const statusRaw=String(r[COL.status]||"").trim();
    const isHold=statusRaw.toLowerCase()==="hold";
    const status=isHold?"Hold":(STATUS_MAP[statusRaw.toUpperCase()]||STATUS_MAP[statusRaw]||"Not Yet Started");
    excelTasks.push({project:curProj,title,status,det:r[COL.det],chk:r[COL.chk]});
  }

  const projSet=[...new Set(excelTasks.map(t=>t.project))];
  console.log(`\n${"=".repeat(65)}`);
  console.log(`FORMCRETE EXCEL ANALYSIS — ${excelTasks.length} tasks | ${projSet.size} projects`);
  console.log(`${"=".repeat(65)}`);

  let grandTotal=0,grandC=0,grandI=0,grandN=0;
  projSet.forEach(p=>{
    const tasks=excelTasks.filter(t=>t.project===p);
    const C=tasks.filter(t=>t.status==="Completed").length;
    const I=tasks.filter(t=>t.status==="In Progress").length;
    const H=tasks.filter(t=>t.status==="Hold").length;
    const N=tasks.filter(t=>t.status==="Not Yet Started").length;
    grandTotal+=tasks.length; grandC+=C; grandI+=I; grandN+=N;
    const holdStr=H>0?` Hold=${H}`:"";
    console.log(`\n  ${p}`);
    console.log(`  Total=${tasks.length} | Completed=${C} | InProgress=${I} | NotYetStarted=${N}${holdStr}`);
    // Show NOT completed tasks
    const pending=tasks.filter(t=>t.status!=="Completed");
    if(pending.length){
      pending.forEach(t=>console.log(`    [${t.status}] ${t.title}`));
    }
  });

  console.log(`\n${"=".repeat(65)}`);
  console.log(`GRAND TOTAL: ${grandTotal} tasks | C=${grandC} | I=${grandI} | N=${grandN}`);
  console.log(`${"=".repeat(65)}`);
  console.log(`\n⚠  NO CHANGES MADE TO DATABASE`);
  console.log(`   If this looks correct, run: node import-formcrete-fresh.cjs`);
}
main().catch(e=>{console.error("FATAL:",e.message);process.exit(1);});
