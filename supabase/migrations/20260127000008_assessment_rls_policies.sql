-- =============================================
-- Assessment RLS Policies
-- This migration adds RLS policies for the assessments table
-- =============================================

-- Enable RLS on assessments table
alter table public.assessments enable row level security;

-- Drop existing policies if they exist
drop policy if exists "assessments: students can view all" on public.assessments;
drop policy if exists "assessments: instructors can view all" on public.assessments;
drop policy if exists "assessments: instructors can create" on public.assessments;
drop policy if exists "assessments: instructors can update own" on public.assessments;
drop policy if exists "assessments: instructors can delete own" on public.assessments;
drop policy if exists "assessments: admins can manage all" on public.assessments;

-- Students can view all assessments
create policy "assessments: students can view all"
on public.assessments
for select
using (is_student());

-- Instructors can view all assessments
create policy "assessments: instructors can view all"
on public.assessments
for select
using (is_instructor());

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
