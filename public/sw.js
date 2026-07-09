// RDS Project Hub — Service Worker
// Web Push notifications for ALL browsers (Chrome, Firefox, Edge, Safari 16.4+)

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));

// ── Push event: show rich notification ───────────────────────
self.addEventListener("push", event => {
  let data = {};
  try { data = event.data?.json() || {}; } catch {}

  const {
    title    = "RDS Project Hub",
    body     = "You have a new notification",
    employee = "",
    type     = "",
    time     = "",
    url      = "/",
    tag      = "rds-" + Date.now(),
    extra    = "",
  } = data;

  // Build body lines
  const lines = [];
  if (employee) lines.push("👤 " + employee);
  if (type)     lines.push("📋 " + type);
  if (body)     lines.push(body);
  if (extra)    lines.push(extra);
  if (time)     lines.push("🕐 " + time);

  event.waitUntil(
    self.registration.showNotification(title, {
      body:    lines.join("\n") || body,
      icon:    "/favicon.svg",
      badge:   "/favicon.svg",
      tag,
      data:    { url },
      actions: [
        { action: "view",    title: "👁 View Now" },
        { action: "dismiss", title: "✕ Dismiss"  },
      ],
      requireInteraction: false,
      vibrate: [200, 100, 200],
    })
  );
});

// ── Notification click ────────────────────────────────────────
self.addEventListener("notificationclick", event => {
  event.notification.close();
  if (event.action === "dismiss") return;

  const target = event.notification.data?.url || "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
      for (const c of list) {
        if (c.url.includes(self.location.origin) && "focus" in c) {
          if ("navigate" in c) c.navigate(self.location.origin + target);
          return c.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(target);
    })
  );
});
