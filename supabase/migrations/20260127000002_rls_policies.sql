-- =============================================
-- Row Level Security (RLS) Policies
-- =============================================

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Get current user's role
create or replace function public.get_my_role()
returns user_role
language sql
stable
security definer
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- Check if user has specific role
create or replace function public.has_role(target_role user_role)
returns boolean
language sql
stable
security definer
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = target_role
  );
$$;

-- Check if user is admin
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
as $$
  select has_role('admin');
$$;

-- Check if user is instructor
create or replace function public.is_instructor()
returns boolean
language sql
stable
security definer
as $$
  select has_role('instructor');
$$;

-- Check if user is student
create or replace function public.is_student()
returns boolean
language sql
stable
security definer
as $$
  select has_role('student');
$$;

-- =============================================
-- ENABLE RLS
-- =============================================
alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.materials enable row level security;
alter table public.course_enrollments enable row level security;

-- =============================================
-- PROFILES POLICIES
-- =============================================

-- Users can view their own profile
create policy "profiles: users can view own profile"
on public.profiles
for select
using (auth.uid() = id);

-- Admins can view all profiles
create policy "profiles: admins can view all"
on public.profiles
for select
using (is_admin());

-- Instructors can view student profiles (for enrolled students)
create policy "profiles: instructors can view students"
on public.profiles
for select
using (
  is_instructor() and role = 'student'
);

-- Users can update their own profile (except role)
create policy "profiles: users can update own profile"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id and role = (select role from public.profiles where id = auth.uid()));

-- Admins can update any profile (including roles)
create policy "profiles: admins can update all"
on public.profiles
for update
using (is_admin())
with check (is_admin());

-- =============================================
-- COURSES POLICIES
-- =============================================

-- Everyone authenticated can view courses
create policy "courses: all authenticated users can view"
on public.courses
for select
using (auth.uid() is not null);

-- Admins can create courses
create policy "courses: admins can create"
on public.courses
for insert
with check (is_admin());

-- Admins can update any course
create policy "courses: admins can update"
on public.courses
for update
using (is_admin())
with check (is_admin());

-- Admins can delete courses
create policy "courses: admins can delete"
on public.courses
for delete
using (is_admin());

-- =============================================
-- MATERIALS POLICIES
-- =============================================

-- Students can view materials for courses they're enrolled in
create policy "materials: students can view enrolled course materials"
on public.materials
for select
using (
  is_student() and exists (
    select 1 from public.course_enrollments
    where course_id = materials.course_id
    and student_id = auth.uid()
  )
);

-- Instructors can view materials for their courses
create policy "materials: instructors can view own course materials"
on public.materials
for select
using (
  is_instructor() and exists (
    select 1 from public.courses
    where id = materials.course_id
    and instructor_id = auth.uid()
  )
);

-- Admins can view all materials
create policy "materials: admins can view all"
on public.materials
for select
using (is_admin());

-- Instructors can upload materials to their courses
create policy "materials: instructors can upload to own courses"
on public.materials
for insert
with check (
  is_instructor() and
  uploader_id = auth.uid() and
  exists (
    select 1 from public.courses
    where id = materials.course_id
    and instructor_id = auth.uid()
  )
);

-- Instructors can update their own materials
create policy "materials: instructors can update own materials"
on public.materials
for update
using (is_instructor() and uploader_id = auth.uid())
with check (is_instructor() and uploader_id = auth.uid());

-- Instructors can delete their own materials
create policy "materials: instructors can delete own materials"
on public.materials
for delete
using (is_instructor() and uploader_id = auth.uid());

-- Admins can manage all materials
create policy "materials: admins can manage all"
on public.materials
for all
using (is_admin())
with check (is_admin());

-- =============================================
-- COURSE ENROLLMENTS POLICIES
-- =============================================

-- Students can view their own enrollments
create policy "enrollments: students can view own"
on public.course_enrollments
for select
using (is_student() and student_id = auth.uid());

-- Instructors can view enrollments for their courses
create policy "enrollments: instructors can view own course enrollments"
on public.course_enrollments
for select
using (
  is_instructor() and exists (
    select 1 from public.courses
    where id = course_enrollments.course_id
    and instructor_id = auth.uid()
  )
);

-- Admins can view all enrollments
create policy "enrollments: admins can view all"
on public.course_enrollments
for select
using (is_admin());

-- Admins can enroll students
create policy "enrollments: admins can enroll students"
on public.course_enrollments
for insert
with check (is_admin());

-- Admins can remove enrollments
create policy "enrollments: admins can remove enrollments"
on public.course_enrollments
for delete
using (is_admin());

-- Students can unenroll themselves (optional - remove if you want admin-only)
create policy "enrollments: students can unenroll themselves"
on public.course_enrollments
for delete
using (is_student() and student_id = auth.uid());
