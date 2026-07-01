-- Workflow Automation Rules
-- Run this once in Supabase Studio > SQL Editor

CREATE TABLE IF NOT EXISTS workflows (
  id            UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  name          TEXT          NOT NULL,
  trigger_event TEXT          NOT NULL,  -- 'status_changed' | 'task_assigned' | 'task_created'
  trigger_value TEXT,                    -- e.g. 'Review' (used with status_changed)
  action_type   TEXT          NOT NULL,  -- 'notify_checker' | 'notify_assignee' | 'notify_role' | 'change_status'
  action_target TEXT,                    -- role name or status value depending on action_type
  escalate_hours INTEGER,                -- optional: hours before escalation fires
  escalate_to   TEXT,                    -- role to escalate to (e.g. 'Manager')
  is_active     BOOLEAN       DEFAULT true,
  created_at    TIMESTAMPTZ   DEFAULT now()
);

-- Enable RLS (allow all authenticated reads/writes for now)
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated users" ON workflows
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Sample rules (optional — delete if not needed)
INSERT INTO workflows (name, trigger_event, trigger_value, action_type, action_target, escalate_hours, escalate_to) VALUES
  ('Notify checker on Review',    'status_changed', 'Review',    'notify_checker',  null,      24, 'Manager'),
  ('Notify assignee on new task', 'task_created',   null,        'notify_assignee', null,      null, null),
  ('Manager alert on In Progress','status_changed', 'In Progress','notify_role',    'Manager', null, null)
ON CONFLICT DO NOTHING;
