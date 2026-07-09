-- Run this in:
-- 1. Local PostgreSQL: psql -U postgres -d rds_local -f create_push_table.sql
-- 2. Supabase SQL Editor (paste and run)

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id        SERIAL PRIMARY KEY,
  username  TEXT NOT NULL,
  endpoint  TEXT NOT NULL,
  p256dh    TEXT NOT NULL,
  auth      TEXT NOT NULL,
  origin    TEXT NOT NULL DEFAULT 'offline',  -- 'offline' or 'online'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(username, endpoint)
);

-- Index for fast lookup by username
CREATE INDEX IF NOT EXISTS idx_push_subs_username ON push_subscriptions(username);
