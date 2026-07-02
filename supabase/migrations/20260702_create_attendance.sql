-- ─────────────────────────────────────────────
--  Employee Attendance Tracking
--  Run in Supabase Studio → SQL Editor
-- ─────────────────────────────────────────────

-- 1. attendance: one row per user per calendar day
CREATE TABLE IF NOT EXISTS attendance (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL,
  user_name            TEXT NOT NULL,
  date                 DATE NOT NULL DEFAULT CURRENT_DATE,
  login_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  logout_at            TIMESTAMPTZ,
  total_work_minutes   INTEGER NOT NULL DEFAULT 0,
  total_break_minutes  INTEGER NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, date)
);

-- 2. breaks: each break session linked to an attendance row
CREATE TABLE IF NOT EXISTS breaks (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attendance_id     UUID NOT NULL REFERENCES attendance(id) ON DELETE CASCADE,
  break_start       TIMESTAMPTZ NOT NULL DEFAULT now(),
  break_end         TIMESTAMPTZ,
  duration_minutes  INTEGER NOT NULL DEFAULT 0
);

-- 3. Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_attendance_user_date ON attendance(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_breaks_attendance    ON breaks(attendance_id);

-- 4. RLS — enable but allow all (access controlled in app layer via anon key)
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE breaks     ENABLE ROW LEVEL SECURITY;

CREATE POLICY "attendance_all" ON attendance FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "breaks_all"     ON breaks     FOR ALL USING (true) WITH CHECK (true);
