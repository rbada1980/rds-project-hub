// /api/send-email.js — Vercel serverless function
// Called by the React frontend when IS_LOCAL is false (Vercel deployment)
// Requires RESEND_API_KEY in Vercel environment variables

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const RESEND_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_KEY) return res.status(500).json({ error: "RESEND_API_KEY not set in Vercel env vars" });

  const { to, subject, html, fromName, fromEmail } = req.body;
  if (!to || !subject || !html) return res.status(400).json({ error: "Missing required fields: to, subject, html" });

  const from = `${fromName || "RDS Projects"} <${fromEmail || "noreply@hub-rdsprojects.com"}>`;

  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + RESEND_KEY
      },
      body: JSON.stringify({
        from,
        to: Array.isArray(to) ? to : [to],
        subject,
        html
      })
    });
    const data = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: data.message || "Resend API error", data });
    return res.json({ ok: true, id: data.id });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
