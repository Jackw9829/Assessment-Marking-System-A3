-- =============================================
-- Migration: Allow Instructors to Create Courses
-- Date: 2026-02-12
-- Description: Adds RLS policies for instructors to create and manage courses
-- =============================================

-- Allow instructors to create courses
CREATE POLICY "courses: instructors can create"
ON public.courses
FOR INSERT
WITH CHECK (
    is_instructor() AND
    (
        instructor_id = auth.uid() OR
        created_by = auth.uid()
    )
);

-- Allow instructors to update courses they created or are assigned to
CREATE POLICY "courses: instructors can update own"
ON public.courses
FOR UPDATE
USING (
    is_instructor() AND
    (
        instructor_id = auth.uid() OR
        created_by = auth.uid()
    )
)
WITH CHECK (
    is_instructor() AND
    (
        instructor_id = auth.uid() OR
        created_by = auth.uid()
    )
);

-- Allow instructors to delete courses they created
CREATE POLICY "courses: instructors can delete own"
ON public.courses
FOR DELETE
USING (
    is_instructor() AND
    created_by = auth.uid()
);
