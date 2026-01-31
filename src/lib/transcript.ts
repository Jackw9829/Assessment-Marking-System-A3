// =============================================
// Interim Transcript Helper Library
// =============================================

import { supabase } from './supabase-client';

// =============================================
// TYPES
// =============================================

export interface TranscriptGrade {
    course_id: string;
    course_code: string;
    course_title: string;
    assessment_id: string;
    assessment_title: string;
    assessment_type: string;
    score: number;
    total_marks: number;
    percentage: number;
    grade_label: 'HD' | 'D' | 'CR' | 'P' | 'F';
    released_at: string;
}

export interface TranscriptSummary {
    total_assessments: number;
    total_courses: number;
    overall_average: number;
    hd_count: number;
    d_count: number;
    cr_count: number;
    p_count: number;
    f_count: number;
}

export interface TranscriptProfile {
    student_id: string;
    full_name: string;
    email: string;
    generated_at: string;
}

export interface CourseTranscriptGroup {
    course_id: string;
    course_code: string;
    course_title: string;
    grades: TranscriptGrade[];
    course_average: number;
}

export interface TranscriptData {
    profile: TranscriptProfile;
    courses: CourseTranscriptGroup[];
    summary: TranscriptSummary;
}

// =============================================
// GRADE LABEL HELPERS
// =============================================

export const gradeLabelConfig = {
    HD: { name: 'High Distinction', colour: '#22C55E', bgClass: 'bg-green-100 text-green-800' },
    D: { name: 'Distinction', colour: '#3B82F6', bgClass: 'bg-blue-100 text-blue-800' },
    CR: { name: 'Credit', colour: '#8B5CF6', bgClass: 'bg-purple-100 text-purple-800' },
    P: { name: 'Pass', colour: '#F59E0B', bgClass: 'bg-yellow-100 text-yellow-800' },
    F: { name: 'Fail', colour: '#EF4444', bgClass: 'bg-red-100 text-red-800' },
} as const;

export function getGradeLabelName(label: string): string {
    return gradeLabelConfig[label as keyof typeof gradeLabelConfig]?.name || label;
}

export function getGradeBadgeClass(label: string): string {
    return gradeLabelConfig[label as keyof typeof gradeLabelConfig]?.bgClass || 'bg-gray-100 text-gray-800';
}

// =============================================
// DATE FORMATTING
// =============================================

export function formatTranscriptDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-AU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
}

export function formatTranscriptDateTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-AU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short',
    });
}

export function formatShortDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-AU', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
}

// =============================================
// API FUNCTIONS
// =============================================

/**
 * Get transcript grades for a student (released only)
 */
export async function getTranscriptGrades(studentId: string): Promise<TranscriptGrade[]> {
    const { data, error } = await (supabase as any).rpc('get_student_transcript_data', {
        p_student_id: studentId,
    });

    if (error) {
        console.error('Error fetching transcript grades:', error);
        throw error;
    }

    return (data || []) as TranscriptGrade[];
}

/**
 * Get transcript summary statistics
 */
export async function getTranscriptSummary(studentId: string): Promise<TranscriptSummary | null> {
    const { data, error } = await (supabase as any).rpc('get_student_transcript_summary', {
        p_student_id: studentId,
    });

    if (error) {
        console.error('Error fetching transcript summary:', error);
        throw error;
    }

    return data?.[0] || null;
}

/**
 * Get student profile for transcript header
 */
export async function getTranscriptProfile(studentId: string): Promise<TranscriptProfile | null> {
    const { data, error } = await (supabase as any).rpc('get_student_transcript_profile', {
        p_student_id: studentId,
    });

    if (error) {
        console.error('Error fetching transcript profile:', error);
        throw error;
    }

    return data?.[0] || null;
}

/**
 * Log transcript action for audit trail
 */
