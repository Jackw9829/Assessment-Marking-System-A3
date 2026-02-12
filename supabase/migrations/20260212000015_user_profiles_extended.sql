-- =============================================
-- Extended User Profiles: Student, Instructor, Admin
-- Migration: 20260212000015
-- =============================================
-- Adds extended profile fields, profile audit logging,
-- notification preferences, and profile photo storage support
-- for role-based user profile management.
-- =============================================

-- =============================================
-- EXTEND PROFILES TABLE
-- =============================================
-- Add new columns to profiles for all roles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS programme text,           -- Student: programme/intake
  ADD COLUMN IF NOT EXISTS intake text,              -- Student: intake period
  ADD COLUMN IF NOT EXISTS department text,           -- Instructor/Admin: department
  ADD COLUMN IF NOT EXISTS staff_id text,            -- Instructor/Admin: staff identifier
  ADD COLUMN IF NOT EXISTS student_id text,          -- Student: student identifier
  ADD COLUMN IF NOT EXISTS role_designation text,    -- Admin: role designation
  ADD COLUMN IF NOT EXISTS bio text,                 -- All roles: short biography
  ADD COLUMN IF NOT EXISTS two_factor_enabled boolean DEFAULT false,  -- Admin: 2FA flag
  ADD COLUMN IF NOT EXISTS email_verified boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_login_at timestamp with time zone;

-- Generate student/staff IDs for existing users
-- Students get STU-XXXXX, Staff get STAFF-XXXXX, Admins get ADM-XXXXX
UPDATE public.profiles
SET student_id = 'STU-' || LPAD(FLOOR(RANDOM() * 99999 + 10000)::text, 5, '0')
WHERE role = 'student' AND student_id IS NULL;

UPDATE public.profiles
SET staff_id = 'STAFF-' || LPAD(FLOOR(RANDOM() * 99999 + 10000)::text, 5, '0')
WHERE role = 'instructor' AND staff_id IS NULL;

UPDATE public.profiles
SET staff_id = 'ADM-' || LPAD(FLOOR(RANDOM() * 9999 + 1000)::text, 4, '0')
WHERE role = 'admin' AND staff_id IS NULL;

-- =============================================
-- EXTEND NOTIFICATION PREFERENCES TABLE
-- =============================================
-- Add profile-specific notification columns to existing table
ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS email_reminders boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS deadline_alerts boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS grade_notifications boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS announcement_notifications boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS system_notifications boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS digest_frequency text DEFAULT 'immediate';

-- Named CHECK constraint for digest_frequency (validates new + existing rows)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'notification_preferences' AND constraint_name = 'chk_digest_frequency'
  ) THEN
    ALTER TABLE public.notification_preferences
      ADD CONSTRAINT chk_digest_frequency
      CHECK (digest_frequency IN ('immediate', 'daily', 'weekly', 'none'));
  END IF;
END;
$$;

-- Auto-create notification preferences for existing users
INSERT INTO public.notification_preferences (user_id)
SELECT id FROM public.profiles
WHERE id NOT IN (SELECT user_id FROM public.notification_preferences)
ON CONFLICT (user_id) DO NOTHING;

-- =============================================
-- PROFILE AUDIT LOG TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.profile_audit_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  action text NOT NULL,                    -- 'update_profile', 'change_password', 'update_email', 'upload_photo', etc.
  field_changed text,                      -- Which field was modified
  old_value text,                          -- Previous value (masked for sensitive fields)
  new_value text,                          -- New value (masked for sensitive fields)
  ip_address text,
  user_agent text,
  performed_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_profiles_student_id ON public.profiles(student_id);
CREATE INDEX IF NOT EXISTS idx_profiles_staff_id ON public.profiles(staff_id);
CREATE INDEX IF NOT EXISTS idx_notification_prefs_user ON public.notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON public.profile_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_performed ON public.profile_audit_log(performed_at);

-- =============================================
-- TRIGGERS
-- =============================================
-- Drop the trigger from migration 14 (uses update_updated_at) and recreate with handle_updated_at
DROP TRIGGER IF EXISTS notification_preferences_updated_at ON public.notification_preferences;
CREATE TRIGGER notification_preferences_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================
-- AUTO-ASSIGN IDS ON NEW USER CREATION
-- =============================================
-- Function to auto-assign student/staff IDs on profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user_profile_extension()
RETURNS trigger AS $$
BEGIN
  -- Assign student_id or staff_id based on role
  IF NEW.role = 'student' AND NEW.student_id IS NULL THEN
    NEW.student_id := 'STU-' || LPAD(FLOOR(RANDOM() * 99999 + 10000)::text, 5, '0');
  ELSIF NEW.role = 'instructor' AND NEW.staff_id IS NULL THEN
    NEW.staff_id := 'STAFF-' || LPAD(FLOOR(RANDOM() * 99999 + 10000)::text, 5, '0');
  ELSIF NEW.role = 'admin' AND NEW.staff_id IS NULL THEN
    NEW.staff_id := 'ADM-' || LPAD(FLOOR(RANDOM() * 9999 + 1000)::text, 4, '0');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- BEFORE INSERT so the function can modify the row before it's written
