-- =============================================
-- Rubrics System for Automatic Mark Calculation
-- Migration: 20260131000012
-- =============================================

-- =============================================
-- 1. RUBRIC TEMPLATES TABLE
-- Stores rubric templates that can be attached to assessments
-- =============================================

CREATE TABLE IF NOT EXISTS rubric_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(assessment_id) -- One rubric template per assessment
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_rubric_templates_assessment_id ON rubric_templates(assessment_id);
CREATE INDEX IF NOT EXISTS idx_rubric_templates_created_by ON rubric_templates(created_by);

-- =============================================
-- 2. RUBRIC COMPONENTS TABLE
-- Stores individual rubric criteria with weightages
-- =============================================

CREATE TABLE IF NOT EXISTS rubric_components (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rubric_template_id UUID NOT NULL REFERENCES rubric_templates(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    weight_percentage DECIMAL(5,2) NOT NULL CHECK (weight_percentage > 0 AND weight_percentage <= 100),
    max_score INTEGER NOT NULL DEFAULT 100 CHECK (max_score > 0),
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_rubric_components_template_id ON rubric_components(rubric_template_id);

-- =============================================
-- 3. RUBRIC SCORES TABLE
-- Stores actual scores given for each rubric component per submission
-- =============================================

CREATE TABLE IF NOT EXISTS rubric_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    rubric_component_id UUID NOT NULL REFERENCES rubric_components(id) ON DELETE CASCADE,
    score INTEGER NOT NULL CHECK (score >= 0),
    graded_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    feedback TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(submission_id, rubric_component_id)
);

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_rubric_scores_submission_id ON rubric_scores(submission_id);
CREATE INDEX IF NOT EXISTS idx_rubric_scores_component_id ON rubric_scores(rubric_component_id);

-- =============================================
-- 4. FUNCTION TO VALIDATE RUBRIC WEIGHTS SUM TO 100%
-- =============================================

CREATE OR REPLACE FUNCTION validate_rubric_weights()
RETURNS TRIGGER AS $$
DECLARE
    total_weight DECIMAL(5,2);
BEGIN
    -- Calculate total weight for this rubric template
    SELECT COALESCE(SUM(weight_percentage), 0) INTO total_weight
    FROM rubric_components
    WHERE rubric_template_id = COALESCE(NEW.rubric_template_id, OLD.rubric_template_id);

    -- For INSERT or UPDATE, add the new weight
    IF TG_OP = 'INSERT' THEN
        total_weight := total_weight + NEW.weight_percentage;
    ELSIF TG_OP = 'UPDATE' THEN
        total_weight := total_weight - OLD.weight_percentage + NEW.weight_percentage;
    END IF;

    -- Check if total exceeds 100%
    IF total_weight > 100 THEN
        RAISE EXCEPTION 'Total rubric weight cannot exceed 100%%. Current total would be: %%', total_weight;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger for weight validation
DROP TRIGGER IF EXISTS check_rubric_weights ON rubric_components;
CREATE TRIGGER check_rubric_weights
    BEFORE INSERT OR UPDATE ON rubric_components
    FOR EACH ROW
    EXECUTE FUNCTION validate_rubric_weights();

-- =============================================
-- 5. FUNCTION TO CALCULATE WEIGHTED TOTAL MARK
-- =============================================

CREATE OR REPLACE FUNCTION calculate_weighted_total(p_submission_id UUID)
RETURNS TABLE (
    total_weighted_score DECIMAL(10,2),
    total_possible_marks INTEGER,
    percentage DECIMAL(5,2),
    all_components_graded BOOLEAN,
    component_count INTEGER,
    graded_count INTEGER
) AS $$
DECLARE
    v_assessment_id UUID;
    v_rubric_template_id UUID;
BEGIN
    -- Get the assessment for this submission
    SELECT assessment_id INTO v_assessment_id
    FROM submissions
    WHERE id = p_submission_id;

    -- Get the rubric template for this assessment
    SELECT id INTO v_rubric_template_id
    FROM rubric_templates
    WHERE assessment_id = v_assessment_id;

    -- If no rubric template, return null
    IF v_rubric_template_id IS NULL THEN
        RETURN QUERY SELECT 
            NULL::DECIMAL(10,2),
            NULL::INTEGER,
            NULL::DECIMAL(5,2),
            FALSE,
            0,
            0;
        RETURN;
    END IF;

    -- Calculate weighted score
    RETURN QUERY
    WITH component_data AS (
        SELECT 
            rc.id,
            rc.weight_percentage,
            rc.max_score,
            rs.score
        FROM rubric_components rc
        LEFT JOIN rubric_scores rs ON rs.rubric_component_id = rc.id 
            AND rs.submission_id = p_submission_id
        WHERE rc.rubric_template_id = v_rubric_template_id
    ),
    calculations AS (
        SELECT
            -- Calculate weighted contribution: (score / max_score) * weight_percentage
            SUM(
                CASE 
                    WHEN cd.score IS NOT NULL 
                    THEN (cd.score::DECIMAL / cd.max_score) * cd.weight_percentage
                    ELSE 0 
                END
            ) as weighted_total,
            COUNT(cd.id)::INTEGER as total_components,
            COUNT(cd.score)::INTEGER as components_graded
        FROM component_data cd
    )
    SELECT 
        c.weighted_total,
        (SELECT total_marks FROM assessments WHERE id = v_assessment_id),
        c.weighted_total, -- This is already a percentage since weights sum to 100
        (c.total_components = c.components_graded AND c.total_components > 0),
        c.total_components,
        c.components_graded
    FROM calculations c;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 6. FUNCTION TO GET RUBRIC WEIGHT TOTAL
-- =============================================

CREATE OR REPLACE FUNCTION get_rubric_weight_total(p_rubric_template_id UUID)
RETURNS DECIMAL(5,2) AS $$
BEGIN
    RETURN COALESCE(
        (SELECT SUM(weight_percentage) 
         FROM rubric_components 
         WHERE rubric_template_id = p_rubric_template_id),
        0
    );
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 7. ENABLE RLS
-- =============================================

ALTER TABLE rubric_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE rubric_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE rubric_scores ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 8. RLS POLICIES FOR RUBRIC TEMPLATES
-- =============================================

-- Instructors can view all rubric templates
CREATE POLICY "rubric_templates: instructors can view all"
    ON rubric_templates FOR SELECT
    USING (is_instructor() OR is_admin());

-- Instructors can create rubric templates for their assessments
CREATE POLICY "rubric_templates: instructors can create for own assessments"
    ON rubric_templates FOR INSERT
    WITH CHECK (
        is_instructor() AND
        created_by = auth.uid() AND
        EXISTS (
            SELECT 1 FROM assessments
            WHERE assessments.id = rubric_templates.assessment_id
            AND assessments.created_by = auth.uid()
        )
    );

-- Instructors can update their own rubric templates
CREATE POLICY "rubric_templates: instructors can update own"
    ON rubric_templates FOR UPDATE
    USING (is_instructor() AND created_by = auth.uid())
    WITH CHECK (is_instructor() AND created_by = auth.uid());

-- Instructors can delete their own rubric templates
CREATE POLICY "rubric_templates: instructors can delete own"
    ON rubric_templates FOR DELETE
    USING (is_instructor() AND created_by = auth.uid());

-- Admins have full access
CREATE POLICY "rubric_templates: admins full access"
    ON rubric_templates FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());

