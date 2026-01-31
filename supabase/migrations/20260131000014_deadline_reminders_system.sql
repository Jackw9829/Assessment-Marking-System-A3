-- =============================================
-- Automated Deadline Reminder System
-- Migration: 20260131000014
-- =============================================
-- This migration creates the database schema for the
-- automated deadline reminder system that notifies
-- students before assessment deadlines.
-- =============================================

-- =============================================
-- 1. ENUMS FOR REMINDER SYSTEM
-- =============================================

-- Enum for notification channels
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'notification_channel'
    ) THEN
        CREATE TYPE notification_channel AS ENUM ('dashboard', 'email', 'both');
    END IF;
END;
$$;

-- Enum for reminder status
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'reminder_status'
    ) THEN
        CREATE TYPE reminder_status AS ENUM ('pending', 'sent', 'cancelled', 'failed');
    END IF;
END;
$$;

-- Enum for notification read status
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'notification_status'
    ) THEN
        CREATE TYPE notification_status AS ENUM ('unread', 'read', 'dismissed');
    END IF;
END;
$$;

-- =============================================
-- 2. REMINDER SCHEDULES TABLE
-- =============================================
-- Defines the reminder intervals for assessments
-- Default intervals: 7 days, 3 days, 1 day before deadline

CREATE TABLE IF NOT EXISTS reminder_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    days_before INTEGER NOT NULL,
    hours_before INTEGER DEFAULT 0,
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT days_before_valid CHECK (days_before >= 0),
    CONSTRAINT hours_before_valid CHECK (hours_before >= 0 AND hours_before < 24),
    UNIQUE(days_before, hours_before)
);

-- Insert default reminder schedules
INSERT INTO reminder_schedules (name, days_before, hours_before, is_default)
VALUES 
    ('One Week Before', 7, 0, true),
    ('Three Days Before', 3, 0, true),
    ('One Day Before', 1, 0, true),
    ('Six Hours Before', 0, 6, true)
ON CONFLICT (days_before, hours_before) DO NOTHING;

-- =============================================
-- 3. SCHEDULED REMINDERS TABLE
-- =============================================
-- Tracks individual scheduled reminders for each
-- student-assessment combination

