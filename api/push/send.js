// POST /api/push/send — Vercel: send Web Push notification to one or more users
// Body: { usernames: string[], title, body, employee, type, url, tag, extra }
//
// Called from App.jsx (online site) after war-room messages, mentions, etc.

import webpush from "web-push";

const SUPA_URL = "https://xypcbioltukahipkqqzc.supabase.co";
const SUPA_KEY = process.env.SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGNiaW9sdHVrYWhpcGtxcXpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0MzEzNjUsImV4cCI6MjA5NTAwNzM2NX0.DG5sv2bpx8j3Mmz0mqIsoDVaCMP2TmWqh-OQUfSZFRw";

const VAPID_PUBLIC_KEY  = "BMTLOA2w7j72nZQd64u_WR2dNKpDcdDiAP92vs_BJY7l2v23qQaw9Xbwimu4Y62U2rjJ9A0rSNM1SYS_6wBDHq4";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "BUB44kF8h_b_PYPOJCJrt9fv2InIsV4C1hN67zGqhiE";
const VAPID_EMAIL       = "mailto:admin@rdsgroup.biz";

webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

function istTime() {
  return new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" }) + " IST";
}

async function getSubscriptions(usernames) {
  if (!usernames?.length) return [];
  const filter = usernames.map(u => `username.eq.${u}`).join(",");
  const r = await fetch(
    `${SUPA_URL}/rest/v1/push_subscriptions?or=(${encodeURIComponent(filter)})&select=username,endpoint,p256dh,auth`,
    { headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` } }
  );
  return r.ok ? (await r.json()) : [];
}

async function removeStale(endpoint) {
  await fetch(
    `${SUPA_URL}/rest/v1/push_subscriptions?endpoint=eq.${encodeURIComponent(endpoint)}`,
    { method: "DELETE", headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` } }
  );
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { usernames, title, body, employee, type, url = "/", tag, extra } = req.body || {};
  if (!usernames?.length) return res.json({ sent: 0 });

  const subs = await getSubscriptions(usernames);
  if (!subs.length) return res.json({ sent: 0 });

  const payload = JSON.stringify({
    title: title || "RDS Project Hub",
    body:  body  || "You have a new notification",
    employee: employee || "",
    type:     type     || "",
    time:     istTime(),
    url:      url || "/",
    tag:      tag || ("rds-" + Date.now()),
    extra:    extra || "",
  });

  let sent = 0;
  await Promise.all(subs.map(async sub => {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      );
      sent++;
    } catch (e) {
      if (e.statusCode === 410 || e.statusCode === 404) {
        await removeStale(sub.endpoint); // expired subscription
      }
    }
  }));

  res.json({ sent, total: subs.length });
}
