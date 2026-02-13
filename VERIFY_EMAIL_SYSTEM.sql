-- ============================================================================
-- VERIFY EMAIL SYSTEM - Run this in Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- STEP 1: Check if functions exist
-- ============================================================================
SELECT '=== STEP 1: CHECK FUNCTIONS ===' as step;

SELECT 
    proname as function_name,
    '✅ EXISTS' as status
FROM pg_proc
WHERE proname IN ('send_email_via_resend', 'process_email_queue')
ORDER BY proname;

-- ============================================================================
-- STEP 2: Check pg_net extension
-- ============================================================================
SELECT '=== STEP 2: CHECK EXTENSION ===' as step;

SELECT 
    extname,
    CASE WHEN extname = 'pg_net' THEN '✅ pg_net enabled' ELSE extname END as status
FROM pg_extension 
WHERE extname = 'pg_net';

-- ============================================================================
-- STEP 3: Check email queue status
-- ============================================================================
SELECT '=== STEP 3: EMAIL QUEUE STATUS ===' as step;

SELECT 
    status,
    COUNT(*) as count
FROM email_queue
GROUP BY status
ORDER BY status;

-- ============================================================================
-- STEP 4: Show recent emails in queue
-- ============================================================================
SELECT '=== STEP 4: RECENT EMAILS ===' as step;

SELECT 
    id,
    recipient_email,
    subject,
    status,
    created_at,
    sent_at,
    error_message
FROM email_queue
ORDER BY created_at DESC
LIMIT 10;

-- ============================================================================
-- STEP 5: SEND TEST EMAIL
-- Replace 'your-email@example.com' with YOUR actual email address!
-- ============================================================================
SELECT '=== STEP 5: SEND TEST EMAIL ===' as step;

-- UNCOMMENT THE LINE BELOW AND REPLACE WITH YOUR EMAIL:
-- SELECT send_email_via_resend(
--     'your-email@example.com',
--     '🧪 Test Email from EduConnect AMS',
--     '<html>
--     <body style="font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5;">
--         <div style="max-width: 500px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px;">
--             <h1 style="color: #4F46E5;">🎉 Email System Working!</h1>
--             <p>Congratulations! Your EduConnect Assessment & Marking System can now send email notifications.</p>
--             <div style="background: #E0F2FE; padding: 15px; border-radius: 8px; margin: 20px 0;">
--                 <strong>What this means:</strong>
--                 <ul>
--                     <li>✅ Deadline reminders will be sent via email</li>
--                     <li>✅ New assessment notifications work</li>
--                     <li>✅ Students will receive email alerts</li>
--                 </ul>
--             </div>
--             <p style="color: #666; font-size: 12px;">
--                 This is an automated test from EduConnect AMS.
--             </p>
--         </div>
--     </body>
--     </html>'
-- ) as request_id;

SELECT 'Uncomment the test email query above to send a test!' as instruction;

-- ============================================================================
-- STEP 6: Check HTTP request status (if test was sent)
-- ============================================================================
SELECT '=== STEP 6: HTTP REQUEST LOG ===' as step;

-- Show recent HTTP requests made by pg_net
SELECT 
    id,
    status_code,
    created
FROM net._http_response
ORDER BY created DESC
LIMIT 5;

-- ============================================================================
-- SUMMARY
-- ============================================================================
SELECT '=== SUMMARY ===' as step;

WITH checks AS (
    SELECT 
        (SELECT COUNT(*) FROM pg_proc WHERE proname = 'send_email_via_resend') as send_fn,
        (SELECT COUNT(*) FROM pg_proc WHERE proname = 'process_email_queue') as queue_fn,
        (SELECT COUNT(*) FROM pg_extension WHERE extname = 'pg_net') as pg_net,
        (SELECT COUNT(*) FROM email_queue WHERE status = 'sent') as sent_count,
        (SELECT COUNT(*) FROM email_queue WHERE status = 'pending') as pending_count
)
SELECT 
    CASE WHEN send_fn > 0 THEN '✅' ELSE '❌' END || ' send_email_via_resend function' as check_1,
    CASE WHEN queue_fn > 0 THEN '✅' ELSE '❌' END || ' process_email_queue function' as check_2,
    CASE WHEN pg_net > 0 THEN '✅' ELSE '❌' END || ' pg_net extension' as check_3,
    sent_count || ' emails sent' as emails_sent,
    pending_count || ' emails pending' as emails_pending
FROM checks;
