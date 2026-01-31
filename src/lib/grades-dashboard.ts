// =============================================
// Student Grades Dashboard Helper Functions
// =============================================

import { supabase } from './supabase-client';
import { AssessmentType } from './student-filters';

// =============================================
// TYPES
// =============================================

export interface GradeRecord {
    grade_id: string;
    assessment_id: string;
    assessment_title: string;
    assessment_type: AssessmentType;
    course_id: string;
    course_code: string;
    course_title: string;
    score: number;
    total_marks: number;
    percentage: number;
    grade_label: GradeLabel;
    feedback: string | null;
    graded_at: string;
    released_at: string | null;
}

export interface GradeStatistics {
    total_assessments: number;
    overall_average: number;
    highest_score: number;
    highest_percentage: number;
    lowest_score: number;
    lowest_percentage: number;
    hd_count: number;
    d_count: number;
    cr_count: number;
    p_count: number;
    f_count: number;
}

export interface CourseGradeSummary {
    course_id: string;
    course_code: string;
    course_title: string;
    assessment_count: number;
    course_average: number;
    course_grade_label: GradeLabel;
}

export type GradeLabel = 'HD' | 'D' | 'CR' | 'P' | 'F';

export type GradesViewMode = 'table' | 'graph';

// =============================================
// GRADE LABEL HELPERS
// =============================================

export const gradeLabels: Record<GradeLabel, { name: string; range: string; colour: string }> = {
    HD: { name: 'High Distinction', range: '85-100%', colour: '#22C55E' },
    D: { name: 'Distinction', range: '75-84%', colour: '#3B82F6' },
    CR: { name: 'Credit', range: '65-74%', colour: '#8B5CF6' },
    P: { name: 'Pass', range: '50-64%', colour: '#F59E0B' },
    F: { name: 'Fail', range: '0-49%', colour: '#EF4444' },
};

export function getGradeLabelColour(label: GradeLabel): string {
    return gradeLabels[label]?.colour || '#6B7280';
}

export function getGradeLabelName(label: GradeLabel): string {
    return gradeLabels[label]?.name || label;
}

export function getGradeBadgeClass(label: GradeLabel): string {
    switch (label) {
        case 'HD': return 'bg-green-100 text-green-800 border-green-200';
        case 'D': return 'bg-blue-100 text-blue-800 border-blue-200';
        case 'CR': return 'bg-purple-100 text-purple-800 border-purple-200';
        case 'P': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        case 'F': return 'bg-red-100 text-red-800 border-red-200';
        default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
}

// =============================================
// CHART COLOURS
// =============================================

export const chartColours = {
    primary: '#3B82F6',
    secondary: '#8B5CF6',
    success: '#22C55E',
    warning: '#F59E0B',
    danger: '#EF4444',
    info: '#06B6D4',
};

export const gradeDistributionColours = [
    '#22C55E', // HD - Green
    '#3B82F6', // D - Blue
    '#8B5CF6', // CR - Purple
    '#F59E0B', // P - Yellow
    '#EF4444', // F - Red
];

// =============================================
// API FUNCTIONS
// =============================================

/**
 * Get all released grades for a student
 */
export async function getStudentGrades(studentId: string): Promise<GradeRecord[]> {
    const { data, error } = await (supabase as any).rpc('get_student_grades_dashboard', {
        p_student_id: studentId,
    });

    if (error) {
        console.error('Error fetching grades:', error);
        throw error;
    }

    return (data || []) as GradeRecord[];
}

/**
 * Get grade statistics for a student
 */
export async function getGradeStatistics(studentId: string): Promise<GradeStatistics | null> {
    const { data, error } = await (supabase as any).rpc('get_student_grade_statistics', {
        p_student_id: studentId,
    });

    if (error) {
        console.error('Error fetching grade statistics:', error);
        throw error;
    }

    return data?.[0] || null;
}

/**
 * Get grades grouped by course
 */
export async function getGradesByCourse(studentId: string): Promise<CourseGradeSummary[]> {
    const { data, error } = await (supabase as any).rpc('get_student_grades_by_course', {
        p_student_id: studentId,
    });

    if (error) {
        console.error('Error fetching grades by course:', error);
        throw error;
    }

    return (data || []) as CourseGradeSummary[];
}

// =============================================
// DATA TRANSFORMATION HELPERS
// =============================================

/**
 * Group grades by course
 */
export function groupGradesByCourse(grades: GradeRecord[]): Map<string, GradeRecord[]> {
    const grouped = new Map<string, GradeRecord[]>();

    for (const grade of grades) {
        const key = grade.course_id;
        if (!grouped.has(key)) {
            grouped.set(key, []);
        }
        grouped.get(key)!.push(grade);
    }

    return grouped;
}

/**
 * Group grades by assessment type
 */
export function groupGradesByType(grades: GradeRecord[]): Map<AssessmentType, GradeRecord[]> {
    const grouped = new Map<AssessmentType, GradeRecord[]>();

    for (const grade of grades) {
        const key = grade.assessment_type;
        if (!grouped.has(key)) {
            grouped.set(key, []);
        }
        grouped.get(key)!.push(grade);
    }

    return grouped;
}

/**
 * Calculate course average from grades
 */
export function calculateCourseAverage(grades: GradeRecord[]): number {
    if (grades.length === 0) return 0;
    const sum = grades.reduce((acc, g) => acc + g.percentage, 0);
    return Math.round((sum / grades.length) * 10) / 10;
}

/**
 * Get grade label from percentage
 */
export function getGradeLabelFromPercentage(percentage: number): GradeLabel {
    if (percentage >= 85) return 'HD';
    if (percentage >= 75) return 'D';
    if (percentage >= 65) return 'CR';
    if (percentage >= 50) return 'P';
    return 'F';
}

/**
 * Prepare data for bar chart (scores by assessment)
 */
export function prepareBarChartData(grades: GradeRecord[]) {
    return grades.map(g => ({
        name: g.assessment_title.length > 15
            ? g.assessment_title.substring(0, 15) + '...'
            : g.assessment_title,
        fullName: g.assessment_title,
        score: g.percentage,
        course: g.course_code,
        gradeLabel: g.grade_label,
    }));
}

/**
 * Prepare data for pie chart (grade distribution)
 */
export function preparePieChartData(stats: GradeStatistics) {
    return [
        { name: 'HD', value: stats.hd_count, colour: gradeLabels.HD.colour },
        { name: 'D', value: stats.d_count, colour: gradeLabels.D.colour },
        { name: 'CR', value: stats.cr_count, colour: gradeLabels.CR.colour },
        { name: 'P', value: stats.p_count, colour: gradeLabels.P.colour },
        { name: 'F', value: stats.f_count, colour: gradeLabels.F.colour },
    ].filter(d => d.value > 0);
}

/**
 * Prepare data for trend line chart
 */
export function prepareTrendChartData(grades: GradeRecord[]) {
    // Sort by graded date
    const sorted = [...grades].sort((a, b) =>
        new Date(a.graded_at).getTime() - new Date(b.graded_at).getTime()
    );

    return sorted.map(g => ({
        date: new Date(g.graded_at).toLocaleDateString('en-AU', {
            day: 'numeric',
            month: 'short'
        }),
        fullDate: g.graded_at,
        score: g.percentage,
        assessment: g.assessment_title,
        course: g.course_code,
    }));
}

/**
 * Format date for display
 */
export function formatGradeDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-AU', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
}
