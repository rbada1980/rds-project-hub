// /api/cron-escalate.js
// Vercel Cron: runs every 6 hours
// Schedule in vercel.json: "0 */6 * * *"
//
// Finds tasks that are:
//   • Overdue by 72+ hours (due_date <= 3 days ago)
//   • Status is NOT Done / Completed / Submitted
//   • Not updated in the last 72 hours
//
// Sends ONE summary email to all Admins and Managers.
// Tracks a 24-hour per-task cooldown in settings table (key: escalation_log).

const SUPA_URL  = "https://xypcbioltukahipkqqzc.supabase.co";
const SUPA_KEY  = process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGNiaW9sdHVrYWhpcGtxcXpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0MzEzNjUsImV4cCI6MjA5NTAwNzM2NX0.DG5sv2bpx8j3Mmz0mqIsoDVaCMP2TmWqh-OQUfSZFRw";
const SUPA_WRITE_KEY = process.env.SUPABASE_SERVICE_KEY || SUPA_KEY;
const NOTIFY_URL = `${SUPA_URL}/functions/v1/notify`;

const PORTAL = "https://hub-rdsprojects.com";

// Statuses considered "done" — tasks with these are ignored
const DONE_STATUSES = new Set(["done", "completed", "submitted"]);

// ── Helpers ───────────────────────────────────────────────────────────────────
async function supaFetch(path) {
  const res = await fetch(SUPA_URL + path, {
    headers: {
      "apikey": SUPA_KEY,
      "Authorization": `Bearer ${SUPA_KEY}`,
      "Content-Type": "application/json",
    },
  });
  return res.json();
}

async function supaWrite(method, path, body) {
  const res = await fetch(SUPA_URL + path, {
    method,
    headers: {
      "apikey": SUPA_WRITE_KEY,
      "Authorization": `Bearer ${SUPA_WRITE_KEY}`,
      "Content-Type": "application/json",
      "Prefer": "return=representation",
    },
    body: JSON.stringify(body),
  });
  return { ok: res.ok, status: res.status, data: await res.json().catch(() => null) };
}

