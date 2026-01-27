-- =============================================
-- Initial Schema: Profiles, Courses, Materials
-- =============================================

-- Create enum for user roles
create type user_role as enum ('admin', 'instructor', 'student');

-- =============================================
-- PROFILES TABLE
-- =============================================
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text unique not null,
  full_name text,
  role user_role not null default 'student',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- =============================================
-- COURSES TABLE
-- =============================================
create table public.courses (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  code text unique not null, -- e.g., "CS101"
  created_by uuid references public.profiles(id) on delete set null,
  instructor_id uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- =============================================
-- MATERIALS TABLE
-- =============================================
create table public.materials (
  id uuid default gen_random_uuid() primary key,
  course_id uuid references public.courses(id) on delete cascade not null,
  title text not null,
  description text,
  file_name text not null,
  file_path text not null, -- Storage path: course_id/filename
  file_size bigint,
  file_type text,
  uploader_id uuid references public.profiles(id) on delete set null not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- =============================================
-- COURSE ENROLLMENTS TABLE (Students in courses)
-- =============================================
create table public.course_enrollments (
  id uuid default gen_random_uuid() primary key,
  course_id uuid references public.courses(id) on delete cascade not null,
  student_id uuid references public.profiles(id) on delete cascade not null,
  enrolled_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(course_id, student_id)
);

-- =============================================
-- INDEXES
-- =============================================
create index idx_profiles_role on public.profiles(role);
create index idx_courses_instructor on public.courses(instructor_id);
create index idx_courses_created_by on public.courses(created_by);
create index idx_materials_course on public.materials(course_id);
create index idx_materials_uploader on public.materials(uploader_id);
create index idx_enrollments_course on public.course_enrollments(course_id);
create index idx_enrollments_student on public.course_enrollments(student_id);

-- =============================================
-- TRIGGERS FOR UPDATED_AT
-- =============================================
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.handle_updated_at();

create trigger courses_updated_at before update on public.courses
  for each row execute function public.handle_updated_at();

create trigger materials_updated_at before update on public.materials
  for each row execute function public.handle_updated_at();

-- =============================================
-- AUTO-CREATE PROFILE ON USER SIGNUP
-- =============================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'student')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
