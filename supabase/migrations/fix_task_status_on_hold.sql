-- ============================================================
-- Fix: Add "On Hold" to tasks.status allowed values
-- Run in Supabase → SQL Editor (safe to run multiple times)
-- ============================================================

-- Step 1: Drop by known name first (in case it already exists)
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;

-- Step 2: Drop ANY other status-related check constraint (auto-named ones)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT tc.constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.check_constraints cc
      ON tc.constraint_name = cc.constraint_name
    WHERE tc.table_name = 'tasks'
      AND tc.constraint_type = 'CHECK'
      AND cc.check_clause ILIKE '%status%'
  LOOP
    EXECUTE 'ALTER TABLE tasks DROP CONSTRAINT IF EXISTS ' || quote_ident(r.constraint_name);
    RAISE NOTICE 'Dropped constraint: %', r.constraint_name;
  END LOOP;
END $$;

-- Step 3: Add fresh constraint with all valid statuses
ALTER TABLE tasks
  ADD CONSTRAINT tasks_status_check
  CHECK (status IN (
    'Not Yet Started',
    'In Progress',
    'Completed',
    'On Hold'
  ));

-- Done! "On Hold" is now a valid task status.
