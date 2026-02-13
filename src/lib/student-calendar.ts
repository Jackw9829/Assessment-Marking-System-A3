// =============================================
// Student Calendar Helper Functions
// =============================================

import { supabase } from './supabase-client';
import { AssessmentType } from './student-filters';

// =============================================
// TYPES
// =============================================

export interface CalendarEvent {
    assessment_id: string;
    title: string;
    description: string | null;
    due_date: string;
    total_marks: number;
    assessment_type: AssessmentType;
    course_id: string;
    course_code: string;
    course_title: string;
    submission_id: string | null;
    submission_status: string;
    is_overdue: boolean;
    is_due_soon: boolean;
    is_submitted: boolean;
}

export type CalendarView = 'month' | 'week';

export interface CalendarDay {
    date: Date;
    isCurrentMonth: boolean;
    isToday: boolean;
    events: CalendarEvent[];
}

// =============================================
// COURSE COLOURS
// =============================================

const courseColours = [
    '#3B82F6', // Blue
    '#10B981', // Emerald
    '#F59E0B', // Amber
    '#EF4444', // Red
    '#8B5CF6', // Violet
    '#EC4899', // Pink
    '#06B6D4', // Cyan
    '#84CC16', // Lime
];

const courseColourMap = new Map<string, string>();

/**
 * Get a consistent colour for a course
 */
export function getCourseColour(courseId: string): string {
    if (!courseColourMap.has(courseId)) {
        const index = courseColourMap.size % courseColours.length;
        courseColourMap.set(courseId, courseColours[index]);
    }
    return courseColourMap.get(courseId)!;
}

// =============================================
// STATUS HELPERS
// =============================================

export type EventStatus = 'overdue' | 'due-soon' | 'upcoming' | 'submitted';

export function getEventStatus(event: CalendarEvent): EventStatus {
    if (event.is_submitted) return 'submitted';
    if (event.is_overdue) return 'overdue';
    if (event.is_due_soon) return 'due-soon';
    return 'upcoming';
}

export function getStatusColour(status: EventStatus): string {
    switch (status) {
        case 'overdue': return '#EF4444';    // Red
        case 'due-soon': return '#F97316';   // Orange
        case 'upcoming': return '#3B82F6';   // Blue
        case 'submitted': return '#22C55E';  // Green
    }
}

export function getStatusLabel(status: EventStatus): string {
    switch (status) {
        case 'overdue': return 'Overdue';
        case 'due-soon': return 'Due Soon';
        case 'upcoming': return 'Upcoming';
        case 'submitted': return 'Submitted';
    }
}

export function getStatusBadgeClass(status: EventStatus): string {
    switch (status) {
        case 'overdue': return 'bg-red-100 text-red-800 border-red-200';
        case 'due-soon': return 'bg-orange-100 text-orange-800 border-orange-200';
        case 'upcoming': return 'bg-blue-100 text-blue-800 border-blue-200';
        case 'submitted': return 'bg-green-100 text-green-800 border-green-200';
    }
}

// =============================================
// DATE HELPERS
// =============================================

/**
 * Get the start of a month
 */
export function getMonthStart(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1);
}

/**
 * Get the end of a month
 */
export function getMonthEnd(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

/**
 * Get the start of a week (Sunday)
 */
export function getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    d.setDate(d.getDate() - day);
    d.setHours(0, 0, 0, 0);
    return d;
}

/**
 * Get the end of a week (Saturday)
 */
export function getWeekEnd(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    d.setDate(d.getDate() + (6 - day));
    d.setHours(23, 59, 59, 999);
    return d;
}

/**
 * Check if two dates are the same day
 */
export function isSameDay(date1: Date, date2: Date): boolean {
    return (
        date1.getFullYear() === date2.getFullYear() &&
        date1.getMonth() === date2.getMonth() &&
        date1.getDate() === date2.getDate()
    );
}

/**
 * Check if a date is today
 */
export function isToday(date: Date): boolean {
    return isSameDay(date, new Date());
}

/**
 * Format date for display
 */
export function formatDate(date: Date): string {
    return date.toLocaleDateString('en-AU', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
    });
}

/**
 * Format time for display
 */
export function formatTime(date: Date): string {
    return date.toLocaleTimeString('en-AU', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    });
}

/**
 * Format month and year for header
 */
export function formatMonthYear(date: Date): string {
    return date.toLocaleDateString('en-AU', {
        month: 'long',
        year: 'numeric',
    });
}

/**
 * Get days in a month view (including padding days from prev/next months)
 */
export function getMonthDays(date: Date, events: CalendarEvent[]): CalendarDay[] {
    const days: CalendarDay[] = [];
    const monthStart = getMonthStart(date);
    const monthEnd = getMonthEnd(date);

    // Start from the Sunday of the week containing the 1st
    const calendarStart = getWeekStart(monthStart);

    // End on the Saturday of the week containing the last day
    const calendarEnd = getWeekEnd(monthEnd);

    const current = new Date(calendarStart);

    while (current <= calendarEnd) {
        const dayDate = new Date(current);
        const dayEvents = events.filter(e =>
            isSameDay(new Date(e.due_date), dayDate)
        );

        days.push({
            date: dayDate,
            isCurrentMonth: current.getMonth() === date.getMonth(),
            isToday: isToday(dayDate),
            events: dayEvents,
        });

        current.setDate(current.getDate() + 1);
    }

    return days;
}

