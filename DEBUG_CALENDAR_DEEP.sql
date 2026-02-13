-- ============================================================================
-- DEEP DEBUG: Calendar Not Updating After Assessment Creation
-- Run in Supabase SQL Editor to diagnose all issues
-- ============================================================================

-- ============================================================================
-- STEP 1: CHECK SCHEMA - Do required columns exist?
-- ============================================================================
SELECT '=== STEP 1: SCHEMA CHECK ===' as debug_step;

SELECT 
    column_name,
    data_type,
    column_default,
    is_nullable,
    CASE 
        WHEN column_name IN ('is_active', 'is_published', 'assessment_type') 
        THEN '✅ NEW COLUMN EXISTS'
        ELSE '📋 Original column'
    END as status
FROM information_schema.columns 
WHERE table_name = 'assessments'
ORDER BY ordinal_position;

-- Check if new columns are missing
SELECT 
    'is_active' as column_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'assessments' AND column_name = 'is_active'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING - Run APPLY_CALENDAR_FIX.sql' END as status
UNION ALL
SELECT 
    'is_published',
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'assessments' AND column_name = 'is_published'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING - Run APPLY_CALENDAR_FIX.sql' END
UNION ALL
SELECT 
    'assessment_type',
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'assessments' AND column_name = 'assessment_type'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING - Run APPLY_CALENDAR_FIX.sql' END;

-- ============================================================================
-- STEP 2: CHECK RPC FUNCTION - Does calendar RPC exist?
-- ============================================================================
SELECT '=== STEP 2: RPC FUNCTION CHECK ===' as debug_step;

SELECT 
    proname as function_name,
    CASE 
        WHEN proname = 'get_student_calendar_events' THEN '✅ Calendar RPC exists'
        ELSE '📋 Other function'
    END as status
FROM pg_proc 
WHERE proname IN ('get_student_calendar_events', 'get_calendar_event_by_assessment')
ORDER BY proname;

-- If no rows, function is missing
SELECT 
    CASE WHEN EXISTS (
        SELECT 1 FROM pg_proc WHERE proname = 'get_student_calendar_events'
    ) THEN '✅ get_student_calendar_events EXISTS' 
    ELSE '❌ MISSING - Run APPLY_CALENDAR_FIX.sql' 
    END as rpc_status;

-- ============================================================================
-- STEP 3: CHECK ASSESSMENTS DATA
-- ============================================================================
SELECT '=== STEP 3: ASSESSMENTS DATA CHECK ===' as debug_step;

-- Show all assessments with their visibility status
SELECT 
    a.id as assessment_id,
    a.title,
    c.code as course_code,
    a.due_date,
    a.due_date AT TIME ZONE 'UTC' as due_date_utc,
    CASE 
        WHEN a.due_date > NOW() THEN '✅ FUTURE'
        WHEN a.due_date > NOW() - INTERVAL '1 day' THEN '⚠️ JUST PASSED'
        ELSE '❌ PAST'
    END as due_date_status,
    a.created_at,
    -- Check new columns (with COALESCE for when they don't exist)
    COALESCE(a.is_active::text, 'column missing') as is_active,
    COALESCE(a.is_published::text, 'column missing') as is_published,
    COALESCE(a.assessment_type::text, 'column missing') as assessment_type
FROM assessments a
JOIN courses c ON a.course_id = c.id
ORDER BY a.due_date DESC
LIMIT 20;

-- ============================================================================
-- STEP 4: CHECK ENROLLMENTS FOR CURRENT USER
-- ============================================================================
SELECT '=== STEP 4: ENROLLMENT CHECK ===' as debug_step;

-- Show courses where students are enrolled
SELECT 
    ce.student_id,
    p.full_name,
    c.code as course_code,
    c.title as course_title,
    (SELECT COUNT(*) FROM assessments a WHERE a.course_id = c.id) as total_assessments,
    (SELECT COUNT(*) FROM assessments a WHERE a.course_id = c.id AND a.due_date > NOW()) as future_assessments
FROM course_enrollments ce
JOIN courses c ON ce.course_id = c.id
JOIN profiles p ON ce.student_id = p.id
ORDER BY c.code;

-- ============================================================================
-- STEP 5: SIMULATE CALENDAR QUERY (Manual version of RPC)
-- ============================================================================
SELECT '=== STEP 5: CALENDAR QUERY SIMULATION ===' as debug_step;

-- This simulates what the calendar RPC should return
-- Replace the date range as needed
SELECT 
    a.id,
    a.title,
    c.code as course_code,
    c.title as course_name,
    a.due_date,
    CASE 
        WHEN a.due_date < NOW() THEN 'overdue'
        WHEN a.due_date < NOW() + INTERVAL '1 day' THEN 'due-soon'
        ELSE 'upcoming'
    END as status,
    -- Check filters
    CASE WHEN COALESCE(a.is_active, true) = true THEN '✅' ELSE '❌ FILTERED OUT' END as active_filter,
    CASE WHEN COALESCE(a.is_published, true) = true THEN '✅' ELSE '❌ FILTERED OUT' END as published_filter,
    CASE 
        WHEN a.due_date >= DATE_TRUNC('month', CURRENT_DATE) 
         AND a.due_date < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
        THEN '✅ IN CURRENT MONTH'
        ELSE '⚠️ OUTSIDE CURRENT MONTH VIEW'
    END as date_range_status
FROM assessments a
JOIN courses c ON a.course_id = c.id
WHERE a.due_date > NOW() - INTERVAL '30 days'  -- Include recent past
ORDER BY a.due_date;

-- ============================================================================
-- STEP 6: CHECK REMINDER SCHEDULES
-- ============================================================================
SELECT '=== STEP 6: REMINDER SCHEDULES CHECK ===' as debug_step;

-- Check if reminder tables exist
SELECT 
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'scheduled_reminders'
    ) THEN '✅ scheduled_reminders table EXISTS' 
    ELSE '❌ MISSING - Run deadline_reminders_system migration' 
    END as scheduled_reminders_status,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'reminder_schedules'
    ) THEN '✅ reminder_schedules table EXISTS' 
    ELSE '❌ MISSING - Run deadline_reminders_system migration' 
    END as reminder_schedules_status;

