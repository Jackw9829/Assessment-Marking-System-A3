-- ================================================
-- Fix: Allow instructors and admins to update submissions
-- This is needed for changing status from 'submitted' to 'graded'
-- ================================================

-- Allow instructors to update submission status (needed for grading)
CREATE POLICY "submissions: instructors can update status"
    ON submissions FOR UPDATE
    USING (is_instructor())
    WITH CHECK (is_instructor());

-- Also ensure admins can update submissions
CREATE POLICY "submissions: admins can update"
    ON submissions FOR UPDATE
    USING (is_admin())
    WITH CHECK (is_admin());
