// Safe duplicate project cleanup
// For each duplicate: move tasks to original, then delete the duplicate
const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");

const supabase = createClient(
  "https://xypcbioltukahipkqqzc.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGNiaW9sdHVrYWhpcGtxcXpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0MzEzNjUsImV4cCI6MjA5NTAwNzM2NX0.DG5sv2bpx8j3Mmz0mqIsoDVaCMP2TmWqh-OQUfSZFRw"
);

// [duplicate_id, original_id, name]
const DUPES = [
  // ── FORMCRETE ──────────────────────────────────────────────
  ["f44a631d-36e7-4c49-bf41-14cee4a9abbf", "95bf954d-4cfc-43cd-ba00-cfca50bed78e", "2460 Australian (Ocean Tower)"],
  ["a12ebdfc-1cb1-4156-9666-b54b4f3115ca", "f4182839-e0ed-4d13-876d-14bba144c6f7", "4541-Gables Cypress Creek"],
  ["75ecc479-c4eb-4fbd-b807-7c52260db1d0", "ee741c1a-d31c-4cb5-a9f1-a5e66817847c", "4543 DULCE VIDA"],
  ["bb81a31e-621f-41ce-b673-c435ad54d11e", "f1e831ba-034f-4fcf-8421-be7b306eec98", "Adela II"],
  ["f06017f4-0973-4e19-96ca-2c6a4f5a0961", "3cd43d93-35cd-4a29-a3e3-0edb173277a9", "Alexan margrate (dup1)"],
  ["2bc1a59c-6a0f-4013-849a-f1190579857f", "3cd43d93-35cd-4a29-a3e3-0edb173277a9", "Alexan margrate (dup2)"],
  ["447f91d1-a1e4-4867-a3b3-1c52feb13cc3", "0089cf21-7056-4c5c-9458-8d608685c9c0", "Altis Delray"],
  ["bd0477b1-9b93-4805-aae0-434eed76c02d", "b832e0a5-14f0-4d48-9a04-2a8dc5f37718", "Hilltop Gardens"],
  ["5c499201-cec0-499f-b012-4613ef765ff5", "f41c0dac-a6a6-462c-a73a-8e25ac1af20b", "Magnolia Point"],
  ["1189afd4-5c13-4c4b-a53a-0692ad831d22", "987a4a3f-8d72-42de-a891-095123135029", "Modera Boca Raton"],
  ["acb71aec-8aee-4c0a-8e87-dd7bb5720229", "df23aa9c-650b-4c7d-8d5c-45c441379f82", "NOMI-6"],
  ["867dab58-4a64-43bc-9c2f-64bb940449a0", "7890e355-c009-4b56-b33b-89100799bcb3", "Octavia"],
  // ── WHITE CAP ──────────────────────────────────────────────
  ["cae5a2af-617a-44d3-ba5e-21d062a3c2d5", "a9e95717-3cc2-4ad7-a674-1aad60987cfa", "1050 N Lake way"],
  ["9a54de60-3c8a-4d12-9e58-124c1e0a2a32", "e7d58807-8362-4a1f-9e7c-c294301e3746", "2651 Southcast 10th court"],
  ["b5a5d1a0-9cdc-47bb-9bd3-62fd67b9dd04", "5a283eee-d00c-42d6-a820-6bc3a74da3ed", "320 S atlantic Drive"],
  ["c659a8f5-8545-4984-819c-240817cb2589", "6e6147b4-c476-4ec0-ac9e-b8a3fffb8e8b", "5900 Powerline Garag"],
  ["02595ce7-2116-4ed1-9f18-6f79476e0183", "4d8d21b3-cd9f-43e0-bb7d-6562ac362d47", "6017 Le Lac Road (Weiner Residence)"],
  ["9f0f58ff-aef8-4a63-acda-eba7463c9041", "762ae52c-2aab-4a12-846b-de4aa6228bb8", "6024 Lelac Rd (dup1)"],
  ["22f1060c-d156-4b41-aa49-d405f59f8cbd", "762ae52c-2aab-4a12-846b-de4aa6228bb8", "6024 Lelac Rd (dup2)"],
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
  ["6798eac8-8df0-4430-9046-92203b1324d8", "66558692-26af-44db-a96d-a49cf1b5c3c0", "Nuvo (dup1)"],
  ["526d9236-895e-405b-9a1a-edd65b2cae03", "66558692-26af-44db-a96d-a49cf1b5c3c0", "Nuvo (dup2)"],
  ["ed529deb-0a70-4e69-a302-137ea50e5fd1", "597b23f7-4f49-45a2-bc35-8c100b24ca2e", "Rancano"],
  ["ca00c5af-d6ad-4212-ab16-6fdb1d547993", "4d64c4f3-a759-48ac-84bb-ea4476368a57", "SW Ranches"],
  ["dfb2aa84-9eff-4420-8b73-0493b8c9604b", "cf8b80c0-5128-48b7-ba23-bc11d8adc2c8", "The Syed Residence"],
];

async function main() {
  const log = [];
  let tasksMoved = 0, projectsDeleted = 0, errors = 0;

  for (const [dupeId, origId, name] of DUPES) {
    // 1. Check if duplicate has any tasks
    const { data: tasks } = await supabase.from("tasks").select("id").eq("project_id", dupeId);
    if (tasks && tasks.length > 0) {
      // Move tasks to the original project
      const { error: moveErr } = await supabase.from("tasks").update({ project_id: origId }).eq("project_id", dupeId);
      if (moveErr) {
        log.push(`ERROR moving tasks for ${name}: ${moveErr.message}`);
        errors++;
        continue;
      }
      log.push(`Moved ${tasks.length} task(s) from duplicate to original: ${name}`);
      tasksMoved += tasks.length;
    }

    // 2. Delete the duplicate project
    const { error: delErr } = await supabase.from("projects").delete().eq("id", dupeId);
    if (delErr) {
      log.push(`ERROR deleting ${name} (${dupeId}): ${delErr.message}`);
      errors++;
    } else {
      log.push(`Deleted duplicate: ${name}`);
      projectsDeleted++;
    }
  }

  const summary = `\n=== DONE ===\nProjects deleted: ${projectsDeleted}\nTasks moved: ${tasksMoved}\nErrors: ${errors}\n`;
  log.push(summary);
  fs.writeFileSync("delete-dupes-log.txt", log.join("\n"));
  console.log(summary);
  console.log("Full log saved to delete-dupes-log.txt");
}

main();
