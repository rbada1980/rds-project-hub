-- Add missing columns to task_revisions table
-- Run this in your Supabase SQL Editor

ALTER TABLE task_revisions ADD COLUMN IF NOT EXISTS detailer text;
ALTER TABLE task_revisions ADD COLUMN IF NOT EXISTS checker text;
ALTER TABLE task_revisions ADD COLUMN IF NOT EXISTS hours numeric;
ALTER TABLE task_revisions ADD COLUMN IF NOT EXISTS updated_at timestamptz;

-- Reload the schema cache so PostgREST picks up the new columns
NOTIFY pgrst, 'reload schema';