-- Students can view rubric templates for their enrolled courses
CREATE POLICY "rubric_templates: students can view enrolled"
    ON rubric_templates FOR SELECT
    USING (
        is_student() AND
        EXISTS (
            SELECT 1 FROM assessments a
            JOIN course_enrollments ce ON ce.course_id = a.course_id
            WHERE a.id = rubric_templates.assessment_id
            AND ce.student_id = auth.uid()
        )
    );

-- =============================================
-- 9. RLS POLICIES FOR RUBRIC COMPONENTS
-- =============================================

-- Instructors can view all rubric components
CREATE POLICY "rubric_components: instructors can view all"
    ON rubric_components FOR SELECT
    USING (is_instructor() OR is_admin());

-- Instructors can create components for their rubric templates
CREATE POLICY "rubric_components: instructors can create"
    ON rubric_components FOR INSERT
    WITH CHECK (
        is_instructor() AND
        EXISTS (
            SELECT 1 FROM rubric_templates rt
            WHERE rt.id = rubric_components.rubric_template_id
            AND rt.created_by = auth.uid()
        )
    );

-- Instructors can update components for their rubric templates
CREATE POLICY "rubric_components: instructors can update"
    ON rubric_components FOR UPDATE
    USING (
        is_instructor() AND
        EXISTS (
            SELECT 1 FROM rubric_templates rt
            WHERE rt.id = rubric_components.rubric_template_id
            AND rt.created_by = auth.uid()
        )
    )
    WITH CHECK (
        is_instructor() AND
        EXISTS (
            SELECT 1 FROM rubric_templates rt
            WHERE rt.id = rubric_components.rubric_template_id
            AND rt.created_by = auth.uid()
        )
    );

