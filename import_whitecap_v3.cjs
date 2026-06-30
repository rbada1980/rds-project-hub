// import_whitecap_v3.cjs
const { createClient } = require("@supabase/supabase-js");

const SUPA_URL = "https://xypcbioltukahipkqqzc.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGNiaW9sdHVrYWhpcGtxcXpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0MzEzNjUsImV4cCI6MjA5NTAwNzM2NX0.DG5sv2bpx8j3Mmz0mqIsoDVaCMP2TmWqh-OQUfSZFRw";
const supabase = createClient(SUPA_URL, SUPA_KEY);

const COLORS = ["#6366f1","#22d3ee","#f59e0b","#10b981","#ef4444","#8b5cf6","#ec4899","#14b8a6","#f97316","#3b82f6","#84cc16","#f43f5e","#0ea5e9","#d946ef","#fb923c"];

// Canonical name corrections — maps any wrong/variant spelling → correct DB name.
// RULE: Add here whenever a new Excel variant causes a duplicate user.
const NAME_MAP = {
  // Typos / OCR variants → correct name
  "siav kumar":    "Siva Kumar",
  "siva kumar":    "Siva Kumar",
  "shiva":         "Siva Kumar",    // Shiva = siav kumar = Siva Kumar (same Rebar person)
  "shiva kumar":   "Siva Kumar",
  "danush":        "Dhanush",
  "allu sai":      "Sai",
  "lokesh reddy":  "Lokesh",        // Lokesh Reddy → Lokesh (correct user)
  // Combined Excel entries → primary person
  "eswar/siav kumar":    "Eswar",
  "allu sai/nanaji":     "Sai",
  "lokesh reddy/nanaji": "Lokesh",
  "eswar/nanaji":        "Eswar",
  "balaram/jagadeesh":   "Balaram",
  "sridevi / vaishnavi": "Sridevi",
};
// Proper Title Case — lowercases first so "NANAJI"→"Nanaji", "CHANDRA MOULI"→"Chandra Mouli"
function toTitleCase(str){
  return str.toLowerCase().replace(/\b\w/g,c=>c.toUpperCase());
}
function normName(n){
  if(!n)return"";
  const k=n.trim();
  return NAME_MAP[k.toLowerCase()]||toTitleCase(k);
}
function normField(f){
  if(!f)return"";
  return f.split(/[\/,]/).map(p=>normName(p.trim())).filter(Boolean).join("/");
}
function err(label,e){
  console.error(`\n❌ ${label}`);
  console.error("  message:", e.message);
  console.error("  details:", e.details);
  console.error("  hint:", e.hint);
  console.error("  code:", e.code);
}

