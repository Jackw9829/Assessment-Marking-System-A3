// =============================================
// Auto-generated Supabase Database Types
// Run: npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/lib/database.types.ts
// =============================================

export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export type UserRole = 'admin' | 'instructor' | 'student'

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
        }
        Enums: {
            user_role: UserRole
        }
    }
}
