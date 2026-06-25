// send_test_mail.cjs — sends today's submission list to chandra@rdstechserv.com
// Run: node send_test_mail.cjs
const https = require("https");

const SUPA_URL  = "https://xypcbioltukahipkqqzc.supabase.co";
const SUPA_KEY  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGNiaW9sdHVrYWhpcGtxcXpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0MzEzNjUsImV4cCI6MjA5NTAwNzM2NX0.DG5sv2bpx8j3Mmz0mqIsoDVaCMP2TmWqh-OQUfSZFRw";
const NOTIFY_URL = `${SUPA_URL}/functions/v1/notify`;

const TEST_EMAIL = "chandra@rdstechserv.com";
const TEST_NAME  = "Chandra Mouli";

function supaFetch(path) {
  return new Promise((resolve, reject) => {
    const url  = new URL(SUPA_URL + path);
    const opts = { hostname: url.hostname, path: url.pathname + url.search, method: "GET",
      headers: { "apikey": SUPA_KEY, "Authorization": `Bearer ${SUPA_KEY}`, "Content-Type": "application/json" } };
    let body = "";
    const req = https.request(opts, res => { res.on("data", d => body += d); res.on("end", () => { try { resolve(JSON.parse(body)); } catch(e) { resolve([]); } }); });
    req.on("error", reject);
    req.end();
  });
}

