-- ==============================================================================
-- SCHOLARIA: Enable 'TVL' Strand in Postgres Check Constraints
-- Run this in the Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- ==============================================================================

-- 1. Update check constraint on public.users
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_strand_check;
ALTER TABLE public.users ADD CONSTRAINT users_strand_check 
  CHECK (strand IS NULL OR (strand = ANY (ARRAY['STEM'::text, 'HUMSS'::text, 'ABM'::text, 'TVL'::text])));

-- 2. Update check constraint on public.materials (for TVL handouts and notes)
ALTER TABLE public.materials DROP CONSTRAINT IF EXISTS materials_strand_check;
ALTER TABLE public.materials ADD CONSTRAINT materials_strand_check 
  CHECK (strand IS NULL OR (strand = ANY (ARRAY['STEM'::text, 'HUMSS'::text, 'ABM'::text, 'TVL'::text])));

-- 3. Update check constraint on public.subjects (for TVL curriculum subjects)
ALTER TABLE public.subjects DROP CONSTRAINT IF EXISTS subjects_strand_check;
ALTER TABLE public.subjects ADD CONSTRAINT subjects_strand_check 
  CHECK (strand = ANY (ARRAY['STEM'::text, 'HUMSS'::text, 'ABM'::text, 'TVL'::text]));
