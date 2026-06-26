// /api/cron-weekly.js
// Vercel Cron: runs every Monday at 1:00 AM IST (= 19:30 UTC Sunday)
// Schedule in vercel.json: "30 19 * * 0"
// Shows past week's submissions (Mon–Sun)

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

function statusBadge(s) {
  if (s === "Done")        return `<span style="background:#d1fae5;color:#065f46;font-size:10px;font-weight:700;padding:3px 10px;border-radius:20px;">Done</span>`;
  if (s === "In Progress") return `<span style="background:#fef3c7;color:#92400e;font-size:10px;font-weight:700;padding:3px 10px;border-radius:20px;">In Progress</span>`;
  return `<span style="background:#fee2e2;color:#991b1b;font-size:10px;font-weight:700;padding:3px 10px;border-radius:20px;">Not Started</span>`;
}
function rowBg(s) { return s === "Done" ? "#f0fdf4" : s === "In Progress" ? "#fffbeb" : "#ffffff"; }

function tableRows(tasks, pm) {
  if (!tasks.length) return `<tr><td colspan="7" style="padding:20px;text-align:center;color:#9ca3af;font-style:italic;font-size:13px;">No submissions this week.</td></tr>`;
  return tasks.map(t => {
    const p = pm[t.project_id];
    return `<tr style="background:${rowBg(t.status)}">
      <td style="padding:9px 12px;border-bottom:1px solid #e5e7eb;color:#374151;font-size:12px;">${t.client || (p && p.client) || "—"}</td>
      <td style="padding:9px 12px;border-bottom:1px solid #e5e7eb;color:#374151;font-size:12px;">${p ? p.name : "—"}</td>
      <td style="padding:9px 12px;border-bottom:1px solid #e5e7eb;color:#111827;font-weight:600;font-size:12px;">${t.title}</td>
      <td style="padding:9px 12px;border-bottom:1px solid #e5e7eb;text-align:center;">${statusBadge(t.status)}</td>
      <td style="padding:9px 12px;border-bottom:1px solid #e5e7eb;color:#374151;font-size:12px;">${t.assignee || "—"}</td>
      <td style="padding:9px 12px;border-bottom:1px solid #e5e7eb;text-align:center;color:#374151;font-size:12px;">${t.client_sub_date || "—"}</td>
      <td style="padding:9px 12px;border-bottom:1px solid #e5e7eb;text-align:center;color:#374151;font-size:12px;">${t.due_date || "—"}</td>
    </tr>`;
  }).join("");
}

function clientCards(tasks, pm) {
  const byClient = {};
  for (const t of tasks) {
    const c = t.client || (pm[t.project_id] && pm[t.project_id].client) || "Unknown";
    if (!byClient[c]) byClient[c] = { total: 0, done: 0, ip: 0 };
    byClient[c].total++;
    if (t.status === "Done") byClient[c].done++;
    else if (t.status === "In Progress") byClient[c].ip++;
  }
  return Object.entries(byClient).map(([name, s]) => `
    <td style="padding:10px 14px;background:#f0fdf4;border-radius:8px;border-left:3px solid #064e3b;min-width:120px;">
      <div style="font-size:11px;font-weight:700;color:#064e3b;margin-bottom:4px;">${name}</div>
      <div style="font-size:10px;color:#374151;">${s.total} total &bull; ${s.done} done &bull; ${s.ip} in progress</div>
    </td>`).join(`<td style="width:10px;"></td>`);
}

