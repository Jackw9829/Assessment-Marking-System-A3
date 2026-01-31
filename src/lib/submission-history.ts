// =============================================
// Submission Proof & History Helper Library
// =============================================

import { supabase } from './supabase-client';

// =============================================
// TYPES
// =============================================

export interface SubmissionRecord {
    submission_id: string;
    submission_reference: string;
    assessment_id: string;
    assessment_title: string;
    assessment_type: string;
    course_id: string;
    course_code: string;
    course_title: string;
    submitted_at: string;
    original_filename: string;
    file_path: string;
    file_size: number;
    file_hash: string | null;
    attempt_number: number;
    is_latest: boolean;
    submission_status: 'on_time' | 'late' | 'grace_period';
    late_duration: string | null;
    status: string;
    max_attempts: number | null;
    due_date: string;
}

export interface SubmissionReceipt {
    submission_id: string;
    submission_reference: string;
    student_name: string;
    student_email: string;
    assessment_title: string;
    course_code: string;
    course_title: string;
    submitted_at: string;
    original_filename: string;
    file_size: number;
    file_hash: string | null;
    attempt_number: number;
    submission_status: 'on_time' | 'late' | 'grace_period';
    late_duration: string | null;
    due_date: string;
    receipt_generated_at: string;
}

export interface AttemptInfo {
    assessment_id: string;
    max_attempts: number | null;
    attempts_used: number;
    attempts_remaining: number | null;
    can_submit: boolean;
    latest_submission_id: string | null;
    latest_submitted_at: string | null;
}

export type SubmissionStatusType = 'on_time' | 'late' | 'grace_period';

// =============================================
// STATUS HELPERS
// =============================================

export const submissionStatusConfig = {
    on_time: {
        label: 'On Time',
        colour: '#22c55e', // green-500
        bgClass: 'bg-green-100 text-green-800 border-green-200',
        icon: '✓',
    },
    late: {
        label: 'Late',
        colour: '#ef4444', // red-500
        bgClass: 'bg-red-100 text-red-800 border-red-200',
        icon: '⚠',
    },
    grace_period: {
        label: 'Grace Period',
        colour: '#f59e0b', // amber-500
        bgClass: 'bg-amber-100 text-amber-800 border-amber-200',
        icon: '⏱',
    },
} as const;

export function getStatusBadgeClass(status: SubmissionStatusType): string {
    return submissionStatusConfig[status]?.bgClass || 'bg-gray-100 text-gray-800';
}

export function getStatusLabel(status: SubmissionStatusType): string {
    return submissionStatusConfig[status]?.label || status;
}

export function getStatusColour(status: SubmissionStatusType): string {
    return submissionStatusConfig[status]?.colour || '#6b7280';
}

// =============================================
// DATE/TIME HELPERS
// =============================================

export function formatSubmissionDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-AU', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export function formatSubmissionDateUTC(dateString: string): string {
    const date = new Date(dateString);
    return date.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ' UTC');
}

export function formatLateDuration(intervalString: string | null): string {
    if (!intervalString) return '';

    // Parse PostgreSQL interval format (e.g., "2 days 03:15:00")
    const match = intervalString.match(
        /(?:(\d+)\s*days?)?\s*(?:(\d+):(\d+):(\d+))?/i
    );
    if (!match) return intervalString;

    const days = parseInt(match[1] || '0', 10);
    const hours = parseInt(match[2] || '0', 10);
    const minutes = parseInt(match[3] || '0', 10);

    const parts: string[] = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);

    return parts.length > 0 ? parts.join(' ') + ' late' : 'Just late';
}

