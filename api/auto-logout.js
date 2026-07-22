// ============================================================
// /api/auto-logout — Vercel Cron (10 PM IST = 16:30 UTC daily)
// Auto-closes attendance records where the employee forgot to
// click logout and the grace period (11h 45min) has expired.
//
// Rule (user-defined):
//   • Wait 8h work + 3h grace = 11h 45min total (including 45min lunch)
//   • If still unclosed → set logout_at = login_at + 8h 45min
//   •                      set total_work_minutes = 480  (8 hours)
// ============================================================

export const maxDuration = 30;

const SUPA_URL = process.env.SUPABASE_URL  || "https://oqvxwwdxolxytlfbxjhs.supabase.co";
const SVC_KEY  = process.env.SUPABASE_SERVICE_KEY;

async function sbFetch(path, opts = {}) {
  const r = await fetch(SUPA_URL + path, {
    ...opts,
    headers: {
      apikey:        SVC_KEY,
      Authorization: `Bearer ${SVC_KEY}`,
      "Content-Type": "application/json",
      Prefer:        opts.method === "PATCH" ? "return=minimal" : "return=representation",
      ...opts.headers,
    },
  });
  if (!r.ok) {
    const txt = await r.text();
    throw new Error(`Supabase ${r.status}: ${txt}`);
  }
  if (r.status === 204) return null;
  const text = await r.text();
  return text ? JSON.parse(text) : null;
}

export default async function handler(req, res) {
  if (!SVC_KEY) {
    return res.status(500).json({ error: "SUPABASE_SERVICE_KEY not configured" });
  }

  const GRACE_MS = (11 * 60 + 45) * 60 * 1000; // 11h 45min
  const WORK_MS  = ( 8 * 60 + 45) * 60 * 1000; // 8h 45min
  const WORK_MIN = 480;                          // 8 hours actual work

  const cutoff = new Date(Date.now() - GRACE_MS).toISOString();

  try {
    // Fetch all unclosed records where login_at is old enough
    const rows = await sbFetch(
      `/rest/v1/attendance?logout_at=is.null&login_at=lt.${encodeURIComponent(cutoff)}&select=id,user_name,login_at`
    );

    if (!rows || rows.length === 0) {
      console.log("[auto-logout] No forgotten logouts found.");
      return res.json({ closed: 0, message: "No forgotten logouts found." });
    }

    let closed = 0;
    const details = [];

    for (const r of rows) {
      try {
        const autoLogout = new Date(new Date(r.login_at).getTime() + WORK_MS).toISOString();
        await sbFetch(`/rest/v1/attendance?id=eq.${r.id}`, {
          method:  "PATCH",
          body:    JSON.stringify({ logout_at: autoLogout, total_work_minutes: WORK_MIN }),
        });
        closed++;
        details.push({ user: r.user_name, login_at: r.login_at, auto_logout: autoLogout });
        console.log(`[auto-logout] ${r.user_name}: closed at ${autoLogout}`);
      } catch (e) {
        console.error(`[auto-logout] Failed for ${r.user_name}:`, e.message);
      }
    }

    return res.json({
      closed,
      message: `Auto-closed ${closed} forgotten logout(s).`,
      details,
    });
  } catch (e) {
    console.error("[auto-logout] Error:", e.message);
    return res.status(500).json({ error: e.message });
  }
}
