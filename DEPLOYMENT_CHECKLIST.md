# Deployment Checklist - Bug Fixes for Learning Materials & Grades

## Summary of Changes

Three critical bugs have been fixed:
1. ✅ **Grades visibility issue** - Students couldn't see verified grades
2. ✅ **Learning materials display issue** - Materials weren't showing despite being uploaded
3. ✅ **Material download function** - Download button was non-functional

---

## Files Changed

### 1. Database Migrations
- **NEW:** `/supabase/migrations/20260131000011_fix_grades_visibility.sql`
  - Fixes the RLS policy for grades to only show verified grades to students

- **MODIFIED:** `/supabase/migrations/20260127000004_assessments_submissions_grades.sql`
  - Updated the "grades: students can view own" policy to require `verified = TRUE`

### 2. Frontend Components
- **MODIFIED:** `/src/app/components/student-dashboard.tsx`
  - Fixed material fetching with proper error handling
  - Implemented complete download functionality
  - Added import for `downloadMaterial` helper

### 3. Documentation
- **NEW:** `/BUG_FIXES_SUMMARY.md`
  - Complete documentation of all issues, fixes, and testing procedures

---

## Deployment Steps

### Step 1: Apply Database Migrations

Run this migration in your Supabase SQL Editor (as postgres user if needed):

```bash
# Copy the contents of the following file and run in Supabase SQL Editor:
/supabase/migrations/20260131000011_fix_grades_visibility.sql
```

**OR** if using Supabase CLI:
```bash
supabase migration up
```

### Step 2: Verify Database Changes

Run this query to verify the new policy exists:
```sql
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename = 'grades' 
ORDER BY policyname;
```

You should see: `"grades: students can view own verified"`

### Step 3: Update Frontend Code

The frontend changes in `student-dashboard.tsx` are automatic once you pull the latest code.

### Step 4: Clear Browser Cache

Have users clear their browser cache or do a hard refresh (Ctrl+Shift+R / Cmd+Shift+R) to load the updated component.

### Step 5: Test the Fixes

Follow the testing steps in `BUG_FIXES_SUMMARY.md`:
1. Test material upload → student access → download
2. Test grade submission → admin verification → student visibility

---

## Rollback Plan (if needed)

If you need to rollback the grades policy change:

```sql
-- Rollback: Revert to old policy (allows students to see ALL grades, not just verified)
DROP POLICY IF EXISTS "grades: students can view own verified" ON public.grades;

CREATE POLICY "grades: students can view own"
	ON public.grades FOR SELECT
	USING (
		is_student() AND
		EXISTS (
			SELECT 1 FROM submissions
			WHERE submissions.id = grades.submission_id
			AND submissions.student_id = auth.uid()
		)
	);
```

---

## Expected Behavior After Deployment

### Learning Materials Tab
- Students will see all materials from courses they're enrolled in
- Download button will be functional and trigger file downloads
- Materials appear immediately after instructor uploads them

### My Grades Tab
- Students will only see grades that have been verified by admin
- Unverified grades (pending admin verification) will NOT be visible
- Once admin verifies a grade, it appears immediately in student's dashboard

### Error Handling
- If materials fail to fetch from a specific course, error is logged but other courses still load
- Download errors show a user-friendly message

---

## Monitoring

After deployment, monitor for:
1. **Browser Console:** No permission denied errors for materials or grades
2. **Supabase Logs:** Check for any RLS policy violations
3. **User Reports:** Confirm students can see their materials and verified grades

---

## Notes

- The RLS policies now correctly enforce business logic:
  - Materials visible to all authenticated users enrolled in the course
  - Grades visible to students ONLY if admin-verified
- All changes are backward compatible
- No data migration required
- The policies use security-definer functions which have been properly configured

---

## Additional Information

For more details on the specific issues and fixes, see:
- `BUG_FIXES_SUMMARY.md` - Detailed technical documentation
- `supabase/migrations/20260131000011_fix_grades_visibility.sql` - Migration file
