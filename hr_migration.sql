-- HR Dashboard Migration
-- Run this in Supabase SQL Editor (https://supabase.com/dashboard → SQL Editor)

-- 1. Add HR fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS employee_id VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS date_of_joining DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS leave_balance JSONB DEFAULT '{"annual":15,"sick":6,"casual":6,"annual_used":0,"sick_used":0,"casual_used":0}'::jsonb;

-- 2. Create holidays table
CREATE TABLE IF NOT EXISTS holidays (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  date DATE NOT NULL,
  type TEXT DEFAULT 'public',  -- national | festival | public | company
  year INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS holidays_year_idx ON holidays(year);
CREATE INDEX IF NOT EXISTS holidays_date_idx ON holidays(date);

-- Done! Go back to the app and click "Run HR Setup" in the dashboard.
