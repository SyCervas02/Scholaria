-- ============================================================
-- SCHOLARIA — Learning Materials storage setup
-- Run this in the Supabase SQL Editor AFTER scholaria_auth_schema.sql
-- (it depends on public.users and public.is_admin() from that file).
-- Safe to re-run.
--
-- This is the storage-layer half of the centralized learning material
-- feature. public.materials (already defined in scholaria_auth_schema.sql)
-- holds the metadata + approval status; this file creates the actual
-- file bucket and the rules for who can touch objects in it.
--
-- Access model:
--   - Bucket is PRIVATE. No public URLs, ever.
--   - Only teacher/admin roles can upload (insert) objects.
--   - Any authenticated user can read objects at the storage layer —
--     but in practice students never get a direct storage URL. They
--     only get a short-lived signed URL from the server's
--     GET /api/materials/:id/download route, and that route only
--     signs URLs for materials with status = 'approved'. That's the
--     real gate; storage RLS is the backstop.
--   - Only the uploader or an admin can update/delete an object.
-- ============================================================

insert into storage.buckets (id, name, public)
values ('learning-materials', 'learning-materials', false)
on conflict (id) do nothing;

drop policy if exists "Teachers and admins upload files" on storage.objects;
create policy "Teachers and admins upload files"
  on storage.objects for insert
  with check (
    bucket_id = 'learning-materials'
    and exists (
      select 1 from public.users
      where id = auth.uid() and role in ('teacher','admin') and is_active = true
    )
  );

drop policy if exists "Authenticated users read files" on storage.objects;
create policy "Authenticated users read files"
  on storage.objects for select
  using (bucket_id = 'learning-materials' and auth.role() = 'authenticated');

drop policy if exists "Owners and admins update files" on storage.objects;
create policy "Owners and admins update files"
  on storage.objects for update
  using (bucket_id = 'learning-materials' and (owner = auth.uid() or public.is_admin()));

drop policy if exists "Owners and admins delete files" on storage.objects;
create policy "Owners and admins delete files"
  on storage.objects for delete
  using (bucket_id = 'learning-materials' and (owner = auth.uid() or public.is_admin()));
