-- ============================================================================
-- FIX DEADLINE REMINDERS SYSTEM
-- Run in Supabase SQL Editor to diagnose and fix reminder issues
-- ============================================================================

-- ============================================================================
-- STEP 1: DIAGNOSE - Check System State
-- ============================================================================
SELECT '=== STEP 1: SYSTEM DIAGNOSIS ===' as step;

-- Check tables exist
SELECT 
    'Tables' as check_type,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'scheduled_reminders') 
         THEN '✅ scheduled_reminders exists' 
         ELSE '❌ MISSING scheduled_reminders' 
    END as status
UNION ALL
SELECT 
    'Tables',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'reminder_schedules') 
         THEN '✅ reminder_schedules exists' 
         ELSE '❌ MISSING reminder_schedules' 
    END
UNION ALL
SELECT 
    'Tables',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') 
         THEN '✅ notifications exists' 
         ELSE '❌ MISSING notifications' 
    END;

-- Check triggers exist
SELECT 
    trigger_name,
    event_object_table as table_name,
    '✅ Trigger exists' as status
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND trigger_name IN (
    'schedule_reminders_on_assessment',
    'schedule_reminders_on_enrollment',
    'cancel_reminders_on_submission'
);

-- ============================================================================
-- STEP 2: CHECK DATA
-- ============================================================================
SELECT '=== STEP 2: DATA CHECK ===' as step;

-- Count assessments, enrollments, reminders
SELECT 'Assessments with future due date' as item, COUNT(*) as count 
FROM assessments WHERE due_date > NOW()
UNION ALL
SELECT 'Course enrollments', COUNT(*) FROM course_enrollments
UNION ALL
SELECT 'Active reminder schedules', COUNT(*) FROM reminder_schedules WHERE is_active = true
UNION ALL
SELECT 'Pending reminders', COUNT(*) FROM scheduled_reminders WHERE status = 'pending'
UNION ALL
SELECT 'Sent reminders', COUNT(*) FROM scheduled_reminders WHERE status = 'sent'
UNION ALL
SELECT 'Notifications (reminder type)', COUNT(*) FROM notifications WHERE type = 'reminder';

-- ============================================================================
-- STEP 3: IDENTIFY THE PROBLEM
-- ============================================================================
SELECT '=== STEP 3: PROBLEM IDENTIFICATION ===' as step;

-- Find assessments that should have reminders but don't
SELECT 
    a.id as assessment_id,
    a.title,
    c.code as course,
    a.due_date,
    (SELECT COUNT(*) FROM course_enrollments WHERE course_id = a.course_id) as enrolled_students,
    (SELECT COUNT(*) FROM scheduled_reminders WHERE assessment_id = a.id) as reminders_scheduled,
    CASE 
        WHEN (SELECT COUNT(*) FROM course_enrollments WHERE course_id = a.course_id) = 0 
        THEN '⚠️ NO ENROLLMENTS - Students must enroll to get reminders'
        WHEN (SELECT COUNT(*) FROM scheduled_reminders WHERE assessment_id = a.id) = 0 
        THEN '❌ MISSING REMINDERS - Need to be scheduled'
        ELSE '✅ Has reminders'
    END as diagnosis
FROM assessments a
JOIN courses c ON a.course_id = c.id
WHERE a.due_date > NOW()
ORDER BY a.due_date;

-- ============================================================================
-- STEP 4: CHECK WHAT REMINDERS ARE DUE NOW
-- ============================================================================
SELECT '=== STEP 4: DUE REMINDERS ===' as step;

-- These reminders should have been processed
SELECT 
    sr.id as reminder_id,
    a.title as assessment,
    p.full_name as student,
    rs.name as reminder_type,
    sr.scheduled_for,
    sr.status,
    CASE 
        WHEN sr.scheduled_for <= NOW() AND sr.status = 'pending' 
        THEN '⚠️ OVERDUE - Should have been processed!'
        WHEN sr.status = 'sent' THEN '✅ Sent'
        WHEN sr.status = 'cancelled' THEN '❌ Cancelled'
        ELSE '⏳ Pending'
    END as diagnosis
FROM scheduled_reminders sr
JOIN assessments a ON sr.assessment_id = a.id
JOIN profiles p ON sr.student_id = p.id
JOIN reminder_schedules rs ON sr.schedule_id = rs.id
ORDER BY sr.scheduled_for DESC
LIMIT 20;

