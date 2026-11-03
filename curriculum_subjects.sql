-- Shared subjects created in the administrator Materials Manager.
-- Run this once in the Supabase SQL editor for the Scholaria project.
CREATE TABLE IF NOT EXISTS public.curriculum_subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  code text NOT NULL,
  grade_level text NOT NULL CHECK (grade_level IN ('Grade 11', 'Grade 12')),
  strand text NOT NULL CHECK (strand IN ('STEM', 'HUMSS', 'ABM', 'TVL')),
  track text NOT NULL CHECK (track IN ('Core', 'Applied', 'Specialized', 'Elective')),
  section text NOT NULL,
  description text,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (code, grade_level, strand, section)
);

ALTER TABLE public.curriculum_subjects ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.curriculum_subjects TO service_role;