-- Note: Run VERIFY_REMINDER_SYSTEM.sql for detailed reminder diagnostics

-- ============================================================================
-- STEP 7: DIAGNOSIS SUMMARY
-- ============================================================================
SELECT '=== STEP 7: DIAGNOSIS SUMMARY ===' as debug_step;

WITH diagnosis AS (
    SELECT 
        -- Schema checks
        (SELECT COUNT(*) FROM information_schema.columns 
         WHERE table_name = 'assessments' AND column_name = 'is_active') as has_is_active,
        (SELECT COUNT(*) FROM information_schema.columns 
         WHERE table_name = 'assessments' AND column_name = 'is_published') as has_is_published,
        -- RPC check
        (SELECT COUNT(*) FROM pg_proc 
         WHERE proname = 'get_student_calendar_events') as has_rpc,
        -- Data checks
        (SELECT COUNT(*) FROM assessments WHERE due_date > NOW()) as future_assessments,
        (SELECT COUNT(*) FROM course_enrollments) as total_enrollments
)
SELECT 
    CASE WHEN has_is_active = 0 THEN '❌ ISSUE: is_active column missing' 
         ELSE '✅ is_active column exists' END as check_1,
    CASE WHEN has_is_published = 0 THEN '❌ ISSUE: is_published column missing' 
         ELSE '✅ is_published column exists' END as check_2,
    CASE WHEN has_rpc = 0 THEN '❌ ISSUE: Calendar RPC function missing' 
         ELSE '✅ Calendar RPC exists' END as check_3,
    CASE WHEN future_assessments = 0 THEN '⚠️ WARNING: No future assessments in database' 
         ELSE '✅ ' || future_assessments || ' future assessment(s) found' END as check_4,
    CASE WHEN total_enrollments = 0 THEN '⚠️ WARNING: No student enrollments' 
         ELSE '✅ ' || total_enrollments || ' enrollment(s) found' END as check_5
FROM diagnosis;

-- ============================================================================
-- RECOMMENDED ACTIONS
-- ============================================================================
SELECT '=== RECOMMENDED ACTIONS ===' as debug_step;

SELECT 
    CASE 
        WHEN NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'assessments' AND column_name = 'is_active'
        ) OR NOT EXISTS (
            SELECT 1 FROM pg_proc WHERE proname = 'get_student_calendar_events'
        ) THEN 
            'ACTION REQUIRED: Run APPLY_CALENDAR_FIX.sql in SQL Editor'
        WHEN (SELECT COUNT(*) FROM assessments WHERE due_date > NOW()) = 0 THEN
            'ACTION: Create a new assessment with a future due date'
        WHEN (SELECT COUNT(*) FROM course_enrollments) = 0 THEN
            'ACTION: Enroll students in courses'
        ELSE
            '✅ All checks passed - Calendar should be working'
    END as recommended_action;
