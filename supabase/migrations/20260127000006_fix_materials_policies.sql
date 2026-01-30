-- =============================================
-- Fix Materials RLS Policies
-- This migration relaxes the materials policies to allow any instructor to view/upload materials
-- =============================================

-- Drop the overly restrictive policies
drop policy if exists "materials: instructors can view own course materials" on public.materials;
drop policy if exists "materials: instructors can upload to own courses" on public.materials;

-- Allow all instructors to view materials (course ownership validation done at app level)
create policy "materials: instructors can view all materials"
on public.materials
for select
using (is_instructor());

-- Allow all instructors to upload materials (course ownership validation done at app level)
create policy "materials: instructors can insert materials"
on public.materials
for insert
with check (
  is_instructor() and
  uploader_id = auth.uid()
);
