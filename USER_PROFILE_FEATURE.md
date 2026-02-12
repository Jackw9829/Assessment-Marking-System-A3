# EduConnect AMS — User Profile Management Feature

## Overview

The User Profile Management module provides role-based profile management for all three user roles within the EduConnect Assessment Marking System (AMS): **Students**, **Instructors**, and **Exam Administrators**. Each profile enforces strict access control rules, audit logging, and separation of editable vs. read-only data.

---

## 1. Student User Profile

### 1.1 Refined User Story

> **As a** student enrolled in the EduConnect AMS,  
> **I want to** view and manage my personal and academic information through a secure profile interface,  
> **so that** I can keep my details up to date, control my notification preferences, and verify my enrolment records — without being able to modify sensitive academic data such as grades or transcripts.

### 1.2 Acceptance Criteria

| # | Criterion | Verification |
|---|-----------|-------------|
| AC-1 | The system shall display the student's **Student ID** as a read-only field generated upon account creation (format: `STU-XXXXX`). | Inspect profile; field is non-editable. |
| AC-2 | The student shall be able to view and edit their **full name**, **phone number**, **programme**, **intake**, and **bio** from the profile page. | Edit fields, save, and confirm persistence. |
| AC-3 | The student's **email address** shall be displayed as read-only; changes require a verification email to be sent to the new address. The update only takes effect upon confirmation. | Trigger email change; confirm verification flow. |
| AC-4 | The student shall be able to **upload, replace, or remove a profile photo** (max 2 MB, image formats only). | Upload a JPG/PNG; confirm display; remove and confirm. |
| AC-5 | The student shall be able to **change their password** with a minimum of 8 characters, with confirmation matching. | Change password and re-login. |
| AC-6 | The student shall have a **read-only view** of their enrolled courses, including course title, code, and instructor name. | Navigate to Enrolled Courses section; fields are non-editable. |
| AC-7 | **Sensitive academic records** (grades, transcripts, assessment scores) shall **not** be viewable or editable from the profile page. | Inspect profile; no grade/transcript editing controls exist. |
| AC-8 | The student shall be able to configure **notification preferences**: email reminders, deadline alerts, grade notifications, announcements, and digest frequency. | Toggle each preference; confirm persistence. |
| AC-9 | All profile changes (name, phone, email request, password change, avatar upload) shall be recorded in a **profile audit log** visible to the student. | Make a change; verify log entry appears with timestamp. |
| AC-10 | A student shall **only** be able to view and edit their **own** profile; Row-Level Security (RLS) prevents access to other users' profiles. | Attempt to query another user's profile via API; confirm denial. |
| AC-11 | The profile page shall display the student's **role badge** (Student) and account **creation date**. | Inspect profile header. |
| AC-12 | Form validation shall prevent saving empty required fields (full name) and invalid data (email format). | Attempt to save blank name; confirm error toast. |

### 1.3 Access Control Rules

| Action | Permitted | Enforced By |
|--------|-----------|-------------|
| View own profile | Student (self) | Supabase RLS (`auth.uid() = id`) |
| Edit personal fields | Student (self) | Application-level role check + RLS |
| View enrolled courses | Student (self) | RLS on `course_enrollments` |
| Modify grades/transcripts | **Denied** | No UI control; no RLS write policy |
| Change email | Student (self) with verification | Supabase Auth email verification |
| View audit log | Student (self) | RLS on `profile_audit_log` |

---

## 2. Instructor User Profile

### 2.1 Refined User Story

> **As an** instructor using the EduConnect AMS,  
> **I want to** manage my personal profile information through a secure interface with appropriate role-based restrictions,  
> **so that** I can maintain accurate contact details and notification preferences — while understanding that course assignments and academic data are managed by the administrator.

### 2.2 Acceptance Criteria

| # | Criterion | Verification |
|---|-----------|-------------|
| AC-1 | The system shall display the instructor's **Staff ID** as a read-only field generated upon account creation (format: `STAFF-XXXXX`). | Inspect profile; field is non-editable. |
| AC-2 | The instructor shall be able to view and edit their **full name**, **phone number**, and **bio**. | Edit fields, save, confirm persistence. |
| AC-3 | The **department** field shall be displayed as **read-only**, managed by the administrator. | Inspect profile; department field is disabled. |
| AC-4 | The instructor's **email address** shall be displayed as read-only; changes require verification via email confirmation. | Trigger change; confirm verification email sent. |
| AC-5 | The instructor shall be able to **upload, replace, or remove a profile photo** (max 2 MB, image formats only). | Upload image; confirm display and removal. |
| AC-6 | The instructor shall be able to **change their password** (minimum 8 characters, with confirmation). | Change password; re-login to confirm. |
| AC-7 | **Assigned courses** shall appear in a **read-only list** — course assignments are administered by the exam administrator. | View course list; no edit/delete controls present. |
| AC-8 | **Academic data** (grades, rubrics, assessment configurations) shall **not** be editable from the profile section. | Inspect profile; confirm no grading controls. |
| AC-9 | The instructor shall be able to configure **notification settings**: email reminders, grade notifications, announcements, system notifications, and digest frequency. | Toggle each; confirm persistence. |
| AC-10 | All profile updates shall be **logged securely** in the profile audit log with action type, field changed, and timestamp. | Make a change; verify log entry. |
| AC-11 | RLS policies shall ensure an instructor can **only access their own profile data**. | Attempt cross-user query; confirm denial. |
| AC-12 | The profile shall display the instructor's **role badge** and Staff ID prominently. | Inspect header section. |

