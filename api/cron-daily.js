// /api/cron-daily.js
// Vercel Cron: runs Mon–Sat at 1:00 AM IST (= 19:30 UTC Sun–Fri)
// Schedule in vercel.json: "30 19 * * 0-5"

const SUPA_URL  = "https://xypcbioltukahipkqqzc.supabase.co";
const SUPA_KEY  = process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGNiaW9sdHVrYWhpcGtxcXpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0MzEzNjUsImV4cCI6MjA5NTAwNzM2NX0.DG5sv2bpx8j3Mmz0mqIsoDVaCMP2TmWqh-OQUfSZFRw";
const NOTIFY_URL = `${SUPA_URL}/functions/v1/notify`;

async function supaFetch(path) {
  const res = await fetch(SUPA_URL + path, {
    headers: {
      "apikey": SUPA_KEY,
      "Authorization": `Bearer ${SUPA_KEY}`,
      "Content-Type": "application/json"
    }
  });
  return res.json();
}

async function postJson(url, payload) {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "apikey": SUPA_KEY,
      "Authorization": `Bearer ${SUPA_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  return res.status;
}

const PORTAL = "https://hub-rdsprojects.com/submissions";
const aStyle = "text-decoration:none;color:inherit;display:block;";

function statusBadge(s) {
  if (s === "Done")        return `<span style="background:#d1fae5;color:#065f46;font-size:10px;font-weight:700;padding:3px 10px;border-radius:20px;">Done</span>`;
  if (s === "In Progress") return `<span style="background:#fef3c7;color:#92400e;font-size:10px;font-weight:700;padding:3px 10px;border-radius:20px;">In Progress</span>`;
  return `<span style="background:#fee2e2;color:#991b1b;font-size:10px;font-weight:700;padding:3px 10px;border-radius:20px;">Not Started</span>`;
}
function rowBg(s) { return s === "Done" ? "#f0fdf4" : s === "In Progress" ? "#fffbeb" : "#ffffff"; }

function tableRows(tasks, pm) {
  if (!tasks.length) return `<tr><td colspan="7" style="padding:20px;text-align:center;color:#9ca3af;font-style:italic;font-size:13px;">No submissions planned for today.</td></tr>`;
  return tasks.map(t => {
    const p = pm[t.project_id];
    return `<tr style="background:${rowBg(t.status)}">
      <td style="padding:0;border-bottom:1px solid #e5e7eb;"><a href="${PORTAL}" style="${aStyle}padding:9px 12px;color:#374151;font-size:12px;">${t.client || (p && p.client) || "—"}</a></td>
      <td style="padding:0;border-bottom:1px solid #e5e7eb;"><a href="${PORTAL}" style="${aStyle}padding:9px 12px;color:#374151;font-size:12px;">${p ? p.name : "—"}</a></td>
      <td style="padding:0;border-bottom:1px solid #e5e7eb;"><a href="${PORTAL}" style="${aStyle}padding:9px 12px;color:#111827;font-weight:600;font-size:12px;">${t.title}</a></td>
      <td style="padding:9px 12px;border-bottom:1px solid #e5e7eb;text-align:center;">${statusBadge(t.status)}</td>
      <td style="padding:0;border-bottom:1px solid #e5e7eb;"><a href="${PORTAL}" style="${aStyle}padding:9px 12px;color:#374151;font-size:12px;">${t.assignee || "—"}</a></td>
      <td style="padding:0;border-bottom:1px solid #e5e7eb;text-align:center;"><a href="${PORTAL}" style="${aStyle}padding:9px 12px;color:#374151;font-size:12px;">${t.client_sub_date || "—"}</a></td>
      <td style="padding:0;border-bottom:1px solid #e5e7eb;text-align:center;"><a href="${PORTAL}" style="${aStyle}padding:9px 12px;color:#374151;font-size:12px;">${t.due_date || "—"}</a></td>
    </tr>`;
  }).join("");
}

function buildEmail(name, tasks, pm, dateLabel) {
  const total = tasks.length;
  const done  = tasks.filter(t => t.status === "Done").length;
  const ip    = tasks.filter(t => t.status === "In Progress").length;
  const ns    = total - done - ip;

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:20px 0;background:#f4f6f9;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:680px;margin:0 auto;"><tr><td>

<table width="100%" cellpadding="0" cellspacing="0" style="background:#1a3a6b;border-radius:10px 10px 0 0;">
<tr><td style="padding:20px 28px;">
  <table cellpadding="0" cellspacing="0" width="100%"><tr>
    <td style="width:1px;white-space:nowrap;">
      <table cellpadding="0" cellspacing="0"><tr><td style="background:#ffffff;border-radius:8px;padding:7px 14px;">
        <table cellpadding="0" cellspacing="0"><tr>
          <td style="width:30px;height:30px;background:#1a3a6b;border-radius:6px;text-align:center;vertical-align:middle;font-weight:800;font-size:11px;color:#ffffff;letter-spacing:1px;">RDS</td>
          <td style="padding-left:8px;font-size:12px;font-weight:800;color:#1a3a6b;letter-spacing:1px;white-space:nowrap;">TECHSERV</td>
        </tr></table>
      </td></tr></table>
    </td>
    <td style="width:1px;padding:0 16px;"><div style="width:1px;height:36px;background:rgba(255,255,255,0.2);"></div></td>
    <td>
      <div style="font-size:18px;font-weight:700;color:#ffffff;">Daily Submission List</div>
      <div style="font-size:12px;color:rgba(255,255,255,0.75);margin-top:3px;">${dateLabel}</div>
    </td>
    <td align="right" style="white-space:nowrap;padding-left:12px;">
      <a href="${PORTAL}" style="text-decoration:none;background:rgba(255,255,255,0.15);border-radius:20px;padding:5px 14px;font-size:12px;color:#ffffff;border:1px solid rgba(255,255,255,0.3);">&#128236; Today's Report</a>
    </td>
  </tr></table>
</td></tr>
<tr><td style="background:#163060;padding:9px 28px;">
  <table cellpadding="0" cellspacing="0"><tr>
    <td style="width:7px;height:7px;background:#4ade80;border-radius:50%;"></td>
    <td style="padding-left:8px;font-size:11px;color:rgba(255,255,255,0.75);">Automated daily digest &mdash; sent at 1:00 AM IST every day except Sunday</td>
  </tr></table>
</td></tr>
</table>

<table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border-left:1px solid #dde3ef;border-right:1px solid #dde3ef;">
<tr><td style="padding:26px 28px;">
  <p style="font-size:14px;color:#374151;margin:0 0 6px;">Dear ${name},</p>
  <p style="font-size:14px;color:#374151;margin:0 0 22px;line-height:1.7;">Please find below the list of <a href="${PORTAL}" style="color:#1a3a6b;font-weight:700;text-decoration:none;">${total} submission(s)</a> planned for today based on <em>Client Submission Date</em> and <em>Due Date</em>. Kindly ensure all deliverables are on track.</p>

  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:8px;margin-bottom:22px;border-left:4px solid #1a3a6b;"><tr>
    <td width="25%" style="padding:0;text-align:center;border-right:1px solid #e5e7eb;"><a href="${PORTAL}" style="text-decoration:none;display:block;padding:14px 0;"><div style="font-size:22px;font-weight:700;color:#1a3a6b;">${total}</div><div style="font-size:11px;color:#6b7280;margin-top:2px;text-transform:uppercase;letter-spacing:0.5px;">Total</div></a></td>
    <td width="25%" style="padding:0;text-align:center;border-right:1px solid #e5e7eb;"><a href="${PORTAL}" style="text-decoration:none;display:block;padding:14px 0;"><div style="font-size:22px;font-weight:700;color:#059669;">${done}</div><div style="font-size:11px;color:#6b7280;margin-top:2px;text-transform:uppercase;letter-spacing:0.5px;">Done</div></a></td>
    <td width="25%" style="padding:0;text-align:center;border-right:1px solid #e5e7eb;"><a href="${PORTAL}" style="text-decoration:none;display:block;padding:14px 0;"><div style="font-size:22px;font-weight:700;color:#d97706;">${ip}</div><div style="font-size:11px;color:#6b7280;margin-top:2px;text-transform:uppercase;letter-spacing:0.5px;">In Progress</div></a></td>
    <td width="25%" style="padding:0;text-align:center;"><a href="${PORTAL}" style="text-decoration:none;display:block;padding:14px 0;"><div style="font-size:22px;font-weight:700;color:#ef4444;">${ns}</div><div style="font-size:11px;color:#6b7280;margin-top:2px;text-transform:uppercase;letter-spacing:0.5px;">Not Started</div></a></td>
  </tr></table>

  <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
  <thead><tr style="background:#1a3a6b;">
    <th style="padding:10px 12px;text-align:left;color:#ffffff;font-size:11px;font-weight:700;letter-spacing:0.5px;border-right:1px solid rgba(255,255,255,0.1);">CLIENT</th>
    <th style="padding:10px 12px;text-align:left;color:#ffffff;font-size:11px;font-weight:700;letter-spacing:0.5px;border-right:1px solid rgba(255,255,255,0.1);">PROJECT</th>
    <th style="padding:10px 12px;text-align:left;color:#ffffff;font-size:11px;font-weight:700;letter-spacing:0.5px;border-right:1px solid rgba(255,255,255,0.1);">TASK</th>
    <th style="padding:10px 12px;text-align:center;color:#ffffff;font-size:11px;font-weight:700;letter-spacing:0.5px;border-right:1px solid rgba(255,255,255,0.1);">STATUS</th>
    <th style="padding:10px 12px;text-align:left;color:#ffffff;font-size:11px;font-weight:700;letter-spacing:0.5px;border-right:1px solid rgba(255,255,255,0.1);">ASSIGNEE</th>
    <th style="padding:10px 12px;text-align:center;color:#ffffff;font-size:11px;font-weight:700;letter-spacing:0.5px;border-right:1px solid rgba(255,255,255,0.1);">SUB DATE</th>
    <th style="padding:10px 12px;text-align:center;color:#ffffff;font-size:11px;font-weight:700;letter-spacing:0.5px;">DUE DATE</th>
  </tr></thead>
  <tbody>${tableRows(tasks, pm)}</tbody>
  </table>

  <div style="margin-top:24px;padding-top:20px;border-top:1px solid #f3f4f6;">
    <p style="font-size:13px;color:#374151;margin:0 0 8px;line-height:1.7;">Please review the above and ensure all tasks marked <em>Not Started</em> are actioned immediately. For any clarification, contact the respective project lead.</p>
    <p style="font-size:13px;color:#374151;margin:0;">Thank you for your continued efforts.</p>
    <p style="font-size:13px;color:#1a3a6b;margin:14px 0 0;font-weight:700;">RDS TechServ Team</p>
    <p style="font-size:12px;color:#9ca3af;margin:2px 0 0;">Project Management Portal &mdash; <a href="${PORTAL}" style="color:#1a3a6b;text-decoration:none;font-weight:600;">hub-rdsprojects.com</a></p>
  </div>
</td></tr></table>

<table width="100%" cellpadding="0" cellspacing="0" style="background:#1a3a6b;border-radius:0 0 10px 10px;">
<tr>
  <td style="padding:14px 28px;font-size:11px;color:rgba(255,255,255,0.5);">&copy; ${new Date().getFullYear()} RDS TechServ. Automated email &mdash; do not reply.</td>
  <td style="padding:14px 28px;font-size:11px;text-align:right;"><a href="${PORTAL}" style="color:rgba(255,255,255,0.6);text-decoration:none;">hub-rdsprojects.com</a></td>
</tr>
</table>

</td></tr></table>
</body></html>`;
}

