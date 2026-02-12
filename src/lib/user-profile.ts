// =============================================
// User Profile Management — Types & Helper Functions
// =============================================
// Provides role-based profile CRUD, avatar upload,
// password change, email verification, notification
// preferences, and audit log retrieval.
// =============================================

import { supabase } from './supabase-client';

// =============================================
// TYPES
// =============================================

export interface ExtendedProfile {
    id: string;
    email: string;
    full_name: string | null;
    role: 'admin' | 'instructor' | 'student';
    phone: string | null;
    avatar_url: string | null;
    programme: string | null;
    intake: string | null;
    department: string | null;
    staff_id: string | null;
    student_id: string | null;
    role_designation: string | null;
    bio: string | null;
    two_factor_enabled: boolean;
    email_verified: boolean;
    last_login_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface NotificationPreferences {
    id: string;
    user_id: string;
    email_reminders: boolean;
    deadline_alerts: boolean;
    grade_notifications: boolean;
    announcement_notifications: boolean;
    system_notifications: boolean;
    digest_frequency: 'immediate' | 'daily' | 'weekly' | 'none';
    created_at: string;
    updated_at: string;
}

export interface ProfileAuditEntry {
    id: string;
    user_id: string;
    action: string;
    field_changed: string | null;
    old_value: string | null;
    new_value: string | null;
    ip_address: string | null;
    user_agent: string | null;
    performed_at: string;
}

/** Fields students are allowed to edit */
export type StudentEditableFields = Pick<
    ExtendedProfile,
    'full_name' | 'phone' | 'bio' | 'programme' | 'intake'
>;

/** Fields instructors are allowed to edit */
export type InstructorEditableFields = Pick<
    ExtendedProfile,
    'full_name' | 'phone' | 'bio'
>;

/** Fields admins are allowed to edit */
export type AdminEditableFields = Pick<
    ExtendedProfile,
    'full_name' | 'phone' | 'bio' | 'role_designation'
>;

// =============================================
// PROFILE FETCH
// =============================================

/**
 * Fetch the extended profile for the currently authenticated user.
 */
export async function getExtendedProfile(): Promise<ExtendedProfile | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    if (error) {
        console.error('Error fetching extended profile:', error);
        return null;
    }

    return data as unknown as ExtendedProfile;
}

// =============================================
// PROFILE UPDATE (role-scoped)
// =============================================

/**
 * Update the current user's profile with role-based field restrictions.
 * - Students may edit: full_name, phone, bio, programme, intake
 * - Instructors may edit: full_name, phone, bio
 * - Admins may edit: full_name, phone, bio, role_designation
 *
 * Academic fields (grades, transcripts, role, enrolled courses) are
 * NOT modifiable through this function.
 */
export async function updateProfile(
    fields: Partial<StudentEditableFields & InstructorEditableFields & AdminEditableFields>
): Promise<ExtendedProfile> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Fetch current role to enforce field restrictions
    const profile = await getExtendedProfile();
    if (!profile) throw new Error('Profile not found');

    // Build allowed update payload based on role
    const allowed: Record<string, unknown> = {};

    // Common editable fields for all roles
    if (fields.full_name !== undefined) allowed.full_name = fields.full_name;
    if (fields.phone !== undefined) allowed.phone = fields.phone;
    if (fields.bio !== undefined) allowed.bio = fields.bio;

    // Student-specific fields
    if (profile.role === 'student') {
        if (fields.programme !== undefined) allowed.programme = fields.programme;
        if (fields.intake !== undefined) allowed.intake = fields.intake;
    }

    // Admin-specific fields
    if (profile.role === 'admin') {
        if (fields.role_designation !== undefined) allowed.role_designation = fields.role_designation;
    }

    if (Object.keys(allowed).length === 0) {
        throw new Error('No permitted fields to update');
    }

    const { data, error } = await (supabase
        .from('profiles') as any)
        .update(allowed)
        .eq('id', user.id)
        .select()
        .single();

    if (error) throw error;
    return data as unknown as ExtendedProfile;
}

// =============================================
// AVATAR UPLOAD
// =============================================

/**
 * Upload a profile photo. File is stored under avatars/{user_id}/{filename}.
 * Returns the public URL of the uploaded image.
 */
