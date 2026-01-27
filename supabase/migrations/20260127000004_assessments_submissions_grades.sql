-- =============================================
-- Assessment & Marking System - Additional Tables
-- Migration: 20260127000004
-- =============================================

-- =============================================
-- 1. ENUMS
-- =============================================

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_type WHERE typname = 'submission_status'
	) THEN
		CREATE TYPE submission_status AS ENUM ('submitted', 'graded');
	END IF;
END;
$$;

-- =============================================
-- 2. ASSESSMENTS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS assessments (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
	title TEXT NOT NULL,
	description TEXT,
	created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
	due_date TIMESTAMPTZ NOT NULL,
	total_marks INTEGER NOT NULL DEFAULT 100,
	created_at TIMESTAMPTZ DEFAULT NOW(),
	updated_at TIMESTAMPTZ DEFAULT NOW(),
	CONSTRAINT total_marks_positive CHECK (total_marks > 0)
);

-- Index for faster course lookups
CREATE INDEX IF NOT EXISTS idx_assessments_course_id ON assessments(course_id);
CREATE INDEX IF NOT EXISTS idx_assessments_created_by ON assessments(created_by);
CREATE INDEX IF NOT EXISTS idx_assessments_due_date ON assessments(due_date);

-- =============================================
-- 3. SUBMISSIONS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS submissions (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
	student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
	file_path TEXT NOT NULL,
	file_name TEXT NOT NULL,
	file_size BIGINT NOT NULL,
	file_type TEXT NOT NULL,
	submitted_at TIMESTAMPTZ DEFAULT NOW(),
	status submission_status DEFAULT 'submitted',
	UNIQUE(assessment_id, student_id)
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_submissions_assessment_id ON submissions(assessment_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student_id ON submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);

-- =============================================
-- 4. GRADES TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS grades (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE UNIQUE,
	graded_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
	score INTEGER NOT NULL,
	total_marks INTEGER NOT NULL,
	feedback TEXT,
	graded_at TIMESTAMPTZ DEFAULT NOW(),
	verified BOOLEAN DEFAULT FALSE,
	verified_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
	verified_at TIMESTAMPTZ,
	CONSTRAINT score_valid CHECK (score >= 0 AND score <= total_marks),
	CONSTRAINT total_marks_positive CHECK (total_marks > 0)
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_grades_submission_id ON grades(submission_id);
CREATE INDEX IF NOT EXISTS idx_grades_graded_by ON grades(graded_by);
CREATE INDEX IF NOT EXISTS idx_grades_verified ON grades(verified);

-- =============================================
-- 5. TRIGGERS FOR UPDATED_AT
-- =============================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
	NEW.updated_at = NOW();
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS assessments_updated_at ON assessments;
CREATE TRIGGER assessments_updated_at
	BEFORE UPDATE ON assessments
	FOR EACH ROW
	EXECUTE FUNCTION update_updated_at();

-- =============================================
-- 6. TRIGGER TO UPDATE SUBMISSION STATUS
-- =============================================

CREATE OR REPLACE FUNCTION update_submission_status()
RETURNS TRIGGER AS $$
BEGIN
	-- When a grade is created, update submission status to 'graded'
	UPDATE submissions
	SET status = 'graded'
	WHERE id = NEW.submission_id;
    
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS grade_updates_submission ON grades;
CREATE TRIGGER grade_updates_submission
	AFTER INSERT ON grades
	FOR EACH ROW
	EXECUTE FUNCTION update_submission_status();

-- =============================================
-- 7. COMMENTS FOR DOCUMENTATION
-- =============================================

COMMENT ON TABLE assessments IS 'Stores assignments and exams created by instructors';
COMMENT ON TABLE submissions IS 'Stores student submissions for assessments';
COMMENT ON TABLE grades IS 'Stores instructor grades and feedback for submissions';
COMMENT ON COLUMN grades.verified IS 'Admin verification flag for grade accuracy';

-- =============================================
-- RLS Policies for Assessments, Submissions, and Grades
-- Migration: 20260127000005
-- =============================================

-- =============================================
-- 1. ENABLE RLS
-- =============================================

ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE grades ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 2. ASSESSMENTS POLICIES
-- =============================================

DO $$ BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND policyname = 'assessments: admins full access'
	) THEN
		CREATE POLICY "assessments: admins full access"
			ON assessments FOR ALL
			USING (is_admin());
	END IF;
END $$;

DO $$ BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND policyname = 'assessments: instructors can view all'
	) THEN
		CREATE POLICY "assessments: instructors can view all"
			ON assessments FOR SELECT
			USING (is_instructor());
	END IF;
END $$;

DO $$ BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND policyname = 'assessments: instructors can create for own courses'
	) THEN
		CREATE POLICY "assessments: instructors can create for own courses"
			ON assessments FOR INSERT
			WITH CHECK (
				is_instructor() AND
				EXISTS (
					SELECT 1 FROM courses
					WHERE courses.id = assessments.course_id
					AND courses.instructor_id = auth.uid()
				)
			);
	END IF;
