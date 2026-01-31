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
        }
        Enums: {
            user_role: UserRole
            submission_status: SubmissionStatus
        }
    }
}
