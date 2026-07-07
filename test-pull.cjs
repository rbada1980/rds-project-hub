// Quick test — run: node test-pull.cjs
const SUPA_URL = "https://xypcbioltukahipkqqzc.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGNiaW9sdHVrYWhpcGtxcXpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTQzMTM2NSwiZXhwIjoyMDk1MDA3MzY1fQ.AoLxjBk3MR3_qjsCP50xzbyx7cp_kaQlVmN_eP_xuYU";

async function test() {
  const url = `${SUPA_URL}/rest/v1/users?select=*&limit=5&offset=0`;
  console.log("Fetching:", url);
  const res = await fetch(url, {
    headers: {
      "apikey":        SUPA_KEY,
      "Authorization": `Bearer ${SUPA_KEY}`,
    }
  });
  console.log("Status:", res.status, res.statusText);
  const text = await res.text();
  console.log("Response:", text.slice(0, 500));
}

test().catch(e => console.error("Error:", e.message));
