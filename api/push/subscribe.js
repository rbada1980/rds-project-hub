// /api/push/subscribe — Vercel: store or remove push subscription in Supabase
// POST { username, subscription }  → upsert
// DELETE { endpoint }              → remove

const SUPA_URL = "https://xypcbioltukahipkqqzc.supabase.co";
const SUPA_KEY = process.env.SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGNiaW9sdHVrYWhpcGtxcXpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0MzEzNjUsImV4cCI6MjA5NTAwNzM2NX0.DG5sv2bpx8j3Mmz0mqIsoDVaCMP2TmWqh-OQUfSZFRw";

const HDR = { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}`, "Content-Type": "application/json" };

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method === "DELETE") {
    const { endpoint } = req.body || {};
    if (endpoint) {
      await fetch(`${SUPA_URL}/rest/v1/push_subscriptions?endpoint=eq.${encodeURIComponent(endpoint)}`, {
        method: "DELETE",
        headers: HDR,
      });
    }
    return res.json({ ok: true });
  }

  if (req.method === "POST") {
    const { username, subscription } = req.body || {};
    if (!username || !subscription?.endpoint) return res.status(400).json({ ok: false });

    await fetch(`${SUPA_URL}/rest/v1/push_subscriptions`, {
      method: "POST",
      headers: { ...HDR, Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify({
        username,
        endpoint: subscription.endpoint,
        p256dh:   subscription.keys?.p256dh || subscription.p256dh,
        auth:     subscription.keys?.auth   || subscription.auth,
        origin:   "online",
      }),
    });
    return res.json({ subscribed: true });
  }

  res.status(405).json({ error: "Method not allowed" });
}
