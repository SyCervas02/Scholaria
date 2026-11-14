-- Scholaria Profile Customizability & Presence Schema Migration
-- Run this in your Supabase SQL Editor to support custom avatar, bio, status, and contact details.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS online_status text DEFAULT 'online' CHECK (online_status = ANY (ARRAY['online'::text, 'away'::text, 'busy'::text, 'offline'::text])),
  ADD COLUMN IF NOT EXISTS status_message text,
  ADD COLUMN IF NOT EXISTS contact_number text,
  ADD COLUMN IF NOT EXISTS last_active_at timestamp with time zone DEFAULT now();

-- Ensure users can update their own profile fields
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
CREATE POLICY "Users can update their own profile"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
