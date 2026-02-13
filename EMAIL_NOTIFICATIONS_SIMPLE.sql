-- ============================================================================
-- EMAIL NOTIFICATIONS - Simple Queue System
-- Run this in Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- STEP 1: Update notification trigger to also queue emails
-- ============================================================================

CREATE OR REPLACE FUNCTION create_assessment_notifications()
RETURNS TRIGGER AS $$
DECLARE
    v_student RECORD;
    v_course_title TEXT;
    v_notification_id UUID;
BEGIN
    -- Get course title
    SELECT title INTO v_course_title FROM courses WHERE id = NEW.course_id;
    
    -- Create notification AND queue email for ALL students
    FOR v_student IN 
        SELECT id, full_name, email FROM profiles WHERE role = 'student'
    LOOP
        -- Create dashboard notification
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
        )
        RETURNING id INTO v_notification_id;
        
        -- Queue email notification (if student has email)
        IF v_student.email IS NOT NULL THEN
            INSERT INTO email_queue (
                notification_id,
                recipient_email,
                recipient_name,
                subject,
                body_html,
                body_text,
                status,
                scheduled_for
            ) VALUES (
                v_notification_id,
                v_student.email,
                v_student.full_name,
                '📝 New Assessment: ' || NEW.title || ' - Due ' || to_char(NEW.due_date, 'Mon DD'),
                '<html>
                <body style="font-family: Arial, sans-serif; padding: 20px;">
                    <h2 style="color: #4F46E5;">📚 EduConnect AMS</h2>
                    <p>Hi ' || COALESCE(v_student.full_name, 'Student') || ',</p>
                    <div style="background: #FEF3C7; padding: 15px; border-radius: 8px; margin: 15px 0;">
                        <strong>New Assessment Posted!</strong><br><br>
                        <strong>Title:</strong> ' || NEW.title || '<br>
                        <strong>Course:</strong> ' || v_course_title || '<br>
                        <strong>Due Date:</strong> ' || to_char(NEW.due_date, 'Day, Month DD, YYYY at HH:MI AM') || '
                    </div>
                    <p>Log in to view details and submit your work.</p>
                    <p style="color: #6B7280; font-size: 12px;">
                        This is an automated message from EduConnect Assessment & Marking System.
                    </p>
                </body>
                </html>',
                'New Assessment: ' || NEW.title || ' for ' || v_course_title || '. Due: ' || to_char(NEW.due_date, 'Mon DD at HH:MI AM'),
                'pending',
                NOW()
            );
        END IF;
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
DROP TRIGGER IF EXISTS notify_on_assessment_create ON assessments;
CREATE TRIGGER notify_on_assessment_create
    AFTER INSERT ON assessments
    FOR EACH ROW
    EXECUTE FUNCTION create_assessment_notifications();

-- ============================================================================
-- STEP 2: Update reminder processor to also queue emails
-- ============================================================================

CREATE OR REPLACE FUNCTION process_due_reminders()
RETURNS INTEGER AS $$
DECLARE
    v_reminder RECORD;
    v_count INTEGER := 0;
    v_course_title TEXT;
    v_student_email TEXT;
    v_student_name TEXT;
    v_notification_id UUID;
    v_time_text TEXT;
BEGIN
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
        AND a.due_date > NOW()
        AND NOT EXISTS (
            SELECT 1 FROM submissions s 
            WHERE s.assessment_id = sr.assessment_id 
            AND s.student_id = sr.student_id
        )
    LOOP
        -- Get course and student info
        SELECT title INTO v_course_title FROM courses WHERE id = v_reminder.course_id;
        SELECT email, full_name INTO v_student_email, v_student_name 
        FROM profiles WHERE id = v_reminder.student_id;
        
        -- Calculate time text
        v_time_text := CASE 
            WHEN v_reminder.days_before = 0 THEN v_reminder.hours_before || ' hours'
            WHEN v_reminder.days_before = 1 THEN '1 day'
            ELSE v_reminder.days_before || ' days'
        END;
        
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
        )
        RETURNING id INTO v_notification_id;
        
        -- Queue email notification
        IF v_student_email IS NOT NULL THEN
            INSERT INTO email_queue (
                notification_id,
                recipient_email,
                recipient_name,
                subject,
                body_html,
                body_text,
                status,
                scheduled_for
            ) VALUES (
                v_notification_id,
                v_student_email,
                v_student_name,
                CASE 
                    WHEN v_reminder.days_before = 0 THEN '🚨 URGENT: ' || v_reminder.assessment_title || ' due in ' || v_time_text
                    ELSE '⏰ Reminder: ' || v_reminder.assessment_title || ' due in ' || v_time_text
                END,
                '<html>
                <body style="font-family: Arial, sans-serif; padding: 20px;">
                    <h2 style="color: #4F46E5;">📚 EduConnect AMS</h2>
                    <p>Hi ' || COALESCE(v_student_name, 'Student') || ',</p>
                    <div style="background: ' || 
                        CASE WHEN v_reminder.days_before <= 1 THEN '#FEE2E2' ELSE '#FEF3C7' END || 
                        '; padding: 15px; border-radius: 8px; margin: 15px 0;">
                        <strong>' || 
                        CASE WHEN v_reminder.days_before = 0 THEN '🚨 URGENT REMINDER' ELSE '⏰ Deadline Reminder' END ||
                        '</strong><br><br>
                        <strong>Assessment:</strong> ' || v_reminder.assessment_title || '<br>
                        <strong>Course:</strong> ' || v_course_title || '<br>
                        <strong>Due in:</strong> ' || v_time_text || '<br>
                        <strong>Due Date:</strong> ' || to_char(v_reminder.due_date, 'Day, Month DD, YYYY at HH:MI AM') || '
                    </div>
                    <p>Don''t miss your deadline! Log in now to submit your work.</p>
                    <p style="color: #6B7280; font-size: 12px;">
                        This is an automated reminder from EduConnect Assessment & Marking System.
                    </p>
                </body>
                </html>',
                'Reminder: ' || v_reminder.assessment_title || ' is due in ' || v_time_text || ' on ' || to_char(v_reminder.due_date, 'Mon DD at HH:MI AM'),
                'pending',
                NOW()
            );
        END IF;
        
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
-- STEP 3: View pending emails
-- ============================================================================

SELECT 
    eq.id,
    eq.recipient_email,
    eq.recipient_name,
    eq.subject,
    eq.status,
    eq.created_at,
    eq.scheduled_for
FROM email_queue eq
WHERE eq.status = 'pending'
ORDER BY eq.created_at DESC
LIMIT 20;

-- ============================================================================
-- STEP 4: Show email queue summary
-- ============================================================================

SELECT 
    status,
    COUNT(*) as count
FROM email_queue
GROUP BY status;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

SELECT '✅ Email queue system configured!' as status,
       'Emails will be queued when assessments are created or reminders fire' as info,
       'Deploy the Edge Function and configure Resend API to actually send emails' as next_step;
