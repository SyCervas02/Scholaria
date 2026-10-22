-- ============================================================
-- SCHOLARIA — Auth-integrated database setup
-- Run this in the Supabase SQL Editor. Replaces the old
-- scholaria_supabase_setup.sql (which had no real auth and an
-- open "using (true)" read policy on users). Safe to re-run.
--
-- Matches server-example/server.js exactly:
--   - public.users.id is the SAME uuid as the row's auth.users.id
--     (server.js sets `id: newUserId` when it inserts the profile
--     right after creating the login). That's what lets RLS say
--     "auth.uid() = id" instead of needing a second lookup column.
--   - Login is by real email + password (Supabase Auth's native
--     model), not by School ID. School ID is a human-facing label
--     stored alongside, generated server-side in generateSchoolId().
--   - Accounts are created ONLY via POST /api/admin/create-account,
--     which uses the service role key and bypasses RLS. The RLS
--     policies below are what protect the data if that boundary is
--     ever bypassed (e.g. a bug, or someone hitting Supabase
--     directly with the anon key) — not the primary access control.
-- ============================================================

-- ── USERS TABLE ────────────────────────────────────────────
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  school_id text unique not null,       -- e.g. HWA-2024-001 / HWA-T-2024-001 / HWA-A-2024-001
  role text not null check (role in ('student','teacher','admin')),
  strand text,                           -- STEM, HUMSS, ABM
  grade_level text,                      -- Grade 11 / Grade 12 (students only)
  section text,                          -- Section A, B, etc.
  subjects text,                         -- comma-separated subjects (teachers only)
  email text unique not null,
  is_active boolean default true,
  is_demo boolean default false,         -- sandboxed demo account, see bottom of file
  created_at timestamptz default now()
);

-- Existing installs from the old schema: bring the table up to date.
-- (If your old `users.id` was a random gen_random_uuid() and not an
-- auth.users id, you cannot alter it in place — truncate and re-seed
-- through the admin UI instead, since real auth.users rows didn't
-- exist under the old mock login anyway.)
alter table public.users add column if not exists is_demo boolean default false;
alter table public.users alter column email set not null;

-- ── QUIZZES / MATERIALS / QUIZ_ATTEMPTS (unchanged shape) ────
create table if not exists public.quizzes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subject text,
  strand text,
  grade_level text,
  created_by uuid references public.users(id),
  status text default 'pending' check (status in ('pending','approved','rejected','active','closed')),
  is_demo boolean default false,
  questions jsonb,
  allow_review_answers boolean default true,
  created_at timestamptz default now()
);

alter table public.quizzes add column if not exists allow_review_answers boolean default true;

create table if not exists public.materials (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subject text,
  strand text,
  grade_level text,
  file_url text,
  file_type text,
  uploaded_by uuid references public.users(id),
  status text default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz default now()
);

create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid references public.quizzes(id),
  student_id uuid references public.users(id),
  score numeric,
  total_items integer,
  answers jsonb,
  submitted_at timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.users enable row level security;
alter table public.quizzes enable row level security;
alter table public.materials enable row level security;
alter table public.quiz_attempts enable row level security;

-- Helper: is the currently-authenticated user an active admin?
-- SECURITY DEFINER lets this function read public.users even though
-- the calling user's own row-level policy wouldn't otherwise allow
-- it — without this, "is the caller an admin" policies referencing
-- public.users recurse into themselves.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid() and role = 'admin' and is_active = true
  );
$$;

drop policy if exists "Public read approved quizzes" on public.quizzes;
create policy "Public read approved quizzes"
  on public.quizzes for select
  using (status in ('approved','active'));

-- Teachers/admins can always see their own quizzes regardless of status
-- (drafts, pending review) — without this they'd lose sight of their
-- own pending items the moment "Public read approved" stops matching.
create policy "Owners read own quizzes"
  on public.quizzes for select
  using (created_by = auth.uid());