CREATE TABLE IF NOT EXISTS scheduled_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    schedule_id UUID NOT NULL REFERENCES reminder_schedules(id) ON DELETE CASCADE,
    scheduled_for TIMESTAMPTZ NOT NULL,
    status reminder_status DEFAULT 'pending',
    sent_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(assessment_id, student_id, schedule_id)
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_scheduled_reminders_status ON scheduled_reminders(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_reminders_scheduled_for ON scheduled_reminders(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_scheduled_reminders_student ON scheduled_reminders(student_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_reminders_assessment ON scheduled_reminders(assessment_id);

-- =============================================
-- 4. NOTIFICATIONS TABLE
-- =============================================
-- Stores all notifications delivered to users
-- (both dashboard and email notifications)

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'reminder', -- 'reminder', 'grade', 'announcement', etc.
    channel notification_channel DEFAULT 'dashboard',
    status notification_status DEFAULT 'unread',
    reference_type TEXT, -- 'assessment', 'submission', 'grade', etc.
    reference_id UUID, -- ID of the referenced entity
    metadata JSONB DEFAULT '{}', -- Additional data (course name, due date, etc.)
    email_sent BOOLEAN DEFAULT false,
    email_sent_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    dismissed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ -- Notification expiry (e.g., after deadline)
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_reference ON notifications(reference_type, reference_id);

-- =============================================
-- 5. STUDENT NOTIFICATION PREFERENCES TABLE
-- =============================================
-- Allows students to customize their notification settings

CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
    email_enabled BOOLEAN DEFAULT true,
    dashboard_enabled BOOLEAN DEFAULT true,
    reminder_7_days BOOLEAN DEFAULT true,
    reminder_3_days BOOLEAN DEFAULT true,
    reminder_1_day BOOLEAN DEFAULT true,
    reminder_6_hours BOOLEAN DEFAULT true,
    quiet_hours_start TIME, -- e.g., '22:00'
    quiet_hours_end TIME,   -- e.g., '08:00'
    timezone TEXT DEFAULT 'UTC',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 6. EMAIL QUEUE TABLE
-- =============================================
-- Queue for outbound email notifications
-- Processed by background worker/edge function

CREATE TABLE IF NOT EXISTS email_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id UUID REFERENCES notifications(id) ON DELETE CASCADE,
    recipient_email TEXT NOT NULL,
    recipient_name TEXT,
    subject TEXT NOT NULL,
    body_html TEXT NOT NULL,
    body_text TEXT,
    status TEXT DEFAULT 'pending', -- 'pending', 'sent', 'failed', 'retry'
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    last_attempt_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    scheduled_for TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for email queue processing
CREATE INDEX IF NOT EXISTS idx_email_queue_status ON email_queue(status);
CREATE INDEX IF NOT EXISTS idx_email_queue_scheduled ON email_queue(scheduled_for) WHERE status = 'pending';

-- =============================================
-- 7. REMINDER HISTORY/AUDIT TABLE
-- =============================================
-- Complete audit trail of all reminder activities

CREATE TABLE IF NOT EXISTS reminder_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reminder_id UUID REFERENCES scheduled_reminders(id) ON DELETE SET NULL,
    assessment_id UUID REFERENCES assessments(id) ON DELETE SET NULL,
    student_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL, -- 'scheduled', 'sent', 'cancelled', 'failed', 'opened'
    details JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reminder_audit_student ON reminder_audit_log(student_id);
CREATE INDEX IF NOT EXISTS idx_reminder_audit_assessment ON reminder_audit_log(assessment_id);
CREATE INDEX IF NOT EXISTS idx_reminder_audit_action ON reminder_audit_log(action);

-- =============================================
-- 8. FUNCTIONS FOR REMINDER SCHEDULING
-- =============================================

-- Function to check if a student has submitted an assessment
CREATE OR REPLACE FUNCTION has_submitted_assessment(
    p_student_id UUID,
    p_assessment_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM submissions
        WHERE student_id = p_student_id
        AND assessment_id = p_assessment_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if student is enrolled in assessment's course
CREATE OR REPLACE FUNCTION is_enrolled_in_assessment_course(
    p_student_id UUID,
    p_assessment_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM assessments a
        JOIN course_enrollments ce ON ce.course_id = a.course_id
        WHERE a.id = p_assessment_id
        AND ce.student_id = p_student_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to schedule reminders for a student-assessment pair
CREATE OR REPLACE FUNCTION schedule_reminders_for_student(
    p_student_id UUID,
    p_assessment_id UUID
) RETURNS INTEGER AS $$
DECLARE
    v_due_date TIMESTAMPTZ;
    v_schedule RECORD;
    v_reminder_time TIMESTAMPTZ;
    v_count INTEGER := 0;
BEGIN
    -- Get assessment due date
    SELECT due_date INTO v_due_date
    FROM assessments
    WHERE id = p_assessment_id;
    
    IF v_due_date IS NULL THEN
        RETURN 0;
    END IF;
    
    -- Check if student is enrolled
    IF NOT is_enrolled_in_assessment_course(p_student_id, p_assessment_id) THEN
        RETURN 0;
    END IF;
    
    -- Check if already submitted
    IF has_submitted_assessment(p_student_id, p_assessment_id) THEN
        RETURN 0;
    END IF;
    
    -- Create reminders for each active schedule
    FOR v_schedule IN 
        SELECT id, days_before, hours_before
        FROM reminder_schedules
        WHERE is_active = true
    LOOP
        v_reminder_time := v_due_date 
            - (v_schedule.days_before || ' days')::INTERVAL
            - (v_schedule.hours_before || ' hours')::INTERVAL;
        
        -- Only schedule if reminder time is in the future
        IF v_reminder_time > NOW() THEN
            INSERT INTO scheduled_reminders (
                assessment_id,
                student_id,
                schedule_id,
                scheduled_for,
                status
            ) VALUES (
                p_assessment_id,
                p_student_id,
                v_schedule.id,
                v_reminder_time,
                'pending'
            )
            ON CONFLICT (assessment_id, student_id, schedule_id) DO NOTHING;
            
            v_count := v_count + 1;
        END IF;
    END LOOP;
    
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cancel reminders after submission
CREATE OR REPLACE FUNCTION cancel_reminders_after_submission()
RETURNS TRIGGER AS $$
BEGIN
    -- Cancel all pending reminders for this student-assessment
    UPDATE scheduled_reminders
    SET status = 'cancelled',
        updated_at = NOW()
    WHERE student_id = NEW.student_id
    AND assessment_id = NEW.assessment_id
    AND status = 'pending';
    
    -- Log the cancellation
    INSERT INTO reminder_audit_log (
        assessment_id,
        student_id,
        action,
        details
    ) VALUES (
        NEW.assessment_id,
        NEW.student_id,
        'cancelled',
        jsonb_build_object(
            'reason', 'submission_received',
            'submission_id', NEW.id
        )
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to cancel reminders when submission is made
DROP TRIGGER IF EXISTS cancel_reminders_on_submission ON submissions;
CREATE TRIGGER cancel_reminders_on_submission
    AFTER INSERT ON submissions
    FOR EACH ROW
    EXECUTE FUNCTION cancel_reminders_after_submission();

-- Function to schedule reminders when student enrolls in a course
CREATE OR REPLACE FUNCTION schedule_reminders_on_enrollment()
RETURNS TRIGGER AS $$
DECLARE
    v_assessment RECORD;
BEGIN
    -- Schedule reminders for all active assessments in the course
    FOR v_assessment IN
        SELECT id
        FROM assessments
        WHERE course_id = NEW.course_id
        AND due_date > NOW()
    LOOP
        PERFORM schedule_reminders_for_student(NEW.student_id, v_assessment.id);
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new enrollments
DROP TRIGGER IF EXISTS schedule_reminders_on_enrollment ON course_enrollments;
CREATE TRIGGER schedule_reminders_on_enrollment
    AFTER INSERT ON course_enrollments
    FOR EACH ROW
    EXECUTE FUNCTION schedule_reminders_on_enrollment();

-- Function to schedule reminders when new assessment is created
CREATE OR REPLACE FUNCTION schedule_reminders_on_assessment_create()
RETURNS TRIGGER AS $$
DECLARE
    v_student RECORD;
BEGIN
    -- Schedule reminders for all enrolled students
    FOR v_student IN
        SELECT student_id
        FROM course_enrollments
        WHERE course_id = NEW.course_id
    LOOP
        PERFORM schedule_reminders_for_student(v_student.student_id, NEW.id);
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new assessments
DROP TRIGGER IF EXISTS schedule_reminders_on_assessment ON assessments;
CREATE TRIGGER schedule_reminders_on_assessment
    AFTER INSERT ON assessments
    FOR EACH ROW
    EXECUTE FUNCTION schedule_reminders_on_assessment_create();

-- Function to get pending reminders due for sending
CREATE OR REPLACE FUNCTION get_due_reminders(
    p_batch_size INTEGER DEFAULT 100
) RETURNS TABLE (
    reminder_id UUID,
    assessment_id UUID,
    student_id UUID,
    student_email TEXT,
    student_name TEXT,
    assessment_title TEXT,
    course_title TEXT,
    due_date TIMESTAMPTZ,
    days_before INTEGER,
    hours_before INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sr.id AS reminder_id,
        sr.assessment_id,
        sr.student_id,
        p.email AS student_email,
        p.full_name AS student_name,
        a.title AS assessment_title,
        c.title AS course_title,
        a.due_date,
        rs.days_before,
        rs.hours_before
    FROM scheduled_reminders sr
    JOIN profiles p ON p.id = sr.student_id
    JOIN assessments a ON a.id = sr.assessment_id
    JOIN courses c ON c.id = a.course_id
    JOIN reminder_schedules rs ON rs.id = sr.schedule_id
    WHERE sr.status = 'pending'
    AND sr.scheduled_for <= NOW()
    AND a.due_date > NOW() -- Only for active assessments
    AND NOT has_submitted_assessment(sr.student_id, sr.assessment_id)
    ORDER BY sr.scheduled_for
    LIMIT p_batch_size;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark reminder as sent and create notification
CREATE OR REPLACE FUNCTION process_reminder(
    p_reminder_id UUID,
    p_channel notification_channel DEFAULT 'both'
) RETURNS UUID AS $$
DECLARE
    v_reminder RECORD;
    v_notification_id UUID;
    v_message TEXT;
    v_title TEXT;
    v_prefs RECORD;
BEGIN
    -- Get reminder details
    SELECT 
        sr.*,
        a.title AS assessment_title,
        a.due_date,
        c.title AS course_title,
        p.email,
        p.full_name,
        rs.days_before,
        rs.hours_before
    INTO v_reminder
    FROM scheduled_reminders sr
    JOIN assessments a ON a.id = sr.assessment_id
    JOIN courses c ON c.id = a.course_id
    JOIN profiles p ON p.id = sr.student_id
    JOIN reminder_schedules rs ON rs.id = sr.schedule_id
    WHERE sr.id = p_reminder_id;
    
    IF v_reminder IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- Get user preferences
    SELECT * INTO v_prefs
    FROM notification_preferences
    WHERE user_id = v_reminder.student_id;
    
    -- Build notification message
    IF v_reminder.days_before > 0 THEN
        v_title := format('Assessment Due in %s Day(s)', v_reminder.days_before);
        v_message := format(
            'Reminder: "%s" for %s is due in %s day(s) on %s',
            v_reminder.assessment_title,
            v_reminder.course_title,
            v_reminder.days_before,
            to_char(v_reminder.due_date, 'Mon DD, YYYY at HH12:MI AM')
        );
    ELSE
        v_title := format('Assessment Due in %s Hour(s)', v_reminder.hours_before);
        v_message := format(
            'URGENT: "%s" for %s is due in %s hour(s) on %s',
            v_reminder.assessment_title,
            v_reminder.course_title,
            v_reminder.hours_before,
            to_char(v_reminder.due_date, 'Mon DD, YYYY at HH12:MI AM')
        );
    END IF;
    
    -- Create notification
    INSERT INTO notifications (
        user_id,
        title,
        message,
        type,
        channel,
        reference_type,
        reference_id,
        metadata,
        expires_at
    ) VALUES (
        v_reminder.student_id,
        v_title,
        v_message,
        'reminder',
        p_channel,
        'assessment',
        v_reminder.assessment_id,
        jsonb_build_object(
            'course_title', v_reminder.course_title,
            'assessment_title', v_reminder.assessment_title,
            'due_date', v_reminder.due_date,
            'days_before', v_reminder.days_before,
            'hours_before', v_reminder.hours_before
        ),
        v_reminder.due_date
    ) RETURNING id INTO v_notification_id;
    
    -- Queue email if enabled
    IF p_channel IN ('email', 'both') AND (v_prefs IS NULL OR v_prefs.email_enabled) THEN
        INSERT INTO email_queue (
            notification_id,
            recipient_email,
            recipient_name,
            subject,
            body_html,
            body_text
        ) VALUES (
            v_notification_id,
            v_reminder.email,
            v_reminder.full_name,
            v_title,
            format(
                '<html><body><h2>%s</h2><p>%s</p><p><a href="%s">Submit Now</a></p></body></html>',
                v_title,
                v_message,
                'https://your-app.com/dashboard?assessment=' || v_reminder.assessment_id
            ),
            v_message
        );
    END IF;
    
    -- Update reminder status
    UPDATE scheduled_reminders
    SET status = 'sent',
        sent_at = NOW(),
        updated_at = NOW()
    WHERE id = p_reminder_id;
    
    -- Log the action
    INSERT INTO reminder_audit_log (
        reminder_id,
        assessment_id,
        student_id,
        action,
        details
    ) VALUES (
        p_reminder_id,
        v_reminder.assessment_id,
        v_reminder.student_id,
        'sent',
        jsonb_build_object(
            'notification_id', v_notification_id,
            'channel', p_channel
        )
    );
    
    RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 9. ROW LEVEL SECURITY POLICIES
-- =============================================

-- Enable RLS on all new tables
ALTER TABLE reminder_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminder_audit_log ENABLE ROW LEVEL SECURITY;

-- Reminder Schedules: Viewable by all authenticated, modifiable by admins
CREATE POLICY "reminder_schedules_select" ON reminder_schedules
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "reminder_schedules_admin" ON reminder_schedules
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role = 'admin'
        )
    );

-- Scheduled Reminders: Students see their own, instructors see their courses
CREATE POLICY "scheduled_reminders_student" ON scheduled_reminders
    FOR SELECT TO authenticated
    USING (student_id = auth.uid());

CREATE POLICY "scheduled_reminders_instructor" ON scheduled_reminders
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM assessments a
            JOIN courses c ON c.id = a.course_id
            WHERE a.id = assessment_id
            AND c.instructor_id = auth.uid()
        )
    );

-- Notifications: Users see their own
CREATE POLICY "notifications_own" ON notifications
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Notification Preferences: Users manage their own
CREATE POLICY "notification_preferences_own" ON notification_preferences
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Email Queue: Admin only
CREATE POLICY "email_queue_admin" ON email_queue
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role = 'admin'
        )
    );

-- Audit Log: Students see their own, admins see all
CREATE POLICY "reminder_audit_student" ON reminder_audit_log
    FOR SELECT TO authenticated
    USING (student_id = auth.uid());

CREATE POLICY "reminder_audit_admin" ON reminder_audit_log
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role = 'admin'
        )
    );

-- =============================================
-- 10. TRIGGERS FOR UPDATED_AT
-- =============================================

CREATE TRIGGER reminder_schedules_updated_at
    BEFORE UPDATE ON reminder_schedules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER scheduled_reminders_updated_at
    BEFORE UPDATE ON scheduled_reminders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER notification_preferences_updated_at
    BEFORE UPDATE ON notification_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