END $$;

DO $$ BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND policyname = 'assessments: instructors can update own'
	) THEN
		CREATE POLICY "assessments: instructors can update own"
			ON assessments FOR UPDATE
			USING (is_instructor() AND created_by = auth.uid())
			WITH CHECK (is_instructor() AND created_by = auth.uid());
	END IF;
END $$;

DO $$ BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND policyname = 'assessments: instructors can delete own'
	) THEN
		CREATE POLICY "assessments: instructors can delete own"
			ON assessments FOR DELETE
			USING (is_instructor() AND created_by = auth.uid());
	END IF;
END $$;

DO $$ BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND policyname = 'assessments: students can view enrolled'
	) THEN
		CREATE POLICY "assessments: students can view enrolled"
			ON assessments FOR SELECT
			USING (
				is_student() AND
				EXISTS (
					SELECT 1 FROM course_enrollments
					WHERE course_enrollments.course_id = assessments.course_id
					AND course_enrollments.student_id = auth.uid()
				)
			);
	END IF;
END $$;

-- =============================================
-- 3. SUBMISSIONS POLICIES
-- =============================================

DO $$ BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND policyname = 'submissions: admins full access'
	) THEN
		CREATE POLICY "submissions: admins full access"
			ON submissions FOR ALL
			USING (is_admin());
	END IF;
END $$;

DO $$ BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND policyname = 'submissions: instructors can view own course submissions'
	) THEN
		CREATE POLICY "submissions: instructors can view own course submissions"
			ON submissions FOR SELECT
			USING (
				is_instructor() AND
				EXISTS (
					SELECT 1 FROM assessments
					JOIN courses ON assessments.course_id = courses.id
					WHERE assessments.id = submissions.assessment_id
					AND courses.instructor_id = auth.uid()
				)
			);
	END IF;
END $$;

DO $$ BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND policyname = 'submissions: students can view own'
	) THEN
		CREATE POLICY "submissions: students can view own"
			ON submissions FOR SELECT
			USING (is_student() AND student_id = auth.uid());
	END IF;
END $$;

DO $$ BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND policyname = 'submissions: students can submit to enrolled courses'
	) THEN
		CREATE POLICY "submissions: students can submit to enrolled courses"
			ON submissions FOR INSERT
			WITH CHECK (
				is_student() AND
				student_id = auth.uid() AND
				EXISTS (
					SELECT 1 FROM assessments
					JOIN course_enrollments ON assessments.course_id = course_enrollments.course_id
					WHERE assessments.id = submissions.assessment_id
					AND course_enrollments.student_id = auth.uid()
				)
			);
	END IF;
END $$;

DO $$ BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND policyname = 'submissions: students can update own ungraded'
	) THEN
		CREATE POLICY "submissions: students can update own ungraded"
			ON submissions FOR UPDATE
			USING (
				is_student() AND
				student_id = auth.uid() AND
				status = 'submitted'
			)
			WITH CHECK (
				is_student() AND
				student_id = auth.uid() AND
				status = 'submitted'
			);
	END IF;
END $$;

DO $$ BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND policyname = 'submissions: students can delete own ungraded'
	) THEN
		CREATE POLICY "submissions: students can delete own ungraded"
			ON submissions FOR DELETE
			USING (
				is_student() AND
				student_id = auth.uid() AND
				status = 'submitted'
			);
	END IF;
END $$;

-- =============================================
-- 4. GRADES POLICIES
-- =============================================

DO $$ BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND policyname = 'grades: admins full access'
	) THEN
		CREATE POLICY "grades: admins full access"
			ON grades FOR ALL
			USING (is_admin());
	END IF;
END $$;

DO $$ BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND policyname = 'grades: instructors can view own course grades'
	) THEN
		CREATE POLICY "grades: instructors can view own course grades"
			ON grades FOR SELECT
			USING (
				is_instructor() AND
				EXISTS (
					SELECT 1 FROM submissions
					JOIN assessments ON submissions.assessment_id = assessments.id
					JOIN courses ON assessments.course_id = courses.id
					WHERE submissions.id = grades.submission_id
					AND courses.instructor_id = auth.uid()
				)
			);
	END IF;
END $$;

DO $$ BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND policyname = 'grades: instructors can grade own courses'
	) THEN
		CREATE POLICY "grades: instructors can grade own courses"
			ON grades FOR INSERT
			WITH CHECK (
				is_instructor() AND
				graded_by = auth.uid() AND
				EXISTS (
					SELECT 1 FROM submissions
					JOIN assessments ON submissions.assessment_id = assessments.id
					JOIN courses ON assessments.course_id = courses.id
					WHERE submissions.id = grades.submission_id
					AND courses.instructor_id = auth.uid()
				)
			);
	END IF;
END $$;

