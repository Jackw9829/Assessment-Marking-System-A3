-- =============================================
-- MANUAL SQL COMMANDS TO FIX GRADES VISIBILITY
-- Run in Supabase SQL Editor
-- =============================================

-- Step 1: Drop the old policy that shows all student grades
DROP POLICY IF EXISTS "grades: students can view own" ON public.grades;

-- Step 2: Create the new policy that only shows verified grades
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

-- Step 3: Verify the policy was created
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename = 'grades' AND policyname LIKE '%students%'
ORDER BY policyname;

-- Expected output: One row with policyname = 'grades: students can view own verified'

-- Step 4: Test the policy by checking permissions
-- (Run as different user contexts to verify)
-- SELECT COUNT(*) FROM grades WHERE verified = TRUE;