### 2.3 Access Control Rules

| Action | Permitted | Enforced By |
|--------|-----------|-------------|
| View own profile | Instructor (self) | Supabase RLS |
| Edit personal fields (name, phone, bio) | Instructor (self) | Role-scoped update function + RLS |
| Edit department | **Denied** (admin-managed) | Application logic; RLS |
| Modify course assignments | **Denied** | No UI control; courses table RLS |
| Modify grades/rubrics | **Denied from profile** | Separate grading interface only |
| Change email | Instructor (self) with verification | Supabase Auth |
| View audit log | Instructor (self) | RLS on `profile_audit_log` |

---

## 3. Exam Administrator User Profile

### 3.1 Refined User Story

> **As an** exam administrator of the EduConnect AMS,  
> **I want to** manage my personal profile information through a secure, audited interface with enhanced security controls,  
> **so that** I can keep my contact details current while ensuring that system configuration and role permissions remain strictly controlled at the system level.

### 3.2 Acceptance Criteria

| # | Criterion | Verification |
|---|-----------|-------------|
| AC-1 | The system shall display the administrator's **Admin ID** as a read-only field (format: `ADM-XXXX`). | Inspect profile; field is non-editable. |
| AC-2 | The admin shall be able to view and edit their **full name**, **phone number**, **bio**, and **role designation** (e.g., Chief Examiner). | Edit fields, save, confirm persistence. |
| AC-3 | The **official email** shall be displayed as read-only; changes require verification for security purposes. | Trigger change; confirm verification email. |
| AC-4 | The administrator shall be able to **upload, replace, or remove a profile photo** (max 2 MB, image formats only). | Upload image; confirm display and removal. |
| AC-5 | The administrator shall be able to **change their password** with an enhanced minimum of **10 characters**, with confirmation. | Change password with 8 chars (fail), then 10 chars (succeed). |
| AC-6 | The profile page shall display a **security notice banner** indicating that this is a privileged account and all activity is logged. | Inspect the amber security notice card. |
| AC-7 | **Two-factor authentication (2FA)** status shall be displayed; if not enabled, a recommendation message shall appear during password change. | View 2FA badge; trigger password dialog; confirm advisory. |
| AC-8 | **System configuration settings** (role permissions, system-level policies) shall **not** be accessible from the profile page. | Inspect profile; no system config controls exist. |
| AC-9 | **Role permissions** shall be displayed as read-only and are **not user-editable** — managed at the platform level. | View role field; confirm disabled state. |
| AC-10 | A **read-only summary** of managed departments/courses shall be visible for reference. | View Managed Courses section; no edit controls. |
| AC-11 | All profile activity shall be **logged comprehensively** in a Security & Compliance Audit Log with timestamps and action descriptions. | Make changes; inspect audit log (50 entries). |
| AC-12 | The admin shall be able to configure **notification settings**: email reminders, grade verification alerts, system notifications, and digest frequency. | Toggle each; confirm persistence. |

### 3.3 Security & Permission Controls

| Action | Permitted | Enforced By |
|--------|-----------|-------------|
| View own profile | Admin (self) | Supabase RLS |
| Edit personal fields | Admin (self) | Role-scoped update function + RLS |
| Modify system configuration | **Denied from profile** | No UI control; separate admin panel |
| Edit role permissions | **Denied** (platform-managed) | Application logic; no API endpoint |
| View all audit logs | Admin | RLS policy (admins can view all) |
| View managed courses | Admin (read-only) | Application query |
| Change email | Admin (self) with verification | Supabase Auth |
| Enable/disable 2FA | System administrator | External configuration |

---

## Technical Implementation

### Database Changes (Migration `20260212000015`)

| Table | Purpose |
|-------|---------|
| `profiles` (extended) | Added: `phone`, `avatar_url`, `programme`, `intake`, `department`, `staff_id`, `student_id`, `role_designation`, `bio`, `two_factor_enabled`, `email_verified`, `last_login_at` |
| `notification_preferences` | Per-user notification settings with RLS |
| `profile_audit_log` | Immutable audit trail of all profile changes |
| `storage.buckets.avatars` | Public bucket for profile photo storage |

### Source Files

| File | Purpose |
|------|---------|
| `src/lib/user-profile.ts` | Types, helper functions for profile CRUD, avatar upload, password change, email verification, notification prefs, audit log |
| `src/app/components/student-profile.tsx` | Student profile UI component |
| `src/app/components/instructor-profile.tsx` | Instructor profile UI component |
| `src/app/components/admin-profile.tsx` | Admin profile UI component |

### Integration Points

- Student profile is accessible via the **"My Profile"** tab in the Student Dashboard.
- Instructor profile is accessible via the **"My Profile"** tab in the Instructor Dashboard.
- Admin profile is accessible via the **"My Profile"** tab in the Admin Dashboard.
- All three use the shared `user-profile.ts` helper library with role-based field restrictions.
- Audit logging is automatic via PostgreSQL triggers on the `profiles` table.
- Password change logging is handled explicitly at the application level.

---

## Glossary

| Term | Definition |
|------|-----------|
| **RLS** | Row-Level Security — Supabase/PostgreSQL feature restricting data access per-user |
| **2FA** | Two-Factor Authentication — additional security verification layer |
| **Audit Log** | Immutable record of all profile-related actions for compliance |
| **Digest Frequency** | User preference for batching non-urgent notifications |
