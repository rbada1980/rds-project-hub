-- ============================================================
-- RDS Realtime Sync — Supabase Setup SQL
-- Run this ONCE in Supabase → SQL Editor
-- ============================================================

-- Step 1: Add updated_at column to tables that don't have it
-- (tasks already has it from the nightly sync)

ALTER TABLE projects ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE users    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE clients  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Step 2: Create trigger function to auto-update updated_at on every row change

CREATE OR REPLACE FUNCTION _rds_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Attach triggers to each table

DROP TRIGGER IF EXISTS _rds_trg_tasks_updated_at    ON tasks;
DROP TRIGGER IF EXISTS _rds_trg_projects_updated_at ON projects;
DROP TRIGGER IF EXISTS _rds_trg_users_updated_at    ON users;
DROP TRIGGER IF EXISTS _rds_trg_clients_updated_at  ON clients;

CREATE TRIGGER _rds_trg_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION _rds_set_updated_at();

CREATE TRIGGER _rds_trg_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION _rds_set_updated_at();

CREATE TRIGGER _rds_trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION _rds_set_updated_at();

CREATE TRIGGER _rds_trg_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION _rds_set_updated_at();

-- Step 4: Enable Realtime for all four tables
-- (This adds them to the supabase_realtime publication)

ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE projects;
ALTER PUBLICATION supabase_realtime ADD TABLE users;
ALTER PUBLICATION supabase_realtime ADD TABLE clients;

-- Done! ✅
-- Now run start-realtime-sync.bat on the LAN server PC.
