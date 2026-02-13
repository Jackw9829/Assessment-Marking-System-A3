// =============================================
// Notification System Types & Helpers
// =============================================
// Frontend utilities for the deadline reminder system
// =============================================

import { supabase } from './supabase-client';
import type { Database } from './database.types';

// =============================================
// TYPES
// =============================================

export type NotificationChannel = 'dashboard' | 'email' | 'both';
export type ReminderStatus = 'pending' | 'sent' | 'cancelled' | 'failed';
export type NotificationStatus = 'unread' | 'read' | 'dismissed';

export interface ReminderSchedule {
    id: string;
    name: string;
    days_before: number;
    hours_before: number;
    is_default: boolean;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface ScheduledReminder {
    id: string;
    assessment_id: string;
    student_id: string;
    schedule_id: string;
    scheduled_for: string;
    status: ReminderStatus;
    sent_at: string | null;
    error_message: string | null;
    created_at: string;
    updated_at: string;
    // Joined data
    assessment?: {
        title: string;
        due_date: string;
        course: {
            title: string;
            code: string;
        };
    };
    schedule?: ReminderSchedule;
}

export interface Notification {
    id: string;
    user_id: string;
    title: string;
    message: string;
    type: 'reminder' | 'grade' | 'announcement' | 'system';
    channel: NotificationChannel;
    status: NotificationStatus;
    reference_type: string | null;
    reference_id: string | null;
    metadata: Record<string, any>;
    email_sent: boolean;
    email_sent_at: string | null;
    read_at: string | null;
    dismissed_at: string | null;
    created_at: string;
    expires_at: string | null;
}

export interface NotificationPreferences {
    id: string;
    user_id: string;
    email_enabled: boolean;
    dashboard_enabled: boolean;
    reminder_7_days: boolean;
    reminder_3_days: boolean;
    reminder_1_day: boolean;
    reminder_6_hours: boolean;
    quiet_hours_start: string | null;
    quiet_hours_end: string | null;
    timezone: string;
    created_at: string;
    updated_at: string;
}

export interface ReminderHistoryEntry {
    id: string;
    reminder_id: string | null;
    assessment_id: string | null;
    student_id: string | null;
    action: string;
    details: Record<string, any>;
    created_at: string;
    // Joined data
    assessment?: {
        title: string;
        course: {
            title: string;
        };
    };
}

// =============================================
// NOTIFICATION FUNCTIONS
// =============================================

/**
 * Fetch all notifications for the current user
 */
export async function getNotifications(
    options: {
        status?: NotificationStatus;
        type?: string;
        limit?: number;
        offset?: number;
    } = {}
): Promise<Notification[]> {
    let query = (supabase as any)
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });

    if (options.status) {
        query = query.eq('status', options.status);
    }
    if (options.type) {
        query = query.eq('type', options.type);
    }
    if (options.limit) {
        query = query.limit(options.limit);
    }
    if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    const { data, error } = await query;

    if (error) {
        console.error('Error fetching notifications:', error);
        throw error;
    }

    return (data || []) as Notification[];
}

/**
 * Get unread notification count
 */
export async function getUnreadNotificationCount(): Promise<number> {
    const { count, error } = await (supabase as any)
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'unread');

    if (error) {
        console.error('Error fetching unread count:', error);
        return 0;
    }

    return count || 0;
}

/**
 * Mark a notification as read
 */
export async function markNotificationAsRead(notificationId: string): Promise<void> {
    const { error } = await (supabase as any)
        .from('notifications')
        .update({
            status: 'read',
            read_at: new Date().toISOString(),
        })
        .eq('id', notificationId);

    if (error) {
        console.error('Error marking notification as read:', error);
        throw error;
    }
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsAsRead(): Promise<void> {
    const { error } = await (supabase as any)
        .from('notifications')
        .update({
            status: 'read',
            read_at: new Date().toISOString(),
        })
        .eq('status', 'unread');

    if (error) {
        console.error('Error marking all notifications as read:', error);
        throw error;
    }
}

/**
 * Dismiss a notification
 */
export async function dismissNotification(notificationId: string): Promise<void> {
    const { error } = await (supabase as any)
        .from('notifications')
        .update({
            status: 'dismissed',
            dismissed_at: new Date().toISOString(),
        })
        .eq('id', notificationId);

    if (error) {
        console.error('Error dismissing notification:', error);
        throw error;
    }
}

// =============================================
// REMINDER FUNCTIONS
// =============================================

/**
 * Get scheduled reminders for the current user
 */
export async function getScheduledReminders(
    options: {
        status?: ReminderStatus;
        assessmentId?: string;
    } = {}
): Promise<ScheduledReminder[]> {
    let query = (supabase as any)
        .from('scheduled_reminders')
        .select(`
      *,
      assessment:assessments (
        title,
        due_date,
        course:courses (
          title,
          code
        )
      ),
      schedule:reminder_schedules (
        name,
        days_before,
        hours_before
      )
    `)
        .order('scheduled_for', { ascending: true });

    if (options.status) {
        query = query.eq('status', options.status);
    }
    if (options.assessmentId) {
        query = query.eq('assessment_id', options.assessmentId);
    }

    const { data, error } = await query;

    if (error) {
        console.error('Error fetching scheduled reminders:', error);
        throw error;
    }

    return (data || []) as ScheduledReminder[];
}

/**
 * Get reminder history for the current user
 */
export async function getReminderHistory(
    limit: number = 50
): Promise<ReminderHistoryEntry[]> {
    const { data, error } = await (supabase as any)
        .from('reminder_audit_log')
        .select(`
      *,
      assessment:assessments (
        title,
        course:courses (
          title
        )
      )
    `)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) {
        console.error('Error fetching reminder history:', error);
        throw error;
    }

    return (data || []) as ReminderHistoryEntry[];
}