-- ============================================================================
-- FIX 1: Schedule reminders for ALL enrolled students & assessments
-- ============================================================================
SELECT '=== FIX 1: SCHEDULE MISSING REMINDERS ===' as step;

-- Preview what will be scheduled
SELECT 
    a.title as assessment,
    p.full_name as student,
    rs.name as reminder_type,
    a.due_date - (rs.days_before || ' days')::INTERVAL - (rs.hours_before || ' hours')::INTERVAL as will_schedule_for
FROM assessments a
CROSS JOIN reminder_schedules rs
JOIN course_enrollments ce ON ce.course_id = a.course_id
JOIN profiles p ON ce.student_id = p.id
LEFT JOIN submissions s ON s.assessment_id = a.id AND s.student_id = ce.student_id
LEFT JOIN scheduled_reminders sr ON sr.assessment_id = a.id 
    AND sr.student_id = ce.student_id 
    AND sr.schedule_id = rs.id
WHERE a.due_date > NOW()
AND rs.is_active = true
AND s.id IS NULL  -- Not submitted
AND sr.id IS NULL -- Not already scheduled
AND (a.due_date - (rs.days_before || ' days')::INTERVAL - (rs.hours_before || ' hours')::INTERVAL) > NOW()
ORDER BY will_schedule_for
LIMIT 30;

-- UNCOMMENT TO ACTUALLY SCHEDULE:
/*
INSERT INTO scheduled_reminders (assessment_id, student_id, schedule_id, scheduled_for, status)
SELECT 
    a.id,
    ce.student_id,
    rs.id,
    a.due_date - (rs.days_before || ' days')::INTERVAL - (rs.hours_before || ' hours')::INTERVAL,
    'pending'
FROM assessments a
CROSS JOIN reminder_schedules rs
JOIN course_enrollments ce ON ce.course_id = a.course_id
LEFT JOIN submissions s ON s.assessment_id = a.id AND s.student_id = ce.student_id
LEFT JOIN scheduled_reminders sr ON sr.assessment_id = a.id 
    AND sr.student_id = ce.student_id 
    AND sr.schedule_id = rs.id
WHERE a.due_date > NOW()
AND rs.is_active = true
AND s.id IS NULL
AND sr.id IS NULL
AND (a.due_date - (rs.days_before || ' days')::INTERVAL - (rs.hours_before || ' hours')::INTERVAL) > NOW()
ON CONFLICT (assessment_id, student_id, schedule_id) DO NOTHING;
*/

-- ============================================================================
-- FIX 2: Process overdue reminders immediately (create notifications)
-- ============================================================================
SELECT '=== FIX 2: PROCESS OVERDUE REMINDERS ===' as step;

-- Preview overdue reminders
SELECT COUNT(*) as overdue_reminders_count
FROM scheduled_reminders
WHERE status = 'pending'
AND scheduled_for <= NOW();

-- UNCOMMENT TO PROCESS IMMEDIATELY:
-- This creates notifications for all overdue pending reminders
/*
WITH overdue_reminders AS (
    SELECT 
        sr.id,
        sr.assessment_id,
        sr.student_id,
        a.title as assessment_title,
        c.title as course_title,
        a.due_date,
        rs.days_before,
        rs.hours_before
    FROM scheduled_reminders sr
    JOIN assessments a ON sr.assessment_id = a.id
    JOIN courses c ON a.course_id = c.id
    JOIN reminder_schedules rs ON sr.schedule_id = rs.id
    WHERE sr.status = 'pending'
    AND sr.scheduled_for <= NOW()
    AND a.due_date > NOW()  -- Only for active assessments
)
INSERT INTO notifications (user_id, title, message, type, reference_type, reference_id, metadata)
SELECT 
    student_id,
    '⏰ Deadline Reminder: ' || assessment_title,
    CASE 
        WHEN days_before > 0 THEN 'Your ' || assessment_title || ' is due in ' || days_before || ' day(s).'
        ELSE 'Your ' || assessment_title || ' is due in ' || hours_before || ' hours!'
    END,
    'reminder',
    'assessment',
    assessment_id,
    jsonb_build_object(
        'course_title', course_title,
        'due_date', due_date,
        'days_before', days_before,
        'hours_before', hours_before
    )
FROM overdue_reminders;

-- Mark reminders as sent
UPDATE scheduled_reminders 
SET status = 'sent', sent_at = NOW(), updated_at = NOW()
WHERE status = 'pending'
AND scheduled_for <= NOW();
*/

