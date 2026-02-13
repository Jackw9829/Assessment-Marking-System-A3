-- ============================================================================
-- DEBUG EMAIL - Check why emails aren't being received
-- ============================================================================

-- Step 1: Check HTTP response details from pg_net
SELECT '=== HTTP RESPONSE STATUS ===' as section;

SELECT 
    id,
    status_code,
    content::text as response_body,
    created
FROM net._http_response
ORDER BY created DESC
LIMIT 10;

-- Step 2: Check what emails were "sent"
SELECT '=== SENT EMAILS ===' as section;

SELECT 
    id,
    recipient_email,
    subject,
    status,
    sent_at,
    error_message
FROM email_queue
WHERE status = 'sent'
ORDER BY sent_at DESC
LIMIT 10;

-- ============================================================================
-- IMPORTANT: Resend Free Tier Limitation
-- ============================================================================
-- With the FREE 'onboarding@resend.dev' sender, Resend can ONLY send to:
-- 1. The email address you used to sign up for Resend
-- 2. OR emails on a domain you've verified with Resend
--
-- To send to ANY email address, you need to:
-- 1. Add and verify your own domain in Resend dashboard
-- 2. Then update the sender in CONFIGURE_EMAIL_NOW.sql
-- ============================================================================

SELECT '=== RESEND FREE TIER INFO ===' as section;
SELECT 
    'Free tier limitation: Can only send to YOUR Resend signup email' as info,
    'To fix: Verify your domain at https://resend.com/domains' as solution;

-- Step 3: Send a test directly and capture the response
SELECT '=== SEND TEST NOW ===' as section;

-- This will show you the request ID - check net._http_response for status
SELECT send_email_via_resend(
    'delivered@resend.dev',  -- Resend's test email that always works
    'Test Delivery Check',
    '<h1>Test</h1><p>If this works, the API is configured correctly.</p>'
) as test_request_id;

-- Wait a moment, then check the response
SELECT '=== CHECK RESPONSE (run after a few seconds) ===' as section;
SELECT 'Run this query to see the result:' as instruction;
SELECT 'SELECT id, status_code, content::text FROM net._http_response ORDER BY created DESC LIMIT 1;' as query_to_run;