// =============================================
// NOTIFICATION PREFERENCES
// =============================================

/**
 * Get notification preferences for the current user
 */
export async function getNotificationPreferences(): Promise<NotificationPreferences | null> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    const { data, error } = await (supabase as any)
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

    if (error && error.code !== 'PGRST116') {
        console.error('Error fetching notification preferences:', error);
        throw error;
    }

    return data as NotificationPreferences | null;
}

/**
 * Update notification preferences
 */
export async function updateNotificationPreferences(
    preferences: Partial<Omit<NotificationPreferences, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<NotificationPreferences> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error('User not authenticated');
    }

    const updateData = {
        user_id: user.id,
        ...preferences,
    };

    const { data, error } = await (supabase as any)
        .from('notification_preferences')
        .upsert(updateData, {
            onConflict: 'user_id',
        })
        .select()
        .single();

    if (error) {
        console.error('Error updating notification preferences:', error);
        throw error;
    }

    return data as NotificationPreferences;
}

// =============================================
// UPCOMING DEADLINES
// =============================================

/**
 * Get upcoming assessment deadlines for enrolled courses
 */
export async function getUpcomingDeadlines(
    daysAhead: number = 14
): Promise<{
    assessment: {
        id: string;
        title: string;
        due_date: string;
        total_marks: number;
    };
    course: {
        id: string;
        title: string;
        code: string;
    };
    submitted: boolean;
    daysUntilDue: number;
}[]> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return [];

    // Calculate future date
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    // Get assessments directly - RLS handles access control
    // This matches how getAssessments() works in supabase-helpers.ts
    const { data: assessments, error } = await supabase
        .from('assessments')
        .select(`
      id,
      title,
      due_date,
      total_marks,
      course:courses (
        id,
        title,
        code
      )
    `)
        .gte('due_date', new Date().toISOString())
        .lte('due_date', futureDate.toISOString())
        .order('due_date', { ascending: true });

    if (error) {
        console.error('Error fetching upcoming deadlines:', error);
        throw error;
    }

    // Get submissions to check which are already submitted
    const { data: submissions } = await supabase
        .from('submissions')
        .select('assessment_id')
        .eq('student_id', user.id);

    const submittedAssessmentIds = new Set(
        (submissions as { assessment_id: string }[] | null)?.map(s => s.assessment_id) || []
    );

    type AssessmentWithCourse = {
        id: string;
        title: string;
        due_date: string;
        total_marks: number;
        course: { id: string; title: string; code: string } | null;
    };

    return ((assessments || []) as AssessmentWithCourse[]).map(a => {
        const dueDate = new Date(a.due_date);
        const now = new Date();
        const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        return {
            assessment: {
                id: a.id,
                title: a.title,
                due_date: a.due_date,
                total_marks: a.total_marks,
            },
            course: a.course as { id: string; title: string; code: string },
            submitted: submittedAssessmentIds.has(a.id),
            daysUntilDue,
        };
    });
}

// =============================================
// REALTIME SUBSCRIPTIONS
// =============================================

/**
 * Subscribe to new notifications
 */
export function subscribeToNotifications(
    userId: string,
    onNotification: (notification: Notification) => void
) {
    const channel = supabase
        .channel(`notifications:${userId}`)
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'notifications',
                filter: `user_id=eq.${userId}`,
            },
            (payload) => {
                onNotification(payload.new as Notification);
            }
        )
        .subscribe();

    return () => {
        channel.unsubscribe();
    };
}

// =============================================
// UTILITY FUNCTIONS
// =============================================

/**
 * Format time until deadline
 */
export function formatTimeUntilDeadline(dueDate: string): string {
    const now = new Date();
    const due = new Date(dueDate);
    const diffMs = due.getTime() - now.getTime();

    if (diffMs < 0) {
        return 'Overdue';
    }

    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
        return `${diffDays} day${diffDays > 1 ? 's' : ''} left`;
    }
    if (diffHours > 0) {
        return `${diffHours} hour${diffHours > 1 ? 's' : ''} left`;
    }

    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} left`;
}

/**
 * Get urgency level based on time until deadline
 */
export function getDeadlineUrgency(dueDate: string): 'low' | 'medium' | 'high' | 'critical' {
    const now = new Date();
    const due = new Date(dueDate);
    const diffHours = (due.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (diffHours < 0) return 'critical';
    if (diffHours <= 6) return 'critical';
    if (diffHours <= 24) return 'high';
    if (diffHours <= 72) return 'medium';
    return 'low';
}
