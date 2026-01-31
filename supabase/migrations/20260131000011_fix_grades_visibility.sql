-- =============================================
-- Fix Grades Visibility - Only Show Verified Grades to Students
-- Migration: 20260131000011
-- =============================================

-- Drop the old policy that allowed students to see all their grades
DROP POLICY IF EXISTS "grades: students can view own" ON public.grades;

-- Create the new policy that only allows viewing verified grades
CREATE POLICY "grades: students can view own verified"
	ON public.grades FOR SELECT
	USING (
		is_student() AND
		verified = TRUE AND
		EXISTS (
			SELECT 1 FROM submissions
			WHERE submissions.id = grades.submission_id
			AND submissions.student_id = auth.uid()
		)
	);

-- Add comment for documentation
COMMENT ON POLICY "grades: students can view own verified" ON grades IS 'Students can only view their own verified grades, not unverified ones';
