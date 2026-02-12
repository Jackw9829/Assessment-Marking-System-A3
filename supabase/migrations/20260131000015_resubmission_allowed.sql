-- =============================================
-- Migration: Add resubmission_allowed field to assessments
-- Migration: 20260131000015
-- Description: Enables instructors to allow students to resubmit assessments
-- =============================================

-- Add resubmission_allowed column to assessments table
ALTER TABLE assessments
ADD COLUMN IF NOT EXISTS resubmission_allowed BOOLEAN DEFAULT FALSE;

-- Add max_resubmissions column (optional limit on number of resubmissions)
ALTER TABLE assessments
ADD COLUMN IF NOT EXISTS max_resubmissions INTEGER DEFAULT 1;

-- Add comment for documentation
COMMENT ON COLUMN assessments.resubmission_allowed IS 'Whether students can resubmit after initial submission';
COMMENT ON COLUMN assessments.max_resubmissions IS 'Maximum number of resubmissions allowed (null = unlimited)';

-- =============================================
-- Update submissions table to support versioning
-- =============================================

-- Remove unique constraint to allow multiple submissions per assessment/student
-- First check if constraint exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'submissions_assessment_id_student_id_key'
    ) THEN
        ALTER TABLE submissions 
        DROP CONSTRAINT submissions_assessment_id_student_id_key;
    END IF;
END;
$$;

-- Add version number column to track submission versions
ALTER TABLE submissions
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- Add is_latest column to quickly identify latest submission
ALTER TABLE submissions
ADD COLUMN IF NOT EXISTS is_latest BOOLEAN DEFAULT TRUE;

-- Add comments
COMMENT ON COLUMN submissions.version IS 'Submission version number (1 = original, 2+ = resubmission)';
COMMENT ON COLUMN submissions.is_latest IS 'Whether this is the latest submission for the assessment';

-- Create index for faster latest submission lookup
CREATE INDEX IF NOT EXISTS idx_submissions_latest 
ON submissions(assessment_id, student_id, is_latest) 
WHERE is_latest = TRUE;

-- =============================================
-- Function to handle new submissions and update is_latest
-- =============================================

CREATE OR REPLACE FUNCTION handle_submission_version()
RETURNS TRIGGER AS $$
DECLARE
    current_version INTEGER;
BEGIN
    -- Get the current highest version for this assessment/student combo
    SELECT COALESCE(MAX(version), 0) INTO current_version
    FROM submissions
    WHERE assessment_id = NEW.assessment_id 
    AND student_id = NEW.student_id;
    
    -- Set version for new submission
    NEW.version := current_version + 1;
    NEW.is_latest := TRUE;
    
    -- Mark previous submissions as not latest
    UPDATE submissions
    SET is_latest = FALSE
    WHERE assessment_id = NEW.assessment_id
    AND student_id = NEW.student_id
    AND is_latest = TRUE;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic versioning
DROP TRIGGER IF EXISTS submission_versioning ON submissions;
CREATE TRIGGER submission_versioning
    BEFORE INSERT ON submissions
    FOR EACH ROW
    EXECUTE FUNCTION handle_submission_version();

-- =============================================
-- Function to check if resubmission is allowed
-- =============================================

CREATE OR REPLACE FUNCTION can_resubmit(
    p_assessment_id UUID,
    p_student_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
    v_resubmission_allowed BOOLEAN;
    v_max_resubmissions INTEGER;
    v_current_submissions INTEGER;
    v_due_date TIMESTAMPTZ;
BEGIN
    -- Get assessment settings
    SELECT resubmission_allowed, max_resubmissions, due_date
    INTO v_resubmission_allowed, v_max_resubmissions, v_due_date
    FROM assessments
    WHERE id = p_assessment_id;
    
    -- If resubmission not allowed, return false
    IF v_resubmission_allowed IS NOT TRUE THEN
        RETURN FALSE;
    END IF;
    
    -- Check due date (can't resubmit after due date)
    IF v_due_date < NOW() THEN
        RETURN FALSE;
    END IF;
    
    -- Count current submissions
    SELECT COUNT(*) INTO v_current_submissions
    FROM submissions
    WHERE assessment_id = p_assessment_id
    AND student_id = p_student_id;
    
    -- Check if under max resubmissions limit
    IF v_max_resubmissions IS NOT NULL AND v_current_submissions >= v_max_resubmissions + 1 THEN
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION can_resubmit(UUID, UUID) TO authenticated;