function buildEmail(name, tasks, pm, weekLabel, monLabel, sunLabel) {
  const total = tasks.length;
  const done  = tasks.filter(t => t.status === "Done").length;
  const ip    = tasks.filter(t => t.status === "In Progress").length;
  const ns    = total - done - ip;

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:20px 0;background:#f4f6f9;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:700px;margin:0 auto;"><tr><td>

<table width="100%" cellpadding="0" cellspacing="0" style="background:#0f2d5e;border-radius:10px 10px 0 0;">
<tr><td style="padding:22px 28px;">
  <table cellpadding="0" cellspacing="0" width="100%"><tr>
    <td style="width:1px;white-space:nowrap;">
      <table cellpadding="0" cellspacing="0"><tr><td style="background:#ffffff;border-radius:8px;padding:7px 14px;">
        <table cellpadding="0" cellspacing="0"><tr>
          <td style="width:30px;height:30px;background:#0f2d5e;border-radius:6px;text-align:center;vertical-align:middle;font-weight:800;font-size:11px;color:#ffffff;letter-spacing:1px;">RDS</td>
          <td style="padding-left:8px;font-size:12px;font-weight:800;color:#0f2d5e;letter-spacing:1px;white-space:nowrap;">TECHSERV</td>
        </tr></table>
      </td></tr></table>
    </td>
    <td style="width:1px;padding:0 16px;"><div style="width:1px;height:36px;background:rgba(255,255,255,0.2);"></div></td>
    <td>
      <div style="font-size:18px;font-weight:700;color:#ffffff;">Weekly Submission Report</div>
      <div style="font-size:12px;color:rgba(255,255,255,0.75);margin-top:3px;">${weekLabel}</div>
    </td>
    <td align="right" style="white-space:nowrap;padding-left:12px;">
      <span style="background:rgba(255,255,255,0.15);border-radius:20px;padding:5px 14px;font-size:12px;color:#ffffff;border:1px solid rgba(255,255,255,0.3);">&#128197; Weekly Report</span>
    </td>
  </tr></table>
</td></tr>
<tr><td style="background:#0a2347;padding:9px 28px;">
  <table cellpadding="0" cellspacing="0"><tr>
    <td style="width:7px;height:7px;background:#60a5fa;border-radius:50%;"></td>
    <td style="padding-left:8px;font-size:11px;color:rgba(255,255,255,0.75);">Automated weekly digest &mdash; sent every Monday at 1:00 AM IST &bull; Period: ${monLabel} &ndash; ${sunLabel}</td>
  </tr></table>
</td></tr>
</table>

<table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border-left:1px solid #dde3ef;border-right:1px solid #dde3ef;">
<tr><td style="padding:26px 28px;">
  <p style="font-size:14px;color:#374151;margin:0 0 6px;">Dear ${name},</p>
  <p style="font-size:14px;color:#374151;margin:0 0 22px;line-height:1.7;">Here is the weekly summary of <strong style="color:#0f2d5e;">${total} submission(s)</strong> for the period <strong>${monLabel} &ndash; ${sunLabel}</strong>. Please review the status of all deliverables.</p>

  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:8px;margin-bottom:22px;border-left:4px solid #0f2d5e;"><tr>
    <td width="25%" style="padding:14px 0;text-align:center;border-right:1px solid #e5e7eb;"><div style="font-size:22px;font-weight:700;color:#0f2d5e;">${total}</div><div style="font-size:11px;color:#6b7280;margin-top:2px;text-transform:uppercase;letter-spacing:0.5px;">Total</div></td>
    <td width="25%" style="padding:14px 0;text-align:center;border-right:1px solid #e5e7eb;"><div style="font-size:22px;font-weight:700;color:#059669;">${done}</div><div style="font-size:11px;color:#6b7280;margin-top:2px;text-transform:uppercase;letter-spacing:0.5px;">Done</div></td>
    <td width="25%" style="padding:14px 0;text-align:center;border-right:1px solid #e5e7eb;"><div style="font-size:22px;font-weight:700;color:#d97706;">${ip}</div><div style="font-size:11px;color:#6b7280;margin-top:2px;text-transform:uppercase;letter-spacing:0.5px;">In Progress</div></td>
    <td width="25%" style="padding:14px 0;text-align:center;"><div style="font-size:22px;font-weight:700;color:#ef4444;">${ns}</div><div style="font-size:11px;color:#6b7280;margin-top:2px;text-transform:uppercase;letter-spacing:0.5px;">Not Started</div></td>
  </tr></table>

  ${Object.keys((() => { const b = {}; for (const t of tasks) { const c = t.client || (pm[t.project_id] && pm[t.project_id].client) || "Unknown"; b[c] = true; } return b; })()).length > 1 ? `
  <div style="margin-bottom:20px;">
    <div style="font-size:12px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px;">By Client</div>
    <table cellpadding="0" cellspacing="0"><tr>${clientCards(tasks, pm)}</tr></table>
  </div>` : ""}

  <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
  <thead><tr style="background:#0f2d5e;">
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
    <p style="font-size:13px;color:#374151;margin:0 0 8px;line-height:1.7;">This report covers all tasks with Client Submission Date or Due Date within the past week. For queries, contact the respective project lead.</p>
    <p style="font-size:13px;color:#374151;margin:0;">Thank you for your continued efforts.</p>
    <p style="font-size:13px;color:#0f2d5e;margin:14px 0 0;font-weight:700;">RDS TechServ Team</p>
    <p style="font-size:12px;color:#9ca3af;margin:2px 0 0;">Project Management Portal &mdash; hub-rdsprojects.com</p>
  </div>
</td></tr></table>

<table width="100%" cellpadding="0" cellspacing="0" style="background:#0f2d5e;border-radius:0 0 10px 10px;">
<tr>
  <td style="padding:14px 28px;font-size:11px;color:rgba(255,255,255,0.5);">&copy; ${new Date().getFullYear()} RDS TechServ. Automated email &mdash; do not reply.</td>
  <td style="padding:14px 28px;font-size:11px;color:rgba(255,255,255,0.4);text-align:right;">hub-rdsprojects.com</td>
</tr>
</table>

</td></tr></table>
</body></html>`;
}

export default async function handler(req, res) {
  try {
    // Compute IST "today" (the Monday this runs)
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istNow = new Date(now.getTime() + istOffset);

    // Past week: last Mon (7 days ago) → last Sun (1 day ago)
    const lastSun = new Date(istNow); lastSun.setDate(istNow.getDate() - 1);
    const lastMon = new Date(istNow); lastMon.setDate(istNow.getDate() - 7);

    const fmt = d => d.toISOString().slice(0, 10);
    const monStr = fmt(lastMon);
    const sunStr = fmt(lastSun);

    const monLabel = lastMon.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
    const sunLabel = lastSun.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
    const weekLabel = `Week of ${monLabel} – ${sunLabel}`;

    const [allTasks, projects, users] = await Promise.all([
      supaFetch(`/rest/v1/tasks?or=(and(client_sub_date.gte.${monStr},client_sub_date.lte.${sunStr}),and(due_date.gte.${monStr},due_date.lte.${sunStr}))&select=title,client,status,assignee,due_date,client_sub_date,project_id&order=client.asc,client_sub_date.asc`),
      supaFetch(`/rest/v1/projects?select=id,name,client`),
      supaFetch(`/rest/v1/users?select=name,email,role,client_name&not.email.is.null`)
    ]);

    const pm = {};
    for (const p of (projects || [])) pm[p.id] = p;

    const tasks = Array.isArray(allTasks) ? allTasks : [];
    const results = [];
    const sent = new Set();

    // Admins, Managers, Team Leaders — full list
    for (const u of (users || []).filter(u => ["Admin", "Manager", "Team Leader"].includes(u.role) && u.email?.trim())) {
      if (sent.has(u.email)) continue;
      sent.add(u.email);
      const html = buildEmail(u.name, tasks, pm, weekLabel, monLabel, sunLabel);
      const status = await postJson(NOTIFY_URL, {
        type: "submission_digest",
        data: {
          taskName: "Weekly Submission Report",
          projectName: `${tasks.length} submission(s) this week`,
          completedBy: "RDS TechServ",
          completedAt: weekLabel,
          recipientEmail: u.email,
          subject: `📊 RDS Weekly Submission Report — ${weekLabel}`,
          htmlBody: html
        }
      });
      results.push({ email: u.email, name: u.name, tasks: tasks.length, status });
    }

    // Clients — filtered to their own tasks
    for (const u of (users || []).filter(u => u.role === "Client" && u.email?.trim() && u.client_name)) {
      const cn = (u.client_name || "").toLowerCase();
      const ct = tasks.filter(t =>
        (t.client || "").toLowerCase() === cn ||
        (pm[t.project_id]?.client || "").toLowerCase() === cn
      );
      if (!ct.length) continue;
      const html = buildEmail(u.name, ct, pm, weekLabel, monLabel, sunLabel);
      const status = await postJson(NOTIFY_URL, {
        type: "submission_digest",
        data: {
          taskName: "Weekly Submission Report",
          projectName: `${ct.length} submission(s) this week`,
          completedBy: "RDS TechServ",
          completedAt: weekLabel,
          recipientEmail: u.email,
          subject: `📊 RDS Weekly Submission Report — ${weekLabel}`,
          htmlBody: html
        }
      });
      results.push({ email: u.email, name: u.name, tasks: ct.length, status });
    }

    console.log(`Weekly digest sent: ${results.length} recipients, ${tasks.length} tasks.`);
    return res.status(200).json({ sent: results.length, tasks: tasks.length, period: `${monStr} to ${sunStr}`, results });

  } catch (err) {
    console.error("Weekly cron error:", err);
    return res.status(500).json({ error: err.message });
  }
}