const ALL_ROWS = [{"project": "Felies Residence", "scope": "CIP&CMU", "title": "Foundations and slab on grade", "status": "Completed", "client_sub_date": "2026-12-01", "due_date": "2026-12-01", "detailer": "Praveena", "checker": "Chandra Mouli", "assignee": "Praveena", "priority": "Medium", "tags": [], "files": [], "notes": ""}, {"project": "Valencia Del Mar Pickleball", "scope": "CIP&CMU", "title": "Foundations and slab on grade", "status": "Completed", "client_sub_date": "2026-01-19", "due_date": "2026-01-19", "detailer": "Danush", "checker": "Kameshwari", "assignee": "Danush", "priority": "Medium", "tags": [], "files": [], "notes": ""}, {"project": "City of temple terrace-fire station #01", "scope": "CIP&CMU", "title": "Foundations", "status": "Completed", "client_sub_date": "2026-01-19", "due_date": "2026-01-19", "detailer": "Swathi", "checker": "Chandra Mouli", "assignee": "Swathi", "priority": "Medium", "tags": [], "files": [], "notes": ""}, {"project": "228 Rutland", "scope": "CIP&CMU", "title": "Foundations and slab on grade", "status": "Completed", "client_sub_date": "2026-01-13", "due_date": "2026-01-13", "detailer": "Allu Sai", "checker": "Kameshwari", "assignee": "Allu Sai", "priority": "Medium", "tags": [], "files": [], "notes": ""}, {"project": "Palmetto Lakes Industrial Park", "scope": "CIP&CMU", "title": "Foundations and slab on grade", "status": "Completed", "client_sub_date": "2026-01-14", "due_date": "2026-01-14", "detailer": "Sri Lalitha", "checker": "Chandra Mouli", "assignee": "Sri Lalitha", "priority": "Medium", "tags": [], "files": [], "notes": ""}, {"project": "Frenchman's Creek Operations Center", "scope": "CIP&CMU", "title": "Building - A Foundations & slab on grade", "status": "Completed", "client_sub_date": "2026-01-26", "due_date": "2026-01-26", "detailer": "Pradeep", "checker": "Anji Reddy", "assignee": "Pradeep", "priority": "Medium", "tags": [], "files": [], "notes": ""}, {"project": "Miami Shores Residence (R+R bluenest)", "scope": "CIP&CMU", "title": "Foundations", "status": "Completed", "client_sub_date": "2026-01-27", "due_date": "2026-01-27", "detailer": "Swathi", "checker": "Chandra Mouli", "assignee": "Swathi", "priority": "Medium", "tags": [], "files": [], "notes": ""}, {"project": "Licata Residence 2726 Appaloosa trail", "scope": "CIP&CMU", "title": "Foundations & slab on grade", "status": "Completed", "client_sub_date": "2026-01-23", "due_date": "2026-01-23", "detailer": "Swathi", "checker": "Anji Reddy", "assignee": "Swathi", "priority": "Medium", "tags": [], "files": [], "notes": ""}, {"project": "4669 S. Flagler Dr", "scope": "CIP&CMU", "title": "Footings & Stem Walls", "status": "Completed", "client_sub_date": "2026-04-02", "due_date": "2026-04-02", "detailer": "Vaishnavi", "checker": "Chandra Mouli", "assignee": "Vaishnavi", "priority": "Medium", "tags": [], "files": [], "notes": ""}, {"project": "Harrison Residence", "scope": "CIP&CMU", "title": "Foundations and slab on grade", "status": "Completed", "client_sub_date": "2026-05-02", "due_date": "2026-05-02", "detailer": "Sri Lalitha", "checker": "Chandra Mouli", "assignee": "Sri Lalitha", "priority": "Medium", "tags": [], "files": [], "notes": ""}, {"project": "PBIA - Revenue Control Building", "scope": "CIP&CMU", "title": "Foundations and slab on grade", "status": "Completed", "client_sub_date": "2026-02-14", "due_date": "2026-02-14", "detailer": "Praveena", "checker": "Anji Reddy", "assignee": "Praveena", "priority": "Medium", "tags": [], "files": [], "notes": ""}, {"project": "127 EL Bravo Way", "scope": "CIP&CMU", "title": "Basement Foundations", "status": "Completed", "client_sub_date": "2026-02-17", "due_date": "2026-02-17", "detailer": "Danush", "checker": "Anji Reddy", "assignee": "Danush", "priority": "Medium", "tags": [], "files": [], "notes": ""}, {"project": "Blue Water Cove 6", "scope": "CIP&CMU", "title": "Foundations & slab on grade", "status": "Completed", "client_sub_date": "2026-02-25", "due_date": "2026-02-25", "detailer": "Allu Sai/Nanaji", "checker": "", "assignee": "Allu Sai", "priority": "Medium", "tags": [], "files": [], "notes": ""}, {"project": "1050 N Lake way", "scope": "CIP&CMU", "title": "Foundations and slab on grade", "status": "Completed", "client_sub_date": "2026-02-17", "due_date": "2026-02-17", "detailer": "Lokesh Reddy/Nanaji", "checker": "Narayana", "assignee": "Lokesh Reddy", "priority": "Medium", "tags": [], "files": [], "notes": ""}, {"project": "143 Reef Road", "scope": "CIP&CMU", "title": "Foundations and slab on grade", "status": "Completed", "client_sub_date": "2026-03-13", "due_date": "2026-03-13", "detailer": "Kunal", "checker": "Chandra Mouli", "assignee": "Kunal", "priority": "Medium", "tags": [], "files": [], "notes": ""}, {"project": "Cutler Bay SHS", "scope": "CIP&CMU", "title": "Foundations and slab on grade", "status": "Completed", "client_sub_date": "2026-04-03", "due_date": "2026-04-03", "detailer": "Swathi", "checker": "Rds", "assignee": "Swathi", "priority": "Medium", "tags": [], "files": [], "notes": ""}, {"project": "Ackerman Residence", "scope": "CIP&CMU", "title": "Foundations & slab on grade", "status": "Completed", "client_sub_date": "2026-03-03", "due_date": "2026-03-03", "detailer": "Lokesh Reddy", "checker": "", "assignee": "Lokesh Reddy", "priority": "Medium", "tags": [], "files": [], "notes": ""}, {"project": "Blue Water Cove 3", "scope": "CIP&CMU", "title": "Foundations & slab on grade", "status": "Completed", "client_sub_date": "2026-06-03", "due_date": "2026-06-03", "detailer": "Vaishnavi", "checker": "Kameshwari", "assignee": "Vaishnavi", "priority": "Medium", "tags": [], "files": [], "notes": ""}, {"project": "BOKOR 432 SUNSHINE BLVD", "scope": "CIP&CMU", "title": "Foundations and slab on grade", "status": "Completed", "client_sub_date": "2026-07-03", "due_date": "2026-07-03", "detailer": "Eswar", "checker": "Eswar", "assignee": "Eswar", "priority": "Medium", "tags": [], "files": [], "notes": ""}, {"project": "Cloyd", "scope": "CIP&CMU", "title": "Foundations and slab on grade", "status": "Completed", "client_sub_date": "2026-03-11", "due_date": "2026-03-11", "detailer": "Vaishnavi", "checker": "Chandra Mouli", "assignee": "Vaishnavi", "priority": "Medium", "tags": [], "files": [], "notes": ""}, {"project": "6017 Le Lac Road (Weiner Residence)", "scope": "CIP&CMU", "title": "Foundations and slab on grade (East Garage)", "status": "Completed", "client_sub_date": "2026-03-21", "due_date": "2026-03-21", "detailer": "Sri lalitha", "checker": "Kameshwari", "assignee": "Sri lalitha", "priority": "Medium", "tags": [], "files": [], "notes": ""}, {"project": "Bluewater cove 11", "scope": "CIP&CMU", "title": "Foundations and slab on grade", "status": "Completed", "client_sub_date": "2026-03-24", "due_date": "2026-03-24", "detailer": "Vaishnavi", "checker": "", "assignee": "Vaishnavi", "priority": "Medium", "tags": [], "files": [], "notes": ""}, {"project": "Bluewater cove 9", "scope": "CIP&CMU", "title": "Foundations and slab on grade", "status": "Completed", "client_sub_date": "2026-03-31", "due_date": "2026-03-31", "detailer": "Vaishnavi", "checker": "Kameshwari", "assignee": "Vaishnavi", "priority": "Medium", "tags": [], "files": [], "notes": ""}, {"project": "164 Seminole", "scope": "CIP&CMU", "title": "Foundations", "status": "Completed", "client_sub_date": "2026-08-04", "due_date": "2026-08-04", "detailer": "Siva kumar", "checker": "Chandra Mouli", "assignee": "Siva kumar", "priority": "Medium", "tags": [], "files": [], "notes": ""}, {"project": "Roy & Shelley Silverman", "scope": "CIP&CMU", "title": "Foundations and slab on grade", "status": "Completed", "client_sub_date": "2026-10-04", "due_date": "2026-10-04", "detailer": "Danush", "checker": "Chandra Mouli", "assignee": "Danush", "priority": "Medium", "tags": [], "files": [], "notes": ""}, {"project": "50 SE OLIVE", "scope": "CIP&CMU", "title": "Foundations & columns", "status": "Completed", "client_sub_date": "2026-08-04", "due_date": "2026-08-04", "detailer": "Danush", "checker": "Chandra Mouli", "assignee": "Danush", "priority": "Medium", "tags": [], "files": [], "notes": ""}, {"project": "Valencia Del Mar Clubhouse", "scope": "CIP&CMU", "title": "Foundations and slab on grade", "status": "Completed", "client_sub_date": "2026-06-04", "due_date": "2026-06-04", "detailer": "Vaishnavi", "checker": "Chandra Mouli", "assignee": "Vaishnavi", "priority": "Medium", "tags": [], "files": [], "notes": ""}, {"project": "910 S Ocean", "scope": "CIP&CMU", "title": "Basement Foundations", "status": "Completed", "client_sub_date": "2026-08-04", "due_date": "2026-08-04", "detailer": "Sridevi", "checker": "Narayana", "assignee": "Sridevi", "priority": "Medium", "tags": [], "files": [], "notes": ""}, {"project": "Burns Residence", "scope": "CIP&CMU", "title": "Foundations and slab on grade", "status": "Completed", "client_sub_date": "2026-06-04", "due_date": "2026-06-04", "detailer": "Praveena", "checker": "Chandra Mouli", "assignee": "Praveena", "priority": "Medium", "tags": [], "files": [], "notes": ""}, {"project": "5940 North Bay Road (NEW SINGLE FAMILY RESIDENCE)", "scope": "CIP&CMU", "title": "Foundations", "status": "Completed", "client_sub_date": "2026-08-04", "due_date": "2026-08-04", "detailer": "Balaram/Jagadeesh", "checker": "Chandra Mouli", "assignee": "Balaram", "priority": "Medium", "tags": [], "files": [], "notes": ""}, {"project": "320 S atlantic Drive", "scope": "CIP&CMU", "title": "Foundations", "status": "Completed", "client_sub_date": "2026-04-18", "due_date": "2026-04-18", "detailer": "Sridevi", "checker": "Chandra Mouli/NNJ", "assignee": "Sridevi", "priority": "Medium", "tags": [], "files": [], "notes": ""}, {"project": "Custom Residence (515 lido drive)", "scope": "CIP&CMU", "title": "Foundations and slab on grade", "status": "Completed", "client_sub_date": "2026-04-24", "due_date": "2026-04-24", "detailer": "Vaishnavi", "checker": "Chandra Mouli", "assignee": "Vaishnavi", "priority": "Medium", "tags": [], "files": [], "notes": ""}, {"project": "Jandrews Residence", "scope": "CIP&CMU", "title": "Foundations and slab on grade", "status": "Completed", "client_sub_date": "2026-04-23", "due_date": "2026-04-23", "detailer": "Praveena", "checker": "Chandra Mouli", "assignee": "Praveena", "priority": "Medium", "tags": [], "files": [], "notes": ""}, {"project": "6024 Lelac Rd", "scope": "CIP&CMU", "title": "Foundations and slab on grade", "status": "Completed", "client_sub_date": "2026-10-04", "due_date": "2026-10-04", "detailer": "Vaishnavi", "checker": "Chandra Mouli", "assignee": "Vaishnavi", "priority": "Medium", "tags": [], "files": [], "notes": ""}, {"project": "5900 Powerline Garag", "scope": "CIP&CMU", "title": "Grade beams", "status": "Completed", "client_sub_date": "2026-04-20", "due_date": "2026-04-20", "detailer": "Sri lalitha", "checker": "", "assignee": "Sri lalitha", "priority": "Medium", "tags": [], "files": [], "notes": ""}, {"project": "South Florida Jewish Cemetery", "scope": "CIP&CMU", "title": "Foundations and slab on grade", "status": "Completed", "client_sub_date": "2026-05-05", "due_date": "2026-05-05", "detailer": "Vaishnavi", "checker": "Eswar", "assignee": "Vaishnavi", "priority": "Medium", "tags": [], "files": [], "notes": ""}, {"project": "1820 S Federal Hwy - Fifth Third Bank", "scope": "CIP&CMU", "title": "Foundations and slab on grade", "status": "Completed", "client_sub_date": "2026-04-24", "due_date": "2026-04-24", "detailer": "Pradeep", "checker": "Narayana", "assignee": "Pradeep", "priority": "Medium", "tags": [], "files": [], "notes": ""}, {"project": "20 Hudson Ave", "scope": "CIP&CMU", "title": "Foundations & slab on grade", "status": "Completed", "client_sub_date": null, "due_date": null, "detailer": "Eswar", "checker": "", "assignee": "Eswar", "priority": "Medium", "tags": [], "files": [], "notes": ""}, {"project": "South Rd Office Building E", "scope": "CIP&CMU", "title": "Foundations and slab on grade", "status": "Completed", "client_sub_date": "2026-04-24", "due_date": "2026-04-24", "detailer": "Vaishnavi", "checker": "NANAJI", "assignee": "Vaishnavi", "priority": "Medium", "tags": [], "files": [], "notes": ""}, {"project": "Baig Residence", "scope": "CIP", "title": "3rd Floor tie beams", "status": "Completed", "client_sub_date": "2026-05-06", "due_date": "2026-05-06", "detailer": "Lokesh", "checker": "", "assignee": "Lokesh", "priority": "Medium", "tags": [], "files": [], "notes": "High Priority"}, {"project": "SW Ranches", "scope": "CIP", "title": "Lower Roof Deck", "status": "Completed", "client_sub_date": "2026-05-15", "due_date": "2026-05-15", "detailer": "Eswar", "checker": "", "assignee": "Eswar", "priority": "Medium", "tags": [], "files": [], "notes": "High Priority"}, {"project": "2651 Southcast 10th court", "scope": "CIP", "title": "Pool deck slab and beams", "status": "Completed", "client_sub_date": "2026-09-05", "due_date": "2026-09-05", "detailer": "", "checker": "", "assignee": "", "priority": "Medium", "tags": [], "files": [], "notes": ""}, {"project": "Country inn Pet Resort", "scope": "CIP&CMU", "title": "Foundations and slab on grade", "status": "Completed", "client_sub_date": "2026-05-22", "due_date": "2026-05-22", "detailer": "Vaishnavi", "checker": "NANAJI", "assignee": "Vaishnavi", "priority": "Medium", "tags": [], "files": [], "notes": "Asap Job"}, {"project": "2960 Greenbriair", "scope": "CIP&CMU", "title": "Foundations", "status": "Completed", "client_sub_date": "2026-05-06", "due_date": "2026-05-06", "detailer": "Lokesh Reddy", "checker": "", "assignee": "Lokesh Reddy", "priority": "Medium", "tags": [], "files": [], "notes": ""}, {"project": "Gallery at Somi Parc Phase 1", "scope": "CIP&CMU", "title": "Foundations (Residential) part - 1", "status": "Completed", "client_sub_date": "2026-06-17", "due_date": "2026-06-17", "detailer": "Eswar/Nanaji", "checker": "", "assignee": "Eswar", "priority": "Medium", "tags": [], "files": [], "notes": ""}, {"project": "6007 Le Lac (Furing residence)", "scope": "CIP", "title": "Foundations & Walls (scope added)", "status": "Completed", "client_sub_date": "2026-05-16", "due_date": "2026-05-16", "detailer": "Pradeep", "checker": "NANAJI", "assignee": "Pradeep", "priority": "Medium", "tags": [], "files": [], "notes": ""}, {"project": "90 Stingaree", "scope": "CIP & CMU", "title": "Slab on grade", "status": "Completed", "client_sub_date": "2026-05-06", "due_date": "2026-05-06", "detailer": "siva kumar", "checker": "", "assignee": "siva kumar", "priority": "Medium", "tags": [], "files": [], "notes": ""}, {"project": "O.B. (Scattered Lots)", "scope": "CIP & CMU", "title": "Foundaitons & sog.", "status": "Completed", "client_sub_date": "2026-05-18", "due_date": "2026-05-18", "detailer": "Lokesh Reddy", "checker": "ESWAR", "assignee": "Lokesh Reddy", "priority": "Medium", "tags": [], "files": [], "notes": "PDF CHECK ONLY"}, {"project": "840 Denery Ln. Residence", "scope": "", "title": "Foundaitons & Slab on grade", "status": "Completed", "client_sub_date": "2026-05-30", "due_date": "2026-05-30", "detailer": "eswar/siav kumar", "checker": "ESWAR", "assignee": "eswar", "priority": "Medium", "tags": [], "files": [], "notes": "PDF CHECK ONLY"}, {"project": "Nuvo", "scope": "CIP & CMU", "title": "Bldg. Type 1 (A, C, D & G)", "status": "Not Yet Started", "client_sub_date": null, "due_date": null, "detailer": "", "checker": "", "assignee": "", "priority": "Medium", "tags": [], "files": [], "notes": ""}, {"project": "The Syed Residence", "scope": "CIP & CMU", "title": "Foundations & Slab on grade", "status": "Completed", "client_sub_date": "2026-06-05", "due_date": "2026-06-05", "detailer": "Eswar", "checker": "", "assignee": "Eswar", "priority": "Medium", "tags": [], "files": [], "notes": ""}, {"project": "810 S Swinton Ave Residence", "scope": "CIP & CMU", "title": "Foundations and slab on grade", "status": "In Progress", "client_sub_date": "2026-09-06", "due_date": "2026-09-06", "detailer": "Praveena", "checker": "", "assignee": "Praveena", "priority": "Medium", "tags": [], "files": [], "notes": ""}, {"project": "Custom Residence (134 Worth CTN)", "scope": "CIP & CMU", "title": "Foundations", "status": "Completed", "client_sub_date": "2026-06-13", "due_date": "2026-06-13", "detailer": "Praveena", "checker": "", "assignee": "Praveena", "priority": "Medium", "tags": [], "files": [], "notes": ""}, {"project": "Rancano", "scope": "CIP & CMU", "title": "Foundations & slab on grade", "status": "Completed", "client_sub_date": "2026-11-06", "due_date": "2026-11-06", "detailer": "Eswar", "checker": "", "assignee": "Eswar", "priority": "Medium", "tags": [], "files": [], "notes": ""}, {"project": "799 Park Drive", "scope": "CIP & CMU", "title": "Foundations & Slab on grade", "status": "Completed", "client_sub_date": "2026-06-16", "due_date": "2026-06-16", "detailer": "Pradeep", "checker": "Nanaji", "assignee": "Pradeep", "priority": "Medium", "tags": [], "files": [], "notes": ""}, {"project": "Chateau De La Duchess (925 Hillsboro)", "scope": "CIP & CMU", "title": "Entry Garages foundations and slab on grade", "status": "Not Yet Started", "client_sub_date": null, "due_date": null, "detailer": "", "checker": "", "assignee": "", "priority": "Medium", "tags": [], "files": [], "notes": ""}, {"project": "Masucci Residence", "scope": "CIP & CMU", "title": "Foundations & slab on grade", "status": "Not Yet Started", "client_sub_date": null, "due_date": null, "detailer": "", "checker": "", "assignee": "", "priority": "Medium", "tags": [], "files": [], "notes": ""}, {"project": "The Bueller family", "scope": "CIP & CMU", "title": "Foundations & slab on grade", "status": "Not Yet Started", "client_sub_date": null, "due_date": null, "detailer": "", "checker": "", "assignee": "", "priority": "Medium", "tags": [], "files": [], "notes": ""}, {"project": "SPOTLOT 28810 SW 207 AVE", "scope": "CIP & CMU", "title": "Foundations & slab on grade", "status": "Not Yet Started", "client_sub_date": null, "due_date": null, "detailer": "", "checker": "", "assignee": "", "priority": "Medium", "tags": [], "files": [], "notes": ""}, {"project": "Broken Sound Club", "scope": "CIP", "title": "Foundations & slab on grade", "status": "Completed", "client_sub_date": null, "due_date": null, "detailer": "", "checker": "", "assignee": "", "priority": "Medium", "tags": [], "files": [], "notes": ""}, {"project": "OLD PROJECTS MODIFICATIONS", "scope": "", "title": "OLD PROJECTS MODIFICATIONS", "status": "Not Yet Started", "client_sub_date": null, "due_date": null, "detailer": "", "checker": "", "assignee": "", "priority": "Medium", "tags": [], "files": [], "notes": ""}, {"project": "1333 Bvld", "scope": "Barlists", "title": "Shear walls and columns Barlists", "status": "Completed", "client_sub_date": "2026-07-05", "due_date": "2026-07-05", "detailer": "Lokesh Reddy", "checker": "", "assignee": "Lokesh Reddy", "priority": "Medium", "tags": [], "files": [], "notes": ""}, {"project": "Valencia Del Mar Clubhouse", "scope": "Barlists", "title": "Slab on grade Barlists", "status": "Completed", "client_sub_date": "2026-05-05", "due_date": "2026-05-05", "detailer": "Vaishnavi", "checker": "", "assignee": "Vaishnavi", "priority": "Medium", "tags": [], "files": [], "notes": ""}, {"project": "320 S atlantic Drive", "scope": "Barlists", "title": "Foundations Barlists", "status": "Completed", "client_sub_date": "2026-05-05", "due_date": "2026-05-05", "detailer": "Sridevi", "checker": "", "assignee": "Sridevi", "priority": "Medium", "tags": [], "files": [], "notes": ""}, {"project": "910 S Ocean", "scope": "Emds", "title": "Comments received on basement R1series dwgs", "status": "Completed", "client_sub_date": "2026-06-05", "due_date": "2026-06-05", "detailer": "Sridevi", "checker": "", "assignee": "Sridevi", "priority": "Medium", "tags": [], "files": [], "notes": ""}, {"project": "6024 Le lac Rd", "scope": "Emds", "title": "Comments received on pool cabana & outdoor kitchen", "status": "Completed", "client_sub_date": "2026-07-05", "due_date": "2026-07-05", "detailer": "Sridevi / Vaishnavi", "checker": "", "assignee": "Sridevi", "priority": "Medium", "tags": [], "files": [], "notes": ""}, {"project": "6017 Le Lac Road (Weiner Residence)", "scope": "Barlists", "title": "Barlists requested for 2story building lift - 1 verticals", "status": "Completed", "client_sub_date": "2026-06-05", "due_date": "2026-06-05", "detailer": "Vaishnavi", "checker": "", "assignee": "Vaishnavi", "priority": "Medium", "tags": [], "files": [], "notes": ""}, {"project": "South Rd Office Building E", "scope": "Barlists", "title": "Lift - 1 Verticals and beams", "status": "Completed", "client_sub_date": "2026-07-05", "due_date": "2026-07-05", "detailer": "Vaishnavi", "checker": "", "assignee": "Vaishnavi", "priority": "Medium", "tags": [], "files": [], "notes": ""}, {"project": "559 Nw 43 st", "scope": "Barlists", "title": "Stairs barlists", "status": "Completed", "client_sub_date": "2026-06-05", "due_date": "2026-06-05", "detailer": "Danush", "checker": "", "assignee": "Danush", "priority": "Medium", "tags": [], "files": [], "notes": ""}, {"project": "PBIA - Revenue Control Building", "scope": "Emds", "title": "Rfi-029 received on foundaitons", "status": "Completed", "client_sub_date": "2026-08-05", "due_date": "2026-08-05", "detailer": "Vaishnavi", "checker": "", "assignee": "Vaishnavi", "priority": "Medium", "tags": [], "files": [], "notes": ""}, {"project": "Sands residence (3223 N Ocean)", "scope": "Emds", "title": "Ssk-017 Received for 2nd for slab at balcony", "status": "Completed", "client_sub_date": "2026-08-05", "due_date": "2026-08-05", "detailer": "Eswar", "checker": "", "assignee": "Eswar", "priority": "Medium", "tags": [], "files": [], "notes": ""}, {"project": "5900 Powerline Garage", "scope": "Barlists", "title": "Foundations (Grade beams)", "status": "Completed", "client_sub_date": "2026-08-05", "due_date": "2026-08-05", "detailer": "Pradeep", "checker": "", "assignee": "Pradeep", "priority": "Medium", "tags": [], "files": [], "notes": ""}, {"project": "1050 N Lake way", "scope": "Barlists", "title": "2nd lift - 2 verticals and beams", "status": "Completed", "client_sub_date": "2026-09-05", "due_date": "2026-09-05", "detailer": "Lokesh Reddy", "checker": "", "assignee": "Lokesh Reddy", "priority": "Medium", "tags": [], "files": [], "notes": ""}, {"project": "Baig Residence", "scope": "Barlists", "title": "2nd floor slab", "status": "Completed", "client_sub_date": "2026-09-05", "due_date": "2026-09-05", "detailer": "Lokesh Reddy", "checker": "", "assignee": "Lokesh Reddy", "priority": "Medium", "tags": [], "files": [], "notes": ""}, {"project": "South Rd Office Building E", "scope": "Patch", "title": "Need patch lists for cmu walls at stem walls", "status": "Completed", "client_sub_date": "2026-09-05", "due_date": "2026-09-05", "detailer": "Lokesh Reddy", "checker": "", "assignee": "Lokesh Reddy", "priority": "Medium", "tags": [], "files": [], "notes": ""}, {"project": "Valencia Del Mar Clubhouse", "scope": "Barlists", "title": "Lift - 1 verticals section #3", "status": "Completed", "client_sub_date": "2026-05-19", "due_date": "2026-05-19", "detailer": "", "checker": "", "assignee": "", "priority": "Medium", "tags": [], "files": [], "notes": ""}, {"project": "South Rd Office Building E", "scope": "Barlists", "title": "Lift -1 verticals barlists", "status": "Completed", "client_sub_date": "2026-05-13", "due_date": "2026-05-13", "detailer": "Lokesh Reddy", "checker": "", "assignee": "Lokesh Reddy", "priority": "Medium", "tags": [], "files": [], "notes": ""}, {"project": "2651 SE 10th Court", "scope": "Barlists", "title": "Pool deck slab and beams barlists", "status": "Completed", "client_sub_date": "2026-05-18", "due_date": "2026-05-18", "detailer": "", "checker": "", "assignee": "", "priority": "Medium", "tags": [], "files": [], "notes": ""}, {"project": "6017 Le Lac Road (Weiner Residence)", "scope": "Barlists", "title": "Orange section #2 1st lift verticals", "status": "Completed", "client_sub_date": "2026-05-19", "due_date": "2026-05-19", "detailer": "", "checker": "", "assignee": "", "priority": "Medium", "tags": [], "files": [], "notes": ""}, {"project": "1333 Bvld", "scope": "Barlists", "title": "Stem walls barlists", "status": "Completed", "client_sub_date": "2026-05-18", "due_date": "2026-05-18", "detailer": "", "checker": "", "assignee": "", "priority": "Medium", "tags": [], "files": [], "notes": ""}, {"project": "2651 SE 10th Court", "scope": "Emds", "title": "Update received on the pool deck", "status": "Completed", "client_sub_date": "2026-05-19", "due_date": "2026-05-19", "detailer": "", "checker": "", "assignee": "", "priority": "Medium", "tags": [], "files": [], "notes": ""}, {"project": "cannatelli", "scope": "Barlists", "title": "Foundations and slab on grade Barlists", "status": "Completed", "client_sub_date": "2026-05-18", "due_date": "2026-05-18", "detailer": "", "checker": "", "assignee": "", "priority": "Medium", "tags": [], "files": [], "notes": ""}, {"project": "6017 Le Lac Road (Weiner Residence)", "scope": "Barlists", "title": "Lift - 1 verticals and beams for Blue section", "status": "Completed", "client_sub_date": null, "due_date": null, "detailer": "", "checker": "", "assignee": "", "priority": "Medium", "tags": [], "files": [], "notes": ""}, {"project": "401 SE Atlantic Drive", "scope": "Barlists", "title": "Barlists for R3 series drawings", "status": "Completed", "client_sub_date": "2026-05-20", "due_date": "2026-05-20", "detailer": "", "checker": "", "assignee": "", "priority": "Medium", "tags": [], "files": [], "notes": ""}, {"project": "515 Lido Drive", "scope": "Barlists", "title": "Column ties for upto 4'-0\"", "status": "Completed", "client_sub_date": "2026-05-20", "due_date": "2026-05-20", "detailer": "", "checker": "", "assignee": "", "priority": "Medium", "tags": [], "files": [], "notes": ""}, {"project": "143 Reef Road", "scope": "Updated drawings", "title": "1st floor beams and second floor slab", "status": "Completed", "client_sub_date": null, "due_date": null, "detailer": "", "checker": "", "assignee": "", "priority": "Medium", "tags": [], "files": [], "notes": ""}, {"project": "PBIA - Revenue Control Building", "scope": "Revised drawings", "title": "Revised drawings received on cmu verticals", "status": "Completed", "client_sub_date": "2026-05-22", "due_date": "2026-05-22", "detailer": "", "checker": "", "assignee": "", "priority": "Medium", "tags": [], "files": [], "notes": ""}, {"project": "515 Lido Drive", "scope": "Barlists", "title": "Garage slab barlists", "status": "Completed", "client_sub_date": "2026-05-21", "due_date": "2026-05-21", "detailer": "", "checker": "", "assignee": "", "priority": "Medium", "tags": [], "files": [], "notes": ""}, {"project": "cannatelli", "scope": "Barlists", "title": "Foundations and slab on grade Barlists", "status": "Completed", "client_sub_date": "2026-05-23", "due_date": "2026-05-23", "detailer": "", "checker": "", "assignee": "", "priority": "Medium", "tags": [], "files": [], "notes": ""}, {"project": "1042 Palm Way Road", "scope": "Revised drawings", "title": "Roof beams and slab", "status": "Completed", "client_sub_date": "2026-05-28", "due_date": "2026-05-28", "detailer": "", "checker": "", "assignee": "", "priority": "Medium", "tags": [], "files": [], "notes": ""}, {"project": "South Rd Office Building E", "scope": "Emds", "title": "Comments received on 1st lift verticals and beams", "status": "In Progress", "client_sub_date": "2026-05-22", "due_date": "2026-05-22", "detailer": "", "checker": "", "assignee": "", "priority": "Medium", "tags": [], "files": [], "notes": ""}, {"project": "910 S Ocean", "scope": "Barlists", "title": "Basement slab barlists", "status": "Completed", "client_sub_date": "2026-05-27", "due_date": "2026-05-27", "detailer": "", "checker": "", "assignee": "", "priority": "Medium", "tags": [], "files": [], "notes": ""}, {"project": "Valencia Del Mar Clubhouse", "scope": "Barlists", "title": "Lift - 2 verticals and beams for green section #2", "status": "In Progress", "client_sub_date": "2026-05-28", "due_date": "2026-05-28", "detailer": "", "checker": "", "assignee": "", "priority": "Medium", "tags": [], "files": [], "notes": ""}, {"project": "Valencia Del Mar Clubhouse", "scope": "Barlists", "title": "Lift - 2 verticals and beams for Yellow section #1", "status": "In Progress", "client_sub_date": "2026-05-28", "due_date": "2026-05-28", "detailer": "", "checker": "", "assignee": "", "priority": "Medium", "tags": [], "files": [], "notes": ""}, {"project": "Burns Residence", "scope": "Barlists", "title": "Slab on grade barlists", "status": "In Progress", "client_sub_date": "2026-05-28", "due_date": "2026-05-28", "detailer": "", "checker": "", "assignee": "", "priority": "Medium", "tags": [], "files": [], "notes": ""}, {"project": "1900 NE 22ND Terrance", "scope": "Emds", "title": "Comments received on slab on grade", "status": "In Progress", "client_sub_date": "2026-05-28", "due_date": "2026-05-28", "detailer": "", "checker": "", "assignee": "", "priority": "Medium", "tags": [], "files": [], "notes": ""}];


