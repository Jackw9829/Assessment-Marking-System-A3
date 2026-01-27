# Supabase Setup Guide

## Overview
This system implements role-based authentication with three roles:
- **Admin**: Creates courses, manages users, assigns instructors
- **Instructor**: Uploads materials to assigned courses
- **Student**: Downloads materials from enrolled courses

## Setup Instructions

### 1. Create Supabase Project
1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the database to be provisioned

### 2. Run Migrations
Execute the SQL migrations in order in the Supabase SQL Editor:

1. **Initial Schema** (`20260127000001_initial_schema.sql`)
   - Creates tables: profiles, courses, materials, course_enrollments
   - Sets up triggers and indexes
   - Auto-creates profile on user signup

2. **RLS Policies** (`20260127000002_rls_policies.sql`)
   - Implements Row Level Security for all tables
   - Defines role-based access control
   - Helper functions for role checking

3. **Storage Policies** (`20260127000003_storage_policies.sql`)
   - Creates `course-materials` storage bucket
   - Implements file upload/download permissions

### 3. Configure Environment Variables
1. Copy `.env.example` to `.env`
2. Get your project URL and anon key from Supabase Dashboard → Settings → API
3. Update the values in `.env`:
   ```
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

### 4. Create Admin User (via Supabase Dashboard)
1. Go to Authentication → Users
2. Create a new user
3. Go to Table Editor → profiles
4. Find the user's profile and change `role` to `admin`

## Database Schema

### Profiles
- Links to auth.users
- Stores role (admin/instructor/student)
- Auto-created on signup

### Courses
- Created by admins
- Can be assigned to instructors
- Students enroll in courses

### Materials
- Uploaded by instructors to their courses
- Stored in Supabase Storage
- Students download from enrolled courses

### Course Enrollments
- Many-to-many relationship between students and courses
- Managed by admins

## API Usage Examples

### Sign Up
```typescript
import { signUpWithRole } from '@/lib/supabase-helpers';

await signUpWithRole('user@example.com', 'password123', 'John Doe', 'student');
```

### Create Course (Admin)
```typescript
import { createCourse } from '@/lib/supabase-helpers';

await createCourse('Introduction to CS', 'CS101', 'First course', instructorId);
```

### Upload Material (Instructor)
```typescript
import { uploadMaterial } from '@/lib/supabase-helpers';

await uploadMaterial(courseId, file, 'Lecture 1', 'First lecture notes');
```

### Download Material (Student)
```typescript
import { downloadMaterial } from '@/lib/supabase-helpers';

const url = await downloadMaterial(filePath);
window.open(url, '_blank');
```

## Security Features

### Row Level Security (RLS)
- All tables have RLS enabled
- Policies enforce role-based access
- Users can only see/modify data they're authorized for

### Storage Security
- Private bucket (not publicly accessible)
- Signed URLs for downloads (expire after 1 hour)
- Instructors can only upload to their courses
- Students can only download from enrolled courses

### Role Enforcement
- Roles stored in profiles table
- Helper functions check roles server-side
- Policies use security definer functions

## Testing the Setup

### Test Admin Functions
1. Create admin user
2. Create a course
3. Create instructor user and assign to course

### Test Instructor Functions
1. Login as instructor
2. Upload material to assigned course
3. Verify students can't see it yet

### Test Student Functions
1. Create student user
2. Enroll student in course (as admin)
3. Login as student and download material

## Troubleshooting

### "Permission denied" errors
- Check RLS policies are applied
- Verify user role in profiles table
- Ensure storage policies are created

### Files not uploading
- Check storage bucket exists
- Verify storage policies
- Ensure file path format: `{course_id}/{filename}`

### Students can't see materials
- Verify student is enrolled in course
- Check material course_id matches enrollment
- Ensure RLS policies are correct

## Next Steps

1. Implement real-time subscriptions for live updates
2. Add course categories/tags
3. Implement assignment submissions
4. Add grading system
5. Email notifications for new materials
