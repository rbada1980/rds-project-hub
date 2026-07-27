-- ── Audit Log: Supabase Setup ─────────────────────────────────
-- Run this once in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS audit_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actor_id     UUID,
  actor_name   TEXT,
  actor_role   TEXT,
  entity_type  TEXT NOT NULL DEFAULT 'task',
  entity_id    UUID,
  entity_label TEXT,
  action       TEXT NOT NULL,
  field        TEXT,
  old_value    TEXT,
  new_value    TEXT,
  project_id   UUID
);

CREATE INDEX IF NOT EXISTS audit_logs_entity_idx  ON audit_logs (entity_id);
CREATE INDEX IF NOT EXISTS audit_logs_project_idx ON audit_logs (project_id);
CREATE INDEX IF NOT EXISTS audit_logs_created_idx ON audit_logs (created_at DESC);

-- Enable Row Level Security (open read for authenticated users, insert for all)
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "audit_logs_read"   ON audit_logs FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "audit_logs_insert" ON audit_logs FOR INSERT WITH CHECK (true);

-- Add to Realtime publication so online→LAN sync can pick it up if needed
ALTER PUBLICATION supabase_realtime ADD TABLE audit_logs;