export function getRelativeTime(dateString: string, dueDate: string): string {
    const submitted = new Date(dateString);
    const due = new Date(dueDate);
    const diff = due.getTime() - submitted.getTime();

    if (diff < 0) {
        // Late
        const lateDiff = Math.abs(diff);
        const hours = Math.floor(lateDiff / (1000 * 60 * 60));
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days} day${days > 1 ? 's' : ''} after deadline`;
        return `${hours} hour${hours > 1 ? 's' : ''} after deadline`;
    }

    // Early
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} before deadline`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} before deadline`;
    return 'Just before deadline';
}

// =============================================
// FILE SIZE HELPERS
// =============================================

export function formatFileSize(bytes: number | null): string {
    if (!bytes || bytes === 0) return '0 B';

    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
    }

    return `${size.toFixed(unitIndex > 0 ? 1 : 0)} ${units[unitIndex]}`;
}

// =============================================
// ATTEMPT HELPERS
// =============================================

export function formatAttemptInfo(info: AttemptInfo): string {
    if (info.max_attempts === null) {
        return 'Unlimited attempts';
    }

    return `${info.attempts_used} of ${info.max_attempts} attempts used`;
}

export function getAttemptProgress(info: AttemptInfo): number {
    if (info.max_attempts === null || info.max_attempts === 0) return 0;
    return (info.attempts_used / info.max_attempts) * 100;
}

// =============================================
// API FUNCTIONS
// =============================================

/**
 * Get all submission history for a student
 */
export async function getSubmissionHistory(
    studentId: string
): Promise<SubmissionRecord[]> {
    const { data, error } = await (supabase as any).rpc('get_student_submission_history', {
        p_student_id: studentId,
    });

    if (error) {
        console.error('Error fetching submission history:', error);
        throw error;
    }

    return (data || []) as SubmissionRecord[];
}

/**
 * Get submission receipt details
 */
export async function getSubmissionReceipt(
    submissionId: string,
    studentId: string
): Promise<SubmissionReceipt | null> {
    const { data, error } = await (supabase as any).rpc('get_submission_receipt', {
        p_submission_id: submissionId,
        p_student_id: studentId,
    });

    if (error) {
        console.error('Error fetching submission receipt:', error);
        throw error;
    }

    return data?.[0] || null;
}

/**
 * Get attempt info for an assessment
 */
export async function getAttemptInfo(
    assessmentId: string,
    studentId: string
): Promise<AttemptInfo | null> {
    const { data, error } = await (supabase as any).rpc('get_assessment_attempt_info', {
        p_assessment_id: assessmentId,
        p_student_id: studentId,
    });

    if (error) {
        console.error('Error fetching attempt info:', error);
        throw error;
    }

    return data?.[0] || null;
}

// =============================================
// GROUP/FILTER HELPERS
// =============================================

/**
 * Group submissions by course
 */
export function groupSubmissionsByCourse(
    submissions: SubmissionRecord[]
): Map<string, SubmissionRecord[]> {
    const grouped = new Map<string, SubmissionRecord[]>();

    submissions.forEach((sub) => {
        const existing = grouped.get(sub.course_id) || [];
        existing.push(sub);
        grouped.set(sub.course_id, existing);
    });

    return grouped;
}

/**
 * Group submissions by assessment
 */
export function groupSubmissionsByAssessment(
    submissions: SubmissionRecord[]
): Map<string, SubmissionRecord[]> {
    const grouped = new Map<string, SubmissionRecord[]>();

    submissions.forEach((sub) => {
        const existing = grouped.get(sub.assessment_id) || [];
        existing.push(sub);
        grouped.set(sub.assessment_id, existing);
    });

    return grouped;
}

/**
 * Filter submissions by course
 */
export function filterByCourse(
    submissions: SubmissionRecord[],
    courseId: string | 'all'
): SubmissionRecord[] {
    if (courseId === 'all') return submissions;
    return submissions.filter((s) => s.course_id === courseId);
}

/**
 * Filter submissions by status
 */
export function filterByStatus(
    submissions: SubmissionRecord[],
    status: SubmissionStatusType | 'all'
): SubmissionRecord[] {
    if (status === 'all') return submissions;
    return submissions.filter((s) => s.submission_status === status);
}

/**
 * Get unique courses from submissions
 */
export function getUniqueCourses(
    submissions: SubmissionRecord[]
): Array<{ id: string; code: string; title: string }> {
    const courseMap = new Map<
        string,
        { id: string; code: string; title: string }
    >();

    submissions.forEach((sub) => {
        if (!courseMap.has(sub.course_id)) {
            courseMap.set(sub.course_id, {
                id: sub.course_id,
                code: sub.course_code,
                title: sub.course_title,
            });
        }
    });

    return Array.from(courseMap.values()).sort((a, b) =>
        a.code.localeCompare(b.code)
    );
}

// =============================================
// RECEIPT GENERATION HELPERS
// =============================================

/**
 * Generate receipt content for printing/download
 */
export function generateReceiptHTML(receipt: SubmissionReceipt): string {
    const statusConfig = submissionStatusConfig[receipt.submission_status];

    return `
