-- ============================================================================
-- CREATE NOTIFICATIONS NOW - Run this in Supabase SQL Editor
-- This will immediately create deadline reminder notifications
-- ============================================================================

-- Step 0: Ensure RLS is enabled and policies exist
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policy to ensure it's correct
DROP POLICY IF EXISTS "notifications_own" ON notifications;
CREATE POLICY "notifications_own" ON notifications
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Allow service role to insert (for background jobs)
DROP POLICY IF EXISTS "notifications_service_insert" ON notifications;
CREATE POLICY "notifications_service_insert" ON notifications
    FOR INSERT TO authenticated
    WITH CHECK (true);

-- Step 1: Create notifications for all students with upcoming assessments
INSERT INTO notifications (user_id, title, message, type, reference_type, reference_id, metadata, status)
SELECT 
    p.id,
    '⏰ Upcoming: ' || a.title,
    'Due on ' || to_char(a.due_date, 'Mon DD at HH:MI AM') || ' for ' || c.title,
    'reminder',
    'assessment',
    a.id,
    jsonb_build_object(
        'course_title', c.title,
        'course_code', c.code,
        'due_date', a.due_date,
        'assessment_title', a.title
    ),
    'unread'
FROM assessments a
JOIN courses c ON a.course_id = c.id
CROSS JOIN profiles p
WHERE p.role = 'student'
AND p.id IS NOT NULL
AND a.due_date > NOW()
AND a.due_date < NOW() + INTERVAL '14 days'
AND NOT EXISTS (
    SELECT 1 FROM submissions s 
    WHERE s.assessment_id = a.id AND s.student_id = p.id
);

-- Step 2: Show what was created
SELECT 
    p.full_name as student,
    n.title,
    n.message,
    n.status,
    n.created_at
FROM notifications n
JOIN profiles p ON n.user_id = p.id
WHERE n.type = 'reminder'
AND n.created_at > NOW() - INTERVAL '1 minute'
ORDER BY n.created_at DESC;

-- Step 3: Count notifications created
SELECT 
    '✅ Notifications created!' as status,
    COUNT(*) as total_notifications
FROM notifications 
WHERE type = 'reminder'
AND created_at > NOW() - INTERVAL '1 minute';