async function postJson(url, payload) {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "apikey": SUPA_KEY,
      "Authorization": `Bearer ${SUPA_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  return res.status;
}

// ── Email builder ─────────────────────────────────────────────────────────────
function urgencyBadge(days) {
  if (days >= 7)  return `<span style="background:#fce7f3;color:#9d174d;font-size:10px;font-weight:700;padding:3px 10px;border-radius:20px;">${days}d overdue</span>`;
  if (days >= 3)  return `<span style="background:#fee2e2;color:#991b1b;font-size:10px;font-weight:700;padding:3px 10px;border-radius:20px;">${days}d overdue</span>`;
  return `<span style="background:#fef3c7;color:#92400e;font-size:10px;font-weight:700;padding:3px 10px;border-radius:20px;">${days}d overdue</span>`;
}

function taskRows(tasks, pm) {
  if (!tasks.length) return `<tr><td colspan="6" style="padding:20px;text-align:center;color:#9ca3af;font-style:italic;font-size:13px;">No escalated tasks.</td></tr>`;
  return tasks.map(t => {
    const p = pm[t.project_id];
    const client  = t.client || (p && p.client) || "—";
    const project = p ? p.name : "—";
    return `<tr>
      <td style="padding:9px 12px;border-bottom:1px solid #e5e7eb;color:#374151;font-size:12px;">${client}</td>
      <td style="padding:9px 12px;border-bottom:1px solid #e5e7eb;color:#374151;font-size:12px;">${project}</td>
      <td style="padding:9px 12px;border-bottom:1px solid #e5e7eb;color:#111827;font-weight:600;font-size:12px;">${t.title}</td>
      <td style="padding:9px 12px;border-bottom:1px solid #e5e7eb;text-align:center;">${urgencyBadge(t._daysOverdue)}</td>
      <td style="padding:9px 12px;border-bottom:1px solid #e5e7eb;color:#374151;font-size:12px;">${t.assignee || "—"}</td>
      <td style="padding:9px 12px;border-bottom:1px solid #e5e7eb;color:#374151;font-size:12px;text-align:center;">${t.due_date || "—"}</td>
    </tr>`;
  }).join("");
}

function buildEscalationEmail(recipientName, tasks, pm, dateLabel) {
  const count = tasks.length;
  const worstDays = Math.max(...tasks.map(t => t._daysOverdue));

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:20px 0;background:#f4f6f9;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:680px;margin:0 auto;"><tr><td>

<table width="100%" cellpadding="0" cellspacing="0" style="background:#7f1d1d;border-radius:10px 10px 0 0;">
<tr><td style="padding:20px 28px;">
  <table cellpadding="0" cellspacing="0" width="100%"><tr>
    <td style="width:1px;white-space:nowrap;">
      <table cellpadding="0" cellspacing="0"><tr><td style="background:#ffffff;border-radius:8px;padding:6px 12px;">
        <span style="font-size:14px;font-weight:700;color:#7f1d1d;letter-spacing:1px;">RDS</span>
      </td></tr></table>
    </td>
    <td style="width:1px;padding:0 16px;"><div style="width:1px;height:36px;background:rgba(255,255,255,0.2);"></div></td>
    <td>
      <div style="font-size:18px;font-weight:700;color:#ffffff;">🚨 Task Escalation Alert</div>
      <div style="font-size:12px;color:rgba(255,255,255,0.75);margin-top:3px;">${dateLabel}</div>
    </td>
    <td align="right" style="white-space:nowrap;padding-left:12px;">
      <a href="${PORTAL}" style="text-decoration:none;background:rgba(255,255,255,0.15);border-radius:20px;padding:5px 14px;font-size:12px;color:#ffffff;border:1px solid rgba(255,255,255,0.3);">&#128196; View Portal</a>
    </td>
  </tr></table>
</td></tr>
<tr><td style="background:#6b1717;padding:9px 28px;">
  <table cellpadding="0" cellspacing="0"><tr>
    <td style="width:7px;height:7px;background:#fca5a5;border-radius:50%;"></td>
    <td style="padding-left:8px;font-size:11px;color:rgba(255,255,255,0.75);">Automated escalation — tasks overdue by 72+ hours with no recent update</td>
  </tr></table>
</td></tr>
</table>

<table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border-left:1px solid #dde3ef;border-right:1px solid #dde3ef;">
<tr><td style="padding:26px 28px;">
  <p style="font-size:14px;color:#374151;margin:0 0 6px;">Dear ${recipientName},</p>
  <p style="font-size:14px;color:#374151;margin:0 0 22px;line-height:1.7;">The following <strong style="color:#991b1b;">${count} task(s)</strong> have been overdue for <strong>72+ hours</strong> with no status update. The most overdue task is <strong>${worstDays} day(s)</strong> past its deadline. Immediate attention is required.</p>

  <table width="100%" cellpadding="0" cellspacing="0" style="background:#fef2f2;border-radius:8px;margin-bottom:22px;border-left:4px solid #991b1b;"><tr>
    <td width="50%" style="padding:0;text-align:center;border-right:1px solid #fecaca;"><div style="padding:14px 0;"><div style="font-size:22px;font-weight:700;color:#991b1b;">${count}</div><div style="font-size:11px;color:#6b7280;margin-top:2px;text-transform:uppercase;letter-spacing:0.5px;">Tasks Escalated</div></div></td>
    <td width="50%" style="padding:0;text-align:center;"><div style="padding:14px 0;"><div style="font-size:22px;font-weight:700;color:#9d174d;">${worstDays}d</div><div style="font-size:11px;color:#6b7280;margin-top:2px;text-transform:uppercase;letter-spacing:0.5px;">Most Overdue</div></div></td>
  </tr></table>

  <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
  <thead><tr style="background:#7f1d1d;">
    <th style="padding:10px 12px;text-align:left;color:#ffffff;font-size:11px;font-weight:700;letter-spacing:0.5px;border-right:1px solid rgba(255,255,255,0.1);">CLIENT</th>
    <th style="padding:10px 12px;text-align:left;color:#ffffff;font-size:11px;font-weight:700;letter-spacing:0.5px;border-right:1px solid rgba(255,255,255,0.1);">PROJECT</th>
    <th style="padding:10px 12px;text-align:left;color:#ffffff;font-size:11px;font-weight:700;letter-spacing:0.5px;border-right:1px solid rgba(255,255,255,0.1);">TASK</th>
    <th style="padding:10px 12px;text-align:center;color:#ffffff;font-size:11px;font-weight:700;letter-spacing:0.5px;border-right:1px solid rgba(255,255,255,0.1);">OVERDUE</th>
    <th style="padding:10px 12px;text-align:left;color:#ffffff;font-size:11px;font-weight:700;letter-spacing:0.5px;border-right:1px solid rgba(255,255,255,0.1);">ASSIGNEE</th>
    <th style="padding:10px 12px;text-align:center;color:#ffffff;font-size:11px;font-weight:700;letter-spacing:0.5px;">DUE DATE</th>
  </tr></thead>
  <tbody>${taskRows(tasks, pm)}</tbody>
  </table>

  <div style="margin-top:24px;padding-top:20px;border-top:1px solid #f3f4f6;">
    <p style="font-size:13px;color:#374151;margin:0 0 8px;line-height:1.7;">Please follow up with the assigned team members immediately and update the task status in the portal.</p>
    <p style="font-size:13px;color:#374151;margin:0;">Thank you.</p>
    <p style="font-size:13px;color:#1a3a6b;margin:14px 0 0;font-weight:700;">RDS TechServ Team</p>
    <p style="font-size:12px;color:#9ca3af;margin:2px 0 0;">Project Management Portal &mdash; <a href="${PORTAL}" style="color:#1a3a6b;text-decoration:none;font-weight:600;">hub-rdsprojects.com</a></p>
  </div>
</td></tr></table>

<table width="100%" cellpadding="0" cellspacing="0" style="background:#7f1d1d;border-radius:0 0 10px 10px;">
<tr>
  <td style="padding:14px 28px;font-size:11px;color:rgba(255,255,255,0.5);">&copy; ${new Date().getFullYear()} RDS TechServ. Automated escalation &mdash; do not reply.</td>
  <td style="padding:14px 28px;font-size:11px;text-align:right;"><a href="${PORTAL}" style="color:rgba(255,255,255,0.6);text-decoration:none;">hub-rdsprojects.com</a></td>
</tr>
</table>

</td></tr></table>
</body></html>`;
}