<!DOCTYPE html>
<html>
<head>
    <title>Submission Receipt - ${receipt.submission_reference}</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 600px; margin: 40px auto; padding: 20px; }
        .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 20px; }
        .logo { font-size: 24px; font-weight: bold; color: #2563eb; }
        .reference { font-size: 18px; color: #666; margin-top: 10px; }
        .section { margin-bottom: 20px; }
        .section-title { font-weight: bold; color: #333; margin-bottom: 8px; border-bottom: 1px solid #eee; padding-bottom: 4px; }
        .field { display: flex; justify-content: space-between; padding: 4px 0; }
        .label { color: #666; }
        .value { font-weight: 500; }
        .status { display: inline-block; padding: 4px 12px; border-radius: 4px; background: ${statusConfig.colour}20; color: ${statusConfig.colour}; font-weight: bold; }
        .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 12px; }
        .verification { margin-top: 20px; padding: 15px; background: #f3f4f6; border-radius: 8px; text-align: center; }
        .hash { font-family: monospace; font-size: 10px; word-break: break-all; color: #666; }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo">EduConnect AMS</div>
        <div class="reference">Submission Receipt: ${receipt.submission_reference}</div>
    </div>
    
    <div class="section">
        <div class="section-title">Student Information</div>
        <div class="field"><span class="label">Name:</span> <span class="value">${receipt.student_name}</span></div>
        <div class="field"><span class="label">Email:</span> <span class="value">${receipt.student_email}</span></div>
    </div>
    
    <div class="section">
        <div class="section-title">Assessment Details</div>
        <div class="field"><span class="label">Course:</span> <span class="value">${receipt.course_code} - ${receipt.course_title}</span></div>
        <div class="field"><span class="label">Assessment:</span> <span class="value">${receipt.assessment_title}</span></div>
        <div class="field"><span class="label">Due Date:</span> <span class="value">${formatSubmissionDate(receipt.due_date)}</span></div>
    </div>
    
    <div class="section">
        <div class="section-title">Submission Details</div>
        <div class="field"><span class="label">Submitted At:</span> <span class="value">${formatSubmissionDate(receipt.submitted_at)}</span></div>
        <div class="field"><span class="label">UTC Timestamp:</span> <span class="value">${formatSubmissionDateUTC(receipt.submitted_at)}</span></div>
        <div class="field"><span class="label">File Name:</span> <span class="value">${receipt.original_filename}</span></div>
        <div class="field"><span class="label">File Size:</span> <span class="value">${formatFileSize(receipt.file_size)}</span></div>
        <div class="field"><span class="label">Attempt:</span> <span class="value">#${receipt.attempt_number}</span></div>
        <div class="field"><span class="label">Status:</span> <span class="status">${statusConfig.label}</span></div>
        ${receipt.late_duration ? `<div class="field"><span class="label">Late By:</span> <span class="value">${formatLateDuration(receipt.late_duration)}</span></div>` : ''}
    </div>
    
    ${receipt.file_hash ? `
    <div class="verification">
        <div style="font-weight: bold; margin-bottom: 8px;">File Integrity Hash (SHA-256)</div>
        <div class="hash">${receipt.file_hash}</div>
    </div>
    ` : ''}
    
    <div class="footer">
        <div>Receipt generated: ${formatSubmissionDate(receipt.receipt_generated_at)}</div>
        <div style="margin-top: 8px;">This is an official submission receipt from EduConnect AMS.</div>
        <div>Keep this document as proof of your submission.</div>
    </div>
</body>
</html>
    `.trim();
}

/**
 * Trigger download of receipt as HTML file
 */
export function downloadReceiptHTML(receipt: SubmissionReceipt): void {
    const html = generateReceiptHTML(receipt);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `Receipt_${receipt.submission_reference}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Print receipt in new window
 */
export function printReceipt(receipt: SubmissionReceipt): void {
    const html = generateReceiptHTML(receipt);
    const printWindow = window.open('', '_blank');
    if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.print();
    }
}

export default {
    getSubmissionHistory,
    getSubmissionReceipt,
    getAttemptInfo,
    formatSubmissionDate,
    formatFileSize,
    formatLateDuration,
    getStatusLabel,
    getStatusBadgeClass,
};
