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
                    phone: string | null
                    avatar_url: string | null
                    programme: string | null
                    intake: string | null
                    department: string | null
                    staff_id: string | null
                    student_id: string | null
                    role_designation: string | null
                    bio: string | null
                    two_factor_enabled: boolean
                    email_verified: boolean
                    last_login_at: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id: string
                    email: string
                    full_name?: string | null
                    role?: UserRole
                    phone?: string | null
                    avatar_url?: string | null
                    programme?: string | null
                    intake?: string | null
                    department?: string | null
                    staff_id?: string | null
                    student_id?: string | null
                    role_designation?: string | null
                    bio?: string | null
                    two_factor_enabled?: boolean
                    email_verified?: boolean
                    last_login_at?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    email?: string
                    full_name?: string | null
                    role?: UserRole
                    phone?: string | null
                    avatar_url?: string | null
                    programme?: string | null
                    intake?: string | null
                    department?: string | null
                    staff_id?: string | null
                    student_id?: string | null
                    role_designation?: string | null
                    bio?: string | null
                    two_factor_enabled?: boolean
                    email_verified?: boolean
                    last_login_at?: string | null
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
                    resubmission_allowed: boolean
                    max_resubmissions: number | null
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
                    resubmission_allowed?: boolean
                    max_resubmissions?: number | null
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
                    resubmission_allowed?: boolean
                    max_resubmissions?: number | null
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
                    version: number
                    is_latest: boolean
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
                    version?: number
                    is_latest?: boolean
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
                    version?: number
                    is_latest?: boolean
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
                    email_reminders: boolean
                    deadline_alerts: boolean
                    grade_notifications: boolean
                    announcement_notifications: boolean
                    system_notifications: boolean
                    digest_frequency: string
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
                    email_reminders?: boolean
                    deadline_alerts?: boolean
                    grade_notifications?: boolean
                    announcement_notifications?: boolean
                    system_notifications?: boolean
                    digest_frequency?: string
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
                    email_reminders?: boolean
                    deadline_alerts?: boolean
                    grade_notifications?: boolean
                    announcement_notifications?: boolean
                    system_notifications?: boolean
                    digest_frequency?: string
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
            profile_audit_log: {
                Row: {
                    id: string
                    user_id: string
                    action: string
                    field_changed: string | null
                    old_value: string | null
                    new_value: string | null
                    ip_address: string | null
                    user_agent: string | null
                    performed_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    action: string
                    field_changed?: string | null
                    old_value?: string | null
                    new_value?: string | null
                    ip_address?: string | null
                    user_agent?: string | null
                    performed_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    action?: string
                    field_changed?: string | null
                    old_value?: string | null
                    new_value?: string | null
                    ip_address?: string | null
                    user_agent?: string | null
                    performed_at?: string
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
            get_student_submission_history: {
                Args: { p_student_id: string }
                Returns: {
                    submission_id: string
                    submission_reference: string
                    assessment_id: string
                    assessment_title: string
                    assessment_type: string
                    course_id: string
                    course_code: string
                    course_title: string
                    submitted_at: string
                    original_filename: string
                    file_path: string
                    file_size: number
                    file_hash: string | null
                    attempt_number: number
                    is_latest: boolean
                    submission_status: string
                    late_duration: string | null
                    status: string
                    max_attempts: number | null
                    due_date: string
                }[]
            }
            get_submission_receipt: {
                Args: { p_submission_id: string; p_student_id: string }
                Returns: {
                    submission_id: string
                    submission_reference: string
                    student_name: string
                    student_email: string
                    assessment_title: string
                    course_code: string
                    course_title: string
                    submitted_at: string
                    original_filename: string
                    file_size: number
                    file_hash: string | null
                    attempt_number: number
                    submission_status: string
                    late_duration: string | null
                    due_date: string
                    receipt_generated_at: string
                }[]
            }
            get_assessment_attempt_info: {
                Args: { p_assessment_id: string; p_student_id: string }
                Returns: {
                    assessment_id: string
                    max_attempts: number | null
                    attempts_used: number
                    attempts_remaining: number | null
                    can_submit: boolean
                    latest_submission_id: string | null
                    latest_submitted_at: string | null
                }[]
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
