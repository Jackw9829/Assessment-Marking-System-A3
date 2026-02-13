// =============================================
// Supabase Helper Functions
// =============================================

import { supabase } from './supabase-client';
import type { UserRole, Profile, Course, Material } from './supabase-types';

// =============================================
// AUTH HELPERS
// =============================================

/**
 * Get current user profile with role
 */
export async function getCurrentUserProfile(): Promise<Profile | null> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    if (error) {
        console.error('Error fetching user profile:', error);
        return null;
    }

    return data;
}

/**
 * Check if current user has specific role
 */
export async function hasRole(role: UserRole): Promise<boolean> {
    const profile = await getCurrentUserProfile();
    return profile?.role === role;
}

/**
 * Sign up with role
 */
export async function signUpWithRole(
    email: string,
    password: string,
    fullName: string,
    role: UserRole = 'student'
) {
    return await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name: fullName,
                role: role,
            },
        },
    });
}

// =============================================
// COURSE HELPERS (Admin)
// =============================================

/**
 * Create a new course (Admin only)
 */
export async function createCourse(
    title: string,
    code: string,
    description: string | null = null,
    instructorId: string | null = null
) {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
        .from('courses')
        .insert({
            title,
            code,
            description,
            instructor_id: instructorId,
            created_by: user.id,
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * Get all courses (Admin only - returns all courses)
 */
export async function getCourses() {
    const { data, error } = await supabase
        .from('courses')
        .select(`
      *,
      instructor:instructor_id(id, full_name, email),
      creator:created_by(id, full_name, email)
    `)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
}

/**
 * Get a single course by ID
 */
export async function getCourseById(courseId: string) {
    const { data, error } = await supabase
        .from('courses')
        .select(`
      *,
      instructor:instructor_id(id, full_name, email),
      creator:created_by(id, full_name, email)
    `)
        .eq('id', courseId)
        .single();

    if (error) throw error;
    return data;
}

/**
 * Get courses for a specific instructor (Instructor role)
 * Returns only courses created by the instructor (created_by = instructor_id)
 */
export async function getInstructorCourses(instructorId: string) {
    const { data, error } = await supabase
        .from('courses')
        .select(`
      *,
      instructor:instructor_id(id, full_name, email),
      creator:created_by(id, full_name, email)
    `)
        .eq('created_by', instructorId)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
}

/**
 * Get enrolled courses for a student (Student role)
 * Returns only courses the student is enrolled in
 */
export async function getEnrolledCourses(studentId: string) {
    const { data, error } = await supabase
        .from('course_enrollments')
        .select(`
      course:course_id(
        *,
        instructor:instructor_id(id, full_name, email),
        creator:created_by(id, full_name, email)
      )
    `)
        .eq('student_id', studentId)
        .order('enrolled_at', { ascending: false });

    if (error) throw error;

    // Extract courses from enrollments
    return (data || []).map(enrollment => enrollment.course).filter(Boolean);
}

/**
 * Get courses based on user role
 * Unified function that returns appropriate courses based on role
 */
export async function getCoursesByRole(userId: string, role: 'student' | 'instructor' | 'admin') {
    switch (role) {
        case 'student':
            return getEnrolledCourses(userId);
        case 'instructor':
            return getInstructorCourses(userId);
        case 'admin':
        default:
            return getCourses();
    }
}

/**
 * Update course (Admin only)
 */
export async function updateCourse(
    courseId: string,
    updates: Partial<Course>
) {
    const { data, error } = await supabase
        .from('courses')
        .update(updates)
        .eq('id', courseId)
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * Delete course (Admin only)
 */
export async function deleteCourse(courseId: string) {
    const { error } = await supabase
        .from('courses')
        .delete()
        .eq('id', courseId);

    if (error) throw error;
}

// =============================================
// MATERIAL HELPERS (Instructor)
// =============================================

/**
 * Upload material file and create database entry (Instructor only)
 */
export async function uploadMaterial(
    courseId: string,
    file: File,
    title: string,
    description: string | null = null
) {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('Not authenticated');

    // Upload file to storage
    const filePath = `${courseId}/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage
        .from('course-materials')
        .upload(filePath, file);

    if (uploadError) throw uploadError;

    // Create material record
    const { data, error } = await supabase
        .from('materials')
        .insert({
            course_id: courseId,
            title,
            description,
            file_name: file.name,
            file_path: filePath,
            file_size: file.size,
            file_type: file.type,
            uploader_id: user.id,
        })
        .select()
        .single();

    if (error) {
        // Cleanup: delete uploaded file if database insert fails
        await supabase.storage.from('course-materials').remove([filePath]);
        throw error;
    }

    return data;
}

/**
 * Get materials for a course
 */
export async function getCourseMaterials(courseId: string) {
    const { data, error } = await supabase
        .from('materials')
        .select(`
      *,
      uploader:uploader_id(id, full_name, email)
    `)
        .eq('course_id', courseId)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
}

/**
 * Download material (generates signed URL)
 */
export async function downloadMaterial(filePath: string, expiresIn: number = 3600) {
    const { data, error } = await supabase.storage
        .from('course-materials')
        .createSignedUrl(filePath, expiresIn);

    if (error) throw error;
    return data.signedUrl;
}

/**
 * Delete material (Instructor only)
 */
export async function deleteMaterial(materialId: string, filePath: string) {
    // Delete from storage
    const { error: storageError } = await supabase.storage
        .from('course-materials')
        .remove([filePath]);

    if (storageError) throw storageError;

    // Delete from database
    const { error } = await supabase
        .from('materials')
        .delete()
        .eq('id', materialId);

    if (error) throw error;
}

/**
 * Get signed URL for submission preview (Instructor only)
 * Used for in-browser document preview during grading
 */
export async function getSubmissionPreviewUrl(filePath: string, expiresIn: number = 3600) {
    const { data, error } = await supabase.storage
        .from('course-materials')
        .createSignedUrl(filePath, expiresIn);

    if (error) throw error;
    return data.signedUrl;
}

/**
 * Check if file type supports in-browser preview
 */
export function isPreviewableFileType(fileType: string | null): boolean {
    if (!fileType) return false;
    const previewableTypes = [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'text/plain',
        'text/html',
    ];
    return previewableTypes.includes(fileType);
}

/**
 * Check if file type is a document that needs conversion for preview
 */
export function isDocumentType(fileType: string | null): boolean {
    if (!fileType) return false;
    const documentTypes = [
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ];
    return documentTypes.includes(fileType);
}

// =============================================
// ENROLLMENT HELPERS
// =============================================

/**
 * Enroll student in course (Admin only)
 */
export async function enrollStudent(courseId: string, studentId: string) {
    const { data, error } = await supabase
        .from('course_enrollments')
        .insert({
            course_id: courseId,
            student_id: studentId,
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * Get enrolled students for a course
 */
export async function getCourseEnrollments(courseId: string) {
    const { data, error } = await supabase
        .from('course_enrollments')
        .select(`
      *,
      student:student_id(id, full_name, email)
    `)
        .eq('course_id', courseId)
        .order('enrolled_at', { ascending: false });

    if (error) throw error;
    return data;
}

/**
 * Get courses student is enrolled in
 */
export async function getStudentEnrollments(studentId: string) {
    const { data, error } = await supabase
        .from('course_enrollments')
        .select(`
      *,
      course:course_id(
        *,
        instructor:instructor_id(id, full_name, email)
      )
    `)
        .eq('student_id', studentId)
        .order('enrolled_at', { ascending: false });

    if (error) throw error;
    return data;
}

/**
 * Unenroll student from course
 */
export async function unenrollStudent(courseId: string, studentId: string) {
    const { error } = await supabase
        .from('course_enrollments')
        .delete()
        .eq('course_id', courseId)
        .eq('student_id', studentId);

    if (error) throw error;
}

// =============================================
// PROFILE HELPERS
// =============================================

/**
 * Get all profiles (Admin only) or filtered by role
 */
export async function getProfiles(role?: UserRole) {
    let query = supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

    if (role) {
        query = query.eq('role', role);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data;
}

/**
 * Get instructors (for course assignment)
 */
export async function getInstructors() {
    return getProfiles('instructor');
}

/**
 * Get students (for enrollment)
 */
export async function getStudents() {
    return getProfiles('student');
}

/**
 * Update user profile
 */
export async function updateProfile(
    userId: string,
    updates: Partial<Profile>
) {
    const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

    if (error) throw error;
    return data;
}

// =============================================
// ASSESSMENT HELPERS
// =============================================

/**
 * Get all assessments (optionally filter by course)
 */
export async function getAssessments(courseId?: string) {
    let query = supabase
        .from('assessments')
        .select('*')
        .order('due_date', { ascending: true });

    if (courseId) {
        query = query.eq('course_id', courseId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data;
}

/**
 * Assessment type options
 */
export type AssessmentType = 'assignment' | 'quiz' | 'examination' | 'project' | 'practical' | 'other';

/**
 * Create an assessment (Instructor only)
 */
export async function createAssessment(
    courseId: string,
    title: string,
    description: string | null,
    dueDate: string,
    totalMarks: number = 100,
    options: {
        assessmentType?: AssessmentType;
        isActive?: boolean;
        isPublished?: boolean;
    } = {}
) {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('Not authenticated');

    const {
        assessmentType = 'assignment',
        isActive = true,
        isPublished = true
    } = options;

    const { data, error } = await supabase
        .from('assessments')
        .insert({
            course_id: courseId,
            title,
            description,
            due_date: dueDate,
            total_marks: totalMarks,
            created_by: user.id,
            assessment_type: assessmentType,
            is_active: isActive,
            is_published: isPublished,
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}

// =============================================
// SUBMISSION HELPERS
// =============================================

/**
 * Submit an assessment (Student only)
 */
export async function submitAssessment(
    assessmentId: string,
    file: File
) {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('Not authenticated');

    // Upload file to storage
    const filePath = `submissions/${assessmentId}/${user.id}/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage
        .from('course-materials')
        .upload(filePath, file);

    if (uploadError) throw uploadError;

    // Create submission record
    const { data, error } = await supabase
        .from('submissions')
        .insert({
            assessment_id: assessmentId,
            student_id: user.id,
            file_path: filePath,
            file_name: file.name,
            file_size: file.size,
            file_type: file.type,
            status: 'submitted',
        })
        .select()
        .single();

    if (error) {
        // Cleanup: delete uploaded file if database insert fails
        await supabase.storage.from('course-materials').remove([filePath]);
        throw error;
    }

    return data;
}

/**
 * Get submissions for a student
 */
export async function getStudentSubmissions(studentId: string) {
    const { data, error } = await supabase
        .from('submissions')
        .select(`
            *,
            assessment:assessment_id(id, title, due_date, total_marks, course_id)
        `)
        .eq('student_id', studentId)
        .order('submitted_at', { ascending: false });

    if (error) throw error;
    return data;
}

/**
 * Get all submissions for grading (Instructor)
 */
export async function getSubmissionsForGrading() {
    const { data, error } = await supabase
        .from('submissions')
        .select(`
            *,
            assessment:assessment_id(id, title, due_date, total_marks, course_id),
            student:student_id(id, full_name, email)
        `)
        .eq('status', 'submitted')
        .order('submitted_at', { ascending: true });

    if (error) throw error;
    return data;
}

/**
 * Grade a submission (Instructor only)
 */
export async function gradeSubmission(
    submissionId: string,
    score: number,
    totalMarks: number,
    feedback: string | null
) {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('Not authenticated');

    // First update submission status to 'graded'
    const { error: updateError } = await supabase
        .from('submissions')
        .update({ status: 'graded' })
        .eq('id', submissionId);

    if (updateError) {
        console.error('Failed to update submission status:', updateError);
        throw updateError;
    }

    // Use upsert to handle case where grade already exists (update instead of fail)
    const { data, error } = await supabase
        .from('grades')
        .upsert({
            submission_id: submissionId,
            graded_by: user.id,
            score,
            total_marks: totalMarks,
            feedback,
            graded_at: new Date().toISOString(),
        }, {
            onConflict: 'submission_id'
        })
        .select()
        .single();

    if (error) throw error;

    return data;
}

/**
 * Get grades for a student (only verified grades are visible to students)
 * RLS policy ensures students can only see their own verified grades
 */
export async function getStudentGrades(studentId: string) {
    // Query grades directly - RLS policy ensures:
    // 1. Students can only see grades for their own submissions
    // 2. Only verified grades are visible to students
    const { data, error } = await supabase
        .from('grades')
        .select(`
            *,
            submission:submission_id(
                id,
                file_name,
                submitted_at,
                student_id,
                status,
                assessment:assessment_id(id, title, course_id, total_marks)
            ),
            grader:graded_by(id, full_name, email)
        `)
        .eq('verified', true)
        .order('graded_at', { ascending: false });

    if (error) throw error;

    // Filter client-side to only show this student's grades
    // (RLS should handle this, but adding as safety check)
    const studentGrades = data?.filter(grade =>
        grade.submission?.student_id === studentId
    ) || [];

    return studentGrades;
}

/**
 * Get all graded submissions for instructor view
 */
export async function getGradedSubmissionsForInstructor() {
    const { data, error } = await supabase
        .from('submissions')
        .select(`
            *,
            assessment:assessment_id(id, title, due_date, total_marks, course_id),
            student:student_id(id, full_name, email),
            grade:grades(id, score, total_marks, feedback, graded_at, verified, graded_by, grader:graded_by(id, full_name))
        `)
        .eq('status', 'graded')
        .order('submitted_at', { ascending: false });

    if (error) throw error;
    return data;
}

// =============================================
// ADMIN GRADE VERIFICATION HELPERS
// =============================================

/**
 * Get grades pending verification (Admin only)
 */
export async function getPendingVerificationGrades() {
    const { data, error } = await supabase
        .from('grades')
        .select(`
            *,
            submission:submission_id(
                id,
                file_name,
                submitted_at,
                student:student_id(id, full_name, email),
                assessment:assessment_id(id, title, course_id, total_marks)
            ),
            grader:graded_by(id, full_name, email)
        `)
        .eq('verified', false)
        .order('graded_at', { ascending: true });

    if (error) throw error;
    return data;
}

/**
 * Get verified/released grades (Admin only)
 */
export async function getVerifiedGrades() {
    const { data, error } = await supabase
        .from('grades')
        .select(`
            *,
            submission:submission_id(
                id,
                file_name,
                submitted_at,
                student:student_id(id, full_name, email),
                assessment:assessment_id(id, title, course_id, total_marks)
            ),
            grader:graded_by(id, full_name, email),
            verifier:verified_by(id, full_name, email)
        `)
        .eq('verified', true)
        .order('verified_at', { ascending: false });

    if (error) throw error;
    return data;
}

/**
 * Verify and release a grade (Admin only)
 * Sets both verified and is_released flags to make grade visible to students
 */
export async function verifyGrade(gradeId: string) {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('Not authenticated');

    const now = new Date().toISOString();

    const { data, error } = await supabase
        .from('grades')
        .update({
            verified: true,
            verified_by: user.id,
            verified_at: now,
            is_released: true,
            released_at: now,
        })
        .eq('id', gradeId)
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * Get all assessments for admin view
 */
export async function getAllAssessments() {
    const { data, error } = await supabase
        .from('assessments')
        .select(`
            *,
            course:course_id(id, title, code),
            creator:created_by(id, full_name, email)
        `)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
}

/**
 * Get all submissions for admin view
 */
export async function getAllSubmissions() {
    const { data, error } = await supabase
        .from('submissions')
        .select(`
            *,
            assessment:assessment_id(id, title, course_id),
            student:student_id(id, full_name, email)
        `)
        .order('submitted_at', { ascending: false });

    if (error) throw error;
    return data;
}

// =============================================
// RUBRIC HELPERS
// =============================================

export interface RubricComponent {
    id?: string;
    name: string;
    description?: string;
    weight_percentage: number;
    max_score: number;
    order_index: number;
}

export interface RubricScore {
    component_id: string;
    score: number;
    feedback?: string;
}

/**
 * Create or get rubric template for an assessment
 */
export async function createRubricTemplate(
    assessmentId: string,
    name: string,
    description?: string
) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
        .from('rubric_templates')
        .insert({
            assessment_id: assessmentId,
            created_by: user.id,
            name,
            description,
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * Get rubric template for an assessment
 * Returns null if rubric system is not configured (tables don't exist)
 */
export async function getRubricTemplate(assessmentId: string) {
    try {
        const { data, error } = await supabase
            .from('rubric_templates')
            .select(`
                *,
                components:rubric_components(
                    id, name, description, weight_percentage, max_score, order_index
                )
            `)
            .eq('assessment_id', assessmentId)
            .single();

        // PGRST116 = no rows found, which is valid (no rubric for this assessment)
        if (error && error.code !== 'PGRST116') {
            // Check for 406 or table-not-found errors - rubric system not configured
            if (error.message?.includes('relation') ||
                error.message?.includes('does not exist') ||
                error.code === '42P01') {
                console.debug('Rubric system not configured - using simple grading');
                return null;
            }
            throw error;
        }
        return data;
    } catch (err: any) {
        // Handle network-level 406 errors (table doesn't exist)
        if (err.status === 406 || err.code === '42P01') {
            console.debug('Rubric tables not found - using simple grading');
            return null;
        }
        throw err;
    }
}

/**
 * Add rubric component to a template
 */
export async function addRubricComponent(
    rubricTemplateId: string,
    component: RubricComponent
) {
    const { data, error } = await supabase
        .from('rubric_components')
        .insert({
            template_id: rubricTemplateId,
            name: component.name,
            description: component.description,
            weight_percentage: component.weight_percentage,
            max_score: component.max_score,
            order_index: component.order_index,
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * Update rubric component
 */
export async function updateRubricComponent(
    componentId: string,
    updates: Partial<RubricComponent>
) {
    const { data, error } = await supabase
        .from('rubric_components')
        .update(updates)
        .eq('id', componentId)
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * Delete rubric component
 */
export async function deleteRubricComponent(componentId: string) {
    const { error } = await supabase
        .from('rubric_components')
        .delete()
        .eq('id', componentId);

    if (error) throw error;
}

/**
 * Get all rubric components for a template
 */
export async function getRubricComponents(rubricTemplateId: string) {
    const { data, error } = await supabase
        .from('rubric_components')
        .select('*')
        .eq('template_id', rubricTemplateId)
        .order('order_index', { ascending: true });

    if (error) throw error;
    return data;
}

/**
 * Save rubric scores for a submission
 */
export async function saveRubricScores(
    submissionId: string,
    scores: RubricScore[]
) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Upsert all scores
    const scoresToInsert = scores.map(score => ({
        submission_id: submissionId,
        component_id: score.component_id,
        score: score.score,
        feedback: score.feedback || null,
        graded_by: user.id,
    }));

    const { data, error } = await supabase
        .from('rubric_scores')
        .upsert(scoresToInsert, {
            onConflict: 'submission_id,component_id'
        })
        .select();

    if (error) throw error;
    return data;
}

/**
 * Get rubric scores for a submission
 */
export async function getRubricScores(submissionId: string) {
    const { data, error } = await supabase
        .from('rubric_scores')
        .select(`
            *,
            component:component_id(
                id, name, description, weight_percentage, max_score
            )
        `)
        .eq('submission_id', submissionId);

    if (error) throw error;
    return data;
}

/**
 * Calculate weighted total mark for a submission
 * Formula: SUM((score / max_score) * weight_percentage)
 */
export function calculateWeightedTotal(
    scores: { score: number; max_score: number; weight_percentage: number }[]
): { weightedTotal: number; allGraded: boolean } {
    if (!scores || scores.length === 0) {
        return { weightedTotal: 0, allGraded: false };
    }

    const allGraded = scores.every(s => s.score !== null && s.score !== undefined);

    const weightedTotal = scores.reduce((total, item) => {
        if (item.score === null || item.score === undefined) return total;
        const contribution = (item.score / item.max_score) * item.weight_percentage;
        return total + contribution;
    }, 0);

    return { weightedTotal: Math.round(weightedTotal * 100) / 100, allGraded };
}

/**
 * Validate that rubric weights sum to 100%
 */
export function validateRubricWeights(components: { weight_percentage: number }[]): {
    isValid: boolean;
    totalWeight: number;
    message: string;
} {
    const totalWeight = components.reduce((sum, c) => sum + c.weight_percentage, 0);
    const isValid = Math.abs(totalWeight - 100) < 0.01; // Allow tiny floating point errors

    return {
        isValid,
        totalWeight: Math.round(totalWeight * 100) / 100,
        message: isValid
            ? 'Weights are valid (100%)'
            : `Total weight is ${totalWeight.toFixed(2)}%. Must equal 100%.`
    };
}

/**
 * Grade submission with rubric scores
 * This saves individual rubric scores and calculates the final weighted grade
 */
export async function gradeSubmissionWithRubric(
    submissionId: string,
    rubricScores: RubricScore[],
    components: { id: string; weight_percentage: number; max_score: number }[],
    totalMarks: number,
    overallFeedback?: string
) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Validate all components have scores
    const componentIds = components.map(c => c.id);
    const scoredIds = rubricScores.map(s => s.component_id);
    const missingScores = componentIds.filter(id => !scoredIds.includes(id));

    if (missingScores.length > 0) {
        throw new Error(`Missing scores for ${missingScores.length} rubric component(s). All components must be graded.`);
    }

    // Calculate weighted total
    const scoresWithWeights = rubricScores.map(score => {
        const component = components.find(c => c.id === score.component_id);
        if (!component) throw new Error('Invalid rubric component');
        return {
            score: score.score,
            max_score: component.max_score,
            weight_percentage: component.weight_percentage,
        };
    });

    const { weightedTotal, allGraded } = calculateWeightedTotal(scoresWithWeights);

    if (!allGraded) {
        throw new Error('All rubric components must be graded before saving');
    }

    // Save rubric scores
    await saveRubricScores(submissionId, rubricScores);

    // Calculate final score based on total marks
    // weightedTotal is a percentage (0-100), convert to actual marks
    const finalScore = Math.round((weightedTotal / 100) * totalMarks);

    // Update submission status and save grade
    const { error: updateError } = await supabase
        .from('submissions')
        .update({ status: 'graded' })
        .eq('id', submissionId);

    if (updateError) throw updateError;

    // Save the final grade
    const { data, error } = await supabase
        .from('grades')
        .upsert({
            submission_id: submissionId,
            graded_by: user.id,
            score: finalScore,
            total_marks: totalMarks,
            feedback: overallFeedback || `Weighted rubric score: ${weightedTotal.toFixed(2)}%`,
            graded_at: new Date().toISOString(),
        }, {
            onConflict: 'submission_id'
        })
        .select()
        .single();

    if (error) throw error;

    return {
        grade: data,
        weightedTotal,
        finalScore,
        rubricScores,
    };
}
