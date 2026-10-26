-- ════════════════════════════════════════════════════════════════════
-- SESSION ENFORCEMENT — Add active_session_token column to users table
-- Run this in Supabase SQL Editor:
-- supabase.com/dashboard/project/qxpsbewbgdwkermxeeso/sql
-- ════════════════════════════════════════════════════════════════════

-- 1. Add the session token column (nullable — no enforcement until user logs in)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS active_session_token TEXT DEFAULT NULL;

-- 2. Index for fast lookup (optional but good practice)
CREATE INDEX IF NOT EXISTS idx_users_active_session_token
  ON public.users (active_session_token)
  WHERE active_session_token IS NOT NULL;

-- 3. Grant permissions (service role already has full access, this is for completeness)
-- GRANT UPDATE (active_session_token) ON public.users TO service_role;

-- Done! The app will now enforce single active sessions automatically.
-- Existing logged-in sessions are unaffected until the next login.