// ── Main handler ──────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  try {
    const now       = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istNow    = new Date(now.getTime() + istOffset);
    const dateLabel = istNow.toLocaleDateString("en-GB", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
      timeZone: "Asia/Kolkata",
    });

    // Cutoff dates (in IST date string YYYY-MM-DD)
    // 72h overdue = due_date <= today - 3 days
    const threeDaysAgo = new Date(istNow);
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const dueDateCutoff = threeDaysAgo.toISOString().slice(0, 10); // YYYY-MM-DD

    // No update in 72h = updated_at <= now - 72h (UTC)
    const updatedCutoff = new Date(now.getTime() - 72 * 60 * 60 * 1000).toISOString();

    // ── 1. Fetch overdue tasks ──────────────────────────────────────────────
    const [rawTasks, projects, users, settingsRows] = await Promise.all([
      supaFetch(
        `/rest/v1/tasks?select=id,title,client,status,assignee,due_date,updated_at,project_id` +
        `&due_date=lte.${dueDateCutoff}` +
        `&updated_at=lte.${updatedCutoff}` +
        `&order=due_date.asc&limit=500`
      ),
      supaFetch(`/rest/v1/projects?select=id,name,client`),
      supaFetch(`/rest/v1/users?select=name,email,role`),
      supaFetch(`/rest/v1/settings?key=eq.escalation_log&select=value`),
    ]);

    // ── 2. Filter out done/completed tasks ─────────────────────────────────
    const today = istNow.toISOString().slice(0, 10);

    const allOverdue = (Array.isArray(rawTasks) ? rawTasks : []).filter(t => {
      const s = (t.status || "").toLowerCase().trim();
      return !DONE_STATUSES.has(s) && t.due_date;
    });

    if (!allOverdue.length) {
      console.log("Escalation cron: no overdue tasks found.");
      return res.status(200).json({ message: "No overdue tasks." });
    }

    // ── 3. Load escalation log (24-hour cooldown per task) ─────────────────
    let escalationLog = {}; // { taskId: ISO_timestamp_of_last_escalation }
    try {
      const raw = Array.isArray(settingsRows) && settingsRows[0]?.value;
      if (raw) escalationLog = typeof raw === "string" ? JSON.parse(raw) : raw;
    } catch { escalationLog = {}; }

    const cooldown24h = 24 * 60 * 60 * 1000;
    const newlyEscalated = allOverdue.filter(t => {
      const lastSent = escalationLog[t.id];
      if (!lastSent) return true; // never escalated
      return now.getTime() - new Date(lastSent).getTime() > cooldown24h;
    });

    if (!newlyEscalated.length) {
      console.log(`Escalation cron: ${allOverdue.length} overdue task(s) all within cooldown window.`);
      return res.status(200).json({ message: "All overdue tasks within 24h cooldown.", overdue: allOverdue.length });
    }

    // Compute days overdue and attach to each task
    const todayMs = new Date(today + "T00:00:00+05:30").getTime();
    newlyEscalated.forEach(t => {
      const dueMs = new Date(t.due_date + "T00:00:00+05:30").getTime();
      t._daysOverdue = Math.floor((todayMs - dueMs) / (24 * 60 * 60 * 1000));
    });

    // Sort worst overdue first
    newlyEscalated.sort((a, b) => b._daysOverdue - a._daysOverdue);

    // ── 4. Build project map ────────────────────────────────────────────────
    const pm = {};
    for (const p of (Array.isArray(projects) ? projects : [])) pm[p.id] = p;

    // ── 5. Send email to all Admins and Managers ───────────────────────────
    const ESCALATION_ROLES = ["Admin", "Manager"];
    const recipients = (Array.isArray(users) ? users : [])
      .filter(u => ESCALATION_ROLES.includes(u.role) && u.email?.trim());

    if (!recipients.length) {
      console.log("Escalation cron: no Admin/Manager recipients found.");
      return res.status(200).json({ message: "No recipients.", tasks: newlyEscalated.length });
    }

    const sent = new Set();
    const results = [];

    for (const u of recipients) {
      const emailKey = u.email.trim().toLowerCase();
      if (sent.has(emailKey)) continue;
      sent.add(emailKey);

      const html   = buildEscalationEmail(u.name, newlyEscalated, pm, dateLabel);
      const status = await postJson(NOTIFY_URL, {
        type: "escalation_alert",
        data: {
          taskName:       `${newlyEscalated.length} overdue task(s) need attention`,
          projectName:    `${newlyEscalated.length} tasks overdue 72+ hours`,
          completedBy:    "RDS TechServ",
          completedAt:    dateLabel,
          recipientEmail: u.email.trim(),
          subject:        `🚨 RDS Escalation Alert — ${newlyEscalated.length} overdue task(s) — ${dateLabel}`,
          htmlBody:       html,
        },
      });

      results.push({ email: u.email, name: u.name, status });
      await new Promise(r => setTimeout(r, 1200)); // avoid rate limit
    }

    // ── 6. Update escalation log ───────────────────────────────────────────
    const nowISO = now.toISOString();
    newlyEscalated.forEach(t => { escalationLog[t.id] = nowISO; });

    // Prune log entries older than 7 days to keep it small
    const pruneMs = 7 * 24 * 60 * 60 * 1000;
    for (const [taskId, ts] of Object.entries(escalationLog)) {
      if (now.getTime() - new Date(ts).getTime() > pruneMs) delete escalationLog[taskId];
    }

    const logJson = JSON.stringify(escalationLog);

    // Try PATCH first (row exists), then INSERT (row doesn't exist)
    const patchRes = await supaWrite(
      "PATCH",
      `/rest/v1/settings?key=eq.escalation_log`,
      { value: logJson }
    );
    if (!patchRes.ok || !Array.isArray(patchRes.data) || !patchRes.data.length) {
      await supaWrite("POST", `/rest/v1/settings`, {
        key: "escalation_log",
        value: logJson,
      });
    }

    console.log(`Escalation cron: ${newlyEscalated.length} task(s) escalated to ${results.length} recipient(s).`);
    return res.status(200).json({
      escalated: newlyEscalated.length,
      recipients: results.length,
      results,
      tasks: newlyEscalated.map(t => ({ id: t.id, title: t.title, daysOverdue: t._daysOverdue })),
    });

  } catch (err) {
    console.error("Escalation cron error:", err);
    return res.status(500).json({ error: err.message });
  }
}