export default async function handler(req, res) {
  try {
    // IST date: UTC+5:30
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(now.getTime() + istOffset);
    const today = istDate.toISOString().slice(0, 10); // YYYY-MM-DD
    const dateLabel = istDate.toLocaleDateString("en-GB", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
      timeZone: "Asia/Kolkata"
    });

    // Check if digest is enabled
    const settingsData = await supaFetch(`/rest/v1/settings?key=in.(daily_digest_enabled,daily_digest_days,last_digest_date)&select=key,value`);
    const settingsMap = {};
    if (Array.isArray(settingsData)) settingsData.forEach(r => { settingsMap[r.key] = r.value; });

    if (settingsMap["daily_digest_enabled"] === "false") {
      console.log("Daily digest is disabled via settings.");
      return res.status(200).json({ message: "Daily digest is disabled." });
    }

    // ── Idempotency guard: refuse to run more than once per IST day ──────────
    if (settingsMap["last_digest_date"] === today) {
      console.log(`Daily digest already ran for ${today} — skipping duplicate.`);
      return res.status(200).json({ message: `Already sent for ${today}. Next run tomorrow at 1 AM IST.` });
    }

    // Check allowed days (0=Sun,1=Mon,...6=Sat). Default: Mon–Sat (1,2,3,4,5,6)
    const allowedDays = (settingsMap["daily_digest_days"] || "1,2,3,4,5,6")
      .split(",").map(Number);
    const todayDow = istDate.getDay(); // 0=Sun
    if (!allowedDays.includes(todayDow)) {
      console.log(`Daily digest skipped — ${["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][todayDow]} not in allowed days [${allowedDays}].`);
      return res.status(200).json({ message: `Skipped: today (${["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][todayDow]}) not in scheduled days.` });
    }

    // ── Stamp last_digest_date (best-effort) ─────────────────────────────────
    // The anon key may lack INSERT permission on the settings table (RLS).
    // A failed stamp is non-fatal: Vercel's scheduler fires at most once/day,
    // so duplicate sends from the auto-cron are not a real risk.
    // The idempotency CHECK above (read) still prevents re-runs on the same day
    // once the row exists and the stamp succeeds at least once.
    try {
      // Try UPDATE first (row may already exist)
      const patchRes = await fetch(`${SUPA_URL}/rest/v1/settings?key=eq.last_digest_date`, {
        method: "PATCH",
        headers: { "apikey": SUPA_KEY, "Authorization": `Bearer ${SUPA_KEY}`, "Content-Type": "application/json", "Prefer": "return=representation" },
        body: JSON.stringify({ value: today })
      });
      let stamped = false;
      if (patchRes.ok) {
        const patched = await patchRes.json();
        if (Array.isArray(patched) && patched.length > 0) stamped = true;
      }

      if (!stamped) {
        // Row doesn't exist — try INSERT (may fail if RLS blocks anon writes)
        const postRes = await fetch(`${SUPA_URL}/rest/v1/settings`, {
          method: "POST",
          headers: { "apikey": SUPA_KEY, "Authorization": `Bearer ${SUPA_KEY}`, "Content-Type": "application/json", "Prefer": "return=minimal" },
          body: JSON.stringify({ key: "last_digest_date", value: today })
        });
        if (postRes.ok) {
          stamped = true;
          console.log(`Stamped last_digest_date = ${today}`);
        } else {
          // RLS likely blocked the INSERT — log a warning and continue anyway.
          // The cron fires at most once/day so the risk of duplicates is minimal.
          const errText = await postRes.text().catch(() => String(postRes.status));
          console.warn(`last_digest_date stamp failed (HTTP ${postRes.status}) — proceeding anyway:`, errText);
        }
      } else {
        console.log(`Stamped last_digest_date = ${today}`);
      }
    } catch (stampErr) {
      console.warn("last_digest_date stamp threw — proceeding anyway:", stampErr.message);
    }

    const [allTasks, projects, users] = await Promise.all([
      supaFetch(`/rest/v1/tasks?or=(client_sub_date.eq.${today},due_date.eq.${today})&select=title,client,status,assignee,due_date,client_sub_date,project_id&order=client.asc,client_sub_date.asc`),
      supaFetch(`/rest/v1/projects?select=id,name,client`),
      supaFetch(`/rest/v1/users?select=name,email,role,client_name`)
    ]);

    if (!Array.isArray(allTasks) || !allTasks.length) {
      console.log(`No submissions for ${today}.`);
      return res.status(200).json({ message: `No submissions for ${today}.` });
    }

    const pm = {};
    for (const p of (projects || [])) pm[p.id] = p;

    const results = [];
    const sent = new Set(); // normalised lowercase email keys — prevents case-dupe sends

    // Admins, Managers, Team Leaders only — full list
    const DIGEST_ROLES = ["Admin", "Manager", "Team Leader"];
    for (const u of (users || []).filter(u => DIGEST_ROLES.includes(u.role) && u.email?.trim())) {
      const emailKey = u.email.trim().toLowerCase();
      if (sent.has(emailKey)) continue;
      sent.add(emailKey);
      const html = buildEmail(u.name, allTasks, pm, dateLabel);
      const status = await postJson(NOTIFY_URL, {
        type: "submission_digest",
        data: {
          taskName: "Daily Submission List",
          projectName: `${allTasks.length} submission(s) planned`,
          completedBy: "RDS TechServ",
          completedAt: dateLabel,
          recipientEmail: u.email.trim(),
          subject: `📬 RDS Daily Submission List — ${dateLabel}`,
          htmlBody: html
        }
      });
      results.push({ email: u.email, name: u.name, role: u.role, tasks: allTasks.length, status });
      await new Promise(r => setTimeout(r, 1200)); // avoid Resend rate limit
    }

    console.log(`Daily digest sent to ${results.length} recipients (Admin/Manager/Team Leader only), ${allTasks.length} tasks.`);
    return res.status(200).json({ sent: results.length, tasks: allTasks.length, results });

  } catch (err) {
    console.error("Daily cron error:", err);
    return res.status(500).json({ error: err.message });
  }
}