-- ============================================================================
-- FIX 3: Ensure all students can see notifications dashboard
-- ============================================================================
SELECT '=== FIX 3: CREATE SAMPLE NOTIFICATION (TEST) ===' as step;

-- This creates a test notification for the currently logged in user
-- Useful to verify notifications work
/*
INSERT INTO notifications (user_id, title, message, type, channel, status)
VALUES (
    auth.uid(),
    '🧪 Test Notification',
    'This is a test notification to verify the system works.',
    'system',
    'dashboard',
    'unread'
);
*/

-- ============================================================================
-- SUMMARY: What needs to happen for reminders to work
-- ============================================================================
SELECT '=== SUMMARY ===' as step;

SELECT 
    1 as step_num,
    'Student must be ENROLLED in a course' as requirement,
    'Reminders are per student-assessment-course' as explanation
UNION ALL
SELECT 
    2,
    'Reminder schedules must be active',
    'Check reminder_schedules table has is_active = true'
UNION ALL
SELECT 
    3,
    'Triggers must create scheduled_reminders',
    'Happens on assessment creation OR student enrollment'
UNION ALL
SELECT 
    4,
    'Edge function must run to process reminders',
    'Converts pending reminders to notifications when due'
UNION ALL
SELECT 
    5,
    'Notifications appear in dashboard',
    'Students see them in NotificationCenter component';

-- ============================================================================
-- FIX 4: AUTO-ENROLL ALL STUDENTS IN ALL COURSES
-- ============================================================================
SELECT '=== FIX 4: AUTO-ENROLL STUDENTS ===' as step;

-- Preview which enrollments would be created
SELECT 
    p.full_name as student,
    p.email,
    c.code as course_code,
    c.title as course_title
FROM profiles p
CROSS JOIN courses c
LEFT JOIN course_enrollments ce ON ce.student_id = p.id AND ce.course_id = c.id
WHERE p.role = 'student'
AND ce.id IS NULL  -- Not already enrolled
LIMIT 30;

-- UNCOMMENT TO AUTO-ENROLL ALL STUDENTS IN ALL COURSES:
/*
INSERT INTO course_enrollments (student_id, course_id, enrolled_at)
SELECT 
    p.id,
    c.id,
    NOW()
FROM profiles p
CROSS JOIN courses c
LEFT JOIN course_enrollments ce ON ce.student_id = p.id AND ce.course_id = c.id
WHERE p.role = 'student'
AND ce.id IS NULL
ON CONFLICT DO NOTHING;
*/

-- ============================================================================
-- FIX 5: CREATE NOTIFICATIONS DIRECTLY (BYPASS EDGE FUNCTION)
-- ============================================================================
SELECT '=== FIX 5: CREATE DIRECT NOTIFICATIONS ===' as step;

-- This creates reminder notifications directly for all upcoming assessments
-- Useful when edge function is not running

-- Preview what notifications would be created
SELECT 
    p.full_name as student,
    a.title as assessment,
    a.due_date,
    a.due_date - NOW() as time_until_due
FROM assessments a
JOIN courses c ON a.course_id = c.id
CROSS JOIN profiles p
WHERE p.role = 'student'
AND a.due_date > NOW()
AND a.due_date < NOW() + INTERVAL '7 days'
AND NOT EXISTS (
    SELECT 1 FROM submissions s 
    WHERE s.assessment_id = a.id AND s.student_id = p.id
)
LIMIT 20;

-- UNCOMMENT TO CREATE NOTIFICATIONS DIRECTLY:
/*
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
AND a.due_date > NOW()
AND a.due_date < NOW() + INTERVAL '7 days'
AND NOT EXISTS (
    SELECT 1 FROM submissions s 
    WHERE s.assessment_id = a.id AND s.student_id = p.id
)
AND NOT EXISTS (
    SELECT 1 FROM notifications n 
    WHERE n.user_id = p.id 
    AND n.reference_id = a.id 
    AND n.type = 'reminder'
    AND n.created_at > NOW() - INTERVAL '1 day'
);
*/
