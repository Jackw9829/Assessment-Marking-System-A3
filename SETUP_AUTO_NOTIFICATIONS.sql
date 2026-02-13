-- ============================================================================
-- AUTOMATED DEADLINE NOTIFICATIONS - Run this in Supabase SQL Editor
-- This creates triggers to automatically generate notifications
-- ============================================================================

-- ============================================================================
-- APPROACH 1: Create notifications directly when assessments are created
-- ============================================================================

-- Function to create notifications for a new assessment
CREATE OR REPLACE FUNCTION create_assessment_notifications()
RETURNS TRIGGER AS $$
DECLARE
    v_student RECORD;
    v_course_title TEXT;
    v_days_until_due INTEGER;
BEGIN
    -- Get course title
    SELECT title INTO v_course_title FROM courses WHERE id = NEW.course_id;
    
    -- Calculate days until due
    v_days_until_due := EXTRACT(DAY FROM (NEW.due_date - NOW()));
    
    -- Create notification for ALL students (not just enrolled ones)
    FOR v_student IN 
        SELECT id, full_name FROM profiles WHERE role = 'student'
    LOOP
        INSERT INTO notifications (
            user_id,
            title,
            message,
            type,
            reference_type,
            reference_id,
            metadata,
            status
        ) VALUES (
            v_student.id,
            '📝 New Assessment: ' || NEW.title,
            'Due on ' || to_char(NEW.due_date, 'Mon DD at HH:MI AM') || ' for ' || v_course_title,
            'reminder',
            'assessment',
            NEW.id,
            jsonb_build_object(
                'course_title', v_course_title,
                'due_date', NEW.due_date,
                'assessment_title', NEW.title,
                'notification_type', 'new_assessment'
            ),
            'unread'
        );
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on assessment creation
DROP TRIGGER IF EXISTS notify_on_assessment_create ON assessments;
CREATE TRIGGER notify_on_assessment_create
    AFTER INSERT ON assessments
    FOR EACH ROW
    EXECUTE FUNCTION create_assessment_notifications();

-- ============================================================================
-- APPROACH 2: Function to process scheduled reminders and create notifications
-- Can be called by pg_cron or manually
-- ============================================================================

CREATE OR REPLACE FUNCTION process_due_reminders()
RETURNS INTEGER AS $$
DECLARE
    v_reminder RECORD;
    v_count INTEGER := 0;
    v_course_title TEXT;
BEGIN
    -- Process all pending reminders that are due
    FOR v_reminder IN
        SELECT 
            sr.id as reminder_id,
            sr.assessment_id,
            sr.student_id,
            a.title as assessment_title,
            a.due_date,
            rs.days_before,
            rs.hours_before,
            a.course_id
        FROM scheduled_reminders sr
        JOIN assessments a ON sr.assessment_id = a.id
        JOIN reminder_schedules rs ON sr.schedule_id = rs.id
        WHERE sr.status = 'pending'
        AND sr.scheduled_for <= NOW()
        AND a.due_date > NOW()  -- Only for active assessments
        AND NOT EXISTS (
            SELECT 1 FROM submissions s 
            WHERE s.assessment_id = sr.assessment_id 
            AND s.student_id = sr.student_id
        )
    LOOP
        -- Get course title
        SELECT title INTO v_course_title FROM courses WHERE id = v_reminder.course_id;
        
        -- Create notification
        INSERT INTO notifications (
            user_id,
            title,
            message,
            type,
            reference_type,
            reference_id,
            metadata,
            status
        ) VALUES (
            v_reminder.student_id,
            CASE 
                WHEN v_reminder.days_before = 0 THEN '🚨 Due in ' || v_reminder.hours_before || ' hours: ' || v_reminder.assessment_title
                WHEN v_reminder.days_before = 1 THEN '⏰ Due tomorrow: ' || v_reminder.assessment_title
                ELSE '📅 Due in ' || v_reminder.days_before || ' days: ' || v_reminder.assessment_title
            END,
            v_reminder.assessment_title || ' is due on ' || to_char(v_reminder.due_date, 'Mon DD at HH:MI AM'),
            'reminder',
            'assessment',
            v_reminder.assessment_id,
            jsonb_build_object(
                'course_title', v_course_title,
                'due_date', v_reminder.due_date,
                'days_before', v_reminder.days_before,
                'hours_before', v_reminder.hours_before
            ),
            'unread'
        );
        
        -- Mark reminder as sent
        UPDATE scheduled_reminders 
        SET status = 'sent', sent_at = NOW(), updated_at = NOW()
        WHERE id = v_reminder.reminder_id;
        
        v_count := v_count + 1;
    END LOOP;
    
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- APPROACH 3: Use pg_cron to run every 5 minutes (if available)
-- ============================================================================

-- Check if pg_cron is available
DO $$
BEGIN
    -- Try to create cron job
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        -- Remove existing job if exists
        PERFORM cron.unschedule('process_deadline_reminders');
        
        -- Schedule to run every 5 minutes
        PERFORM cron.schedule(
            'process_deadline_reminders',
            '*/5 * * * *',  -- Every 5 minutes
            'SELECT process_due_reminders()'
        );
        
        RAISE NOTICE 'pg_cron job created: process_deadline_reminders runs every 5 minutes';
    ELSE
        RAISE NOTICE 'pg_cron not available - reminders will be created on assessment creation only';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'pg_cron setup skipped: %', SQLERRM;
END;
$$;

-- ============================================================================
-- APPROACH 4: Create a webhook-triggered function (alternative to cron)
-- Call this URL periodically from external scheduler
-- ============================================================================

-- Grant execute permission
GRANT EXECUTE ON FUNCTION process_due_reminders() TO authenticated;
GRANT EXECUTE ON FUNCTION process_due_reminders() TO anon;

-- ============================================================================
-- TEST: Process any existing due reminders now
-- ============================================================================

SELECT process_due_reminders() as reminders_processed;

-- ============================================================================
-- VERIFY: Show recent notifications
-- ============================================================================

SELECT 
    p.full_name as student,
    n.title,
    n.status,
    n.created_at
FROM notifications n
JOIN profiles p ON n.user_id = p.id
WHERE n.type = 'reminder'
ORDER BY n.created_at DESC
LIMIT 10;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

SELECT '✅ Automated notifications configured!' as status,
       'New assessments will automatically notify all students' as info;
