// supabase/functions/notify/index.ts
// ─────────────────────────────────────────────────────────────────────────────
// RDS Project Hub — Email Notification Edge Function
// Deployed to Supabase, called from your React app.
// Uses Resend (https://resend.com) — free tier: 3,000 emails/month.
//
// Deploy with:
//   supabase functions deploy notify
//
// Set secrets:
//   supabase secrets set RESEND_API_KEY=re_xxxx
//   supabase secrets set NOTIFY_FROM=notifications@yourdomain.com
//   supabase secrets set ADMIN_EMAIL=ramesh@ecovon.in
// ─────────────────────────────────────────────────────────────────────────────

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM_EMAIL     = Deno.env.get("NOTIFY_FROM")    ?? "notifications@rdshub.com";
const ADMIN_EMAIL    = Deno.env.get("ADMIN_EMAIL")     ?? "ramesh@ecovon.in";
const APP_NAME       = "RDS Project Hub";
const PRIMARY_COLOR  = "#f97316"; // matches C.accent in your app

// ── CORS headers (allows calls from your Vite/React dev server) ───────────────
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── Main handler ─────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { type, data } = body;

    if (!type || !data) {
      return new Response(JSON.stringify({ error: "Missing type or data" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let subject = "";
    let html    = "";
    const to    = data.recipientEmail || ADMIN_EMAIL;

    switch (type) {
      case "task_completed":
        subject = `✅ Task Completed: ${data.taskName}`;
        html    = templateTaskCompleted(data);
        break;
      case "status_change":
        subject = `🔄 Status Update: ${data.taskName} → ${data.newStatus}`;
        html    = templateStatusChange(data);
        break;
      case "deadline":
        subject = `⏰ Deadline Alert: "${data.taskName}" due in ${data.daysRemaining} day(s)`;
        html    = templateDeadline(data);
        break;
      case "task_assigned":
        subject = `📋 New Task Assigned: ${data.taskName}`;
        html    = templateTaskAssigned(data);
        break;
      case "project_created":
        subject = `🚀 New Project Created: ${data.projectName}`;
        html    = templateProjectCreated(data);
        break;
      default:
        return new Response(JSON.stringify({ error: `Unknown type: ${type}` }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: `${APP_NAME} <${FROM_EMAIL}>`, to, subject, html }),
    });

    const result = await res.json();
    if (!res.ok) throw new Error(result.message ?? "Resend error");

    return new Response(JSON.stringify({ success: true, id: result.id }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("[notify] Error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Shared layout
// ─────────────────────────────────────────────────────────────────────────────
function layout(content: string): string {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
  <style>
    body{margin:0;padding:0;background:#f4f6f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;}
    .wrap{max-width:580px;margin:32px auto;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.1);}
    .hdr{background:${PRIMARY_COLOR};padding:20px 28px;}
    .hdr h1{margin:0;color:#fff;font-size:18px;font-weight:700;}
    .hdr p{margin:3px 0 0;color:rgba(255,255,255,.8);font-size:12px;}
    .body{padding:28px;}
    .row{display:flex;margin-bottom:10px;}
    .lbl{color:#6b7280;font-size:12px;width:130px;flex-shrink:0;padding-top:2px;}
    .val{color:#111827;font-size:13px;font-weight:600;}
    .badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;}
    .btn{display:inline-block;margin-top:20px;padding:11px 24px;background:${PRIMARY_COLOR};color:#fff;text-decoration:none;border-radius:6px;font-size:13px;font-weight:700;}
    hr{border:none;border-top:1px solid #e5e7eb;margin:20px 0;}
    .ftr{background:#f9fafb;padding:16px 28px;text-align:center;color:#9ca3af;font-size:11px;}
  </style></head><body>
  <div class="wrap">
    <div class="hdr"><h1>${APP_NAME}</h1><p>Project Update Notification</p></div>
    <div class="body">${content}</div>
    <div class="ftr">© ${new Date().getFullYear()} ${APP_NAME} · Automated notification</div>
  </div></body></html>`;
}

function badge(text: string, color: string): string {
  return `<span class="badge" style="background:${color}22;color:${color};border:1px solid ${color}44;">${text}</span>`;
}
function statusColor(s: string): string {
  const m: Record<string,string> = {
    "Done":"#22c55e","Completed":"#22c55e","In Progress":"#3b82f6",
    "Review":"#a855f7","To Do":"#475569","To Be Started":"#eab308","Blocked":"#ef4444",
  };
  return m[s] ?? "#475569";
}

// ─────────────────────────────────────────────────────────────────────────────
// Templates
// ─────────────────────────────────────────────────────────────────────────────
function templateTaskCompleted(d: Record<string,string>): string {
  return layout(`
    <h2 style="margin-top:0;color:#111827;font-size:20px;">✅ Task Completed</h2>
    <p style="color:#4b5563;line-height:1.6;font-size:14px;">A task in <strong>${d.projectName}</strong> has been marked complete.</p>
    <hr/>
    <div class="row"><span class="lbl">Task</span><span class="val">${d.taskName}</span></div>
    <div class="row"><span class="lbl">Project</span><span class="val">${d.projectName}</span></div>
    <div class="row"><span class="lbl">Completed by</span><span class="val">${d.completedBy||"—"}</span></div>
    <div class="row"><span class="lbl">Completed at</span><span class="val">${d.completedAt||"Just now"}</span></div>
    <div class="row"><span class="lbl">Status</span><span class="val">${badge("Completed","#22c55e")}</span></div>
    ${d.taskUrl?`<a href="${d.taskUrl}" class="btn">View Task →</a>`:""}
  `);
}

function templateStatusChange(d: Record<string,string>): string {
  return layout(`
    <h2 style="margin-top:0;color:#111827;font-size:20px;">🔄 Status Updated</h2>
    <p style="color:#4b5563;line-height:1.6;font-size:14px;">An item in <strong>${d.projectName}</strong> has changed status.</p>
    <hr/>
    <div class="row"><span class="lbl">Task</span><span class="val">${d.taskName}</span></div>
    <div class="row"><span class="lbl">Project</span><span class="val">${d.projectName}</span></div>
    <div class="row"><span class="lbl">Status change</span><span class="val">${badge(d.oldStatus,statusColor(d.oldStatus))} → ${badge(d.newStatus,statusColor(d.newStatus))}</span></div>
    <div class="row"><span class="lbl">Changed by</span><span class="val">${d.changedBy||"—"}</span></div>
    ${d.taskUrl?`<a href="${d.taskUrl}" class="btn">View Task →</a>`:""}
  `);
}

function templateDeadline(d: Record<string,string>): string {
  const urgency = Number(d.daysRemaining)<=1?"#ef4444":Number(d.daysRemaining)<=2?"#f59e0b":PRIMARY_COLOR;
  return layout(`
    <h2 style="margin-top:0;color:${urgency};font-size:20px;">⏰ Deadline Approaching</h2>
    <p style="color:#4b5563;line-height:1.6;font-size:14px;">
      <strong style="color:${urgency};">${d.daysRemaining===0?"Today!":"In "+d.daysRemaining+" day(s)"}</strong> — <strong>${d.taskName}</strong> is due.
    </p>
    <hr/>
    <div class="row"><span class="lbl">Task</span><span class="val">${d.taskName}</span></div>
    <div class="row"><span class="lbl">Project</span><span class="val">${d.projectName}</span></div>
    <div class="row"><span class="lbl">Assigned to</span><span class="val">${d.assigneeName||"Unassigned"}</span></div>
    <div class="row"><span class="lbl">Due date</span><span class="val" style="color:${urgency};font-weight:700;">${d.dueDate}</span></div>
    ${d.taskUrl?`<a href="${d.taskUrl}" class="btn" style="background:${urgency};">View Task →</a>`:""}
  `);
}

function templateProjectCreated(d: Record<string,string>): string {
  return layout(`
    <h2 style="margin-top:0;color:#111827;font-size:20px;">🚀 New Project Created</h2>
    <p style="color:#4b5563;line-height:1.6;font-size:14px;">A new project has been added to <strong>${APP_NAME}</strong>.</p>
    <hr/>
    <div class="row"><span class="lbl">Project</span><span class="val">${d.projectName}</span></div>
    ${d.client?`<div class="row"><span class="lbl">Client</span><span class="val">${d.client}</span></div>`:""}
    ${d.deadline?`<div class="row"><span class="lbl">Deadline</span><span class="val">${d.deadline}</span></div>`:""}
    ${d.description?`<div class="row"><span class="lbl">Description</span><span class="val">${d.description}</span></div>`:""}
    <div class="row"><span class="lbl">Created by</span><span class="val">${d.createdBy||"—"}</span></div>
    <div class="row"><span class="lbl">Created at</span><span class="val">${d.createdAt||"Just now"}</span></div>
  `);
}

function templateTaskAssigned(d: Record<string,string>): string {
  return layout(`
    <h2 style="margin-top:0;color:#111827;font-size:20px;">📋 New Task Assigned</h2>
    <p style="color:#4b5563;line-height:1.6;font-size:14px;">Hi <strong>${d.assigneeName}</strong>, you have a new task in <strong>${d.projectName}</strong>.</p>
    <hr/>
    <div class="row"><span class="lbl">Task</span><span class="val">${d.taskName}</span></div>
    <div class="row"><span class="lbl">Project</span><span class="val">${d.projectName}</span></div>
    <div class="row"><span class="lbl">Assigned by</span><span class="val">${d.assignedBy||"—"}</span></div>
    ${d.dueDate?`<div class="row"><span class="lbl">Due date</span><span class="val">${d.dueDate}</span></div>`:""}
    ${d.description?`<hr/><p style="background:#f9fafb;border-left:3px solid ${PRIMARY_COLOR};padding:10px 14px;margin:0;font-size:13px;color:#374151;">${d.description}</p>`:""}
    ${d.taskUrl?`<a href="${d.taskUrl}" class="btn">Open Task →</a>`:""}
  `);
}
