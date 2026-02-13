-- =============================================
-- Deadline Reminder System - Diagnostic Queries
-- Run these in Supabase SQL Editor to diagnose missing notifications
-- NO MANUAL ID REPLACEMENT NEEDED - Auto-discovers data
-- =============================================

-- =============================================
-- STEP 1: Check if reminder schedules are active
-- =============================================
-- Expected: Should show 4 active schedules (7d, 3d, 1d, 6h)

SELECT id, name, days_before, hours_before, is_active, is_default
FROM reminder_schedules
ORDER BY days_before DESC, hours_before DESC;

-- =============================================
-- STEP 2: Find ALL assessments almost due (within 7 days)
-- =============================================
-- Shows all assessments due soon with student enrollment info

SELECT 
    a.id AS assessment_id,
    a.title AS assessment_title,
    a.due_date,
    c.id AS course_id,
    c.title AS course_title,
    a.due_date - NOW() AS time_until_due,
    EXTRACT(DAY FROM (a.due_date - NOW())) AS days_until_due,
    (SELECT COUNT(*) FROM course_enrollments ce WHERE ce.course_id = c.id) AS enrolled_students
FROM assessments a
JOIN courses c ON c.id = a.course_id
WHERE a.due_date > NOW()
  AND a.due_date <= NOW() + INTERVAL '7 days'
ORDER BY a.due_date;

-- =============================================
-- STEP 3: Check ALL scheduled_reminders for assessments due soon
-- =============================================
-- Shows all reminders for assessments due within 7 days

SELECT 
    sr.id AS reminder_id,
    a.title AS assessment_title,
    p.email AS student_email,
    sr.scheduled_for,
    sr.status,
    sr.sent_at,
    sr.error_message,
    rs.name AS schedule_name,
    rs.days_before,
    rs.hours_before,
    CASE 
        WHEN sr.scheduled_for <= NOW() AND sr.status = 'pending' THEN '⚠️ OVERDUE - Should have been sent!'
        WHEN sr.status = 'sent' THEN '✅ Sent'
        WHEN sr.status = 'cancelled' THEN '❌ Cancelled'
        ELSE '⏳ Pending'
    END AS status_note
FROM scheduled_reminders sr
JOIN reminder_schedules rs ON rs.id = sr.schedule_id
JOIN assessments a ON a.id = sr.assessment_id
JOIN profiles p ON p.id = sr.student_id
WHERE a.due_date > NOW()
  AND a.due_date <= NOW() + INTERVAL '7 days'
ORDER BY sr.scheduled_for;

-- =============================================
-- STEP 4: Find students enrolled but WITHOUT reminders scheduled
-- =============================================
-- Critical: Shows students who SHOULD have reminders but DON'T

SELECT 
    p.id AS student_id,
    p.email,
    p.full_name,
    a.id AS assessment_id,
    a.title AS assessment_title,
    a.due_date,
    c.title AS course_title,
    'NO REMINDERS SCHEDULED' AS issue
FROM course_enrollments ce
JOIN profiles p ON p.id = ce.student_id
JOIN courses c ON c.id = ce.course_id
JOIN assessments a ON a.course_id = c.id
WHERE a.due_date > NOW()
  AND a.due_date <= NOW() + INTERVAL '7 days'
  AND NOT EXISTS (
      SELECT 1 FROM scheduled_reminders sr 
      WHERE sr.student_id = ce.student_id 
        AND sr.assessment_id = a.id
  )
  AND NOT EXISTS (
      SELECT 1 FROM submissions s 
      WHERE s.student_id = ce.student_id 
        AND s.assessment_id = a.id
  )
ORDER BY a.due_date;

-- =============================================
-- STEP 5: Check for reminders that should have fired but didn't
-- =============================================
-- Shows ALL pending reminders where scheduled_for is in the past

SELECT 
    sr.id AS reminder_id,
    a.title AS assessment_title,
    p.email AS student_email,
    p.full_name AS student_name,
    sr.scheduled_for,
    sr.status,
    NOW() - sr.scheduled_for AS overdue_by,
    rs.name AS schedule_name,
    '⚠️ SHOULD HAVE BEEN SENT' AS issue
FROM scheduled_reminders sr
JOIN assessments a ON a.id = sr.assessment_id
JOIN profiles p ON p.id = sr.student_id
JOIN reminder_schedules rs ON rs.id = sr.schedule_id
WHERE sr.status = 'pending'
  AND sr.scheduled_for <= NOW()
  AND a.due_date > NOW()
ORDER BY sr.scheduled_for;

-- =============================================
-- STEP 6: Check all student enrollments for courses with due assessments
-- =============================================

SELECT 
    ce.student_id,
    p.email,
    p.full_name,
    ce.course_id,
    c.title AS course_title,
    (SELECT COUNT(*) FROM assessments a 
     WHERE a.course_id = c.id 
       AND a.due_date > NOW() 
       AND a.due_date <= NOW() + INTERVAL '7 days') AS assessments_due_soon
FROM course_enrollments ce
JOIN profiles p ON p.id = ce.student_id
JOIN courses c ON c.id = ce.course_id
WHERE EXISTS (
    SELECT 1 FROM assessments a 
    WHERE a.course_id = c.id 
      AND a.due_date > NOW() 
      AND a.due_date <= NOW() + INTERVAL '7 days'
)
ORDER BY c.title, p.email;