CREATE TRIGGER on_profile_created_extension
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile_extension();

-- Separate AFTER INSERT trigger to create notification preferences
-- (needs the row to exist first for the FK reference)
CREATE OR REPLACE FUNCTION public.handle_new_user_notification_prefs()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_profile_created_notification_prefs
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_notification_prefs();

-- =============================================
-- PROFILE AUDIT LOGGING FUNCTION
-- =============================================
CREATE OR REPLACE FUNCTION public.log_profile_change()
RETURNS trigger AS $$
BEGIN
  -- Log full_name changes
  IF OLD.full_name IS DISTINCT FROM NEW.full_name THEN
    INSERT INTO public.profile_audit_log (user_id, action, field_changed, old_value, new_value)
    VALUES (NEW.id, 'update_profile', 'full_name', OLD.full_name, NEW.full_name);
  END IF;

  -- Log email changes
  IF OLD.email IS DISTINCT FROM NEW.email THEN
    INSERT INTO public.profile_audit_log (user_id, action, field_changed, old_value, new_value)
    VALUES (NEW.id, 'update_email', 'email', '***masked***', '***masked***');
  END IF;

  -- Log phone changes
  IF OLD.phone IS DISTINCT FROM NEW.phone THEN
    INSERT INTO public.profile_audit_log (user_id, action, field_changed, old_value, new_value)
    VALUES (NEW.id, 'update_profile', 'phone', OLD.phone, NEW.phone);
  END IF;

  -- Log avatar changes
  IF OLD.avatar_url IS DISTINCT FROM NEW.avatar_url THEN
    INSERT INTO public.profile_audit_log (user_id, action, field_changed, old_value, new_value)
    VALUES (NEW.id, 'upload_photo', 'avatar_url', 'previous_photo', 'new_photo');
  END IF;

  -- Log programme/intake changes
  IF OLD.programme IS DISTINCT FROM NEW.programme THEN
    INSERT INTO public.profile_audit_log (user_id, action, field_changed, old_value, new_value)
    VALUES (NEW.id, 'update_profile', 'programme', OLD.programme, NEW.programme);
  END IF;

  -- Log department changes
  IF OLD.department IS DISTINCT FROM NEW.department THEN
    INSERT INTO public.profile_audit_log (user_id, action, field_changed, old_value, new_value)
    VALUES (NEW.id, 'update_profile', 'department', OLD.department, NEW.department);
  END IF;

  -- Log bio changes
  IF OLD.bio IS DISTINCT FROM NEW.bio THEN
    INSERT INTO public.profile_audit_log (user_id, action, field_changed, old_value, new_value)
    VALUES (NEW.id, 'update_profile', 'bio', 'previous_bio', 'updated_bio');
  END IF;

  -- Log 2FA changes
  IF OLD.two_factor_enabled IS DISTINCT FROM NEW.two_factor_enabled THEN
    INSERT INTO public.profile_audit_log (user_id, action, field_changed, old_value, new_value)
    VALUES (NEW.id, 'update_security', 'two_factor_enabled', OLD.two_factor_enabled::text, NEW.two_factor_enabled::text);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_profile_updated_audit
  AFTER UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.log_profile_change();

-- =============================================
-- RLS POLICIES FOR NEW TABLES
-- =============================================
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_audit_log ENABLE ROW LEVEL SECURITY;

-- Notification Preferences: replace the broad FOR ALL policy from migration 14
-- with more granular per-operation policies for better security control
DROP POLICY IF EXISTS "notification_preferences_own" ON public.notification_preferences;

CREATE POLICY "Users can view own notification preferences"
  ON public.notification_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notification preferences"
  ON public.notification_preferences FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert own notification preferences"
  ON public.notification_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Profile Audit Log: users can only view their own audit trail
CREATE POLICY "Users can view own audit log"
  ON public.profile_audit_log FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can view all audit logs (for compliance)
CREATE POLICY "Admins can view all audit logs"
  ON public.profile_audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =============================================
-- STORAGE BUCKET FOR PROFILE PHOTOS
-- =============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for avatars bucket
CREATE POLICY "Users can upload own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update own avatar"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own avatar"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Anyone can view avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');
