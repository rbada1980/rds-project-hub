// Round 2: delete remaining duplicates using service role key (bypasses RLS)
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  "https://xypcbioltukahipkqqzc.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGNiaW9sdHVrYWhpcGtxcXpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTQzMTM2NSwiZXhwIjoyMDk1MDA3MzY1fQ.AoLxjBk3MR3_qjsCP50xzbyx7cp_kaQlVmN_eP_xuYU"
);

// [duplicate_id, original_id, name]
const REMAINING = [
  // Formcrete
  ["f44a631d-36e7-4c49-bf41-14cee4a9abbf", "95bf954d-4cfc-43cd-ba00-cfca50bed78e", "2460 Australian"],
  ["a12ebdfc-1cb1-4156-9666-b54b4f3115ca", "f4182839-e0ed-4d13-876d-14bba144c6f7", "4541-Gables Cypress Creek"],
  ["75ecc479-c4eb-4fbd-b807-7c52260db1d0", "ee741c1a-d31c-4cb5-a9f1-a5e66817847c", "4543 DULCE VIDA"],
  // White Cap
  ["22f1060c-d156-4b41-aa49-d405f59f8cbd", "762ae52c-2aab-4a12-846b-de4aa6228bb8", "6024 Lelac Rd"],
  ["1b7c9110-f5ae-47f9-9694-ff72a31ec8c2", "0aaf6b47-2dc7-4b00-816a-3d2628692e9f", "799 Park Drive"],
  ["0fa44d53-1c6f-4d12-bbd0-36cd9dbf08a9", "6ed72ddf-eb49-4b8c-b93d-bb82f4cd4085", "810 S Swinton Ave Residence"],
  ["ef928463-3d15-4d76-b055-ec589e06c35e", "460c8444-e3a9-41c1-9510-1ee873ff66dd", "Ackerman Residence"],
  ["213561ee-bc92-48b5-8eaf-5ba02f21606a", "faa3f760-2f91-4e78-94fc-bb9e3692ecc6", "Baig Residence"],
  ["f0c10b58-339b-4a35-b2a0-394f395eb088", "86ada9e7-6945-4ddf-bea5-3fd3a230d5b6", "Blue Water Cove 3"],
  ["22bb2463-d704-405f-a0f8-455a56a72250", "1f858c86-19db-4eb6-8a57-be43aa12f323", "Bluewater cove 11"],
  ["82bc1a4d-4490-4eb4-913e-d2b6f60dbea3", "54d0f616-a3a1-4797-a46f-9a4233d79f9a", "Bluewater cove 9"],
  ["af4c29d5-3292-4a41-95a4-18f7aff7121f", "b3a1b673-bd76-45bf-8479-0315f4a488a7", "BOKOR 432 SUNSHINE BLVD"],
  ["9f179738-7570-4161-9217-9ab229ba7317", "d2f3cf70-65c0-4bbd-9c24-674a6fdadb01", "Chateau De La Duchess"],
  ["d1654cc5-d3b2-4328-9b23-50b9bb90239c", "5635c43e-5868-4dba-931b-addb1400ac77", "Country inn Pet Resort"],
  ["3a4a03cc-8f4f-43c4-b039-07c7886dd318", "c13cc6ae-8b95-4dd3-bc9b-ccc6cbfadcc0", "Custom Residence (134 Worth CTN)"],
  ["8c0c843d-6669-41ae-b9b1-b38d34b53d17", "37906870-1aa0-4304-a165-c65824d8e73e", "Custom Residence (515 lido drive)"],
  ["4591311f-7c91-4201-9b3a-9d1ba67fb8f4", "d8924af8-d413-4937-9188-6231839da0eb", "Felies Residence"],
  ["28fedcb2-cb2a-4c2d-b243-31df866f48d4", "ee2a86e4-0e50-4f05-83f9-f42c98a5af35", "Jandrews Residence (dup1)"],
  ["a1fcc8d7-0487-4b01-84d9-4f72586fc4c9", "ee2a86e4-0e50-4f05-83f9-f42c98a5af35", "Jandrews Residence (dup2)"],
];

async function main() {
  let deleted = 0, moved = 0, errors = 0;

  for (const [dupeId, origId, name] of REMAINING) {
    // Move any tasks from duplicate to original
    const { data: tasks } = await supabase.from("tasks").select("id").eq("project_id", dupeId);
    if (tasks && tasks.length > 0) {
      const { error: moveErr } = await supabase.from("tasks").update({ project_id: origId }).eq("project_id", dupeId);
      if (moveErr) { console.log(`MOVE ERROR [${name}]: ${moveErr.message}`); errors++; continue; }
      console.log(`Moved ${tasks.length} task(s): ${name}`);
      moved += tasks.length;
    }

    // Delete duplicate project
    const { error: delErr } = await supabase.from("projects").delete().eq("id", dupeId);
    if (delErr) { console.log(`DELETE ERROR [${name}]: ${delErr.message}`); errors++; }
    else { console.log(`Deleted: ${name}`); deleted++; }
  }

  console.log(`\n=== DONE === Deleted: ${deleted}  Tasks moved: ${moved}  Errors: ${errors}`);
}

main();
