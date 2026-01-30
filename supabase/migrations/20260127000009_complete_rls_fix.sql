-- =============================================
-- COMPLETE RLS FIX - Run this in Supabase SQL Editor
-- This script fixes all visibility issues for courses, materials, and assessments
-- =============================================

-- =============================================
-- 1. COURSES - Ensure all authenticated users can view
-- =============================================
drop policy if exists "courses: all authenticated users can view" on public.courses;

create policy "courses: all authenticated users can view"
on public.courses
for select
using (auth.uid() is not null);

-- =============================================
-- 2. MATERIALS - Fix visibility for all roles
-- =============================================
drop policy if exists "materials: students can view enrolled course materials" on public.materials;
drop policy if exists "materials: students can view all materials" on public.materials;
drop policy if exists "materials: instructors can view own course materials" on public.materials;
drop policy if exists "materials: instructors can view all course materials" on public.materials;
drop policy if exists "materials: instructors can view all materials" on public.materials;
drop policy if exists "materials: instructors can upload to own courses" on public.materials;
drop policy if exists "materials: instructors can insert materials" on public.materials;

-- All authenticated users can view materials
create policy "materials: all authenticated users can view"
on public.materials
for select
using (auth.uid() is not null);

-- Instructors can insert materials
create policy "materials: instructors can insert"
on public.materials
for insert
with check (is_instructor() and uploader_id = auth.uid());

-- Instructors can update their own materials
drop policy if exists "materials: instructors can update own materials" on public.materials;
create policy "materials: instructors can update own"
on public.materials
for update
using (is_instructor() and uploader_id = auth.uid())
with check (is_instructor() and uploader_id = auth.uid());

-- Instructors can delete their own materials
drop policy if exists "materials: instructors can delete own materials" on public.materials;
create policy "materials: instructors can delete own"
on public.materials
for delete
using (is_instructor() and uploader_id = auth.uid());

-- Admins can manage all materials
drop policy if exists "materials: admins can view all" on public.materials;
drop policy if exists "materials: admins can manage all" on public.materials;
create policy "materials: admins can manage all"
on public.materials
for all
using (is_admin())
with check (is_admin());

-- =============================================
-- 3. ASSESSMENTS - Fix visibility for all roles
-- =============================================
alter table public.assessments enable row level security;

drop policy if exists "assessments: students can view all" on public.assessments;
drop policy if exists "assessments: instructors can view all" on public.assessments;
drop policy if exists "assessments: instructors can create" on public.assessments;
drop policy if exists "assessments: instructors can update own" on public.assessments;
drop policy if exists "assessments: instructors can delete own" on public.assessments;
drop policy if exists "assessments: admins can manage all" on public.assessments;

-- All authenticated users can view assessments
create policy "assessments: all authenticated users can view"
on public.assessments
for select
using (auth.uid() is not null);

-- Instructors can create assessments
create policy "assessments: instructors can create"
on public.assessments
for insert
with check (is_instructor() and created_by = auth.uid());

-- Instructors can update their own assessments
create policy "assessments: instructors can update own"
on public.assessments
for update
using (is_instructor() and created_by = auth.uid())
with check (is_instructor() and created_by = auth.uid());

-- Instructors can delete their own assessments
create policy "assessments: instructors can delete own"
on public.assessments
for delete
using (is_instructor() and created_by = auth.uid());

-- Admins can manage all assessments
create policy "assessments: admins can manage all"
on public.assessments
for all
using (is_admin())
with check (is_admin());

-- =============================================
-- 4. STORAGE - Fix file upload/download
-- =============================================
drop policy if exists "storage: instructors can upload to own courses" on storage.objects;
drop policy if exists "storage: instructors can upload materials" on storage.objects;

-- Allow instructors to upload files
create policy "storage: instructors can upload"
on storage.objects
for insert
with check (
  bucket_id = 'course-materials' and
  (select has_role('instructor'))
);

-- Allow all authenticated users to download files
drop policy if exists "storage: students can download enrolled course materials" on storage.objects;
drop policy if exists "storage: instructors can view own course files" on storage.objects;
drop policy if exists "storage: instructors can view all course files" on storage.objects;

create policy "storage: authenticated users can download"
on storage.objects
for select
using (
  bucket_id = 'course-materials' and
  auth.uid() is not null
);

-- =============================================
-- DONE - All visibility issues should be fixed
-- =============================================