-- =============================================
-- STEP 7: Check ALL submissions for assessments due soon
-- =============================================
-- Students with submissions won't get reminders (expected behavior)

SELECT 
    s.id AS submission_id,
    p.email AS student_email,
    a.title AS assessment_title,
    s.status,
    s.submitted_at,
    'Student already submitted - No reminders expected' AS note
FROM submissions s
JOIN assessments a ON a.id = s.assessment_id
JOIN profiles p ON p.id = s.student_id
WHERE a.due_date > NOW()
  AND a.due_date <= NOW() + INTERVAL '7 days'
ORDER BY s.submitted_at DESC;

-- =============================================
-- STEP 8: Check ALL notification preferences
-- =============================================
-- Shows preferences for all students with assessments due

SELECT 
    p.email,
    p.full_name,
    COALESCE(np.email_enabled, true) AS email_enabled,
    COALESCE(np.dashboard_enabled, true) AS dashboard_enabled,
    COALESCE(np.reminder_7_days, true) AS reminder_7_days,
    COALESCE(np.reminder_3_days, true) AS reminder_3_days,
    COALESCE(np.reminder_1_day, true) AS reminder_1_day,
    COALESCE(np.reminder_6_hours, true) AS reminder_6_hours,
    COALESCE(np.timezone, 'UTC') AS timezone,
    CASE WHEN np.user_id IS NULL THEN '⚠️ No preferences set (using defaults)' ELSE '✅ Preferences exist' END AS status
FROM profiles p
LEFT JOIN notification_preferences np ON np.user_id = p.id
WHERE EXISTS (
    SELECT 1 FROM course_enrollments ce
    JOIN assessments a ON a.course_id = ce.course_id
    WHERE ce.student_id = p.id
      AND a.due_date > NOW()
      AND a.due_date <= NOW() + INTERVAL '7 days'
)
ORDER BY p.email;

-- =============================================
-- STEP 9: Check ALL recent reminder notifications
-- =============================================

SELECT 
    n.id,
    p.email AS student_email,
    n.title,
    n.message,
    n.type,
    n.status AS read_status,
    n.created_at,
    a.title AS assessment_title
FROM notifications n
JOIN profiles p ON p.id = n.user_id
LEFT JOIN assessments a ON a.id = n.reference_id
WHERE n.type = 'reminder'
ORDER BY n.created_at DESC
LIMIT 50;

-- =============================================
-- STEP 10: Check reminder audit log (all recent activity)
-- =============================================

SELECT 
    ral.id,
    p.email AS student_email,
    ral.action,
    ral.details,
    ral.created_at,
    a.title AS assessment_title
FROM reminder_audit_log ral
LEFT JOIN assessments a ON a.id = ral.assessment_id
LEFT JOIN profiles p ON p.id = ral.student_id
ORDER BY ral.created_at DESC
LIMIT 50;

-- =============================================
-- STEP 11: FIX - Schedule reminders for ALL missing student/assessment pairs
-- =============================================
-- Run this to create missing reminders

DO $$
DECLARE
    v_missing RECORD;
    v_count INTEGER := 0;
BEGIN
    FOR v_missing IN
        SELECT ce.student_id, a.id AS assessment_id
        FROM course_enrollments ce
        JOIN assessments a ON a.course_id = ce.course_id
        WHERE a.due_date > NOW()
          AND NOT EXISTS (
              SELECT 1 FROM scheduled_reminders sr 
              WHERE sr.student_id = ce.student_id 
                AND sr.assessment_id = a.id
          )
          AND NOT EXISTS (
              SELECT 1 FROM submissions s 
              WHERE s.student_id = ce.student_id 
                AND s.assessment_id = a.id
          )
    LOOP
        PERFORM schedule_reminders_for_student(v_missing.student_id, v_missing.assessment_id);
        v_count := v_count + 1;
    END LOOP;
    RAISE NOTICE 'Scheduled reminders for % student-assessment pairs', v_count;
END $$;

-- =============================================
-- STEP 12: Check if get_due_reminders returns anything
-- =============================================
-- This is what the edge function calls - if empty, nothing to process

SELECT * FROM get_due_reminders(100);

-- =============================================
-- STEP 13: Verify triggers exist
-- =============================================

SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE trigger_name IN (
    'schedule_reminders_on_assessment',
    'schedule_reminders_on_enrollment',
    'cancel_reminders_on_submission'
);

-- =============================================
-- STEP 14: Manually process a pending reminder (for testing)
-- =============================================
-- Uncomment and run if you want to manually trigger one reminder

/*
DO $$
DECLARE
    v_reminder_id UUID;
    v_notification_id UUID;
BEGIN
    -- Get first pending reminder that should have been sent
    SELECT id INTO v_reminder_id
    FROM scheduled_reminders
    WHERE status = 'pending'
      AND scheduled_for <= NOW()
    LIMIT 1;
    
    IF v_reminder_id IS NOT NULL THEN
        SELECT process_reminder(v_reminder_id, 'both') INTO v_notification_id;
        RAISE NOTICE 'Processed reminder %, created notification %', v_reminder_id, v_notification_id;
    ELSE
        RAISE NOTICE 'No pending reminders found';
    END IF;
END $$;
*/
