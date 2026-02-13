-- ============================================================================
-- QUICK FIX: Create Missing Calendar RPC Function
-- Run this in Supabase SQL Editor: Dashboard → SQL Editor → New Query
-- ============================================================================

-- Add missing columns to assessments table (safe to run multiple times)
ALTER TABLE assessments 
ADD COLUMN IF NOT EXISTS assessment_type text DEFAULT 'assignment',
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS is_published boolean DEFAULT true;

-- Drop existing function if exists
DROP FUNCTION IF EXISTS get_student_calendar_events(date, date);

-- Create the calendar events function
CREATE OR REPLACE FUNCTION get_student_calendar_events(
    p_start_date date,
    p_end_date date
)
RETURNS TABLE (
    id uuid,
    title text,
    description text,
    event_type text,
    course_id uuid,
    course_code text,
    course_name text,
    due_date timestamptz,
    assessment_type text,
    submission_status text,
    is_submitted boolean,
    submitted_at timestamptz,
    total_marks integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.title::text,
        a.description::text,
        'assessment'::text as event_type,
        c.id as course_id,
        c.code::text as course_code,
        c.title::text as course_name,
        a.due_date,
        COALESCE(a.assessment_type::text, 'assignment')::text as assessment_type,
        CASE 
            WHEN s.id IS NOT NULL AND s.status = 'graded' THEN 'graded'
            WHEN s.id IS NOT NULL THEN 'submitted'
            WHEN a.due_date < NOW() THEN 'overdue'
            ELSE 'pending'
        END::text as submission_status,
        (s.id IS NOT NULL) as is_submitted,
        s.submitted_at,
        a.total_marks
    FROM assessments a
    INNER JOIN courses c ON a.course_id = c.id
    INNER JOIN course_enrollments ce ON ce.course_id = c.id AND ce.student_id = auth.uid()
    LEFT JOIN submissions s ON s.assessment_id = a.id AND s.student_id = auth.uid()
    WHERE 
        a.due_date >= p_start_date::timestamptz
        AND a.due_date < (p_end_date + INTERVAL '1 day')::timestamptz
        AND COALESCE(a.is_active, true) = true
        AND COALESCE(a.is_published, true) = true
    ORDER BY a.due_date ASC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_student_calendar_events(date, date) TO authenticated;

-- Verify function was created
SELECT 'SUCCESS: get_student_calendar_events function created!' as status
WHERE EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_student_calendar_events');
