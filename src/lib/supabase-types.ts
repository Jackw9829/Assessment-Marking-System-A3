// =============================================
// Supabase Database Types
// =============================================

export type UserRole = 'admin' | 'instructor' | 'student';

export interface Profile {
    id: string;
    email: string;
    full_name: string | null;
    role: UserRole;
    created_at: string;
    updated_at: string;
}

export interface Course {
    id: string;
    title: string;
    description: string | null;
    code: string;
    created_by: string | null;
    instructor_id: string | null;
    created_at: string;
    updated_at: string;
}

export interface Material {
    id: string;
    course_id: string;
    title: string;
    description: string | null;
    file_name: string;
    file_path: string;
    file_size: number | null;
    file_type: string | null;
    uploader_id: string;
    created_at: string;
    updated_at: string;
}

export interface CourseEnrollment {
    id: string;
    course_id: string;
    student_id: string;
    enrolled_at: string;
}

// Extended types with relations
export interface CourseWithInstructor extends Course {
    instructor?: Profile;
    creator?: Profile;
}

export interface MaterialWithUploader extends Material {
    uploader?: Profile;
    course?: Course;
}

export interface EnrollmentWithDetails extends CourseEnrollment {
    course?: Course;
    student?: Profile;
}