async function main(){
  console.log("=== White Cap Import v3 ===\n");

  // ── STEP 1: Test DB connection ──
  const {data:ping,error:pingErr} = await supabase.from("projects").select("id").limit(1);
  if(pingErr){err("DB Connection failed",pingErr);return;}
  console.log("✓ DB connected\n");

  // ── STEP 2: Check what columns tasks table has ──
  const {data:sampleTask,error:stErr} = await supabase.from("tasks").select("*").limit(1);
  if(stErr){err("tasks table check",stErr);}
  else if(sampleTask&&sampleTask[0]){
    console.log("✓ tasks columns:", Object.keys(sampleTask[0]).join(", "));
  } else {
    console.log("✓ tasks table exists (empty)");
  }

  // ── STEP 3: Fetch users ──
  const {data:users,error:uErr}=await supabase.from("users").select("id,name,username,role");
  if(uErr){err("fetch users",uErr);return;}
  console.log(`✓ ${users.length} users in DB`);

  const byName={};
  for(const u of users){
    byName[u.name.toLowerCase().trim()]=u;
    if(u.username)byName[u.username.toLowerCase().trim()]=u;
  }

  // ── STEP 4: Create missing users ──
  const SKIP=new Set(["nnj","rds","rds user","nanaji","narayana","n/a","na","tbd","tekla","unknown","pdf check only","asap","high priority","eswar/siav kumar","balaram/jagadeesh","lokesh reddy/nanaji","eswar/nanaji","sridevi / vaishnavi","allu sai/nanaji"]);
  const allNames=new Set();
  for(const row of ALL_ROWS){
    for(const field of [row.detailer,row.checker]){
      if(!field)continue;
      for(const p of field.split(/[\/,]/)){
        const n=normName(p.trim());
        if(n&&n.length>1&&!SKIP.has(n.toLowerCase()))allNames.add(n);
      }
    }
  }

  console.log(`\n--- Users to process: ${allNames.size} ---`);
  for(const name of allNames){
    const key=name.toLowerCase();
    // Exact case-insensitive match on name or username
    if(byName[key]){console.log(`  ✓ EXISTS: ${name}`);continue;}
    // Also check if any existing user's name matches after title-case normalization
    const existingMatch=Object.values(byName).find(u=>toTitleCase(u.name)===name);
    if(existingMatch){byName[key]=existingMatch;console.log(`  ~ NORMALIZED MATCH: "${name}" → "${existingMatch.name}"`);continue;}
    const username=name.toLowerCase().replace(/\s+/g,"_").replace(/[^a-z0-9_]/g,"");
    const {data:nu,error:ne}=await supabase.from("users")
      .insert({name,username,password:"Rds@2025",role:"User",client_name:"",email:""})
      .select().single();
    if(ne){err(`create user "${name}"`,ne);}
    else{byName[key]=nu;byName[nu.username]=nu;console.log(`  + CREATED: ${name} (@${username})`);}
  }

  // ── STEP 5: Group rows by project ──
  const byProject={};
  for(const row of ALL_ROWS){
    if(!byProject[row.project])byProject[row.project]=[];
    byProject[row.project].push(row);
  }

  // ── STEP 6: TEST insert BEFORE deleting anything ──
  // If this fails, old data is safe — nothing has been deleted yet
  console.log("\n--- Testing insert (old data is still safe) ---");
  const testProjName=Object.keys(byProject)[0];
  const testTasks=byProject[testProjName];
  const testAssignee=normName(testTasks[0].assignee);
  const {data:testProj,error:testErr}=await supabase.from("projects").insert({
    name:testProjName+" [TEST]",
    client:"White Cap",
    color:"#6366f1",
    description:"Test import",
    assigned_users:[],
    deadline:testTasks[0].due_date||null
  }).select().single();
  if(testErr){
    err("TEST project insert FAILED — old data untouched",testErr);
    return;
  }
  console.log(`✓ Test project OK: "${testProj.name}"`);

  const {data:testTask,error:ttErr}=await supabase.from("tasks").insert({
    project_id:testProj.id,
    title:testTasks[0].title||"Test Task",
    status:testTasks[0].status||"Not Yet Started",
    priority:"Medium",
    assignee:testAssignee,
    detailer:normField(testTasks[0].detailer),
    checker:normField(testTasks[0].checker),
    scope:testTasks[0].scope||"",
    client_sub_date:testTasks[0].client_sub_date||null,
    due_date:testTasks[0].due_date||null,
    client:"White Cap",
    tags:[],files:[],
  }).select().single();
  if(ttErr){
    err("TEST task insert FAILED — old data untouched",ttErr);
    await supabase.from("projects").delete().eq("id",testProj.id);
    return;
  }
  console.log(`✓ Test task OK: "${testTask.title}"`);

  // Clean up test records
  await supabase.from("tasks").delete().eq("id",testTask.id);
  await supabase.from("projects").delete().eq("id",testProj.id);
  console.log("✓ Test records cleaned up — inserts work, safe to proceed\n");

  // ── STEP 7: NOW delete old White Cap data (only after test passed) ──
  console.log("--- Removing old White Cap data ---");
  const {data:allProj}=await supabase.from("projects").select("id,name,client");
  const wcProj=(allProj||[]).filter(p=>(p.client||"").toLowerCase().includes("white cap")||(p.client||"").toLowerCase().includes("whitecap"));
  console.log(`  Found ${wcProj.length} existing White Cap projects`);
  for(const p of wcProj){
    await supabase.from("tasks").delete().eq("project_id",p.id);
    const {error:pe}=await supabase.from("projects").delete().eq("id",p.id);
    if(pe)err(`delete project "${p.name}"`,pe);
    else console.log(`  🗑 Deleted: ${p.name}`);
  }

  // ── STEP 8: Full import ──
  console.log(`\n--- Inserting ${Object.keys(byProject).length} projects, ${ALL_ROWS.length} tasks ---`);
  let pOk=0,tOk=0,pFail=0,tFail=0;
  let pIdx=0;
  for(const [projName,tasks] of Object.entries(byProject)){
    const color=COLORS[pIdx++%COLORS.length];
    const deadline=tasks.reduce((lat,t)=>(!t.due_date?lat:(!lat||t.due_date>lat?t.due_date:lat)),null);

    // Collect assigned usernames
    const assignedSet=new Set();
    for(const t of tasks){
      for(const field of [t.detailer,t.checker,t.assignee]){
        if(!field)continue;
        for(const part of field.split(/[\/,]/)){
          const u=byName[normName(part.trim()).toLowerCase()];
          if(u?.username)assignedSet.add(u.username);
        }
      }
    }

    const {data:proj,error:pErr}=await supabase.from("projects").insert({
      name:projName,
      client:"White Cap",
      color,
      description:"White Cap Projects Tracker 2026",
      assigned_users:[...assignedSet],
      deadline:deadline||null,
    }).select().single();

    if(pErr){err(`project "${projName}"`,pErr);pFail++;continue;}
    pOk++;

    for(const t of tasks){
      const assignee=normName(t.assignee)||normName((t.detailer||"").split("/")[0]);
      const {error:tErr}=await supabase.from("tasks").insert({
        project_id:proj.id,
        title:t.title||projName,
        status:t.status||"Not Yet Started",
        priority:t.priority||"Medium",
        assignee,
        detailer:normField(t.detailer),
        checker:normField(t.checker),
        scope:t.scope||"",
        client_sub_date:t.client_sub_date||null,
        due_date:t.due_date||null,
        client:"White Cap",
        tags:[],files:[],
      });
      if(tErr){err(`task "${t.title}"`,tErr);tFail++;}
      else tOk++;
    }
    console.log(`  ✓ ${projName} — ${tasks.length} task(s)`);
  }

  console.log(`\n=== RESULT: ${pOk} projects ✓, ${pFail} failed | ${tOk} tasks ✓, ${tFail} failed ===`);
}

main().catch(e=>console.error("FATAL:",e));
