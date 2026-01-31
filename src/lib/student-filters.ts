// =============================================
// Student Assessment Filter Helpers
// =============================================

import { supabase } from './supabase-client';

// =============================================
// TYPES
// =============================================

export type AssessmentType = 'assignment' | 'quiz' | 'examination' | 'project' | 'practical' | 'other';
export type SubmissionStatus = 'not_submitted' | 'submitted' | 'graded';
export type ResultsStatus = 'available' | 'pending' | 'not_applicable';

export interface FilterState {
    courseId: string | null;
    assessmentType: AssessmentType | null;
    status: SubmissionStatus | null;
    dueDateStart: Date | null;
    dueDateEnd: Date | null;
    submissionDateStart: Date | null;
    submissionDateEnd: Date | null;
    resultsStatus: ResultsStatus | null;
}

export interface FilteredAssessment {
    assessment_id: string;
    assessment_title: string;
    assessment_description: string | null;
    assessment_type: AssessmentType;
    course_id: string;
    course_title: string;
    course_code: string;
    due_date: string;
    total_marks: number;
    submission_id: string | null;
    submission_status: string;
    submitted_at: string | null;
    file_name: string | null;
    grade_id: string | null;
    score: number | null;
    feedback: string | null;
    graded_at: string | null;
    is_released: boolean;
    results_status: string;
}

export interface EnrolledCourse {
    course_id: string;
    course_title: string;
    course_code: string;
    enrolled_at: string;
}

// =============================================
// DEFAULT FILTER STATE
// =============================================

export const defaultFilterState: FilterState = {
    courseId: null,
    assessmentType: null,
    status: null,
    dueDateStart: null,
    dueDateEnd: null,
    submissionDateStart: null,
    submissionDateEnd: null,
    resultsStatus: null,
};

// =============================================
// FILTER FUNCTIONS
// =============================================

/**
 * Get filtered assessments for a student
 * Uses database function to ensure RLS and privacy
 */
export async function getFilteredAssessments(
    studentId: string,
    filters: Partial<FilterState> = {}
): Promise<FilteredAssessment[]> {
    const { data, error } = await (supabase as any).rpc('get_student_filtered_assessments', {
        p_student_id: studentId,
        p_course_id: filters.courseId || null,
        p_assessment_type: filters.assessmentType || null,
        p_status: filters.status || null,
        p_due_date_start: filters.dueDateStart?.toISOString() || null,
        p_due_date_end: filters.dueDateEnd?.toISOString() || null,
        p_submission_date_start: filters.submissionDateStart?.toISOString() || null,
        p_submission_date_end: filters.submissionDateEnd?.toISOString() || null,
        p_results_status: filters.resultsStatus || null,
    });

    if (error) {
        console.error('Error fetching filtered assessments:', error);
        throw error;
    }

    return (data || []) as FilteredAssessment[];
}

/**
 * Get courses in which the student is enrolled
 */
export async function getEnrolledCourses(studentId: string): Promise<EnrolledCourse[]> {
    const { data, error } = await (supabase as any).rpc('get_student_enrolled_courses', {
        p_student_id: studentId,
    });

    if (error) {
        console.error('Error fetching enrolled courses:', error);
        throw error;
    }

    return (data || []) as EnrolledCourse[];
}

/**
 * Check if any filters are active
 */
export function hasActiveFilters(filters: FilterState): boolean {
    return (
        filters.courseId !== null ||
        filters.assessmentType !== null ||
        filters.status !== null ||
        filters.dueDateStart !== null ||
        filters.dueDateEnd !== null ||
        filters.submissionDateStart !== null ||
        filters.submissionDateEnd !== null ||
        filters.resultsStatus !== null
    );
}

/**
 * Get active filter count
 */
export function getActiveFilterCount(filters: FilterState): number {
    let count = 0;
    if (filters.courseId) count++;
    if (filters.assessmentType) count++;
    if (filters.status) count++;
    if (filters.dueDateStart || filters.dueDateEnd) count++;
    if (filters.submissionDateStart || filters.submissionDateEnd) count++;
    if (filters.resultsStatus) count++;
    return count;
}

/**
 * Format assessment type for display
 */
export function formatAssessmentType(type: AssessmentType): string {
    const labels: Record<AssessmentType, string> = {
        assignment: 'Assignment',
        quiz: 'Quiz',
        examination: 'Examination',
        project: 'Project',
        practical: 'Practical',
        other: 'Other',
    };
    return labels[type] || type;
}

/**
 * Format submission status for display
 */
export function formatSubmissionStatus(status: SubmissionStatus): string {
    const labels: Record<SubmissionStatus, string> = {
        not_submitted: 'Not Submitted',
        submitted: 'Submitted',
        graded: 'Graded',
    };
    return labels[status] || status;
}

/**
 * Format results status for display
 */
export function formatResultsStatus(status: ResultsStatus): string {
    const labels: Record<ResultsStatus, string> = {
        available: 'Results Available',
        pending: 'Results Pending',
        not_applicable: 'Not Graded',
    };
    return labels[status] || status;
}

/**
 * Get status badge variant
 */
export function getStatusBadgeVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
    switch (status) {
        case 'graded':
            return 'default';
        case 'submitted':
            return 'secondary';
        case 'not_submitted':
            return 'outline';
        default:
            return 'secondary';
    }
}

/**
 * Get results badge variant
 */
export function getResultsBadgeVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
    switch (status) {
        case 'available':
            return 'default';
        case 'pending':
            return 'secondary';
        case 'not_applicable':
            return 'outline';
        default:
            return 'secondary';
    }
}

/**
 * Check if assessment is overdue
 */
export function isOverdue(dueDate: string, status: string): boolean {
    if (status !== 'not_submitted') return false;
    return new Date(dueDate) < new Date();
}

/**
 * Get days until due
 */
export function getDaysUntilDue(dueDate: string): number {
    const now = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}
