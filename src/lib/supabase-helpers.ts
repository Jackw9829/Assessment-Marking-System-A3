// =============================================
// Supabase Helper Functions
// =============================================

import { supabase } from './supabase-client';
import type { UserRole, Profile, Course, Material } from './supabase-types';

// =============================================
// AUTH HELPERS
// =============================================

/**
 * Get current user profile with role
 */
export async function getCurrentUserProfile(): Promise<Profile | null> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    if (error) {
        console.error('Error fetching user profile:', error);
        return null;
    }

    return data;
}

/**
 * Check if current user has specific role
 */
export async function hasRole(role: UserRole): Promise<boolean> {
    const profile = await getCurrentUserProfile();
    return profile?.role === role;
}

/**
 * Sign up with role
 */
export async function signUpWithRole(
    email: string,
    password: string,
    fullName: string,
    role: UserRole = 'student'
) {
    return await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name: fullName,
                role: role,
            },
        },
    });
}

// =============================================
// COURSE HELPERS (Admin)
// =============================================

/**
 * Create a new course (Admin only)
 */
export async function createCourse(
    title: string,
    code: string,
    description: string | null = null,
    instructorId: string | null = null
) {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
        .from('courses')
        .insert({
            title,
            code,
            description,
            instructor_id: instructorId,
            created_by: user.id,
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * Get all courses
 */
export async function getCourses() {
    const { data, error } = await supabase
        .from('courses')
        .select(`
      *,
      instructor:instructor_id(id, full_name, email),
      creator:created_by(id, full_name, email)
    `)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
}

/**
 * Update course (Admin only)
 */
export async function updateCourse(
    courseId: string,
    updates: Partial<Course>
) {
    const { data, error } = await supabase
        .from('courses')
        .update(updates)
        .eq('id', courseId)
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * Delete course (Admin only)
 */
export async function deleteCourse(courseId: string) {
    const { error } = await supabase
        .from('courses')
        .delete()
        .eq('id', courseId);

    if (error) throw error;
}

// =============================================
// MATERIAL HELPERS (Instructor)
// =============================================

/**
 * Upload material file and create database entry (Instructor only)
 */
export async function uploadMaterial(
    courseId: string,
    file: File,
    title: string,
    description: string | null = null
) {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('Not authenticated');

    // Upload file to storage
    const filePath = `${courseId}/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage
        .from('course-materials')
        .upload(filePath, file);

    if (uploadError) throw uploadError;

    // Create material record
    const { data, error } = await supabase
        .from('materials')
        .insert({
            course_id: courseId,
            title,
            description,
            file_name: file.name,
            file_path: filePath,
            file_size: file.size,
            file_type: file.type,
            uploader_id: user.id,
        })
        .select()
        .single();

    if (error) {
        // Cleanup: delete uploaded file if database insert fails
        await supabase.storage.from('course-materials').remove([filePath]);
        throw error;
    }

    return data;
}

/**
 * Get materials for a course
 */
export async function getCourseMaterials(courseId: string) {
    const { data, error } = await supabase
        .from('materials')
        .select(`
      *,
      uploader:uploader_id(id, full_name, email)
    `)
        .eq('course_id', courseId)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
}

/**
 * Download material (generates signed URL)
 */
export async function downloadMaterial(filePath: string, expiresIn: number = 3600) {
    const { data, error } = await supabase.storage
        .from('course-materials')
        .createSignedUrl(filePath, expiresIn);

    if (error) throw error;
    return data.signedUrl;
}

/**
 * Delete material (Instructor only)
 */
export async function deleteMaterial(materialId: string, filePath: string) {
    // Delete from storage
    const { error: storageError } = await supabase.storage
        .from('course-materials')
        .remove([filePath]);

    if (storageError) throw storageError;

    // Delete from database
    const { error } = await supabase
        .from('materials')
        .delete()
        .eq('id', materialId);

    if (error) throw error;
}

// =============================================
// ENROLLMENT HELPERS
// =============================================

/**
 * Enroll student in course (Admin only)
 */
export async function enrollStudent(courseId: string, studentId: string) {
    const { data, error } = await supabase
        .from('course_enrollments')
        .insert({
            course_id: courseId,
            student_id: studentId,
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * Get enrolled students for a course
 */
export async function getCourseEnrollments(courseId: string) {
    const { data, error } = await supabase
        .from('course_enrollments')
        .select(`
      *,
      student:student_id(id, full_name, email)
    `)
        .eq('course_id', courseId)
        .order('enrolled_at', { ascending: false });

    if (error) throw error;
    return data;
}

/**
 * Get courses student is enrolled in
 */
export async function getStudentEnrollments(studentId: string) {
    const { data, error } = await supabase
        .from('course_enrollments')
        .select(`
      *,
      course:course_id(
        *,
        instructor:instructor_id(id, full_name, email)
      )
    `)
        .eq('student_id', studentId)
        .order('enrolled_at', { ascending: false });

    if (error) throw error;
    return data;
}

/**
 * Unenroll student from course
 */
export async function unenrollStudent(courseId: string, studentId: string) {
    const { error } = await supabase
        .from('course_enrollments')
        .delete()
        .eq('course_id', courseId)
        .eq('student_id', studentId);

    if (error) throw error;
}

// =============================================
// PROFILE HELPERS
// =============================================

/**
 * Get all profiles (Admin only) or filtered by role
 */
export async function getProfiles(role?: UserRole) {
    let query = supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

    if (role) {
        query = query.eq('role', role);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data;
}

/**
 * Get instructors (for course assignment)
 */
export async function getInstructors() {
    return getProfiles('instructor');
}

/**
 * Get students (for enrollment)
 */
export async function getStudents() {
    return getProfiles('student');
}

/**
 * Update user profile
 */
export async function updateProfile(
    userId: string,
    updates: Partial<Profile>
) {
    const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

    if (error) throw error;
    return data;
}
