// debug-excel-cols.cjs — show raw column values for Bird Arts rows
const XLSX = require("xlsx");
const path = require("path");

const wb  = XLSX.readFile(path.join(__dirname,"Formcrete Projects Tracker_2026.xlsx"),{cellDates:true});
const raw = XLSX.utils.sheet_to_json(wb.Sheets["PROJECTS"],{header:1,defval:null});

// Print header row (row index 4)
console.log("\n=== HEADER (row 5) ===");
const hdr = raw[4] || [];
hdr.forEach((h,i)=>{ if(h) console.log(`  col[${i}]: ${h}`); });

// Print Bird Arts rows
console.log("\n=== Bird Arts rows ===");
for(let i=5;i<raw.length;i++){
  const r=raw[i];
  const proj=r[2]?String(r[2]).trim():null;
  if(!proj||!proj.toLowerCase().includes("bird"))continue;
  console.log(`\nRow ${i+1}: ${r[5]}`);
  r.forEach((v,idx)=>{
    if(v!==null&&v!==undefined&&String(v).trim()!=="")
      console.log(`  col[${idx}]: ${v instanceof Date ? v.toISOString()+' (Date)' : JSON.stringify(v)}`);
  });
}
