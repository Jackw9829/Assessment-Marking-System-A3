-- ============================================================================
-- Migration: Calendar & Reminder Integration Fix
-- Date: 2026-02-12
-- Purpose: Fix missing RPC function, add assessment status columns, 
--          and update reminder triggers for proper integration
-- ============================================================================

-- ============================================================================
-- PART 1: Add Missing Columns to Assessments Table
-- ============================================================================

-- Add assessment_type enum
DO $$ BEGIN
    CREATE TYPE assessment_type AS ENUM (
        'assignment',
        'quiz',
        'examination',
        'project',
        'practical',
        'other'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Add missing columns to assessments table
ALTER TABLE assessments 
ADD COLUMN IF NOT EXISTS assessment_type assessment_type DEFAULT 'assignment',
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS is_published boolean DEFAULT true;

-- Create indexes for efficient filtering
CREATE INDEX IF NOT EXISTS idx_assessments_is_active ON assessments(is_active);
CREATE INDEX IF NOT EXISTS idx_assessments_is_published ON assessments(is_published);
CREATE INDEX IF NOT EXISTS idx_assessments_type ON assessments(assessment_type);
CREATE INDEX IF NOT EXISTS idx_assessments_due_date_active ON assessments(due_date) WHERE is_active = true AND is_published = true;

-- ============================================================================
-- PART 2: Create Missing Calendar RPC Function
-- ============================================================================

-- Drop existing function if it exists with wrong signature
DROP FUNCTION IF EXISTS get_student_calendar_events(uuid, date, date);
DROP FUNCTION IF EXISTS get_student_calendar_events(date, date);

-- Create the calendar events function
CREATE OR REPLACE FUNCTION get_student_calendar_events(
    p_start_date date,
    p_end_date date
)
RETURNS TABLE (
    id uuid,
    title text,
    description text,
    event_type text,
    course_id uuid,
    course_code text,
    course_name text,
    due_date timestamptz,
    assessment_type text,
    submission_status text,
    is_submitted boolean,
    submitted_at timestamptz,
    total_marks integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.title::text,
        a.description::text,
        'assessment'::text as event_type,
        c.id as course_id,
        c.code::text as course_code,
        c.title::text as course_name,
        a.due_date,
        COALESCE(a.assessment_type::text, 'assignment')::text as assessment_type,
        CASE 
            WHEN s.id IS NOT NULL AND s.status = 'graded' THEN 'graded'
            WHEN s.id IS NOT NULL THEN 'submitted'
            WHEN a.due_date < NOW() THEN 'overdue'
            ELSE 'pending'
        END::text as submission_status,
        (s.id IS NOT NULL) as is_submitted,
        s.submitted_at,
        a.total_marks
    FROM assessments a
    INNER JOIN courses c ON a.course_id = c.id
    INNER JOIN course_enrollments ce ON ce.course_id = c.id AND ce.student_id = auth.uid()
    LEFT JOIN submissions s ON s.assessment_id = a.id AND s.student_id = auth.uid()
    WHERE 
        a.due_date >= p_start_date::timestamptz
        AND a.due_date < (p_end_date + INTERVAL '1 day')::timestamptz
        AND COALESCE(a.is_active, true) = true
        AND COALESCE(a.is_published, true) = true
    ORDER BY a.due_date ASC;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_student_calendar_events(date, date) TO authenticated;

-- ============================================================================
-- PART 3: Fix Reminder Scheduling Trigger
-- ============================================================================

-- Update trigger function to respect is_active and is_published
CREATE OR REPLACE FUNCTION schedule_reminders_on_assessment_create()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    enrolled_student RECORD;
    reminder_7day timestamptz;
    reminder_1day timestamptz;
BEGIN
    -- Only schedule reminders for active, published assessments with future due dates
    IF COALESCE(NEW.is_active, true) = false OR 
       COALESCE(NEW.is_published, true) = false OR 
       NEW.due_date <= NOW() THEN
        RETURN NEW;
    END IF;

    -- Calculate reminder times
    reminder_7day := NEW.due_date - INTERVAL '7 days';
    reminder_1day := NEW.due_date - INTERVAL '1 day';

    -- Schedule reminders for all currently enrolled students
    FOR enrolled_student IN 
        SELECT ce.student_id as user_id 
        FROM course_enrollments ce
        WHERE ce.course_id = NEW.course_id
    LOOP
        -- Schedule 7-day reminder if still in the future
        IF reminder_7day > NOW() THEN
            INSERT INTO reminder_schedules (
                assessment_id,
                user_id,
                reminder_type,
                scheduled_for,
                is_active
            ) VALUES (
                NEW.id,
                enrolled_student.user_id,
                '7_day',
                reminder_7day,
                true
            )
            ON CONFLICT (assessment_id, user_id, reminder_type) DO NOTHING;
        END IF;

        -- Schedule 1-day reminder if still in the future
        IF reminder_1day > NOW() THEN
            INSERT INTO reminder_schedules (
                assessment_id,
                user_id,
                reminder_type,
                scheduled_for,
                is_active
            ) VALUES (
                NEW.id,
                enrolled_student.user_id,
                '1_day',
                reminder_1day,
                true
            )
            ON CONFLICT (assessment_id, user_id, reminder_type) DO NOTHING;
        END IF;
    END LOOP;

    RETURN NEW;
END;
$$;

-- ============================================================================
-- PART 4: Add Trigger for New Enrollments
-- ============================================================================

-- When a student enrolls, schedule reminders for all existing assessments
CREATE OR REPLACE FUNCTION schedule_reminders_on_enrollment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    assessment_rec RECORD;
    reminder_7day timestamptz;
    reminder_1day timestamptz;
BEGIN
    -- Get all active, published assessments for this course with future due dates
    FOR assessment_rec IN 
        SELECT a.id, a.due_date
        FROM assessments a
        WHERE a.course_id = NEW.course_id
        AND a.due_date > NOW()
        AND COALESCE(a.is_active, true) = true
        AND COALESCE(a.is_published, true) = true
    LOOP
        -- Calculate reminder times
        reminder_7day := assessment_rec.due_date - INTERVAL '7 days';
        reminder_1day := assessment_rec.due_date - INTERVAL '1 day';

        -- Schedule 7-day reminder if still in the future
        IF reminder_7day > NOW() THEN
            INSERT INTO reminder_schedules (
                assessment_id,
                user_id,
                reminder_type,
                scheduled_for,
                is_active
            ) VALUES (
                assessment_rec.id,
                NEW.student_id,
                '7_day',
                reminder_7day,
                true
            )
            ON CONFLICT (assessment_id, user_id, reminder_type) DO NOTHING;
        END IF;

        -- Schedule 1-day reminder if still in the future
        IF reminder_1day > NOW() THEN
            INSERT INTO reminder_schedules (
                assessment_id,
                user_id,
                reminder_type,
                scheduled_for,
                is_active
            ) VALUES (
                assessment_rec.id,
                NEW.student_id,
                '1_day',
                reminder_1day,
                true
            )
            ON CONFLICT (assessment_id, user_id, reminder_type) DO NOTHING;
        END IF;
    END LOOP;

    RETURN NEW;
END;
$$;

-- Create trigger for enrollments (drop first if exists)
DROP TRIGGER IF EXISTS trigger_schedule_reminders_on_enrollment ON course_enrollments;

CREATE TRIGGER trigger_schedule_reminders_on_enrollment
    AFTER INSERT ON course_enrollments
    FOR EACH ROW
    EXECUTE FUNCTION schedule_reminders_on_enrollment();

-- ============================================================================
-- PART 5: Add Trigger for Assessment Updates
-- ============================================================================

-- When assessment is updated (published, activated, due date changed), update reminders
CREATE OR REPLACE FUNCTION update_reminders_on_assessment_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    enrolled_student RECORD;
    reminder_7day timestamptz;
    reminder_1day timestamptz;
BEGIN
    -- If assessment is deactivated or unpublished, deactivate all reminders
    IF COALESCE(NEW.is_active, true) = false OR COALESCE(NEW.is_published, true) = false THEN
        UPDATE reminder_schedules 
        SET is_active = false, updated_at = NOW()
        WHERE assessment_id = NEW.id AND is_active = true;
        RETURN NEW;
    END IF;

    -- If assessment was previously inactive but now active, or due_date changed
    IF (COALESCE(OLD.is_active, true) = false AND COALESCE(NEW.is_active, true) = true) OR
       (COALESCE(OLD.is_published, true) = false AND COALESCE(NEW.is_published, true) = true) OR
       (OLD.due_date IS DISTINCT FROM NEW.due_date) THEN
        
        -- Deactivate old reminders
        UPDATE reminder_schedules 
        SET is_active = false, updated_at = NOW()
        WHERE assessment_id = NEW.id;

        -- Only reschedule if due_date is in the future
        IF NEW.due_date > NOW() THEN
            reminder_7day := NEW.due_date - INTERVAL '7 days';
            reminder_1day := NEW.due_date - INTERVAL '1 day';

            -- Schedule new reminders for all enrolled students
            FOR enrolled_student IN 
                SELECT ce.student_id as user_id 
                FROM course_enrollments ce
                WHERE ce.course_id = NEW.course_id
            LOOP
                IF reminder_7day > NOW() THEN
                    INSERT INTO reminder_schedules (
                        assessment_id,
                        user_id,
                        reminder_type,
                        scheduled_for,
                        is_active
                    ) VALUES (
                        NEW.id,
                        enrolled_student.user_id,
                        '7_day',
                        reminder_7day,
                        true
                    )
                    ON CONFLICT (assessment_id, user_id, reminder_type) 
                    DO UPDATE SET scheduled_for = EXCLUDED.scheduled_for, is_active = true, updated_at = NOW();
                END IF;

                IF reminder_1day > NOW() THEN
                    INSERT INTO reminder_schedules (
                        assessment_id,
                        user_id,
                        reminder_type,
                        scheduled_for,
                        is_active
                    ) VALUES (
                        NEW.id,
                        enrolled_student.user_id,
                        '1_day',
                        reminder_1day,
                        true
                    )
                    ON CONFLICT (assessment_id, user_id, reminder_type) 
                    DO UPDATE SET scheduled_for = EXCLUDED.scheduled_for, is_active = true, updated_at = NOW();
                END IF;
            END LOOP;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- Create trigger for assessment updates
DROP TRIGGER IF EXISTS trigger_update_reminders_on_assessment ON assessments;

CREATE TRIGGER trigger_update_reminders_on_assessment
    AFTER UPDATE ON assessments
    FOR EACH ROW
    EXECUTE FUNCTION update_reminders_on_assessment_update();

-- ============================================================================
-- PART 6: Backfill Reminders for Existing Assessments
-- ============================================================================

-- Schedule reminders for existing assessments that don't have them
DO $$
DECLARE
    enrolled_student RECORD;
    assessment_rec RECORD;
    reminder_7day timestamptz;
    reminder_1day timestamptz;
BEGIN
    -- Loop through all active assessments with future due dates
    FOR assessment_rec IN 
        SELECT a.id, a.course_id, a.due_date
        FROM assessments a
        WHERE a.due_date > NOW()
        AND COALESCE(a.is_active, true) = true
        AND COALESCE(a.is_published, true) = true
    LOOP
        reminder_7day := assessment_rec.due_date - INTERVAL '7 days';
        reminder_1day := assessment_rec.due_date - INTERVAL '1 day';

        -- Get enrolled students who don't have submissions
        FOR enrolled_student IN 
            SELECT ce.student_id as user_id 
            FROM course_enrollments ce
            LEFT JOIN submissions s ON s.assessment_id = assessment_rec.id 
                AND s.student_id = ce.student_id
            WHERE ce.course_id = assessment_rec.course_id
            AND s.id IS NULL  -- No submission yet
        LOOP
            IF reminder_7day > NOW() THEN
                INSERT INTO reminder_schedules (
                    assessment_id,
                    user_id,
                    reminder_type,
                    scheduled_for,
                    is_active
                ) VALUES (
                    assessment_rec.id,
                    enrolled_student.user_id,
                    '7_day',
                    reminder_7day,
                    true
                )
                ON CONFLICT (assessment_id, user_id, reminder_type) DO NOTHING;
            END IF;

            IF reminder_1day > NOW() THEN
                INSERT INTO reminder_schedules (
                    assessment_id,
                    user_id,
                    reminder_type,
                    scheduled_for,
                    is_active
                ) VALUES (
                    assessment_rec.id,
                    enrolled_student.user_id,
                    '1_day',
                    reminder_1day,
                    true
                )
                ON CONFLICT (assessment_id, user_id, reminder_type) DO NOTHING;
            END IF;
        END LOOP;
    END LOOP;
END;
$$;

-- ============================================================================
-- PART 7: Create Helper Function for Real-time Calendar Updates
-- ============================================================================

-- Function to get calendar events for real-time subscription
CREATE OR REPLACE FUNCTION get_calendar_event_by_assessment(p_assessment_id uuid)
RETURNS TABLE (
    id uuid,
    title text,
    description text,
    event_type text,
    course_id uuid,
    course_code text,
    course_name text,
    due_date timestamptz,
    assessment_type text,
    is_active boolean,
    is_published boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.title::text,
        a.description::text,
        'assessment'::text as event_type,
        c.id as course_id,
        c.code::text as course_code,
        c.title::text as course_name,
        a.due_date,
        COALESCE(a.assessment_type::text, 'assignment')::text as assessment_type,
        COALESCE(a.is_active, true) as is_active,
        COALESCE(a.is_published, true) as is_published
    FROM assessments a
    INNER JOIN courses c ON a.course_id = c.id
    WHERE a.id = p_assessment_id;
END;
$$;

GRANT EXECUTE ON FUNCTION get_calendar_event_by_assessment(uuid) TO authenticated;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify columns were added
DO $$
BEGIN
    RAISE NOTICE 'Migration completed. Verifying...';
    
    -- Check assessments columns
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'assessments' AND column_name = 'assessment_type'
    ) THEN
        RAISE NOTICE '✓ assessment_type column exists';
    ELSE
        RAISE EXCEPTION '✗ assessment_type column missing';
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'assessments' AND column_name = 'is_active'
    ) THEN
        RAISE NOTICE '✓ is_active column exists';
    ELSE
        RAISE EXCEPTION '✗ is_active column missing';
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'assessments' AND column_name = 'is_published'
    ) THEN
        RAISE NOTICE '✓ is_published column exists';
    ELSE
        RAISE EXCEPTION '✗ is_published column missing';
    END IF;
    
    -- Check function exists
    IF EXISTS (
        SELECT 1 FROM pg_proc WHERE proname = 'get_student_calendar_events'
    ) THEN
        RAISE NOTICE '✓ get_student_calendar_events function exists';
    ELSE
        RAISE EXCEPTION '✗ get_student_calendar_events function missing';
    END IF;
    
    RAISE NOTICE 'All verifications passed!';
END;
$$;
