-- ============================================================================
-- CONFIGURE EMAIL - Run this in Supabase SQL Editor
-- This sets up your Resend API key for email notifications
-- ============================================================================

-- Step 1: Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Step 2: Create the email sending function (doesn't need vault)
CREATE OR REPLACE FUNCTION send_email_via_resend(
    p_to TEXT,
    p_subject TEXT,
    p_html TEXT,
    p_from TEXT DEFAULT 'EduConnect <onboarding@resend.dev>'
) RETURNS BIGINT AS $$
DECLARE
    v_request_id BIGINT;
BEGIN
    -- Send HTTP request to Resend API
    SELECT net.http_post(
        url := 'https://api.resend.com/emails',
        headers := jsonb_build_object(
            'Authorization', 'Bearer re_WyCE187V_fh7LbXB8S4saUqJ7PV9fFEYJ',
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

-- Step 3: Create function to process email queue
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
    FOR v_email IN
        SELECT * FROM email_queue
        WHERE status = 'pending'
        AND scheduled_for <= NOW()
        AND attempts < max_attempts
        ORDER BY scheduled_for
        LIMIT p_batch_size
    LOOP
        BEGIN
            UPDATE email_queue SET status = 'processing', attempts = attempts + 1
            WHERE id = v_email.id;
            
            v_request_id := send_email_via_resend(
                v_email.recipient_email,
                v_email.subject,
                v_email.body_html
            );
            
            IF v_request_id IS NOT NULL THEN
                UPDATE email_queue 
                SET status = 'sent', sent_at = NOW()
                WHERE id = v_email.id;
                
                IF v_email.notification_id IS NOT NULL THEN
                    UPDATE notifications
                    SET email_sent = true, email_sent_at = NOW()
                    WHERE id = v_email.notification_id;
                END IF;
                
                RETURN QUERY SELECT v_email.id, v_email.recipient_email, 'sent'::TEXT, v_request_id;
            ELSE
                UPDATE email_queue SET status = 'failed', error_message = 'No request ID returned'
                WHERE id = v_email.id;
                
                RETURN QUERY SELECT v_email.id, v_email.recipient_email, 'failed'::TEXT, NULL::BIGINT;
            END IF;
            
        EXCEPTION WHEN OTHERS THEN
            UPDATE email_queue 
            SET status = CASE WHEN attempts >= max_attempts THEN 'failed' ELSE 'pending' END,
                error_message = SQLERRM
            WHERE id = v_email.id;
            
            RETURN QUERY SELECT v_email.id, v_email.recipient_email, 'error'::TEXT, NULL::BIGINT;
        END;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION send_email_via_resend(TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION process_email_queue(INTEGER) TO authenticated;

-- Step 4: Process any pending emails now
SELECT * FROM process_email_queue(20);

-- Step 5: Show email queue status
SELECT 
    status,
    COUNT(*) as count
FROM email_queue
GROUP BY status;

-- ============================================================================
-- SUCCESS!
-- ============================================================================
SELECT '✅ Email configured with your Resend API key!' as status;
