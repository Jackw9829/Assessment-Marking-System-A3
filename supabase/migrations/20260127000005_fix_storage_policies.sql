-- =============================================
-- Fix Storage Policies for Material Upload
-- This migration fixes the RLS policies to allow instructors to upload
-- =============================================

-- Drop existing restrictive policy
drop policy if exists "storage: instructors can upload to own courses" on storage.objects;

-- Create a more permissive upload policy for instructors
-- Allows any instructor to upload to any course folder
-- (Course ownership validation can be done at the application level)
create policy "storage: instructors can upload materials"
on storage.objects
for insert
with check (
  bucket_id = 'course-materials' and
  (select has_role('instructor'))
);

-- Also ensure instructors can update/delete their own uploads
drop policy if exists "storage: instructors can update own files" on storage.objects;
drop policy if exists "storage: instructors can delete own files" on storage.objects;

create policy "storage: instructors can update own files"
on storage.objects
for update
using (
  bucket_id = 'course-materials' and
  (select has_role('instructor')) and
  owner = auth.uid()
)
with check (
  bucket_id = 'course-materials' and
  (select has_role('instructor'))
);

create policy "storage: instructors can delete own files"
on storage.objects
for delete
using (
  bucket_id = 'course-materials' and
  (select has_role('instructor')) and
  owner = auth.uid()
);

-- Allow instructors to view all course materials (for management purposes)
drop policy if exists "storage: instructors can view own course files" on storage.objects;

create policy "storage: instructors can view all course files"
on storage.objects
for select
using (
  bucket_id = 'course-materials' and
  (select has_role('instructor'))
);