export async function logTranscriptAction(
    studentId: string,
    action: 'viewed' | 'generated' | 'downloaded',
    metadata: Record<string, any> = {}
): Promise<string | null> {
    const { data, error } = await (supabase as any).rpc('log_transcript_action', {
        p_student_id: studentId,
        p_action: action,
        p_metadata: metadata,
    });

    if (error) {
        console.error('Error logging transcript action:', error);
        // Don't throw - logging failure shouldn't block user action
        return null;
    }

    return data;
}

/**
 * Get complete transcript data
 */
export async function getCompleteTranscriptData(studentId: string): Promise<TranscriptData | null> {
    try {
        const [grades, summary, profile] = await Promise.all([
            getTranscriptGrades(studentId),
            getTranscriptSummary(studentId),
            getTranscriptProfile(studentId),
        ]);

        if (!profile || !summary) {
            return null;
        }

        // Group grades by course
        const courses = groupGradesByCourse(grades);

        return {
            profile,
            courses,
            summary,
        };
    } catch (error) {
        console.error('Error fetching complete transcript data:', error);
        throw error;
    }
}

// =============================================
// GROUPING HELPERS
// =============================================

/**
 * Group grades by course
 */
export function groupGradesByCourse(grades: TranscriptGrade[]): CourseTranscriptGroup[] {
    const courseMap = new Map<string, TranscriptGrade[]>();

    grades.forEach((grade) => {
        const existing = courseMap.get(grade.course_id) || [];
        existing.push(grade);
        courseMap.set(grade.course_id, existing);
    });

    const courseGroups: CourseTranscriptGroup[] = [];

    courseMap.forEach((courseGrades, courseId) => {
        const firstGrade = courseGrades[0];
        const courseAverage =
            courseGrades.reduce((sum, g) => sum + g.percentage, 0) / courseGrades.length;

        courseGroups.push({
            course_id: courseId,
            course_code: firstGrade.course_code,
            course_title: firstGrade.course_title,
            grades: courseGrades,
            course_average: Math.round(courseAverage * 100) / 100,
        });
    });

    // Sort by course code
    return courseGroups.sort((a, b) => a.course_code.localeCompare(b.course_code));
}

// =============================================
// PDF GENERATION
// =============================================

/**
 * Generate transcript HTML for PDF conversion
 */
