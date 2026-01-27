-- =============================================
-- Storage Bucket and Policies
-- =============================================

-- Create the storage bucket for course materials
insert into storage.buckets (id, name, public)
values ('course-materials', 'course-materials', false)
on conflict (id) do nothing;

-- =============================================
-- STORAGE POLICIES
-- =============================================

-- Instructors can upload files to their course folders
-- Path format: {course_id}/{filename}
create policy "storage: instructors can upload to own courses"
on storage.objects
for insert
with check (
  bucket_id = 'course-materials' and
  (select has_role('instructor')) and
  (
    -- Verify the instructor owns the course in the path
    select exists (
      select 1 from public.courses
      where id::text = (storage.foldername(name))[1]
      and instructor_id = auth.uid()
    )
  )
);

-- Instructors can update/delete their own files
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
  (select has_role('instructor')) and
  owner = auth.uid()
);

create policy "storage: instructors can delete own files"
on storage.objects
for delete
using (
  bucket_id = 'course-materials' and
  (select has_role('instructor')) and
  owner = auth.uid()
);

-- Students can download files from courses they're enrolled in
create policy "storage: students can download enrolled course materials"
on storage.objects
for select
using (
  bucket_id = 'course-materials' and
  (select has_role('student')) and
  (
    -- Verify student is enrolled in the course
    select exists (
      select 1 from public.course_enrollments ce
      where ce.course_id::text = (storage.foldername(name))[1]
      and ce.student_id = auth.uid()
    )
  )
);

-- Instructors can view files from their courses
create policy "storage: instructors can view own course files"
on storage.objects
for select
using (
  bucket_id = 'course-materials' and
  (select has_role('instructor')) and
  (
    select exists (
      select 1 from public.courses
      where id::text = (storage.foldername(name))[1]
      and instructor_id = auth.uid()
    )
  )
);

-- Admins can manage all files
create policy "storage: admins can manage all files"
on storage.objects
for all
using (
  bucket_id = 'course-materials' and
  (select has_role('admin'))
)
with check (
  bucket_id = 'course-materials' and
  (select has_role('admin'))
);
