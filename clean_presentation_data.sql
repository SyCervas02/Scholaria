-- ==============================================================================
-- SCHOLARIA — Presentation Database Sanitization & Flush Script
-- ==============================================================================
-- PURPOSE:
--   Flushes out all random test entries, inappropriate chat messages, test quizzes,
--   fake quiz submissions, temporary uploads, AND deletes all test user accounts
--   EXCEPT the 3 official demo presentation accounts.
--
-- ACCOUNTS PRESERVED (EXACTLY 3 DEMO ACCOUNTS):
--   1. Admin:   Mr. S. Llorente Jr.   (demo-admin@scholaria.test / HWA-A-DEMO)
--   2. Teacher: Benedict Callanta     (demo-teacher@scholaria.test / HWA-T-DEMO)
--   3. Student: Joseph Andrew Asis    (demo-student@scholaria.test / HWA-DEMO-001)
--
-- SAFETY GUARANTEES:
--   - DOES NOT drop or alter any table schemas, constraints, types, or RLS policies.
--   - DOES NOT touch the 'public.subjects' table (all 100 curriculum subjects preserved).
--   - RESETS moderation strikes and un-mutes the demo accounts.
-- ==============================================================================

BEGIN;

-- 1. FLUSH CHAT & MODERATION DATA (Purges all test conversations and profanities)
TRUNCATE TABLE public.chat_violations CASCADE;
TRUNCATE TABLE public.messages CASCADE;
TRUNCATE TABLE public.conversation_participants CASCADE;
TRUNCATE TABLE public.conversations CASCADE;

-- 2. FLUSH ASSESSMENT & STUDENT PERFORMANCE DATA (Purges all test submissions)
TRUNCATE TABLE public.quiz_attempts CASCADE;
TRUNCATE TABLE public.class_records CASCADE;

-- 3. FLUSH TEST QUIZZES & TEST LEARNING MATERIALS
TRUNCATE TABLE public.quizzes CASCADE;
TRUNCATE TABLE public.materials CASCADE;
TRUNCATE TABLE public.teacher_lessons CASCADE;

-- 4. RESET USER MODERATION FLAGS & STRIKES ON REMAINING DEMO ACCOUNTS
UPDATE public.users
SET profanity_strikes = 0,
    muted_until = NULL,
    permanently_muted = false,
    online_status = 'online',
    status_message = NULL;

-- 6. REMOVE ALL USER ACCOUNTS EXCEPT THE OFFICIAL DEMO ACCOUNTS
-- First delete from auth.users (cascades to public.users)
DELETE FROM auth.users
WHERE email NOT IN (
  'demo-student@scholaria.test',
  'demo-teacher@scholaria.test',
  'demo-admin@scholaria.test'
);

-- Delete any remaining non-demo accounts from public.users
DELETE FROM public.users
WHERE email NOT IN (
  'demo-student@scholaria.test',
  'demo-teacher@scholaria.test',
  'demo-admin@scholaria.test'
);

COMMIT;

-- ==============================================================================
-- VERIFICATION CHECK (Confirm exactly 3 demo accounts remain):
-- ==============================================================================
SELECT 'Remaining Users' AS item, count(*) AS count FROM public.users
UNION ALL
SELECT 'Quizzes', count(*) FROM public.quizzes
UNION ALL
SELECT 'Materials', count(*) FROM public.materials
UNION ALL
SELECT 'Messages', count(*) FROM public.messages
UNION ALL
SELECT 'Chat Violations', count(*) FROM public.chat_violations
UNION ALL
SELECT 'Quiz Attempts', count(*) FROM public.quiz_attempts
UNION ALL
SELECT 'Curriculum Subjects (Preserved)', count(*) FROM public.subjects;

-- Show the exact 3 demo accounts that remain:
SELECT id, full_name, role, school_id, email, is_demo, profanity_strikes 
FROM public.users;
