// /api/cron-daily.js
// Vercel Cron: runs Mon–Sat at 1:00 AM IST (= 19:30 UTC Sun–Fri)
// Schedule in vercel.json: "30 19 * * 0-5"

const SUPA_URL  = "https://xypcbioltukahipkqqzc.supabase.co";
const SUPA_KEY  = process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGNiaW9sdHVrYWhpcGtxcXpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0MzEzNjUsImV4cCI6MjA5NTAwNzM2NX0.DG5sv2bpx8j3Mmz0mqIsoDVaCMP2TmWqh-OQUfSZFRw";
// Service role key bypasses RLS — used for writing last_digest_date (anon key is blocked by RLS INSERT policy)
// Add SUPABASE_SERVICE_KEY to Vercel env vars: Supabase dashboard → Project Settings → API → service_role
const SUPA_WRITE_KEY = process.env.SUPABASE_SERVICE_KEY || SUPA_KEY;
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
      <table cellpadding="0" cellspacing="0"><tr><td style="background:#ffffff;border-radius:8px;padding:6px 12px;">
        <img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0OCIgaGVpZ2h0PSI0NiIgZmlsbD0ibm9uZSIgdmlld0JveD0iMCAwIDQ4IDQ2Ij48cGF0aCBmaWxsPSIjODYzYmZmIiBkPSJNMjUuOTQ2IDQ0LjkzOGMtLjY2NC44NDUtMi4wMjEuMzc1LTIuMDIxLS42OThWMzMuOTM3YTIuMjYgMi4yNiAwIDAgMC0yLjI2Mi0yLjI2MkgxMC4yODdjLS45MiAwLTEuNDU2LTEuMDQtLjkyLTEuNzg4bDcuNDgtMTAuNDcxYzEuMDctMS40OTcgMC0zLjU3OC0xLjg0Mi0zLjU3OEgxLjIzN2MtLjkyIDAtMS40NTYtMS4wNC0uOTItMS43ODhMMTAuMDEzLjQ3NGMuMjE0LS4yOTcuNTU2LS40NzQuOTItLjQ3NGgyOC44OTRjLjkyIDAgMS40NTYgMS4wNC45MiAxLjc4OGwtNy40OCAxMC40NzFjLTEuMDcgMS40OTggMCAzLjU3OSAxLjg0MiAzLjU3OWgxMS4zNzdjLjk0MyAwIDEuNDczIDEuMDg4Ljg5IDEuODNMMjUuOTQ3IDQ0Ljk0eiIgc3R5bGU9ImZpbGw6Izg2M2JmZjtmaWxsOmNvbG9yKGRpc3BsYXktcDMgLjUyNTIgLjIzIDEpO2ZpbGwtb3BhY2l0eToxIi8+PG1hc2sgaWQ9ImEiIHdpZHRoPSI0OCIgaGVpZ2h0PSI0NiIgeD0iMCIgeT0iMCIgbWFza1VuaXRzPSJ1c2VyU3BhY2VPblVzZSIgc3R5bGU9Im1hc2stdHlwZTphbHBoYSI+PHBhdGggZmlsbD0iIzAwMCIgZD0iTTI1Ljg0MiA0NC45MzhjLS42NjQuODQ0LTIuMDIxLjM3NS0yLjAyMS0uNjk4VjMzLjkzN2EyLjI2IDIuMjYgMCAwIDAtMi4yNjItMi4yNjJIMTAuMTgzYy0uOTIgMC0xLjQ1Ni0xLjA0LS45Mi0xLjc4OGw3LjQ4LTEwLjQ3MWMxLjA3LTEuNDk4IDAtMy41NzktMS44NDItMy41NzlIMS4xMzNjLS45MiAwLTEuNDU2LTEuMDQtLjkyLTEuNzg3TDkuOTEuNDczYy4yMTQtLjI5Ny41NTYtLjQ3NC45Mi0uNDc0aDI4Ljg5NGMuOTIgMCAxLjQ1NiAxLjA0LjkyIDEuNzg4bC03LjQ4IDEwLjQ3MWMtMS4wNyAxLjQ5OCAwIDMuNTc4IDEuODQyIDMuNTc4aDExLjM3N2MuOTQzIDAgMS40NzMgMS4wODguODkgMS44MzJMMjUuODQzIDQ0Ljk0eiIgc3R5bGU9ImZpbGw6IzAwMDtmaWxsLW9wYWNpdHk6MSIvPjwvbWFzaz48ZyBtYXNrPSJ1cmwoI2EpIj48ZyBmaWx0ZXI9InVybCgjYikiPjxlbGxpcHNlIGN4PSI1LjUwOCIgY3k9IjE0LjcwNCIgZmlsbD0iI2VkZTZmZiIgcng9IjUuNTA4IiByeT0iMTQuNzA0IiBzdHlsZT0iZmlsbDojZWRlNmZmO2ZpbGw6Y29sb3IoZGlzcGxheS1wMyAuOTI3NSAuOTAzMyAxKTtmaWxsLW9wYWNpdHk6MSIgdHJhbnNmb3JtPSJtYXRyaXgoLjAwMzI0IDEgMSAtLjAwMzI0IC00LjQ3IDMxLjUxNikiLz48L2c+PGcgZmlsdGVyPSJ1cmwoI2MpIj48ZWxsaXBzZSBjeD0iMTAuMzk5IiBjeT0iMjkuODUxIiBmaWxsPSIjZWRlNmZmIiByeD0iMTAuMzk5IiByeT0iMjkuODUxIiBzdHlsZT0iZmlsbDojZWRlNmZmO2ZpbGw6Y29sb3IoZGlzcGxheS1wMyAuOTI3NSAuOTAzMyAxKTtmaWxsLW9wYWNpdHk6MSIgdHJhbnNmb3JtPSJtYXRyaXgoLjAwMzI0IDEgMSAtLjAwMzI0IC0zOS4zMjggNy44ODMpIi8+PC9nPjxnIGZpbHRlcj0idXJsKCNkKSI+PGVsbGlwc2UgY3g9IjUuNTA4IiBjeT0iMzAuNDg3IiBmaWxsPSIjN2UxNGZmIiByeD0iNS41MDgiIHJ5PSIzMC40ODciIHN0eWxlPSJmaWxsOiM3ZTE0ZmY7ZmlsbDpjb2xvcihkaXNwbGF5LXAzIC40OTIyIC4wNzY3IDEpO2ZpbGwtb3BhY2l0eToxIiB0cmFuc2Zvcm09InJvdGF0ZSg4OS44MTQgLTI1LjkxMyAtMTQuNjM5KXNjYWxlKDEgLTEpIi8+PC9nPjxnIGZpbHRlcj0idXJsKCNlKSI+PGVsbGlwc2UgY3g9IjUuNTA4IiBjeT0iMzAuNTk5IiBmaWxsPSIjN2UxNGZmIiByeD0iNS41MDgiIHJ5PSIzMC41OTkiIHN0eWxlPSJmaWxsOiM3ZTE0ZmY7ZmlsbDpjb2xvcihkaXNwbGF5LXAzIC40OTIyIC4wNzY3IDEpO2ZpbGwtb3BhY2l0eToxIiB0cmFuc2Zvcm09InJvdGF0ZSg4OS44MTQgLTMyLjY0NCAtMy4zMzQpc2NhbGUoMSAtMSkiLz48L2c+PGcgZmlsdGVyPSJ1cmwoI2YpIj48ZWxsaXBzZSBjeD0iNS41MDgiIGN5PSIzMC41OTkiIGZpbGw9IiM3ZTE0ZmYiIHJ4PSI1LjUwOCIgcnk9IjMwLjU5OSIgc3R5bGU9ImZpbGw6IzdlMTRmZjtmaWxsOmNvbG9yKGRpc3BsYXktcDMgLjQ5MjIgLjA3NjcgMSk7ZmlsbC1vcGFjaXR5OjEiIHRyYW5zZm9ybT0ibWF0cml4KC4wMDMyNCAxIDEgLS4wMDMyNCAtMzQuMzQgMzAuNDcpIi8+PC9nPjxnIGZpbHRlcj0idXJsKCNnKSI+PGVsbGlwc2UgY3g9IjE0LjA3MiIgY3k9IjIyLjA3OCIgZmlsbD0iI2VkZTZmZiIgcng9IjE0LjA3MiIgcnk9IjIyLjA3OCIgc3R5bGU9ImZpbGw6I2VkZTZmZjtmaWxsOmNvbG9yKGRpc3BsYXktcDMgLjkyNzUgLjkwMzMgMSk7ZmlsbC1vcGFjaXR5OjEiIHRyYW5zZm9ybT0icm90YXRlKDkzLjM1IDI0LjUwNiA0OC40OTMpc2NhbGUoLTEgMSkiLz48L2c+PGcgZmlsdGVyPSJ1cmwoI2gpIj48ZWxsaXBzZSBjeD0iMy40NyIgY3k9IjIxLjUwMSIgZmlsbD0iIzdlMTRmZiIgcng9IjMuNDciIHJ5PSIyMS41MDEiIHN0eWxlPSJmaWxsOiM3ZTE0ZmY7ZmlsbDpjb2xvcihkaXNwbGF5LXAzIC40OTIyIC4wNzY3IDEpO2ZpbGwtb3BhY2l0eToxIiB0cmFuc2Zvcm09InJvdGF0ZSg4OS4wMDkgMjguNzA4IDQ3LjU5KXNjYWxlKC0xIDEpIi8+PC9nPjxnIGZpbHRlcj0idXJsKCNpKSI+PGVsbGlwc2UgY3g9IjMuNDciIGN5PSIyMS41MDEiIGZpbGw9IiM3ZTE0ZmYiIHJ4PSIzLjQ3IiByeT0iMjEuNTAxIiBzdHlsZT0iZmlsbDojN2UxNGZmO2ZpbGw6Y29sb3IoZGlzcGxheS1wMyAuNDkyMiAuMDc2NyAxKTtmaWxsLW9wYWNpdHk6MSIgdHJhbnNmb3JtPSJyb3RhdGUoODkuMDA5IDI4LjcwOCA0Ny41OSlzY2FsZSgtMSAxKSIvPjwvZz48ZyBmaWx0ZXI9InVybCgjaikiPjxlbGxpcHNlIGN4PSIuMzg3IiBjeT0iOC45NzIiIGZpbGw9IiM3ZTE0ZmYiIHJ4PSI0LjQwNyIgcnk9IjI5LjEwOCIgc3R5bGU9ImZpbGw6IzdlMTRmZjtmaWxsOmNvbG9yKGRpc3BsYXktcDMgLjQ5MjIgLjA3NjcgMSk7ZmlsbC1vcGFjaXR5OjEiIHRyYW5zZm9ybT0icm90YXRlKDM5LjUxIC4zODcgOC45NzIpIi8+PC9nPjxnIGZpbHRlcj0idXJsKCNrKSI+PGVsbGlwc2UgY3g9IjQ3LjUyMyIgY3k9Ii02LjA5MiIgZmlsbD0iIzdlMTRmZiIgcng9IjQuNDA3IiByeT0iMjkuMTA4IiBzdHlsZT0iZmlsbDojN2UxNGZmO2ZpbGw6Y29sb3IoZGlzcGxheS1wMyAuNDkyMiAuMDc2NyAxKTtmaWxsLW9wYWNpdHk6MSIgdHJhbnNmb3JtPSJyb3RhdGUoMzcuODkyIDQ3LjUyMyAtNi4wOTIpIi8+PC9nPjxnIGZpbHRlcj0idXJsKCNsKSI+PGVsbGlwc2UgY3g9IjQxLjQxMiIgY3k9IjYuMzMzIiBmaWxsPSIjNDdiZmZmIiByeD0iNS45NzEiIHJ5PSI5LjY2NSIgc3R5bGU9ImZpbGw6IzQ3YmZmZjtmaWxsOmNvbG9yKGRpc3BsYXktcDMgLjI3OTkgLjc0OCAxKTtmaWxsLW9wYWNpdHk6MSIgdHJhbnNmb3JtPSJyb3RhdGUoMzcuODkyIDQxLjQxMiA2LjMzMykiLz48L2c+PGcgZmlsdGVyPSJ1cmwoI20pIj48ZWxsaXBzZSBjeD0iLTEuODc5IiBjeT0iMzguMzMyIiBmaWxsPSIjN2UxNGZmIiByeD0iNC40MDciIHJ5PSIyOS4xMDgiIHN0eWxlPSJmaWxsOiM3ZTE0ZmY7ZmlsbDpjb2xvcihkaXNwbGF5LXAzIC40OTIyIC4wNzY3IDEpO2ZpbGwtb3BhY2l0eToxIiB0cmFuc2Zvcm09InJvdGF0ZSgzNy44OTIgLTEuODggMzguMzMyKSIvPjwvZz48ZyBmaWx0ZXI9InVybCgjbikiPjxlbGxpcHNlIGN4PSItMS44NzkiIGN5PSIzOC4zMzIiIGZpbGw9IiM3ZTE0ZmYiIHJ4PSI0LjQwNyIgcnk9IjI5LjEwOCIgc3R5bGU9ImZpbGw6IzdlMTRmZjtmaWxsOmNvbG9yKGRpc3BsYXktcDMgLjQ5MjIgLjA3NjcgMSk7ZmlsbC1vcGFjaXR5OjEiIHRyYW5zZm9ybT0icm90YXRlKDM3Ljg5MiAtMS44OCAzOC4zMzIpIi8+PC9nPjxnIGZpbHRlcj0idXJsKCNvKSI+PGVsbGlwc2UgY3g9IjM1LjY1MSIgY3k9IjI5LjkwNyIgZmlsbD0iIzdlMTRmZiIgcng9IjQuNDA3IiByeT0iMjkuMTA4IiBzdHlsZT0iZmlsbDojN2UxNGZmO2ZpbGw6Y29sb3IoZGlzcGxheS1wMyAuNDkyMiAuMDc2NyAxKTtmaWxsLW9wYWNpdHk6MSIgdHJhbnNmb3JtPSJyb3RhdGUoMzcuODkyIDM1LjY1MSAyOS45MDcpIi8+PC9nPjxnIGZpbHRlcj0idXJsKCNwKSI+PGVsbGlwc2UgY3g9IjM4LjQxOCIgY3k9IjMyLjQiIGZpbGw9IiM0N2JmZmYiIHJ4PSI1Ljk3MSIgcnk9IjE1LjI5NyIgc3R5bGU9ImZpbGw6IzQ3YmZmZjtmaWxsOmNvbG9yKGRpc3BsYXktcDMgLjI3OTkgLjc0OCAxKTtmaWxsLW9wYWNpdHk6MSIgdHJhbnNmb3JtPSJyb3RhdGUoMzcuODkyIDM4LjQxOCAzMi40KSIvPjwvZz48L2c+PGRlZnM+PGZpbHRlciBpZD0iYiIgd2lkdGg9IjYwLjA0NSIgaGVpZ2h0PSI0MS42NTQiIHg9Ii0xOS43NyIgeT0iMTYuMTQ5IiBjb2xvci1pbnRlcnBvbGF0aW9uLWZpbHRlcnM9InNSR0IiIGZpbHRlclVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PGZlRmxvb2QgZmxvb2Qtb3BhY2l0eT0iMCIgcmVzdWx0PSJCYWNrZ3JvdW5kSW1hZ2VGaXgiLz48ZmVCbGVuZCBpbj0iU291cmNlR3JhcGhpYyIgaW4yPSJCYWNrZ3JvdW5kSW1hZ2VGaXgiIHJlc3VsdD0ic2hhcGUiLz48ZmVHYXVzc2lhbkJsdXIgcmVzdWx0PSJlZmZlY3QxX2ZvcmVncm91bmRCbHVyXzIwMDJfMTcxNTgiIHN0ZERldmlhdGlvbj0iNy42NTkiLz48L2ZpbHRlcj48ZmlsdGVyIGlkPSJjIiB3aWR0aD0iOTAuMzQiIGhlaWdodD0iNTEuNDM3IiB4PSItNTQuNjEzIiB5PSItNy41MzMiIGNvbG9yLWludGVycG9sYXRpb24tZmlsdGVycz0ic1JHQiIgZmlsdGVyVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48ZmVGbG9vZCBmbG9vZC1vcGFjaXR5PSIwIiByZXN1bHQ9IkJhY2tncm91bmRJbWFnZUZpeCIvPjxmZUJsZW5kIGluPSJTb3VyY2VHcmFwaGljIiBpbjI9IkJhY2tncm91bmRJbWFnZUZpeCIgcmVzdWx0PSJzaGFwZSIvPjxmZUdhdXNzaWFuQmx1ciByZXN1bHQ9ImVmZmVjdDFfZm9yZWdyb3VuZEJsdXJfMjAwMl8xNzE1OCIgc3RkRGV2aWF0aW9uPSI3LjY1OSIvPjwvZmlsdGVyPjxmaWx0ZXIgaWQ9ImQiIHdpZHRoPSI3OS4zNTUiIGhlaWdodD0iMjkuNCIgeD0iLTQ5LjY0IiB5PSIyLjAzIiBjb2xvci1pbnRlcnBvbGF0aW9uLWZpbHRlcnM9InNSR0IiIGZpbHRlclVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PGZlRmxvb2QgZmxvb2Qtb3BhY2l0eT0iMCIgcmVzdWx0PSJCYWNrZ3JvdW5kSW1hZ2VGaXgiLz48ZmVCbGVuZCBpbj0iU291cmNlR3JhcGhpYyIgaW4yPSJCYWNrZ3JvdW5kSW1hZ2VGaXgiIHJlc3VsdD0ic2hhcGUiLz48ZmVHYXVzc2lhbkJsdXIgcmVzdWx0PSJlZmZlY3QxX2ZvcmVncm91bmRCbHVyXzIwMDJfMTcxNTgiIHN0ZERldmlhdGlvbj0iNC41OTYiLz48L2ZpbHRlcj48ZmlsdGVyIGlkPSJlIiB3aWR0aD0iNzkuNTc5IiBoZWlnaHQ9IjI5LjQiIHg9Ii00NS4wNDUiIHk9IjIwLjAyOSIgY29sb3ItaW50ZXJwb2xhdGlvbi1maWx0ZXJzPSJzUkdCIiBmaWx0ZXJVbml0cz0idXNlclNwYWNlT25Vc2UiPjxmZUZsb29kIGZsb29kLW9wYWNpdHk9IjAiIHJlc3VsdD0iQmFja2dyb3VuZEltYWdlRml4Ii8+PGZlQmxlbmQgaW49IlNvdXJjZUdyYXBoaWMiIGluMj0iQmFja2dyb3VuZEltYWdlRml4IiByZXN1bHQ9InNoYXBlIi8+PGZlR2F1c3NpYW5CbHVyIHJlc3VsdD0iZWZmZWN0MV9mb3JlZ3JvdW5kQmx1cl8yMDAyXzE3MTU4IiBzdGREZXZpYXRpb249IjQuNTk2Ii8+PC9maWx0ZXI+PGZpbHRlciBpZD0iZiIgd2lkdGg9Ijc5LjU3OSIgaGVpZ2h0PSIyOS40IiB4PSItNDMuNTEzIiB5PSIyMS4xNzgiIGNvbG9yLWludGVycG9sYXRpb24tZmlsdGVycz0ic1JHQiIgZmlsdGVyVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48ZmVGbG9vZCBmbG9vZC1vcGFjaXR5PSIwIiByZXN1bHQ9IkJhY2tncm91bmRJbWFnZUZpeCIvPjxmZUJsZW5kIGluPSJTb3VyY2VHcmFwaGljIiBpbjI9IkJhY2tncm91bmRJbWFnZUZpeCIgcmVzdWx0PSJzaGFwZSIvPjxmZUdhdXNzaWFuQmx1ciByZXN1bHQ9ImVmZmVjdDFfZm9yZWdyb3VuZEJsdXJfMjAwMl8xNzE1OCIgc3RkRGV2aWF0aW9uPSI0LjU5NiIvPjwvZmlsdGVyPjxmaWx0ZXIgaWQ9ImciIHdpZHRoPSI3NC43NDkiIGhlaWdodD0iNTguODUyIiB4PSIxNS43NTYiIHk9Ii0xNy45MDEiIGNvbG9yLWludGVycG9sYXRpb24tZmlsdGVycz0ic1JHQiIgZmlsdGVyVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48ZmVGbG9vZCBmbG9vZC1vcGFjaXR5PSIwIiByZXN1bHQ9IkJhY2tncm91bmRJbWFnZUZpeCIvPjxmZUJsZW5kIGluPSJTb3VyY2VHcmFwaGljIiBpbjI9IkJhY2tncm91bmRJbWFnZUZpeCIgcmVzdWx0PSJzaGFwZSIvPjxmZUdhdXNzaWFuQmx1ciByZXN1bHQ9ImVmZmVjdDFfZm9yZWdyb3VuZEJsdXJfMjAwMl8xNzE1OCIgc3RkRGV2aWF0aW9uPSI3LjY1OSIvPjwvZmlsdGVyPjxmaWx0ZXIgaWQ9ImgiIHdpZHRoPSI2MS4zNzciIGhlaWdodD0iMjUuMzYyIiB4PSIyMy41NDgiIHk9IjIuMjg0IiBjb2xvci1pbnRlcnBvbGF0aW9uLWZpbHRlcnM9InNSR0IiIGZpbHRlclVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PGZlRmxvb2QgZmxvb2Qtb3BhY2l0eT0iMCIgcmVzdWx0PSJCYWNrZ3JvdW5kSW1hZ2VGaXgiLz48ZmVCbGVuZCBpbj0iU291cmNlR3JhcGhpYyIgaW4yPSJCYWNrZ3JvdW5kSW1hZ2VGaXgiIHJlc3VsdD0ic2hhcGUiLz48ZmVHYXVzc2lhbkJsdXIgcmVzdWx0PSJlZmZlY3QxX2ZvcmVncm91bmRCbHVyXzIwMDJfMTcxNTgiIHN0ZERldmlhdGlvbj0iNC41OTYiLz48L2ZpbHRlcj48ZmlsdGVyIGlkPSJpIiB3aWR0aD0iNjEuMzc3IiBoZWlnaHQ9IjI1LjM2MiIgeD0iMjMuNTQ4IiB5PSIyLjI4NCIgY29sb3ItaW50ZXJwb2xhdGlvbi1maWx0ZXJzPSJzUkdCIiBmaWx0ZXJVbml0cz0idXNlclNwYWNlT25Vc2UiPjxmZUZsb29kIGZsb29kLW9wYWNpdHk9IjAiIHJlc3VsdD0iQmFja2dyb3VuZEltYWdlRml4Ii8+PGZlQmxlbmQgaW49IlNvdXJjZUdyYXBoaWMiIGluMj0iQmFja2dyb3VuZEltYWdlRml4IiByZXN1bHQ9InNoYXBlIi8+PGZlR2F1c3NpYW5CbHVyIHJlc3VsdD0iZWZmZWN0MV9mb3JlZ3JvdW5kQmx1cl8yMDAyXzE3MTU4IiBzdGREZXZpYXRpb249IjQuNTk2Ii8+PC9maWx0ZXI+PGZpbHRlciBpZD0iaiIgd2lkdGg9IjU2LjA0NSIgaGVpZ2h0PSI2My42NDkiIHg9Ii0yNy42MzYiIHk9Ii0yMi44NTMiIGNvbG9yLWludGVycG9sYXRpb24tZmlsdGVycz0ic1JHQiIgZmlsdGVyVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48ZmVGbG9vZCBmbG9vZC1vcGFjaXR5PSIwIiByZXN1bHQ9IkJhY2tncm91bmRJbWFnZUZpeCIvPjxmZUJsZW5kIGluPSJTb3VyY2VHcmFwaGljIiBpbjI9IkJhY2tncm91bmRJbWFnZUZpeCIgcmVzdWx0PSJzaGFwZSIvPjxmZUdhdXNzaWFuQmx1ciByZXN1bHQ9ImVmZmVjdDFfZm9yZWdyb3VuZEJsdXJfMjAwMl8xNzE1OCIgc3RkRGV2aWF0aW9uPSI0LjU5NiIvPjwvZmlsdGVyPjxmaWx0ZXIgaWQ9ImsiIHdpZHRoPSI1NC44MTQiIGhlaWdodD0iNjQuNjQ2IiB4PSIyMC4xMTYiIHk9Ii0zOC40MTUiIGNvbG9yLWludGVycG9sYXRpb24tZmlsdGVycz0ic1JHQiIgZmlsdGVyVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48ZmVGbG9vZCBmbG9vZC1vcGFjaXR5PSIwIiByZXN1bHQ9IkJhY2tncm91bmRJbWFnZUZpeCIvPjxmZUJsZW5kIGluPSJTb3VyY2VHcmFwaGljIiBpbjI9IkJhY2tncm91bmRJbWFnZUZpeCIgcmVzdWx0PSJzaGFwZSIvPjxmZUdhdXNzaWFuQmx1ciByZXN1bHQ9ImVmZmVjdDFfZm9yZWdyb3VuZEJsdXJfMjAwMl8xNzE1OCIgc3RkRGV2aWF0aW9uPSI0LjU5NiIvPjwvZmlsdGVyPjxmaWx0ZXIgaWQ9ImwiIHdpZHRoPSIzMy41NDEiIGhlaWdodD0iMzUuMzEzIiB4PSIyNC42NDEiIHk9Ii0xMS4zMjMiIGNvbG9yLWludGVycG9sYXRpb24tZmlsdGVycz0ic1JHQiIgZmlsdGVyVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48ZmVGbG9vZCBmbG9vZC1vcGFjaXR5PSIwIiByZXN1bHQ9IkJhY2tncm91bmRJbWFnZUZpeCIvPjxmZUJsZW5kIGluPSJTb3VyY2VHcmFwaGljIiBpbjI9IkJhY2tncm91bmRJbWFnZUZpeCIgcmVzdWx0PSJzaGFwZSIvPjxmZUdhdXNzaWFuQmx1ciByZXN1bHQ9ImVmZmVjdDFfZm9yZWdyb3VuZEJsdXJfMjAwMl8xNzE1OCIgc3RkRGV2aWF0aW9uPSI0LjU5NiIvPjwvZmlsdGVyPjxmaWx0ZXIgaWQ9Im0iIHdpZHRoPSI1NC44MTQiIGhlaWdodD0iNjQuNjQ2IiB4PSItMjkuMjg2IiB5PSI2LjAwOSIgY29sb3ItaW50ZXJwb2xhdGlvbi1maWx0ZXJzPSJzUkdCIiBmaWx0ZXJVbml0cz0idXNlclNwYWNlT25Vc2UiPjxmZUZsb29kIGZsb29kLW9wYWNpdHk9IjAiIHJlc3VsdD0iQmFja2dyb3VuZEltYWdlRml4Ii8+PGZlQmxlbmQgaW49IlNvdXJjZUdyYXBoaWMiIGluMj0iQmFja2dyb3VuZEltYWdlRml4IiByZXN1bHQ9InNoYXBlIi8+PGZlR2F1c3NpYW5CbHVyIHJlc3VsdD0iZWZmZWN0MV9mb3JlZ3JvdW5kQmx1cl8yMDAyXzE3MTU4IiBzdGREZXZpYXRpb249IjQuNTk2Ii8+PC9maWx0ZXI+PGZpbHRlciBpZD0ibiIgd2lkdGg9IjU0LjgxNCIgaGVpZ2h0PSI2NC42NDYiIHg9Ii0yOS4yODYiIHk9IjYuMDA5IiBjb2xvci1pbnRlcnBvbGF0aW9uLWZpbHRlcnM9InNSR0IiIGZpbHRlclVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PGZlRmxvb2QgZmxvb2Qtb3BhY2l0eT0iMCIgcmVzdWx0PSJCYWNrZ3JvdW5kSW1hZ2VGaXgiLz48ZmVCbGVuZCBpbj0iU291cmNlR3JhcGhpYyIgaW4yPSJCYWNrZ3JvdW5kSW1hZ2VGaXgiIHJlc3VsdD0ic2hhcGUiLz48ZmVHYXVzc2lhbkJsdXIgcmVzdWx0PSJlZmZlY3QxX2ZvcmVncm91bmRCbHVyXzIwMDJfMTcxNTgiIHN0ZERldmlhdGlvbj0iNC41OTYiLz48L2ZpbHRlcj48ZmlsdGVyIGlkPSJvIiB3aWR0aD0iNTQuODE0IiBoZWlnaHQ9IjY0LjY0NiIgeD0iOC4yNDQiIHk9Ii0yLjQxNiIgY29sb3ItaW50ZXJwb2xhdGlvbi1maWx0ZXJzPSJzUkdCIiBmaWx0ZXJVbml0cz0idXNlclNwYWNlT25Vc2UiPjxmZUZsb29kIGZsb29kLW9wYWNpdHk9IjAiIHJlc3VsdD0iQmFja2dyb3VuZEltYWdlRml4Ii8+PGZlQmxlbmQgaW49IlNvdXJjZUdyYXBoaWMiIGluMj0iQmFja2dyb3VuZEltYWdlRml4IiByZXN1bHQ9InNoYXBlIi8+PGZlR2F1c3NpYW5CbHVyIHJlc3VsdD0iZWZmZWN0MV9mb3JlZ3JvdW5kQmx1cl8yMDAyXzE3MTU4IiBzdGREZXZpYXRpb249IjQuNTk2Ii8+PC9maWx0ZXI+PGZpbHRlciBpZD0icCIgd2lkdGg9IjM5LjQwOSIgaGVpZ2h0PSI0My42MjMiIHg9IjE4LjcxMyIgeT0iMTAuNTg4IiBjb2xvci1pbnRlcnBvbGF0aW9uLWZpbHRlcnM9InNSR0IiIGZpbHRlclVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PGZlRmxvb2QgZmxvb2Qtb3BhY2l0eT0iMCIgcmVzdWx0PSJCYWNrZ3JvdW5kSW1hZ2VGaXgiLz48ZmVCbGVuZCBpbj0iU291cmNlR3JhcGhpYyIgaW4yPSJCYWNrZ3JvdW5kSW1hZ2VGaXgiIHJlc3VsdD0ic2hhcGUiLz48ZmVHYXVzc2lhbkJsdXIgcmVzdWx0PSJlZmZlY3QxX2ZvcmVncm91bmRCbHVyXzIwMDJfMTcxNTgiIHN0ZERldmlhdGlvbj0iNC41OTYiLz48L2ZpbHRlcj48L2RlZnM+PC9zdmc+" alt="RDS" style="height:38px;width:auto;display:block;" />
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

    // Check if digest is enabled + allowed days (read-only settings)
    const settingsData = await supaFetch(`/rest/v1/settings?key=in.(daily_digest_enabled,daily_digest_days)&select=key,value`);
    const settingsMap = {};
    if (Array.isArray(settingsData)) settingsData.forEach(r => { settingsMap[r.key] = r.value; });

    if (settingsMap["daily_digest_enabled"] === "false") {
      console.log("Daily digest is disabled via settings.");
      return res.status(200).json({ message: "Daily digest is disabled." });
    }

    // Check allowed days (0=Sun,1=Mon,...6=Sat). Default: Mon–Sat (1,2,3,4,5,6)
    const allowedDays = (settingsMap["daily_digest_days"] || "1,2,3,4,5,6")
      .split(",").map(Number);
    const todayDow = istDate.getDay(); // 0=Sun
    if (!allowedDays.includes(todayDow)) {
      console.log(`Daily digest skipped — ${["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][todayDow]} not in allowed days.`);
      return res.status(200).json({ message: `Skipped: today not in scheduled days.` });
    }

    // ── ATOMIC idempotency claim ──────────────────────────────────────────────
    // WRITE first, read second — prevents race condition where two concurrent
    // Vercel executions both pass the check before either stamps the date.
    //
    // Step 1: PATCH only if value != today (atomic conditional update)
    const claimPatch = await fetch(
      `${SUPA_URL}/rest/v1/settings?key=eq.last_digest_date&value=neq.${today}`,
      { method: "PATCH",
        headers: { "apikey": SUPA_WRITE_KEY, "Authorization": `Bearer ${SUPA_WRITE_KEY}`,
                   "Content-Type": "application/json", "Prefer": "return=representation" },
        body: JSON.stringify({ value: today }) }
    );
    let claimed = false;
    if (claimPatch.ok) {
      const rows = await claimPatch.json().catch(() => []);
      if (Array.isArray(rows) && rows.length > 0) { claimed = true; console.log(`Claimed last_digest_date=${today} via PATCH`); }
    }

    if (!claimed) {
      // Row didn't exist yet — try INSERT with ignore-duplicates so only ONE concurrent
      // request wins (the other gets 0 rows back and bails).
      const claimInsert = await fetch(`${SUPA_URL}/rest/v1/settings`, {
        method: "POST",
        headers: { "apikey": SUPA_WRITE_KEY, "Authorization": `Bearer ${SUPA_WRITE_KEY}`,
                   "Content-Type": "application/json",
                   "Prefer": "resolution=ignore-duplicates,return=representation" },
        body: JSON.stringify({ key: "last_digest_date", value: today })
      });
      if (claimInsert.ok) {
        const rows = await claimInsert.json().catch(() => []);
        if (Array.isArray(rows) && rows.length > 0) { claimed = true; console.log(`Claimed last_digest_date=${today} via INSERT`); }
      }
    }

    if (!claimed) {
      // Either already stamped today (race lost) or stamp failed entirely.
      // Re-read to distinguish the two cases.
      const check = await supaFetch(`/rest/v1/settings?key=eq.last_digest_date&select=value`);
      const currentVal = Array.isArray(check) && check[0]?.value;
      if (currentVal === today) {
        console.log(`Daily digest already ran for ${today} — duplicate suppressed.`);
        return res.status(200).json({ message: `Already sent for ${today}. Duplicate suppressed.` });
      }
      // Stamp failed for unknown reason — log but proceed (better than silent skip).
      console.warn(`last_digest_date stamp failed (current=${currentVal}) — proceeding anyway to avoid missing digest.`);
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