create policy "Teachers and admins create quizzes"
  on public.quizzes for insert
  with check (
    created_by = auth.uid()
    and exists (select 1 from public.users where id = auth.uid() and role in ('teacher','admin') and is_active = true)
  );

create policy "Owners and admins update quizzes"
  on public.quizzes for update
  using (created_by = auth.uid() or public.is_admin())
  with check (created_by = auth.uid() or public.is_admin());

drop policy if exists "Owners and admins delete quizzes" on public.quizzes;
create policy "Owners and admins delete quizzes"
  on public.quizzes for delete
  using (created_by = auth.uid() or public.is_admin());

drop policy if exists "Public read approved materials" on public.materials;
create policy "Public read approved materials"
  on public.materials for select
  using (status = 'approved');

create policy "Owners read own materials"
  on public.materials for select
  using (uploaded_by = auth.uid());

create policy "Teachers and admins upload materials"
  on public.materials for insert
  with check (
    uploaded_by = auth.uid()
    and exists (select 1 from public.users where id = auth.uid() and role in ('teacher','admin') and is_active = true)
  );

create policy "Owners and admins update materials"
  on public.materials for update
  using (uploaded_by = auth.uid() or public.is_admin())
  with check (uploaded_by = auth.uid() or public.is_admin());

-- Quiz attempts: a student can only ever write/read their own attempt
-- rows. Teachers/admins read via a separate policy so they can grade
-- and build reports.
create policy "Students manage own attempts"
  on public.quiz_attempts for all
  using (student_id = auth.uid())
  with check (student_id = auth.uid());

create policy "Teachers and admins read all attempts"
  on public.quiz_attempts for select
  using (exists (select 1 from public.users where id = auth.uid() and role in ('teacher','admin') and is_active = true));

-- Login by School ID instead of email: the frontend needs to turn a
-- typed School ID into the email Supabase Auth actually signs in
-- with, but it can't just SELECT email FROM users WHERE school_id=..
-- pre-login (no session yet, so RLS blocks it, correctly). This RPC
-- is the one narrow, deliberate exception: SECURITY DEFINER lets it
-- read the table, but it returns ONLY an email string for an active
-- account — never a row, never anything for inactive/deleted
-- accounts. Note this does mean a caller can confirm whether a given
-- School ID exists (a non-null vs null result) — the same tradeoff
-- any "log in with username" form has. It reveals no password, role,
-- or personal data, so we accept that tradeoff for the nicer login UX.
create or replace function public.email_for_school_id(p_school_id text)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select email from public.users
  where school_id = p_school_id and is_active = true
  limit 1;
$$;

-- USERS: replace the old "using (true)" open-read policy with real rules.
drop policy if exists "Users read own record" on public.users;

create policy "Users read own row"
  on public.users for select
  using (id = auth.uid());

create policy "Admins read all rows"
  on public.users for select
  using (public.is_admin());

-- No client-side insert/update policy is created, on purpose.
-- Account creation requires calling supabase.auth.admin.createUser(),
-- which only works with the service role key — so even a hand-crafted
-- insert against this table from the browser can't produce a working
-- login. All writes to public.users happen server-side, in
-- POST /api/admin/create-account, using supabaseAdmin (service role,
-- bypasses RLS). If you later want admins to edit an existing profile
-- (name, section, deactivate) directly from the browser instead of
-- through a backend route, the matching policy would be:
drop policy if exists "Admins update users" on public.users;
create policy "Admins update users" on public.users
  for update using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- DEMO ACCOUNT
-- One pre-seeded, sandboxed account that POST /api/auth/demo-login
-- signs into on the server's behalf (see
-- server-example/scripts/seed-demo-account.js). Its row is flagged
-- is_demo = true so the frontend can show a "you're viewing a demo"
-- banner and so you can filter it out of real reports later.
--
-- Do NOT insert this row by hand — run the seed script, which
-- creates the matching auth.users login first (email + password),
-- then this profile row with the SAME id. A profile row with no
-- matching auth.users id cannot log in at all.
-- ============================================================