-- Instructors can delete components for their rubric templates
CREATE POLICY "rubric_components: instructors can delete"
    ON rubric_components FOR DELETE
    USING (
        is_instructor() AND
        EXISTS (
            SELECT 1 FROM rubric_templates rt
            WHERE rt.id = rubric_components.rubric_template_id
            AND rt.created_by = auth.uid()
        )
    );

-- Admins have full access
CREATE POLICY "rubric_components: admins full access"
    ON rubric_components FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());

-- Students can view rubric components for their enrolled courses
CREATE POLICY "rubric_components: students can view enrolled"
    ON rubric_components FOR SELECT
    USING (
        is_student() AND
        EXISTS (
            SELECT 1 FROM rubric_templates rt
            JOIN assessments a ON a.id = rt.assessment_id
            JOIN course_enrollments ce ON ce.course_id = a.course_id
            WHERE rt.id = rubric_components.rubric_template_id
            AND ce.student_id = auth.uid()
        )
    );

-- =============================================
-- 10. RLS POLICIES FOR RUBRIC SCORES
-- =============================================

-- Instructors can view all rubric scores for their courses
CREATE POLICY "rubric_scores: instructors can view"
    ON rubric_scores FOR SELECT
    USING (is_instructor() OR is_admin());

-- Instructors can create/update scores
CREATE POLICY "rubric_scores: instructors can upsert"
    ON rubric_scores FOR INSERT
    WITH CHECK (
        is_instructor() AND
        graded_by = auth.uid()
    );

CREATE POLICY "rubric_scores: instructors can update"
    ON rubric_scores FOR UPDATE
    USING (is_instructor() AND graded_by = auth.uid())
    WITH CHECK (is_instructor() AND graded_by = auth.uid());

-- Admins have full access
CREATE POLICY "rubric_scores: admins full access"
    ON rubric_scores FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());

-- Students can view their own rubric scores (verified grades only)
CREATE POLICY "rubric_scores: students can view own"
    ON rubric_scores FOR SELECT
    USING (
        is_student() AND
        EXISTS (
            SELECT 1 FROM submissions s
            JOIN grades g ON g.submission_id = s.id
            WHERE s.id = rubric_scores.submission_id
            AND s.student_id = auth.uid()
            AND g.verified = TRUE
        )
    );

-- =============================================
-- 11. COMMENTS FOR DOCUMENTATION
-- =============================================

COMMENT ON TABLE rubric_templates IS 'Stores rubric templates attached to assessments for weighted grading';
COMMENT ON TABLE rubric_components IS 'Individual rubric criteria with percentage weightages (must total 100%)';
COMMENT ON TABLE rubric_scores IS 'Actual scores given for each rubric component per submission';
COMMENT ON COLUMN rubric_components.weight_percentage IS 'Percentage weight of this component (0-100). All components must sum to exactly 100%';
COMMENT ON COLUMN rubric_components.max_score IS 'Maximum score for this component (default 100)';
COMMENT ON FUNCTION calculate_weighted_total IS 'Calculates weighted total mark based on rubric scores. Formula: SUM((score/max_score) * weight_percentage)';

-- =============================================
-- 12. UPDATE TRIGGERS
-- =============================================

DROP TRIGGER IF EXISTS rubric_templates_updated_at ON rubric_templates;
CREATE TRIGGER rubric_templates_updated_at
    BEFORE UPDATE ON rubric_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS rubric_components_updated_at ON rubric_components;
CREATE TRIGGER rubric_components_updated_at
    BEFORE UPDATE ON rubric_components
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS rubric_scores_updated_at ON rubric_scores;
CREATE TRIGGER rubric_scores_updated_at
    BEFORE UPDATE ON rubric_scores
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
