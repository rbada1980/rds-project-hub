// test-supabase.cjs — run: node test-supabase.cjs
const fs = require("fs"), path = require("path");
const KEY = JSON.parse(fs.readFileSync(path.join(__dirname,"sync-config.json"),"utf8")).service_key;
const URL = "https://xypcbioltukahipkqqzc.supabase.co";

async function test() {
  console.log("Testing Supabase connection...");
  try {
    const r = await fetch(`${URL}/rest/v1/clients?select=id&limit=1`, {
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}` }
    });
    console.log("HTTP status:", r.status);
    const txt = await r.text();
    console.log("Response:", txt.slice(0, 200));
  } catch(e) {
    console.error("FETCH ERROR:", e.message);
  }
}
test();
