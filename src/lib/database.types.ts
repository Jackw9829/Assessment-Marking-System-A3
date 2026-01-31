// =============================================
// Auto-generated Supabase Database Types
// Updated with rubric system tables
// =============================================

export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export type UserRole = 'admin' | 'instructor' | 'student'
export type SubmissionStatus = 'submitted' | 'graded'
export type NotificationChannel = 'dashboard' | 'email' | 'both'
export type ReminderStatus = 'pending' | 'sent' | 'cancelled' | 'failed'
export type NotificationStatus = 'unread' | 'read' | 'dismissed'

export interface Database {
    public: {
        Tables: {
            profiles: {
                Row: {
                    id: string
                    email: string
                    full_name: string | null
                    role: UserRole
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id: string
                    email: string
                    full_name?: string | null
                    role?: UserRole
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    email?: string
                    full_name?: string | null
                    role?: UserRole
                    created_at?: string
                    updated_at?: string
                }
            }
            courses: {
                Row: {
                    id: string
                    title: string
                    description: string | null
                    code: string
                    created_by: string | null
                    instructor_id: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    title: string
                    description?: string | null
                    code: string
                    created_by?: string | null
                    instructor_id?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    title?: string
                    description?: string | null
                    code?: string
                    created_by?: string | null
                    instructor_id?: string | null
                    created_at?: string
                    updated_at?: string
                }
            }
            materials: {
                Row: {
                    id: string
                    course_id: string
                    title: string
                    description: string | null
                    file_name: string
                    file_path: string
                    file_size: number | null
                    file_type: string | null
                    uploader_id: string
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    course_id: string
                    title: string
                    description?: string | null
                    file_name: string
                    file_path: string
                    file_size?: number | null
                    file_type?: string | null
                    uploader_id: string
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    course_id?: string
                    title?: string
                    description?: string | null
                    file_name?: string
                    file_path?: string
                    file_size?: number | null
                    file_type?: string | null
                    uploader_id?: string
                    created_at?: string
                    updated_at?: string
                }
            }
            course_enrollments: {
                Row: {
                    id: string
                    course_id: string
                    student_id: string
                    enrolled_at: string
                }
                Insert: {
                    id?: string
                    course_id: string
                    student_id: string
                    enrolled_at?: string
                }
                Update: {
                    id?: string
                    course_id?: string
                    student_id?: string
                    enrolled_at?: string
                }
            }
            assessments: {
                Row: {
                    id: string
                    course_id: string
                    title: string
                    description: string | null
                    due_date: string
                    total_marks: number
                    created_by: string
                    created_at: string | null
                    updated_at: string | null
                }
                Insert: {
                    id?: string
                    course_id: string
                    title: string
                    description?: string | null
                    due_date: string
                    total_marks?: number
                    created_by: string
                    created_at?: string | null
                    updated_at?: string | null
                }
                Update: {
                    id?: string
                    course_id?: string
                    title?: string
                    description?: string | null
                    due_date?: string
                    total_marks?: number
                    created_by?: string
                    created_at?: string | null
                    updated_at?: string | null
                }
            }
            submissions: {
                Row: {
                    id: string
                    assessment_id: string
                    student_id: string
                    file_path: string
                    file_name: string
                    file_size: number
                    file_type: string
                    submitted_at: string | null
                    status: SubmissionStatus | null
                }
                Insert: {
                    id?: string
                    assessment_id: string
                    student_id: string
                    file_path: string
                    file_name: string
                    file_size: number
                    file_type: string
                    submitted_at?: string | null
                    status?: SubmissionStatus | null
                }
                Update: {
                    id?: string
                    assessment_id?: string
                    student_id?: string
                    file_path?: string
                    file_name?: string
                    file_size?: number
                    file_type?: string
                    submitted_at?: string | null
                    status?: SubmissionStatus | null
                }
            }
            grades: {
                Row: {
                    id: string
                    submission_id: string
                    graded_by: string
                    score: number
                    total_marks: number
                    feedback: string | null
                    graded_at: string | null
                    verified: boolean | null
                    verified_by: string | null
                    verified_at: string | null
                }
                Insert: {
                    id?: string
                    submission_id: string
                    graded_by: string
                    score: number
                    total_marks: number
                    feedback?: string | null
                    graded_at?: string | null
                    verified?: boolean | null
                    verified_by?: string | null
                    verified_at?: string | null
                }
                Update: {
                    id?: string
                    submission_id?: string
                    graded_by?: string
                    score?: number
                    total_marks?: number
                    feedback?: string | null
                    graded_at?: string | null
                    verified?: boolean | null
                    verified_by?: string | null
                    verified_at?: string | null
                }
            }
            rubric_templates: {
                Row: {
                    id: string
                    assessment_id: string | null
                    name: string
                    description: string | null
                    created_by: string | null
                    created_at: string | null
                    updated_at: string | null
                }
                Insert: {
                    id?: string
                    assessment_id?: string | null
                    name: string
                    description?: string | null
                    created_by?: string | null
                    created_at?: string | null
                    updated_at?: string | null
                }
                Update: {
                    id?: string
                    assessment_id?: string | null
                    name?: string
                    description?: string | null
                    created_by?: string | null
                    created_at?: string | null
                    updated_at?: string | null
                }
            }
            rubric_components: {
                Row: {
                    id: string
                    template_id: string | null
                    name: string
                    description: string | null
                    weight_percentage: number
                    max_score: number | null
                    order_index: number | null
                    created_at: string | null
                    updated_at: string | null
                }
                Insert: {
                    id?: string
                    template_id?: string | null
                    name: string
                    description?: string | null
                    weight_percentage: number
                    max_score?: number | null
                    order_index?: number | null
                    created_at?: string | null
                    updated_at?: string | null
                }
                Update: {
                    id?: string
                    template_id?: string | null
                    name?: string
                    description?: string | null
                    weight_percentage?: number
                    max_score?: number | null
                    order_index?: number | null
                    created_at?: string | null
                    updated_at?: string | null
                }
            }
            rubric_scores: {
                Row: {
                    id: string
                    submission_id: string | null
                    component_id: string | null
                    score: number
                    feedback: string | null
                    graded_by: string | null
                    graded_at: string | null
                }
                Insert: {
                    id?: string
                    submission_id?: string | null
                    component_id?: string | null
                    score: number
                    feedback?: string | null
                    graded_by?: string | null
                    graded_at?: string | null
                }
                Update: {
                    id?: string
                    submission_id?: string | null
                    component_id?: string | null
                    score?: number
                    feedback?: string | null
                    graded_by?: string | null
                    graded_at?: string | null
                }
            }
            notifications: {
                Row: {
                    id: string
                    user_id: string
                    title: string
                    message: string
                    type: string
                    channel: NotificationChannel
                    status: NotificationStatus
                    reference_type: string | null
                    reference_id: string | null
                    metadata: Record<string, any>
                    email_sent: boolean
                    email_sent_at: string | null
                    read_at: string | null
                    dismissed_at: string | null
                    created_at: string
                    expires_at: string | null
                }
                Insert: {
                    id?: string
                    user_id: string
                    title: string
                    message: string
                    type?: string
                    channel?: NotificationChannel
                    status?: NotificationStatus
                    reference_type?: string | null
                    reference_id?: string | null
                    metadata?: Record<string, any>
                    email_sent?: boolean
                    email_sent_at?: string | null
                    read_at?: string | null
                    dismissed_at?: string | null
                    created_at?: string
                    expires_at?: string | null
                }
                Update: {
                    id?: string
                    user_id?: string
                    title?: string
                    message?: string
                    type?: string
                    channel?: NotificationChannel
                    status?: NotificationStatus
                    reference_type?: string | null
                    reference_id?: string | null
                    metadata?: Record<string, any>
                    email_sent?: boolean
                    email_sent_at?: string | null
                    read_at?: string | null
                    dismissed_at?: string | null
                    created_at?: string
                    expires_at?: string | null
                }
            }
            notification_preferences: {
                Row: {
                    id: string
                    user_id: string
                    email_enabled: boolean
                    dashboard_enabled: boolean
                    reminder_7_days: boolean
                    reminder_3_days: boolean
                    reminder_1_day: boolean
                    reminder_6_hours: boolean
                    quiet_hours_start: string | null
                    quiet_hours_end: string | null
                    timezone: string
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    email_enabled?: boolean
                    dashboard_enabled?: boolean
                    reminder_7_days?: boolean
                    reminder_3_days?: boolean
                    reminder_1_day?: boolean
                    reminder_6_hours?: boolean
                    quiet_hours_start?: string | null
                    quiet_hours_end?: string | null
                    timezone?: string
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    email_enabled?: boolean
                    dashboard_enabled?: boolean
                    reminder_7_days?: boolean
                    reminder_3_days?: boolean
                    reminder_1_day?: boolean
                    reminder_6_hours?: boolean
                    quiet_hours_start?: string | null
                    quiet_hours_end?: string | null
                    timezone?: string
                    created_at?: string
                    updated_at?: string
                }
            }
            scheduled_reminders: {
                Row: {
                    id: string
                    assessment_id: string
                    student_id: string
                    schedule_id: string
                    scheduled_for: string
                    status: ReminderStatus
                    sent_at: string | null
                    error_message: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    assessment_id: string
                    student_id: string
                    schedule_id: string
                    scheduled_for: string
                    status?: ReminderStatus
                    sent_at?: string | null
                    error_message?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    assessment_id?: string
                    student_id?: string
                    schedule_id?: string
                    scheduled_for?: string
                    status?: ReminderStatus
                    sent_at?: string | null
                    error_message?: string | null
                    created_at?: string
                    updated_at?: string
                }
            }
            reminder_schedules: {
                Row: {
                    id: string
                    name: string
                    days_before: number
                    hours_before: number
                    is_default: boolean
                    is_active: boolean
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    name: string
                    days_before: number
                    hours_before?: number
                    is_default?: boolean
                    is_active?: boolean
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    name?: string
                    days_before?: number
                    hours_before?: number
                    is_default?: boolean
                    is_active?: boolean
                    created_at?: string
                    updated_at?: string
                }
            }
            reminder_audit_log: {
                Row: {
                    id: string
                    reminder_id: string | null
                    assessment_id: string | null
                    student_id: string | null
                    action: string
                    details: Record<string, any>
                    created_at: string
                }
                Insert: {
                    id?: string
                    reminder_id?: string | null
                    assessment_id?: string | null
                    student_id?: string | null
                    action: string
                    details?: Record<string, any>
                    created_at?: string
                }
                Update: {
                    id?: string
                    reminder_id?: string | null
                    assessment_id?: string | null
                    student_id?: string | null
                    action?: string
                    details?: Record<string, any>
                    created_at?: string
                }
            }
            email_queue: {
                Row: {
                    id: string
                    notification_id: string | null
                    recipient_email: string
                    recipient_name: string | null
                    subject: string
                    body_html: string
                    body_text: string | null
                    status: string
                    attempts: number
                    max_attempts: number
                    last_attempt_at: string | null
                    sent_at: string | null
                    error_message: string | null
                    created_at: string
                    scheduled_for: string
                }
                Insert: {
                    id?: string
                    notification_id?: string | null
                    recipient_email: string
                    recipient_name?: string | null
                    subject: string
                    body_html: string
                    body_text?: string | null
                    status?: string
                    attempts?: number
                    max_attempts?: number
                    last_attempt_at?: string | null
                    sent_at?: string | null
                    error_message?: string | null
                    created_at?: string
                    scheduled_for?: string
                }
                Update: {
                    id?: string
                    notification_id?: string | null
                    recipient_email?: string
                    recipient_name?: string | null
                    subject?: string
                    body_html?: string
                    body_text?: string | null
                    status?: string
                    attempts?: number
                    max_attempts?: number
                    last_attempt_at?: string | null
                    sent_at?: string | null
                    error_message?: string | null
                    created_at?: string
                    scheduled_for?: string
                }
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            get_my_role: {
                Args: Record<string, never>
                Returns: UserRole
            }
            has_role: {
                Args: { target_role: UserRole }
                Returns: boolean
            }
            is_admin: {
                Args: Record<string, never>
                Returns: boolean
            }
            is_instructor: {
                Args: Record<string, never>
                Returns: boolean
            }
            is_student: {
                Args: Record<string, never>
                Returns: boolean
            }
            calculate_weighted_total: {
                Args: { p_submission_id: string }
                Returns: number
            }
            get_due_reminders: {
                Args: { p_batch_size?: number }
                Returns: {
                    reminder_id: string
                    assessment_id: string
                    student_id: string
                    student_email: string
                    student_name: string
                    assessment_title: string
                    course_title: string
                    due_date: string
                    days_before: number
                    hours_before: number
                }[]
            }
            has_submitted_assessment: {
                Args: { p_student_id: string; p_assessment_id: string }
                Returns: boolean
            }
            is_enrolled_in_assessment_course: {
                Args: { p_student_id: string; p_assessment_id: string }
                Returns: boolean
            }
            schedule_reminders_for_student: {
                Args: { p_student_id: string; p_assessment_id: string }
                Returns: number
            }
        }
        Enums: {
            user_role: UserRole
            submission_status: SubmissionStatus
            notification_channel: NotificationChannel
            reminder_status: ReminderStatus
            notification_status: NotificationStatus
        }
    }
}