/**
 * Get days in a week view
 */
export function getWeekDays(date: Date, events: CalendarEvent[]): CalendarDay[] {
    const days: CalendarDay[] = [];
    const weekStart = getWeekStart(date);

    for (let i = 0; i < 7; i++) {
        const dayDate = new Date(weekStart);
        dayDate.setDate(weekStart.getDate() + i);

        const dayEvents = events.filter(e =>
            isSameDay(new Date(e.due_date), dayDate)
        );

        days.push({
            date: dayDate,
            isCurrentMonth: true,
            isToday: isToday(dayDate),
            events: dayEvents,
        });
    }

    return days;
}

// =============================================
// API FUNCTIONS
// =============================================

/**
 * Fallback query when RPC function doesn't exist
 * Directly queries assessments for enrolled courses
 */
async function getCalendarEventsFallback(
    startDate: Date,
    endDate: Date
): Promise<CalendarEvent[]> {
    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        console.warn('Calendar fallback: No authenticated user');
        return [];
    }

    // Format dates for query - extend end date to include full day
    const startDateStr = startDate.toISOString().split('T')[0]; // YYYY-MM-DD
    const endDateExtended = new Date(endDate);
    endDateExtended.setDate(endDateExtended.getDate() + 1); // Add 1 day to include events on end date
    const endDateStr = endDateExtended.toISOString().split('T')[0]; // YYYY-MM-DD

    // Query ALL assessments directly - RLS handles access control
    // This matches how getUpcomingDeadlines() works in notifications.ts
    const { data: assessments, error } = await supabase
        .from('assessments')
        .select(`
            id,
            title,
            description,
            due_date,
            total_marks,
            course_id,
            courses (
                id,
                code,
                title
            )
        `)
        .gte('due_date', startDateStr)
        .lt('due_date', endDateStr)
        .order('due_date', { ascending: true });

    if (error) {
        console.error('Fallback query error:', error);
        return [];
    }

    if (!assessments || assessments.length === 0) {
        console.warn('Calendar fallback: No assessments found in date range', startDateStr, 'to', endDateStr);
        return [];
    }

    // Get user's submissions for these assessments
    const assessmentIds = assessments.map((a: any) => a.id);
    const { data: submissions } = await supabase
        .from('submissions')
        .select('assessment_id, id, submitted_at, status')
        .eq('student_id', user.id)
        .in('assessment_id', assessmentIds) as { data: { assessment_id: string; id: string; submitted_at: string; status: string }[] | null };

    const submissionMap = new Map(
        (submissions || []).map(s => [s.assessment_id, s])
    );

    return assessments.map((a: any) => {
        const submission = submissionMap.get(a.id);
        const dueDate = new Date(a.due_date);
        const now = Date.now();
        const isOverdue = !submission && dueDate.getTime() < now;
        const isDueSoon = !submission && dueDate.getTime() - now < 24 * 60 * 60 * 1000 && dueDate.getTime() > now;

        return {
            assessment_id: a.id,
            title: a.title,
            description: a.description,
            due_date: a.due_date,
            total_marks: a.total_marks,
            assessment_type: 'assignment' as AssessmentType,
            course_id: a.course_id,
            course_code: a.courses?.code || '',
            course_title: a.courses?.title || '',
            submission_id: submission?.id || null,
            submission_status: submission?.status === 'graded' ? 'graded' :
                submission ? 'submitted' :
                    isOverdue ? 'overdue' : 'pending',
            is_overdue: isOverdue,
            is_due_soon: isDueSoon,
            is_submitted: !!submission,
        };
    });
}

/**
 * Fetch calendar events for the current student within a date range
 * Uses RPC function if available, falls back to direct query
 */
export async function getCalendarEvents(
    _studentId: string,
    startDate: Date,
    endDate: Date
): Promise<CalendarEvent[]> {
    // Skip RPC - use direct query which works for all authenticated users
    // The RPC function requires course_enrollments which excludes new students
    return getCalendarEventsFallback(startDate, endDate);
}

/**
 * Get events for the current month view
 */
export async function getMonthEvents(studentId: string, date: Date): Promise<CalendarEvent[]> {
    const monthStart = getMonthStart(date);
    const monthEnd = getMonthEnd(date);

    // Extend range to cover padding days in calendar view
    const calendarStart = getWeekStart(monthStart);
    const calendarEnd = getWeekEnd(monthEnd);

    return getCalendarEvents(studentId, calendarStart, calendarEnd);
}

/**
 * Get events for the current week view
 */
export async function getWeekEvents(studentId: string, date: Date): Promise<CalendarEvent[]> {
    const weekStart = getWeekStart(date);
    const weekEnd = getWeekEnd(date);

    return getCalendarEvents(studentId, weekStart, weekEnd);
}
