// email-notifications/notifications.js
// ─────────────────────────────────────────────────────────────────────────────
// RDS Project Hub — React Notification Utility
// Calls your Supabase Edge Function to send emails.
// Import this into App.jsx and call notify() at the right event points.
//
// Usage:
//   import { notify } from './email-notifications/notifications';
//   notify('task_completed', { taskName, projectName, completedBy, ... });
// ─────────────────────────────────────────────────────────────────────────────

// ── Your Supabase project URL (already in your App.jsx) ──────────────────────
const SUPA_URL    = "https://xypcbioltukahipkqqzc.supabase.co";
const SUPA_KEY    = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGNiaW9sdHVrYWhpcGtxcXpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0MzEzNjUsImV4cCI6MjA5NTAwNzM2NX0.DG5sv2bpx8j3Mmz0mqIsoDVaCMP2TmWqh-OQUfSZFRw";

// ── Default recipient if no email is available on a user ────────────────────
const ADMIN_EMAIL = "ramesh@ecovon.in";

// ── Edge Function endpoint ──────────────────────────────────────────────────
const NOTIFY_URL  = `${SUPA_URL}/functions/v1/notify`;

/**
 * Send an email notification via the Supabase Edge Function.
 * Fails silently — never breaks the main app flow.
 *
 * @param {"task_completed"|"status_change"|"deadline"|"task_assigned"} type
 * @param {Object} data   - Payload fields (see each notify* helper below)
 */
export async function notify(type, data) {
  // Skip if no meaningful data
  if (!type || !data?.taskName) return;

  try {
    await fetch(NOTIFY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPA_KEY,
        "Authorization": `Bearer ${SUPA_KEY}`,
      },
      body: JSON.stringify({ type, data: { ...data, recipientEmail: data.recipientEmail || ADMIN_EMAIL } }),
    });
    // Fire-and-forget — don't await result in most cases
  } catch {
    // Silently ignore — email failure must never interrupt task saves
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Convenience wrappers — pass these directly to notify() in App.jsx
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build payload for a completed task.
 * @param {Object} task       - The task object from state
 * @param {Object} project    - The project object
 * @param {Object} currentUser - The logged-in user (me)
 */
export function taskCompletedPayload(task, project, currentUser) {
  return {
    taskName:       task.title,
    projectName:    project?.name ?? "Unknown Project",
    completedBy:    currentUser?.name ?? "Unknown",
    completedAt:    new Date().toLocaleString("en-IN"),
    recipientEmail: ADMIN_EMAIL,
  };
}

/**
 * Build payload for a status change.
 */
export function statusChangePayload(task, project, oldStatus, newStatus, currentUser) {
  return {
    taskName:       task.title,
    projectName:    project?.name ?? "Unknown Project",
    oldStatus,
    newStatus,
    changedBy:      currentUser?.name ?? "Unknown",
    recipientEmail: ADMIN_EMAIL,
  };
}

/**
 * Build payload for a new task assignment.
 * @param {string} assigneeName   - Display name of the assignee
 * @param {string} assigneeEmail  - Email of the assignee (optional, falls back to admin)
 */
export function taskAssignedPayload(task, project, assigneeName, assigneeEmail, currentUser) {
  return {
    taskName:       task.title,
    projectName:    project?.name ?? "Unknown Project",
    assigneeName,
    assignedBy:     currentUser?.name ?? "Unknown",
    dueDate:        task.due_date ?? "",
    description:    "",
    recipientEmail: assigneeEmail || ADMIN_EMAIL,
  };
}

/**
 * Build payload for a deadline alert.
 * Used for the daily overdue check on the dashboard.
 */
export function deadlinePayload(task, project, daysRemaining, assigneeName, assigneeEmail) {
  return {
    taskName:       task.title,
    projectName:    project?.name ?? "Unknown Project",
    dueDate:        task.due_date,
    daysRemaining:  String(daysRemaining),
    assigneeName,
    recipientEmail: assigneeEmail || ADMIN_EMAIL,
  };
}
