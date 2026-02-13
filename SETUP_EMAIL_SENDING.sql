-- ============================================================================
-- SEND EMAILS VIA DATABASE - Using pg_net Extension
-- Run this in Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- STEP 1: Enable pg_net extension (for HTTP requests from database)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_net;

-- ============================================================================
-- STEP 2: Create function to send email via Resend API
-- ============================================================================

CREATE OR REPLACE FUNCTION send_email_via_resend(
    p_to TEXT,
    p_subject TEXT,
    p_html TEXT,
    p_from TEXT DEFAULT 'EduConnect <noreply@educonnect.app>'
) RETURNS BIGINT AS $$
DECLARE
    v_api_key TEXT;
    v_request_id BIGINT;
BEGIN
    -- Get API key from vault (Supabase secrets)
    -- You need to run: SELECT vault.create_secret('RESEND_API_KEY', 're_your_key_here');
    SELECT decrypted_secret INTO v_api_key 
    FROM vault.decrypted_secrets 
    WHERE name = 'RESEND_API_KEY';
    
    IF v_api_key IS NULL THEN
        RAISE NOTICE 'RESEND_API_KEY not found in vault. Emails disabled.';
        RETURN NULL;
    END IF;
    
    -- Send HTTP request to Resend API
    SELECT net.http_post(
        url := 'https://api.resend.com/emails',
        headers := jsonb_build_object(
            'Authorization', 'Bearer ' || v_api_key,
            'Content-Type', 'application/json'
        ),
        body := jsonb_build_object(
            'from', p_from,
            'to', p_to,
            'subject', p_subject,
            'html', p_html
        )
    ) INTO v_request_id;
    
    RETURN v_request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 3: Create function to process email queue
-- ============================================================================

CREATE OR REPLACE FUNCTION process_email_queue(p_batch_size INTEGER DEFAULT 10)
RETURNS TABLE (
    email_id UUID,
    recipient TEXT,
    status TEXT,
    request_id BIGINT
) AS $$
DECLARE
    v_email RECORD;
    v_request_id BIGINT;
BEGIN
    -- Process pending emails
    FOR v_email IN
        SELECT * FROM email_queue
        WHERE status = 'pending'
        AND scheduled_for <= NOW()
        AND attempts < max_attempts
        ORDER BY scheduled_for
        LIMIT p_batch_size
    LOOP
        BEGIN
            -- Mark as processing
            UPDATE email_queue SET status = 'processing', attempts = attempts + 1
            WHERE id = v_email.id;
            
            -- Send email
            v_request_id := send_email_via_resend(
                v_email.recipient_email,
                v_email.subject,
                v_email.body_html
            );
            
            IF v_request_id IS NOT NULL THEN
                -- Mark as sent
                UPDATE email_queue 
                SET status = 'sent', sent_at = NOW()
                WHERE id = v_email.id;
                
                -- Update notification
                IF v_email.notification_id IS NOT NULL THEN
                    UPDATE notifications
                    SET email_sent = true, email_sent_at = NOW()
                    WHERE id = v_email.notification_id;
                END IF;
                
                RETURN QUERY SELECT v_email.id, v_email.recipient_email, 'sent'::TEXT, v_request_id;
            ELSE
                -- No API key - mark as skipped
                UPDATE email_queue SET status = 'skipped'
                WHERE id = v_email.id;
                
                RETURN QUERY SELECT v_email.id, v_email.recipient_email, 'skipped'::TEXT, NULL::BIGINT;
            END IF;
            
        EXCEPTION WHEN OTHERS THEN
            -- Mark as failed
            UPDATE email_queue 
            SET status = CASE WHEN attempts >= max_attempts THEN 'failed' ELSE 'pending' END,
                error_message = SQLERRM
            WHERE id = v_email.id;
            
            RETURN QUERY SELECT v_email.id, v_email.recipient_email, 'error'::TEXT, NULL::BIGINT;
        END;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users (for admin processing)
GRANT EXECUTE ON FUNCTION process_email_queue(INTEGER) TO authenticated;

-- ============================================================================
-- STEP 4: Set up Resend API key in vault (REQUIRED!)
-- ============================================================================

-- First, enable vault if not already:
-- CREATE EXTENSION IF NOT EXISTS vault;

-- Then store your Resend API key:
-- Run this with your actual API key:
/*
SELECT vault.create_secret(
    'RESEND_API_KEY',
    're_YOUR_API_KEY_HERE',
    'Resend API key for email notifications'
);
*/

-- ============================================================================
-- STEP 5: Test email sending (OPTIONAL)
-- ============================================================================

-- Send a test email (replace with your email):
/*
SELECT send_email_via_resend(
    'your-email@example.com',
    'Test Email from EduConnect',
    '<h1>Hello!</h1><p>This is a test email from EduConnect AMS.</p>'
);
*/

-- ============================================================================
-- STEP 6: Process pending emails
-- ============================================================================

-- Process up to 10 pending emails now:
SELECT * FROM process_email_queue(10);

-- ============================================================================
-- STEP 7: Check email queue status
-- ============================================================================

SELECT 
    status,
    COUNT(*) as count,
    MAX(created_at) as latest
FROM email_queue
GROUP BY status;

-- ============================================================================
-- SUCCESS
-- ============================================================================

SELECT 
    '✅ Email system ready!' as status,
    'To enable: Add your Resend API key to vault (see Step 4)' as next_step;
