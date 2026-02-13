-- ============================================================================
-- VERIFY REMINDER SYSTEM
-- Run in Supabase SQL Editor to confirm reminder system is working
-- ============================================================================

-- ============================================================================
-- STEP 1: CHECK REMINDER TABLES EXIST
-- ============================================================================
SELECT '=== STEP 1: REMINDER TABLES CHECK ===' as debug_step;

SELECT 
    table_name,
    CASE 
        WHEN table_name IN ('reminder_schedules', 'scheduled_reminders', 'notifications', 'notification_preferences') 
        THEN '✅ Core reminder table'
        ELSE '📋 Supporting table'
    END as table_type
FROM information_schema.tables 
WHERE table_schema = 'public'
AND table_name IN (
    'reminder_schedules',
    'scheduled_reminders', 
    'notifications',
    'notification_preferences',
    'email_queue',
    'reminder_audit_log'
)
ORDER BY table_name;

-- Count of each table
SELECT 'reminder_schedules' as table_name, COUNT(*) as row_count FROM reminder_schedules
UNION ALL
SELECT 'scheduled_reminders', COUNT(*) FROM scheduled_reminders
UNION ALL
SELECT 'notifications', COUNT(*) FROM notifications;

-- ============================================================================
-- STEP 2: CHECK REMINDER SCHEDULE INTERVALS
-- ============================================================================
SELECT '=== STEP 2: REMINDER SCHEDULE INTERVALS ===' as debug_step;

SELECT 
    id,
    name,
    days_before,
    hours_before,
    is_default,
    is_active,
    CASE 
        WHEN is_active THEN '✅ ACTIVE'
        ELSE '❌ INACTIVE'
    END as status
FROM reminder_schedules
ORDER BY days_before DESC, hours_before DESC;

-- ============================================================================
-- STEP 3: CHECK TRIGGERS EXIST
-- ============================================================================
SELECT '=== STEP 3: TRIGGERS CHECK ===' as debug_step;

SELECT 
    trigger_name,
    event_manipulation as event,
    event_object_table as table_name,
    action_timing as timing,
    '✅ EXISTS' as status
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND trigger_name IN (
    'cancel_reminders_on_submission',
    'schedule_reminders_on_enrollment',
    'schedule_reminders_on_assessment'
)
ORDER BY trigger_name;

-- ============================================================================
-- STEP 4: CHECK SCHEDULED REMINDERS DATA
-- ============================================================================
SELECT '=== STEP 4: SCHEDULED REMINDERS ===' as debug_step;

-- Show recent scheduled reminders with assessment details
SELECT 
    sr.id as reminder_id,
    a.title as assessment_title,
    p.full_name as student_name,
    rs.name as reminder_type,
    a.due_date,
    sr.scheduled_for,
    sr.status,
    sr.sent_at,
    CASE 
        WHEN sr.sent_at IS NOT NULL THEN '✅ SENT'
        WHEN sr.status = 'cancelled' THEN '❌ CANCELLED'
        WHEN sr.scheduled_for < NOW() AND sr.status = 'pending' THEN '⚠️ OVERDUE'
        WHEN sr.status = 'pending' THEN '⏳ PENDING'
        ELSE sr.status::text
    END as reminder_status,
    -- Time until reminder fires
    CASE 
        WHEN sr.scheduled_for > NOW() 
        THEN EXTRACT(EPOCH FROM (sr.scheduled_for - NOW())) / 3600 || ' hours'
        ELSE 'PAST'
    END as time_until_reminder
FROM scheduled_reminders sr
JOIN assessments a ON sr.assessment_id = a.id
JOIN profiles p ON sr.student_id = p.id
JOIN reminder_schedules rs ON sr.schedule_id = rs.id
ORDER BY sr.scheduled_for DESC
LIMIT 20;

-- ============================================================================
-- STEP 5: CHECK FOR ASSESSMENTS WITHOUT REMINDERS
-- ============================================================================
SELECT '=== STEP 5: ASSESSMENTS MISSING REMINDERS ===' as debug_step;

-- Find assessments that should have reminders but don't
SELECT 
    a.id as assessment_id,
    a.title,
    c.code as course_code,
    a.due_date,
    (SELECT COUNT(*) FROM course_enrollments ce WHERE ce.course_id = a.course_id) as enrolled_students,
    (SELECT COUNT(*) FROM scheduled_reminders sr WHERE sr.assessment_id = a.id) as reminder_count,
    CASE 
        WHEN a.due_date <= NOW() THEN 'Past due - no reminders needed'
        WHEN (SELECT COUNT(*) FROM course_enrollments ce WHERE ce.course_id = a.course_id) = 0 THEN '⚠️ No enrolled students'
        WHEN (SELECT COUNT(*) FROM scheduled_reminders sr WHERE sr.assessment_id = a.id) = 0 THEN '❌ MISSING REMINDERS'
        ELSE '✅ Has reminders'
    END as status
