// /api/push-subscribe.js — Vercel: store push subscription in Supabase
// POST { username, subscription: { endpoint, keys: { p256dh, auth } } }

const SUPA_URL = "https://xypcbioltukahipkqqzc.supabase.co";
const SUPA_KEY = process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGNiaW9sdHVrYWhpcGtxcXpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0MzEzNjUsImV4cCI6MjA5NTAwNzM2NX0.DG5sv2bpx8j3Mmz0mqIsoDVaCMP2TmWqh-OQUfSZFRw";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method === "GET") {
    return res.json({ key: "BMTLOA2w7j72nZQd64u_WR2dNKpDcdDiAP92vs_BJY7l2v23qQaw9Xbwimu4Y62U2rjJ9A0rSNM1SYS_6wBDHq4" });
  }

  if (req.method === "DELETE") {
    const { endpoint } = req.body || {};
    await fetch(`${SUPA_URL}/rest/v1/push_subscriptions?endpoint=eq.${encodeURIComponent(endpoint)}`, {
      method: "DELETE",
      headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` },
    });
    return res.json({ ok: true });
  }

  if (req.method === "POST") {
    const { username, subscription } = req.body || {};
    if (!username || !subscription?.endpoint) return res.json({ ok: false });

    await fetch(`${SUPA_URL}/rest/v1/push_subscriptions`, {
      method: "POST",
      headers: {
        apikey: SUPA_KEY,
        Authorization: `Bearer ${SUPA_KEY}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify({
        username,
        endpoint:  subscription.endpoint,
        p256dh:    subscription.keys.p256dh,
        auth:      subscription.keys.auth,
        origin:    "online",
      }),
    });
    return res.json({ subscribed: true });
  }

  res.status(405).json({ error: "Method not allowed" });
}