DO $$ BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND policyname = 'grades: instructors can update own unverified'
	) THEN
		CREATE POLICY "grades: instructors can update own unverified"
			ON grades FOR UPDATE
			USING (
				is_instructor() AND
				graded_by = auth.uid() AND
				verified = FALSE
			)
			WITH CHECK (
				is_instructor() AND
				graded_by = auth.uid() AND
				verified = FALSE
			);
	END IF;
END $$;

DO $$ BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND policyname = 'grades: students can view own'
	) THEN
		CREATE POLICY "grades: students can view own"
			ON grades FOR SELECT
			USING (
				is_student() AND
				EXISTS (
					SELECT 1 FROM submissions
					WHERE submissions.id = grades.submission_id
					AND submissions.student_id = auth.uid()
				)
			);
	END IF;
END $$;

-- =============================================
-- 5. COMMENTS FOR DOCUMENTATION
-- =============================================

COMMENT ON POLICY "assessments: instructors can create for own courses" ON assessments IS 'Instructors can only create assessments for courses they teach';
COMMENT ON POLICY "submissions: students can submit to enrolled courses" ON submissions IS 'Students can only submit to assessments in courses they are enrolled in';
COMMENT ON POLICY "grades: instructors can grade own courses" ON grades IS 'Instructors can only grade submissions from their own courses';

-- =============================================
-- Storage Policies for Submissions
-- Migration: 20260127000006
-- =============================================

-- =============================================
-- 1. CREATE SUBMISSIONS STORAGE BUCKET
-- =============================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('submissions', 'submissions', false)
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- 2. STORAGE POLICIES FOR SUBMISSIONS
-- =============================================

DO $$ BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND policyname = 'storage: students can upload own submissions'
	) THEN
		CREATE POLICY "storage: students can upload own submissions"
		ON storage.objects FOR INSERT
		WITH CHECK (
			bucket_id = 'submissions' AND
			is_student() AND
			(storage.foldername(name))[1] IN (
				SELECT assessments.id::text
				FROM assessments
				JOIN course_enrollments ON assessments.course_id = course_enrollments.course_id
				WHERE course_enrollments.student_id = auth.uid()
			) AND
			(storage.foldername(name))[2] = auth.uid()::text
		);
	END IF;
END $$;

DO $$ BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND policyname = 'storage: students can view own submissions'
	) THEN
		CREATE POLICY "storage: students can view own submissions"
		ON storage.objects FOR SELECT
		USING (
			bucket_id = 'submissions' AND
			is_student() AND
			(storage.foldername(name))[2] = auth.uid()::text
		);
	END IF;
END $$;

DO $$ BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND policyname = 'storage: students can update own ungraded submissions'
	) THEN
		CREATE POLICY "storage: students can update own ungraded submissions"
		ON storage.objects FOR UPDATE
		USING (
			bucket_id = 'submissions' AND
			is_student() AND
			(storage.foldername(name))[2] = auth.uid()::text AND
			EXISTS (
				SELECT 1 FROM submissions
				WHERE submissions.file_path = storage.objects.name
				AND submissions.student_id = auth.uid()
				AND submissions.status = 'submitted'
			)
		)
		WITH CHECK (
			bucket_id = 'submissions' AND
			is_student() AND
			(storage.foldername(name))[2] = auth.uid()::text
		);
	END IF;
END $$;

DO $$ BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND policyname = 'storage: students can delete own ungraded submissions'
	) THEN
		CREATE POLICY "storage: students can delete own ungraded submissions"
		ON storage.objects FOR DELETE
		USING (
			bucket_id = 'submissions' AND
			is_student() AND
			(storage.foldername(name))[2] = auth.uid()::text AND
			EXISTS (
				SELECT 1 FROM submissions
				WHERE submissions.file_path = storage.objects.name
				AND submissions.student_id = auth.uid()
				AND submissions.status = 'submitted'
			)
		);
	END IF;
END $$;

DO $$ BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND policyname = 'storage: instructors can view course submissions'
	) THEN
		CREATE POLICY "storage: instructors can view course submissions"
		ON storage.objects FOR SELECT
		USING (
			bucket_id = 'submissions' AND
			is_instructor() AND
			(storage.foldername(name))[1] IN (
				SELECT assessments.id::text
				FROM assessments
				JOIN courses ON assessments.course_id = courses.id
				WHERE courses.instructor_id = auth.uid()
			)
		);
	END IF;
END $$;

DO $$ BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND policyname = 'storage: admins full access submissions'
	) THEN
		CREATE POLICY "storage: admins full access submissions"
		ON storage.objects FOR ALL
		USING (bucket_id = 'submissions' AND is_admin())
		WITH CHECK (bucket_id = 'submissions' AND is_admin());
	END IF;
END $$;

-- =============================================
-- 3. COMMENTS FOR DOCUMENTATION
-- =============================================

COMMENT ON POLICY "storage: students can upload own submissions" ON storage.objects IS 'Students can upload files to assessment_id/student_id/ folders for enrolled courses';
COMMENT ON POLICY "storage: instructors can view course submissions" ON storage.objects IS 'Instructors can view submission files from their courses';