export function generateTranscriptHTML(data: TranscriptData): string {
    const { profile, courses, summary } = data;

    const coursesHTML = courses
        .map(
            (course) => `
        <div class="course-section">
            <h3 class="course-header">${course.course_code} - ${course.course_title}</h3>
            <table class="grades-table">
                <thead>
                    <tr>
                        <th>Assessment</th>
                        <th>Type</th>
                        <th>Score</th>
                        <th>Percentage</th>
                        <th>Grade</th>
                        <th>Released</th>
                    </tr>
                </thead>
                <tbody>
                    ${course.grades
                    .map(
                        (g) => `
                        <tr>
                            <td>${g.assessment_title}</td>
                            <td>${formatAssessmentType(g.assessment_type)}</td>
                            <td>${g.score}/${g.total_marks}</td>
                            <td>${g.percentage}%</td>
                            <td><span class="grade-badge grade-${g.grade_label.toLowerCase()}">${g.grade_label}</span></td>
                            <td>${formatShortDate(g.released_at)}</td>
                        </tr>
                    `
                    )
                    .join('')}
                </tbody>
            </table>
            <p class="course-average">Course Average: ${course.course_average}%</p>
        </div>
    `
        )
        .join('');

    return `
<!DOCTYPE html>
<html>
<head>
    <title>Interim Transcript - ${profile.full_name}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Times New Roman', serif; 
            font-size: 11pt;
            line-height: 1.4;
            color: #333;
            padding: 40px;
            max-width: 800px;
            margin: 0 auto;
            position: relative;
        }
        
        /* Watermark */
        body::before {
            content: 'INTERIM TRANSCRIPT';
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-45deg);
            font-size: 80px;
            color: rgba(0, 0, 0, 0.05);
            font-weight: bold;
            z-index: -1;
            white-space: nowrap;
        }
        
        .header { 
            text-align: center; 
            border-bottom: 3px solid #1e3a5f;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .institution { 
            font-size: 24pt; 
            font-weight: bold; 
            color: #1e3a5f;
            margin-bottom: 10px;
        }
        .transcript-title {
            font-size: 18pt;
            font-weight: bold;
            color: #c41e3a;
            letter-spacing: 3px;
            margin-top: 15px;
        }
        
        .student-info {
            background: #f5f5f5;
            padding: 20px;
            margin-bottom: 30px;
            border-left: 4px solid #1e3a5f;
        }
        .student-info h2 { 
            font-size: 14pt;
            color: #1e3a5f;
            margin-bottom: 15px;
        }
        .info-row { 
            display: flex; 
            margin-bottom: 8px;
        }
        .info-label { 
            font-weight: bold; 
            width: 150px;
            color: #555;
        }
        .info-value { 
            flex: 1;
        }
        
        .course-section {
            margin-bottom: 30px;
            page-break-inside: avoid;
        }
        .course-header {
            font-size: 12pt;
            background: #1e3a5f;
            color: white;
            padding: 10px 15px;
            margin-bottom: 0;
        }
        
        .grades-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 10px;
        }
        .grades-table th {
            background: #e8e8e8;
            padding: 10px;
            text-align: left;
            font-size: 10pt;
            border: 1px solid #ccc;
        }
        .grades-table td {
            padding: 8px 10px;
            border: 1px solid #ddd;
            font-size: 10pt;
        }
        .grades-table tr:nth-child(even) {
            background: #f9f9f9;
        }
        
        .grade-badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 4px;
            font-weight: bold;
            font-size: 9pt;
        }
        .grade-hd { background: #dcfce7; color: #166534; }
        .grade-d { background: #dbeafe; color: #1e40af; }
        .grade-cr { background: #ede9fe; color: #5b21b6; }
        .grade-p { background: #fef3c7; color: #92400e; }
        .grade-f { background: #fee2e2; color: #991b1b; }
        
        .course-average {
            text-align: right;
            font-style: italic;
            color: #666;
            margin-top: 5px;
        }
        
        .summary-section {
            background: #f0f7ff;
            padding: 20px;
            margin-top: 30px;
            border: 2px solid #1e3a5f;
        }
        .summary-section h2 {
            font-size: 14pt;
            color: #1e3a5f;
            margin-bottom: 15px;
        }
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 15px;
        }
        .summary-item {
            text-align: center;
        }
        .summary-value {
            font-size: 24pt;
            font-weight: bold;
            color: #1e3a5f;
        }
        .summary-label {
            font-size: 9pt;
            color: #666;
            text-transform: uppercase;
        }
        
        .grade-distribution {
            margin-top: 20px;
            display: flex;
            justify-content: center;
            gap: 20px;
        }
        .distribution-item {
            text-align: center;
        }
        .distribution-count {
            font-size: 18pt;
            font-weight: bold;
        }
        .distribution-label {
            font-size: 9pt;
        }
        
        .disclaimer {
            margin-top: 40px;
            padding: 20px;
            background: #fff3cd;
            border: 1px solid #ffc107;
            font-size: 9pt;
            color: #664d03;
        }
        .disclaimer-title {
            font-weight: bold;
            margin-bottom: 10px;
        }
        
        .footer {
            margin-top: 40px;
            text-align: center;
            font-size: 9pt;
            color: #888;
            border-top: 1px solid #ddd;
            padding-top: 20px;
        }
        
        @media print {
            body { padding: 20px; }
            .course-section { page-break-inside: avoid; }
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="institution">EduConnect</div>
        <div>Assessment Marking System</div>
        <div class="transcript-title">INTERIM TRANSCRIPT</div>
    </div>
    
    <div class="student-info">
        <h2>Student Information</h2>
        <div class="info-row">
            <span class="info-label">Full Name:</span>
            <span class="info-value">${profile.full_name || 'N/A'}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Email:</span>
            <span class="info-value">${profile.email}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Student ID:</span>
            <span class="info-value">${profile.student_id}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Generated On:</span>
            <span class="info-value">${formatTranscriptDateTime(profile.generated_at)}</span>
        </div>
    </div>
    
    <h2 style="font-size: 14pt; color: #1e3a5f; margin-bottom: 20px;">Academic Record</h2>
    
    ${coursesHTML}
    
    <div class="summary-section">
        <h2>Summary</h2>
        <div class="summary-grid">
            <div class="summary-item">
                <div class="summary-value">${summary.total_assessments}</div>
                <div class="summary-label">Total Assessments</div>
            </div>
            <div class="summary-item">
                <div class="summary-value">${summary.total_courses}</div>
                <div class="summary-label">Courses</div>
            </div>
            <div class="summary-item">
                <div class="summary-value">${summary.overall_average}%</div>
                <div class="summary-label">Overall Average</div>
            </div>
        </div>
        <div class="grade-distribution">
            <div class="distribution-item">
                <div class="distribution-count" style="color: #166534;">${summary.hd_count}</div>
                <div class="distribution-label">HD</div>
            </div>
            <div class="distribution-item">
                <div class="distribution-count" style="color: #1e40af;">${summary.d_count}</div>
                <div class="distribution-label">D</div>
            </div>
            <div class="distribution-item">
                <div class="distribution-count" style="color: #5b21b6;">${summary.cr_count}</div>
                <div class="distribution-label">CR</div>
            </div>
            <div class="distribution-item">
                <div class="distribution-count" style="color: #92400e;">${summary.p_count}</div>
                <div class="distribution-label">P</div>
            </div>
            <div class="distribution-item">
                <div class="distribution-count" style="color: #991b1b;">${summary.f_count}</div>
                <div class="distribution-label">F</div>
            </div>
        </div>
    </div>
    
    <div class="disclaimer">
        <div class="disclaimer-title">IMPORTANT DISCLAIMER</div>
        <p>This is an interim transcript generated by EduConnect Assessment Marking System. It reflects only grades that have been officially released as of the generation date shown above. This document is <strong>not</strong> an official transcript from the university registrar and should not be used for purposes requiring certified academic records. For official transcripts, please contact your institution's Student Administration office.</p>
    </div>
    
    <div class="footer">
        <p>INTERIM TRANSCRIPT - Generated by EduConnect AMS</p>
        <p>This document is for informational purposes only.</p>
    </div>
</body>
</html>
    `.trim();
}

/**
 * Format assessment type for display
 */
function formatAssessmentType(type: string): string {
    const types: Record<string, string> = {
        assignment: 'Assignment',
        quiz: 'Quiz',
        examination: 'Exam',
        project: 'Project',
        practical: 'Practical',
        other: 'Other',
    };
    return types[type] || type;
}

/**
 * Download transcript as HTML file (can be printed to PDF)
 */
export function downloadTranscriptHTML(data: TranscriptData): void {
    const html = generateTranscriptHTML(data);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);

    const studentName = data.profile.full_name?.replace(/\s+/g, '_') || 'Student';
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `Interim_Transcript_${studentName}_${dateStr}.html`;

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Print transcript in new window
 */
export function printTranscript(data: TranscriptData): void {
    const html = generateTranscriptHTML(data);
    const printWindow = window.open('', '_blank');
    if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        // Small delay to ensure styles are loaded
        setTimeout(() => {
            printWindow.print();
        }, 250);
    }
}

export default {
    getTranscriptGrades,
    getTranscriptSummary,
    getTranscriptProfile,
    getCompleteTranscriptData,
    logTranscriptAction,
    generateTranscriptHTML,
    downloadTranscriptHTML,
    printTranscript,
};