export async function uploadAvatar(file: File): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/avatar.${fileExt}`;

    // Upload to storage
    const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

    const publicUrl = urlData.publicUrl;

    // Update profile with new avatar URL
    const { error: updateError } = await (supabase
        .from('profiles') as any)
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

    if (updateError) throw updateError;

    return publicUrl;
}

/**
 * Remove the current user's avatar.
 */
export async function removeAvatar(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // List and delete files in user's avatar folder
    const { data: files } = await supabase.storage.from('avatars').list(user.id);
    if (files && files.length > 0) {
        const paths = files.map(f => `${user.id}/${f.name}`);
        await supabase.storage.from('avatars').remove(paths);
    }

    // Clear avatar_url on profile
    await (supabase
        .from('profiles') as any)
        .update({ avatar_url: null })
        .eq('id', user.id);
}

// =============================================
// PASSWORD CHANGE
// =============================================

/**
 * Change the current user's password.
 * The change is logged automatically via profile_audit_log.
 */
export async function changePassword(newPassword: string): Promise<void> {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;

    // Manually log password change since it's an auth-level operation
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        await (supabase.from('profile_audit_log') as any).insert({
            user_id: user.id,
            action: 'change_password',
            field_changed: 'password',
            old_value: '***masked***',
            new_value: '***masked***',
        });
    }
}

// =============================================
// EMAIL UPDATE (with verification)
// =============================================

/**
 * Request an email change. Supabase will send a confirmation link
 * to the new address; the change only takes effect after verification.
 */
export async function requestEmailChange(newEmail: string): Promise<void> {
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    if (error) throw error;

    // Log the request (actual change happens after verification)
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        await (supabase.from('profile_audit_log') as any).insert({
            user_id: user.id,
            action: 'request_email_change',
            field_changed: 'email',
            old_value: '***masked***',
            new_value: '***masked***',
        });
    }
}

// =============================================
// NOTIFICATION PREFERENCES
// =============================================

/**
 * Fetch the current user's notification preferences.
 */
export async function getNotificationPreferences(): Promise<NotificationPreferences | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

    if (error) {
        // Auto-create preferences if they don't exist
        if (error.code === 'PGRST116') {
            const { data: created, error: createErr } = await (supabase
                .from('notification_preferences') as any)
                .insert({ user_id: user.id })
                .select()
                .single();
            if (createErr) {
                console.error('Error creating notification preferences:', createErr);
                return null;
            }
            return created as unknown as NotificationPreferences;
        }
        console.error('Error fetching notification preferences:', error);
        return null;
    }

    return data as unknown as NotificationPreferences;
}

/**
 * Update notification preferences for the current user.
 */
export async function updateNotificationPreferences(
    prefs: Partial<Omit<NotificationPreferences, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<NotificationPreferences> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await (supabase
        .from('notification_preferences') as any)
        .update(prefs)
        .eq('user_id', user.id)
        .select()
        .single();

    if (error) throw error;
    return data as unknown as NotificationPreferences;
}

// =============================================
// AUDIT LOG
// =============================================

/**
 * Retrieve the profile audit log for the current user,
 * ordered by most recent first.
 */
export async function getProfileAuditLog(limit = 50): Promise<ProfileAuditEntry[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
        .from('profile_audit_log')
        .select('*')
        .eq('user_id', user.id)
        .order('performed_at', { ascending: false })
        .limit(limit);

    if (error) {
        console.error('Error fetching audit log:', error);
        return [];
    }

    return (data || []) as unknown as ProfileAuditEntry[];
}

// =============================================
// ENROLLED COURSES (read-only for students)
// =============================================

/**
 * Get courses the current student is enrolled in (read-only view).
 */
export async function getEnrolledCoursesForProfile(studentId: string) {
    const { data, error } = await supabase
        .from('course_enrollments')
        .select(`
      id,
      enrolled_at,
      course:course_id (
        id,
        title,
        code,
        description,
        instructor:instructor_id (
          full_name,
          email
        )
      )
    `)
        .eq('student_id', studentId)
        .order('enrolled_at', { ascending: false });

    if (error) throw error;
    return data || [];
}

// =============================================
// ASSIGNED COURSES (read-only for instructors)
// =============================================

/**
 * Get courses assigned to the current instructor (read-only view).
 */
export async function getAssignedCoursesForProfile(instructorId: string) {
    const { data, error } = await supabase
        .from('courses')
        .select('id, title, code, description, created_at')
        .eq('instructor_id', instructorId)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
}

// =============================================
// MANAGED DEPARTMENTS (read-only for admins)
// =============================================

/**
 * Get a summary of departments/courses managed by admin.
 */
export async function getAdminManagedSummary() {
    const { data: courses, error } = await supabase
        .from('courses')
        .select('id, title, code, instructor:instructor_id(full_name)')
        .order('title', { ascending: true });

    if (error) throw error;
    return courses || [];
}
