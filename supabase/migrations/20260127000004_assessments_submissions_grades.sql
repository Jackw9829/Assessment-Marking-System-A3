-- =============================================
-- Assessments, Submissions, Grades
-- Run after 20260127000001/02/03
-- =============================================

-- =============================================
-- TABLES
-- =============================================

create table if not exists public.assessments (
  id uuid default gen_random_uuid() primary key,
  course_id uuid references public.courses(id) on delete cascade not null,
  title text not null,
  description text,
  due_date timestamp with time zone,
  total_marks integer not null default 100 check (total_marks > 0),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.submissions (
  id uuid default gen_random_uuid() primary key,
  assessment_id uuid references public.assessments(id) on delete cascade not null,
  student_id uuid references public.profiles(id) on delete cascade not null,
  file_name text not null,
  file_path text not null,
  file_type text,
  file_size bigint,
  status text default 'submitted',
  submitted_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (assessment_id, student_id)
);

create table if not exists public.grades (
  id uuid default gen_random_uuid() primary key,
  submission_id uuid references public.submissions(id) on delete cascade not null,
  graded_by uuid references public.profiles(id) on delete set null,
  score integer not null check (score >= 0),
  total_marks integer not null check (total_marks > 0),
  feedback text,
  graded_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (submission_id)
);

-- =============================================
-- INDEXES
-- =============================================
create index if not exists idx_assessments_course on public.assessments(course_id);
create index if not exists idx_assessments_due_date on public.assessments(due_date);
create index if not exists idx_submissions_assessment on public.submissions(assessment_id);
create index if not exists idx_submissions_student on public.submissions(student_id);
create index if not exists idx_grades_submission on public.grades(submission_id);

-- =============================================
-- TRIGGERS FOR UPDATED_AT
-- =============================================
create trigger assessments_updated_at before update on public.assessments
  for each row execute function public.handle_updated_at();

create trigger submissions_updated_at before update on public.submissions
  for each row execute function public.handle_updated_at();

create trigger grades_updated_at before update on public.grades
  for each row execute function public.handle_updated_at();

-- =============================================
-- ENABLE RLS
-- =============================================
alter table public.assessments enable row level security;
alter table public.submissions enable row level security;
alter table public.grades enable row level security;

-- =============================================
-- ASSESSMENTS POLICIES
-- =============================================

-- Authenticated users can view assessments if they are enrolled (students), teach the course (instructors), or are admins
create policy "assessments: view by role" on public.assessments for select
using (
  auth.uid() is not null and (
    is_admin()
    or exists (
      select 1 from public.courses c
      where c.id = assessments.course_id
      and c.instructor_id = auth.uid()
    )
    or exists (
      select 1 from public.course_enrollments ce
      where ce.course_id = assessments.course_id
      and ce.student_id = auth.uid()
    )
  )
);

-- Instructors can create assessments for their courses; admins can create any
create policy "assessments: instructors/admins can insert" on public.assessments for insert
with check (
  is_admin() or (
    is_instructor() and exists (
      select 1 from public.courses c
      where c.id = assessments.course_id
      and c.instructor_id = auth.uid()
    )
  )
);

-- Instructors can update/delete assessments for their courses; admins can update/delete any
create policy "assessments: instructors/admins can update" on public.assessments for update
using (
  is_admin() or (
    is_instructor() and exists (
      select 1 from public.courses c
      where c.id = assessments.course_id
      and c.instructor_id = auth.uid()
    )
  )
)
with check (
  is_admin() or (
    is_instructor() and exists (
      select 1 from public.courses c
      where c.id = assessments.course_id
      and c.instructor_id = auth.uid()
    )
  )
);

create policy "assessments: instructors/admins can delete" on public.assessments for delete
using (
  is_admin() or (
    is_instructor() and exists (
      select 1 from public.courses c
      where c.id = assessments.course_id
      and c.instructor_id = auth.uid()
    )
  )
);

-- =============================================
-- SUBMISSIONS POLICIES
-- =============================================

-- Students can view their own submissions; instructors/admins can view submissions for their courses
create policy "submissions: view by role" on public.submissions for select
using (
  is_admin()
  or (is_student() and student_id = auth.uid())
  or (
    is_instructor() and exists (
      select 1 from public.assessments a
      join public.courses c on c.id = a.course_id
      where a.id = submissions.assessment_id
      and c.instructor_id = auth.uid()
    )
  )
);

-- Students can submit to assessments for courses they are enrolled in
create policy "submissions: students can insert" on public.submissions for insert
with check (
  is_student()
  and student_id = auth.uid()
  and exists (
    select 1 from public.assessments a
    join public.course_enrollments ce on ce.course_id = a.course_id
    where a.id = submissions.assessment_id
    and ce.student_id = auth.uid()
  )
);

-- (Optional) allow students to update their own submissions; comment out to forbid edits
create policy "submissions: students can update own" on public.submissions for update
using (is_student() and student_id = auth.uid())
with check (is_student() and student_id = auth.uid());

-- Instructors can delete submissions for their courses; admins can delete any
create policy "submissions: instructors/admins can delete" on public.submissions for delete
using (
  is_admin() or (
    is_instructor() and exists (
      select 1 from public.assessments a
      join public.courses c on c.id = a.course_id
      where a.id = submissions.assessment_id
      and c.instructor_id = auth.uid()
    )
  )
);

-- =============================================
-- GRADES POLICIES
-- =============================================

-- Students can view grades for their own submissions; instructors/admins can view grades for their courses
create policy "grades: view by role" on public.grades for select
using (
  is_admin()
  or exists (
    select 1 from public.submissions s
    where s.id = grades.submission_id
    and s.student_id = auth.uid()
  )
  or (
    is_instructor() and exists (
      select 1 from public.submissions s
      join public.assessments a on a.id = s.assessment_id
      join public.courses c on c.id = a.course_id
      where s.id = grades.submission_id
      and c.instructor_id = auth.uid()
    )
  )
);

-- Instructors can insert/update grades for submissions in their courses; admins can insert/update any
create policy "grades: instructors/admins can insert" on public.grades for insert
with check (
  is_admin() or (
    is_instructor() and exists (
      select 1 from public.submissions s
      join public.assessments a on a.id = s.assessment_id
      join public.courses c on c.id = a.course_id
      where s.id = grades.submission_id
      and c.instructor_id = auth.uid()
    )
  )
);

create policy "grades: instructors/admins can update" on public.grades for update
using (
  is_admin() or (
    is_instructor() and exists (
      select 1 from public.submissions s
      join public.assessments a on a.id = s.assessment_id
      join public.courses c on c.id = a.course_id
      where s.id = grades.submission_id
      and c.instructor_id = auth.uid()
    )
  )
)
with check (
  is_admin() or (
    is_instructor() and exists (
      select 1 from public.submissions s
      join public.assessments a on a.id = s.assessment_id
      join public.courses c on c.id = a.course_id
      where s.id = grades.submission_id
      and c.instructor_id = auth.uid()
    )
  )
);

create policy "grades: instructors/admins can delete" on public.grades for delete
using (
  is_admin() or (
    is_instructor() and exists (
      select 1 from public.submissions s
      join public.assessments a on a.id = s.assessment_id
      join public.courses c on c.id = a.course_id
      where s.id = grades.submission_id
      and c.instructor_id = auth.uid()
    )
  )
);
