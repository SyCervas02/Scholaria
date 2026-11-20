-- Run once in the Supabase SQL Editor to enable shared, live announcements.
-- Announcement contents are stored in payload; audience controls which
-- authenticated roles/strands can read the row through Postgres RLS.

create table if not exists public.school_announcements (
  id text primary key,
  created_by uuid not null references public.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists school_announcements_created_by_idx
  on public.school_announcements(created_by);

alter table public.school_announcements enable row level security;
grant select, insert, update, delete on public.school_announcements to authenticated;

drop policy if exists "Read announcements for audience" on public.school_announcements;
create policy "Read announcements for audience"
  on public.school_announcements for select to authenticated
  using (
    created_by = auth.uid()
    or public.is_admin()
    or exists (
      select 1
      from public.users u
      where u.id = auth.uid()
        and u.is_active = true
        and (
          (u.role = 'student' and (
            coalesce(payload->'audience', '["All Students", "All Teachers"]'::jsonb) ? 'All Students'
            or coalesce(payload->'audience', '[]'::jsonb) ? (coalesce(u.strand, '') || ' Strand')
          ))
          or (u.role = 'teacher' and coalesce(payload->'audience', '["All Students", "All Teachers"]'::jsonb) ? 'All Teachers')
        )
    )
  );

drop policy if exists "Teachers and admins create announcements" on public.school_announcements;
create policy "Teachers and admins create announcements"
  on public.school_announcements for insert to authenticated
  with check (
    (created_by = auth.uid() or public.is_admin())
    and exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.is_active = true and u.role in ('teacher', 'admin')
    )
  );

drop policy if exists "Authors and admins update announcements" on public.school_announcements;
create policy "Authors and admins update announcements"
  on public.school_announcements for update to authenticated
  using (created_by = auth.uid() or public.is_admin())
  with check (created_by = auth.uid() or public.is_admin());

drop policy if exists "Authors and admins delete announcements" on public.school_announcements;
create policy "Authors and admins delete announcements"
  on public.school_announcements for delete to authenticated
  using (created_by = auth.uid() or public.is_admin());

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.school_announcements;
  end if;
exception
  when duplicate_object then null;
end $$;