function postJson(urlStr, payload) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const url  = new URL(urlStr);
    const opts = { hostname: url.hostname, path: url.pathname, method: "POST",
      headers: { "apikey": SUPA_KEY, "Authorization": `Bearer ${SUPA_KEY}`, "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) } };
    let body = "";
    const req = https.request(opts, res => { res.on("data", d => body += d); res.on("end", () => resolve(body)); });
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

function statusBadge(status) {
  if (status === "Done")        return `<span style="background:#d1fae5;color:#065f46;font-size:10px;font-weight:700;padding:3px 10px;border-radius:20px;letter-spacing:0.3px;">Done</span>`;
  if (status === "In Progress") return `<span style="background:#fef3c7;color:#92400e;font-size:10px;font-weight:700;padding:3px 10px;border-radius:20px;letter-spacing:0.3px;">In Progress</span>`;
  return `<span style="background:#fee2e2;color:#991b1b;font-size:10px;font-weight:700;padding:3px 10px;border-radius:20px;letter-spacing:0.3px;">Not Started</span>`;
}

function rowBg(status) {
  if (status === "Done")        return "#f0fdf4";
  if (status === "In Progress") return "#fffbeb";
  return "#ffffff";
}

function buildTableRows(tasks, projMap) {
  if (!tasks.length) return `<tr><td colspan="7" style="padding:20px;text-align:center;color:#9ca3af;font-style:italic;font-size:13px;">No submissions planned for today.</td></tr>`;
  return tasks.map(t => {
    const proj = projMap[t.project_id];
    return `<tr style="background:${rowBg(t.status)}">
      <td style="padding:9px 12px;border-bottom:1px solid #e5e7eb;color:#111827;font-weight:500;font-size:12px;">${t.title}</td>
      <td style="padding:9px 12px;border-bottom:1px solid #e5e7eb;color:#374151;font-size:12px;">${proj ? proj.name : "—"}</td>
      <td style="padding:9px 12px;border-bottom:1px solid #e5e7eb;color:#374151;font-size:12px;">${t.client || (proj && proj.client) || "—"}</td>
      <td style="padding:9px 12px;border-bottom:1px solid #e5e7eb;text-align:center;">${statusBadge(t.status)}</td>
      <td style="padding:9px 12px;border-bottom:1px solid #e5e7eb;color:#374151;font-size:12px;">${t.assignee || "—"}</td>
      <td style="padding:9px 12px;border-bottom:1px solid #e5e7eb;text-align:center;color:#374151;font-size:12px;">${t.client_sub_date || "—"}</td>
      <td style="padding:9px 12px;border-bottom:1px solid #e5e7eb;text-align:center;color:#374151;font-size:12px;">${t.due_date || "—"}</td>
    </tr>`;
  }).join("");
}

function buildEmail(recipientName, tasks, projMap, today, dateLabel) {
  const total      = tasks.length;
  const done       = tasks.filter(t => t.status === "Done").length;
  const inProgress = tasks.filter(t => t.status === "In Progress").length;
  const notStarted = total - done - inProgress;

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:20px 0;background:#f4f6f9;font-family:Arial,Helvetica,sans-serif;">
<div style="max-width:680px;margin:0 auto;">

  <!-- HEADER -->
  <div style="background:#1a3a6b;border-radius:10px 10px 0 0;overflow:hidden;">
    <div style="padding:22px 28px;display:flex;align-items:center;gap:16px;">
      <div style="background:#ffffff;border-radius:8px;padding:7px 14px;display:inline-flex;align-items:center;gap:8px;flex-shrink:0;">
        <div style="width:30px;height:30px;background:#1a3a6b;border-radius:6px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:11px;color:#ffffff;letter-spacing:1px;">RDS</div>
        <div style="font-size:12px;font-weight:800;color:#1a3a6b;letter-spacing:1px;">TECHSERV</div>
      </div>
      <div style="width:1px;height:36px;background:rgba(255,255,255,0.2);flex-shrink:0;"></div>
      <div style="flex:1;">
        <div style="font-size:18px;font-weight:700;color:#ffffff;letter-spacing:0.3px;">Daily Submission List</div>
        <div style="font-size:12px;color:rgba(255,255,255,0.75);margin-top:3px;">${dateLabel}</div>
      </div>
      <div style="background:rgba(255,255,255,0.15);border-radius:20px;padding:5px 14px;font-size:12px;color:#ffffff;border:1px solid rgba(255,255,255,0.3);flex-shrink:0;">&#128236; Test Mail</div>
    </div>
    <div style="background:#163060;padding:9px 28px;display:flex;align-items:center;gap:8px;">
      <div style="width:7px;height:7px;border-radius:50%;background:#facc15;flex-shrink:0;"></div>
      <span style="font-size:11px;color:rgba(255,255,255,0.75);">TEST EMAIL &mdash; RDS TechServ Daily Submission Digest</span>
    </div>
  </div>

  <!-- BODY -->
  <div style="background:#ffffff;border-left:1px solid #dde3ef;border-right:1px solid #dde3ef;padding:26px 28px;">
    <p style="font-size:14px;color:#374151;margin:0 0 6px;">Dear ${recipientName},</p>
    <p style="font-size:14px;color:#374151;margin:0 0 22px;line-height:1.7;">Please find below the list of <strong style="color:#1a3a6b;">${total} submission(s)</strong> planned for today based on <em>Client Submission Date</em> and <em>Due Date</em>. Kindly ensure all deliverables are on track.</p>

    <!-- STAT STRIP -->
    <table width="100%" style="background:#f8fafc;border-radius:8px;margin-bottom:22px;border-left:4px solid #1a3a6b;border-collapse:collapse;">
      <tr>
        <td width="25%" style="padding:14px 0;text-align:center;border-right:1px solid #e5e7eb;">
          <div style="font-size:22px;font-weight:700;color:#1a3a6b;">${total}</div>
          <div style="font-size:11px;color:#6b7280;margin-top:2px;text-transform:uppercase;letter-spacing:0.5px;">Total</div>
        </td>
        <td width="25%" style="padding:14px 0;text-align:center;border-right:1px solid #e5e7eb;">
          <div style="font-size:22px;font-weight:700;color:#059669;">${done}</div>
          <div style="font-size:11px;color:#6b7280;margin-top:2px;text-transform:uppercase;letter-spacing:0.5px;">Done</div>
        </td>
        <td width="25%" style="padding:14px 0;text-align:center;border-right:1px solid #e5e7eb;">
          <div style="font-size:22px;font-weight:700;color:#d97706;">${inProgress}</div>
          <div style="font-size:11px;color:#6b7280;margin-top:2px;text-transform:uppercase;letter-spacing:0.5px;">In Progress</div>
        </td>
        <td width="25%" style="padding:14px 0;text-align:center;">
          <div style="font-size:22px;font-weight:700;color:#ef4444;">${notStarted}</div>
          <div style="font-size:11px;color:#6b7280;margin-top:2px;text-transform:uppercase;letter-spacing:0.5px;">Not Started</div>
        </td>
      </tr>
    </table>

    <!-- SUBMISSION TABLE -->
    <table width="100%" style="border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
      <thead>
        <tr style="background:#1a3a6b;">
          <th style="padding:10px 12px;text-align:left;color:#ffffff;font-size:11px;font-weight:700;letter-spacing:0.5px;border-right:1px solid rgba(255,255,255,0.1);">TASK</th>
          <th style="padding:10px 12px;text-align:left;color:#ffffff;font-size:11px;font-weight:700;letter-spacing:0.5px;border-right:1px solid rgba(255,255,255,0.1);">PROJECT</th>
          <th style="padding:10px 12px;text-align:left;color:#ffffff;font-size:11px;font-weight:700;letter-spacing:0.5px;border-right:1px solid rgba(255,255,255,0.1);">CLIENT</th>
          <th style="padding:10px 12px;text-align:center;color:#ffffff;font-size:11px;font-weight:700;letter-spacing:0.5px;border-right:1px solid rgba(255,255,255,0.1);">STATUS</th>
          <th style="padding:10px 12px;text-align:left;color:#ffffff;font-size:11px;font-weight:700;letter-spacing:0.5px;border-right:1px solid rgba(255,255,255,0.1);">ASSIGNEE</th>
          <th style="padding:10px 12px;text-align:center;color:#ffffff;font-size:11px;font-weight:700;letter-spacing:0.5px;border-right:1px solid rgba(255,255,255,0.1);">SUB DATE</th>
          <th style="padding:10px 12px;text-align:center;color:#ffffff;font-size:11px;font-weight:700;letter-spacing:0.5px;">DUE DATE</th>
        </tr>
      </thead>
      <tbody>${buildTableRows(tasks, projMap)}</tbody>
    </table>

    <!-- SIGN-OFF -->
    <div style="margin-top:24px;padding-top:20px;border-top:1px solid #f3f4f6;">
      <p style="font-size:13px;color:#374151;margin:0 0 8px;line-height:1.7;">Please review the above and ensure all tasks marked <em>Not Started</em> are actioned immediately. For any clarification, contact the respective project lead.</p>
      <p style="font-size:13px;color:#374151;margin:0;">Thank you for your continued efforts.</p>
      <p style="font-size:13px;color:#1a3a6b;margin:14px 0 0;font-weight:700;">RDS TechServ Team</p>
      <p style="font-size:12px;color:#9ca3af;margin:2px 0 0;">Project Management Portal &mdash; hub-rdsprojects.com</p>
    </div>
  </div>

  <!-- FOOTER -->
  <div style="background:#1a3a6b;border-radius:0 0 10px 10px;padding:14px 28px;">
    <table width="100%" style="border-collapse:collapse;">
      <tr>
        <td style="font-size:11px;color:rgba(255,255,255,0.5);">&copy; ${new Date().getFullYear()} RDS TechServ. This is an automated email &mdash; please do not reply.</td>
        <td style="font-size:11px;color:rgba(255,255,255,0.4);text-align:right;">hub-rdsprojects.com</td>
      </tr>
    </table>
  </div>

</div>
</body></html>`;
}

async function main() {
  const today     = new Date().toLocaleDateString("en-CA");
  const dateLabel = new Date().toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  console.log(`\n=== RDS Test Mail → ${TEST_EMAIL} ===`);
  console.log(`Date: ${today}\n`);

  const allTasks = await supaFetch(
    `/rest/v1/tasks?or=(client_sub_date.eq.${today},due_date.eq.${today})&select=title,client,status,assignee,detailer,checker,due_date,client_sub_date,project_id&order=client_sub_date.asc,due_date.asc`
  );
  const projects = await supaFetch(`/rest/v1/projects?select=id,name,client`);
  const projMap  = {};
  for (const p of (projects || [])) projMap[p.id] = p;

  const tasks = allTasks || [];
  console.log(`Tasks for today: ${tasks.length}`);
  tasks.forEach(t => console.log(`  • ${t.title} [${t.status}]`));

  const html = buildEmail(TEST_NAME, tasks, projMap, today, dateLabel);

  const payload = {
    type: "submission_digest",
    data: {
      taskName:      `Daily Submission List — ${today}`,
      projectName:   `${tasks.length} submission(s) planned for today`,
      completedBy:   "RDS TechServ Automated Digest",
      completedAt:   dateLabel,
      recipientEmail: TEST_EMAIL,
      subject:       `[TEST] 📬 RDS Daily Submission List — ${dateLabel}`,
      htmlBody:      html
    }
  };

  console.log(`\nSending to ${TEST_EMAIL}...`);
  const res  = await postJson(NOTIFY_URL, payload);
  let parsed;
  try { parsed = JSON.parse(res); } catch(e) { parsed = { raw: res }; }

  if (parsed.success || parsed.id) {
    console.log(`✓ Sent successfully! Email ID: ${parsed.id || "—"}`);
  } else {
    console.log(`⚠ Response: ${JSON.stringify(parsed)}`);
    if (parsed.error && parsed.error.includes("Unknown type")) {
      console.log("\n→ Edge Function not yet redeployed. Please run:");
      console.log("  supabase functions deploy notify");
      console.log("  Then run this script again.\n");
    }
  }
}

main().catch(e => { console.error("FATAL:", e); process.exit(1); });
