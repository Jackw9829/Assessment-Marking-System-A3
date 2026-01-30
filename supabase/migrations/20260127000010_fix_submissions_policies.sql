-- =============================================
-- Fix Submissions RLS Policies
-- Allow students to submit and view their submissions
-- Allow instructors to view all submissions for grading
-- =============================================

-- Enable RLS on submissions if not already enabled
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE grades ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 1. SUBMISSIONS POLICIES
-- =============================================

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "submissions: admins full access" ON submissions;
DROP POLICY IF EXISTS "submissions: instructors can view own course submissions" ON submissions;
DROP POLICY IF EXISTS "submissions: students can view own" ON submissions;
DROP POLICY IF EXISTS "submissions: students can submit to enrolled courses" ON submissions;
DROP POLICY IF EXISTS "submissions: students can update own ungraded" ON submissions;
DROP POLICY IF EXISTS "submissions: all authenticated can view" ON submissions;
DROP POLICY IF EXISTS "submissions: students can submit" ON submissions;
DROP POLICY IF EXISTS "submissions: instructors can view all" ON submissions;

-- Students can view their own submissions
CREATE POLICY "submissions: students can view own"
ON submissions FOR SELECT
USING (is_student() AND student_id = auth.uid());

-- Students can create submissions (simplified - no enrollment check for now)
CREATE POLICY "submissions: students can submit"
ON submissions FOR INSERT
WITH CHECK (is_student() AND student_id = auth.uid());

-- Instructors can view all submissions
CREATE POLICY "submissions: instructors can view all"
ON submissions FOR SELECT
USING (is_instructor());

-- Admins have full access
CREATE POLICY "submissions: admins full access"
ON submissions FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- =============================================
-- 2. GRADES POLICIES
-- =============================================

-- Drop existing policies
DROP POLICY IF EXISTS "grades: admins full access" ON grades;
DROP POLICY IF EXISTS "grades: instructors can create" ON grades;
DROP POLICY IF EXISTS "grades: instructors can view own" ON grades;
DROP POLICY IF EXISTS "grades: students can view own" ON grades;
DROP POLICY IF EXISTS "grades: instructors can view all" ON grades;

-- Students can view their own grades (via submission)
CREATE POLICY "grades: students can view own"
ON grades FOR SELECT
USING (
    is_student() AND
    EXISTS (
        SELECT 1 FROM submissions
        WHERE submissions.id = grades.submission_id
        AND submissions.student_id = auth.uid()
    )
);

-- Instructors can view all grades
CREATE POLICY "grades: instructors can view all"
ON grades FOR SELECT
USING (is_instructor());

-- Instructors can create grades
CREATE POLICY "grades: instructors can create"
ON grades FOR INSERT
WITH CHECK (is_instructor() AND graded_by = auth.uid());

-- Instructors can update their own grades
CREATE POLICY "grades: instructors can update own"
ON grades FOR UPDATE
USING (is_instructor() AND graded_by = auth.uid())
WITH CHECK (is_instructor() AND graded_by = auth.uid());

-- Admins have full access
CREATE POLICY "grades: admins full access"
ON grades FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- =============================================
-- 3. STORAGE POLICIES FOR SUBMISSIONS
-- =============================================

-- Allow students to upload submission files
DROP POLICY IF EXISTS "storage: students can upload submissions" ON storage.objects;

CREATE POLICY "storage: students can upload submissions"
ON storage.objects
FOR INSERT
WITH CHECK (
    bucket_id = 'course-materials' AND
    (SELECT has_role('student'))
);

-- Allow students to view their own submission files
DROP POLICY IF EXISTS "storage: students can view own submissions" ON storage.objects;

CREATE POLICY "storage: students can view submissions"
ON storage.objects
FOR SELECT
USING (
    bucket_id = 'course-materials' AND
    auth.uid() IS NOT NULL
);