FROM assessments a
JOIN courses c ON a.course_id = c.id
WHERE a.due_date > NOW()
ORDER BY a.due_date;

-- ============================================================================
-- STEP 6: CHECK SUBMISSION CANCELLATION
-- ============================================================================
SELECT '=== STEP 6: SUBMISSION → CANCELLED REMINDERS ===' as debug_step;

-- Show submissions and their corresponding cancelled reminders
SELECT 
    s.id as submission_id,
    a.title as assessment_title,
    p.full_name as student_name,
    s.submitted_at,
    (SELECT COUNT(*) FROM scheduled_reminders sr 
     WHERE sr.assessment_id = s.assessment_id 
     AND sr.student_id = s.student_id 
     AND sr.status = 'cancelled') as cancelled_reminders,
    CASE 
        WHEN (SELECT COUNT(*) FROM scheduled_reminders sr 
              WHERE sr.assessment_id = s.assessment_id 
              AND sr.student_id = s.student_id 
              AND sr.status = 'pending') > 0 
        THEN '⚠️ Still has pending reminders!'
        ELSE '✅ All reminders cancelled/sent'
    END as status
FROM submissions s
JOIN assessments a ON s.assessment_id = a.id
JOIN profiles p ON s.student_id = p.id
ORDER BY s.submitted_at DESC
LIMIT 10;

-- ============================================================================
-- STEP 7: VERIFY REMINDER -> NOTIFICATION FLOW
-- ============================================================================
SELECT '=== STEP 7: NOTIFICATIONS CHECK ===' as debug_step;

-- Show recent notifications
SELECT 
    n.id,
    p.full_name as user_name,
    n.title,
    n.type,
    n.channel,
    n.status,
    n.created_at,
    n.read_at,
    CASE 
        WHEN n.status = 'read' THEN '✅ Read'
        WHEN n.status = 'unread' THEN '📬 Unread'
        ELSE n.status::text
    END as notification_status
FROM notifications n
JOIN profiles p ON n.user_id = p.id
WHERE n.type = 'reminder'
ORDER BY n.created_at DESC
LIMIT 10;

-- ============================================================================
-- STEP 8: DIAGNOSIS SUMMARY
-- ============================================================================
SELECT '=== STEP 8: DIAGNOSIS SUMMARY ===' as debug_step;

WITH diagnosis AS (
    SELECT 
        (SELECT COUNT(*) FROM reminder_schedules WHERE is_active = true) as active_schedules,
        (SELECT COUNT(*) FROM scheduled_reminders WHERE status = 'pending') as pending_reminders,
        (SELECT COUNT(*) FROM scheduled_reminders WHERE status = 'sent') as sent_reminders,
        (SELECT COUNT(*) FROM scheduled_reminders WHERE status = 'cancelled') as cancelled_reminders,
        (SELECT COUNT(*) FROM notifications WHERE type = 'reminder') as total_notifications,
        (SELECT COUNT(*) FROM assessments WHERE due_date > NOW()) as future_assessments
)
SELECT 
    CASE WHEN active_schedules > 0 THEN '✅ ' || active_schedules || ' active schedule(s)'
         ELSE '❌ No active reminder schedules' END as check_schedules,
    CASE WHEN pending_reminders > 0 THEN '⏳ ' || pending_reminders || ' pending reminder(s)'
         ELSE '📋 No pending reminders' END as check_pending,
    '✅ ' || sent_reminders || ' reminder(s) sent' as check_sent,
    '📋 ' || cancelled_reminders || ' reminder(s) cancelled (by submission)' as check_cancelled,
    CASE WHEN future_assessments > 0 AND pending_reminders = 0 
         THEN '⚠️ Future assessments exist but no pending reminders!'
         ELSE '✅ Reminder state looks correct' END as overall_status
FROM diagnosis;

-- ============================================================================
-- FIX: Manually schedule reminders for existing assessments
-- ============================================================================
SELECT '=== FIX: SCHEDULE MISSING REMINDERS ===' as debug_step;

-- This queries what WOULD be scheduled (dry run)
SELECT 
    a.id as assessment_id,
    a.title,
    ce.student_id,
    p.full_name,
    rs.name as schedule_name,
    a.due_date - (rs.days_before || ' days')::INTERVAL - (rs.hours_before || ' hours')::INTERVAL as would_schedule_for
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
AND sr.id IS NULL -- Reminder not already scheduled
AND (a.due_date - (rs.days_before || ' days')::INTERVAL - (rs.hours_before || ' hours')::INTERVAL) > NOW()
ORDER BY would_schedule_for
LIMIT 20;

-- To actually schedule missing reminders, uncomment and run:
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
