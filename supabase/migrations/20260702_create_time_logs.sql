-- ─────────────────────────────────────────────
--  Task Time Logging
--  Run in Supabase Studio → SQL Editor
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS time_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id           UUID NOT NULL,
  project_id        UUID NOT NULL,
  user_id           UUID NOT NULL,
  user_name         TEXT NOT NULL,
  duration_minutes  INTEGER NOT NULL DEFAULT 0,
  logged_date       DATE NOT NULL DEFAULT CURRENT_DATE,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Fast lookups by task, project, user
CREATE INDEX IF NOT EXISTS idx_time_logs_task    ON time_logs(task_id);
CREATE INDEX IF NOT EXISTS idx_time_logs_project ON time_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_time_logs_user    ON time_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_time_logs_date    ON time_logs(logged_date DESC);

-- RLS — enabled, access controlled at app layer
ALTER TABLE time_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "time_logs_all" ON time_logs FOR ALL USING (true) WITH CHECK (true);
