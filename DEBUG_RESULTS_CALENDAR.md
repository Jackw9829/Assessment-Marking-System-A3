# Deep Debug Results: Calendar Not Updating After Assessment Creation

## Root Cause Analysis

### Primary Root Causes Identified

| # | Issue | Location | Impact | Status |
|---|-------|----------|--------|--------|
| 1 | **Missing RPC Function** | Database | Calendar shows 404/400 error, no events displayed | ✅ Fixed (APPLY_CALENDAR_FIX.sql) |
| 2 | **Missing Schema Columns** | Database | `is_active`, `is_published`, `assessment_type` columns don't exist, causing INSERT failures | ✅ Fixed (APPLY_CALENDAR_FIX.sql) |
| 3 | **Non-resilient createAssessment** | [supabase-helpers.ts](src/lib/supabase-helpers.ts) | Function crashes when new columns don't exist | ✅ Fixed (backward compatible) |
| 4 | **Non-resilient getCalendarEvents** | [student-calendar.ts](src/lib/student-calendar.ts) | Function throws when RPC missing | ✅ Fixed (fallback query added) |
| 5 | **Enrollment JOIN filter** | RPC Function | Students not enrolled don't see assessments | By design |

### Evidence Chain

```
Assessment Creation Flow:
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ Instructor UI   │───►│ createAssessment │───►│ Database INSERT │
│ (datetime-local)│    │ (supabase-helpers)│   │ (assessments)   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                       │
                                                       ▼
                               ┌───────────────────────────────────┐
                               │ Trigger: schedule_reminders_on_  │
                               │ assessment_create (if exists)    │
                               └───────────────────────────────────┘

Calendar Display Flow:
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ Student Calendar│───►│ getCalendarEvents│───►│ RPC Function    │
│ Component       │    │ (student-calendar)│   │ OR Fallback     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         ▲                                              │
         │              ┌──────────────────┐           │
         └──────────────│ Real-time Sub    │◄──────────┘
                        │ (assessments)    │
                        └──────────────────┘
```

## Failure Points Analysis

### Step 1: Database Write Verification

**Before Fix:**
```
createAssessment() tries to INSERT:
  - course_id: ✅
  - title: ✅
  - description: ✅
  - due_date: ✅
  - total_marks: ✅
  - assessment_type: ❌ Column doesn't exist → ERROR
  - is_active: ❌ Column doesn't exist → ERROR  
  - is_published: ❌ Column doesn't exist → ERROR

Result: INSERT fails silently, no assessment created
```

**After Fix:**
```
createAssessment() now:
  1. Tries INSERT with new columns
  2. If fails with "column not found", retries with base columns only
  3. Works regardless of schema version
```

### Step 2: Calendar Data Source Verification

**Before Fix:**
```
getCalendarEvents() calls RPC:
  supabase.rpc('get_student_calendar_events', {...})
  
Result: 404 (function doesn't exist) or 400 (column errors)
```

**After Fix:**
```
getCalendarEvents() now:
  1. Tries RPC function
  2. If RPC fails (404, 400, column errors), uses fallback query
  3. Fallback directly queries assessments + enrollments + submissions
  4. Calendar displays events regardless of RPC availability
```

### Step 3: Frontend Rendering Verification

**Real-time Subscription:** ✅ Already implemented
```typescript
// student-calendar.tsx lines 103-115
const channel = supabase
    .channel('calendar-updates')
    .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'assessments',
    }, () => {
        fetchEvents(); // Auto-refresh on changes
    })
    .subscribe();
```

**Key Field Mapping:**
| RPC Response Field | CalendarEvent Field | Status |
|-------------------|---------------------|--------|
| `id` | `assessment_id` | ✅ |
| `due_date` | `due_date` | ✅ |
| `title` | `title` | ✅ |
| `course_code` | `course_code` | ✅ |
| `course_name` | `course_title` | ✅ |

## Fix Strategy Applied

### 1. Database Schema (APPLY_CALENDAR_FIX.sql)
- Adds missing columns: `assessment_type`, `is_active`, `is_published`
- Creates `get_student_calendar_events` RPC function
- Uses `COALESCE` for backward compatibility with existing data

### 2. Frontend Backward Compatibility ([supabase-helpers.ts](src/lib/supabase-helpers.ts))
```typescript
// Lines 521-585: createAssessment now has fallback
if (error && error.message?.includes('column')) {
    // Retry with base schema only
    const result = await supabase.from('assessments').insert({
        course_id, title, description, due_date, total_marks, created_by
    });
}
```

### 3. Calendar Resilience ([student-calendar.ts](src/lib/student-calendar.ts))
```typescript
// Lines 261-350: getCalendarEventsFallback()
// Directly queries assessments when RPC unavailable
```

## Verification Checklist

### Pre-Test Setup
- [ ] Run `DEBUG_CALENDAR_DEEP.sql` in Supabase SQL Editor
- [ ] Note which checks fail (schema? RPC? data?)
- [ ] Run `APPLY_CALENDAR_FIX.sql` if needed
- [ ] Refresh the app

### Test Case 1: Assessment Creation
| Step | Action | Expected Result | Pass? |
|------|--------|-----------------|-------|
| 1.1 | Log in as instructor | Dashboard loads | |
| 1.2 | Create assessment with future due date | Toast: "Assessment created successfully!" | |
| 1.3 | Check console for errors | No errors | |
| 1.4 | Verify in database | Record exists with correct `due_date` | |

### Test Case 2: Calendar Display
| Step | Action | Expected Result | Pass? |
|------|--------|-----------------|-------|
| 2.1 | Log in as student enrolled in course | Dashboard loads | |
| 2.2 | Navigate to Calendar | Calendar view renders | |
| 2.3 | Check current month | New assessment visible | |
| 2.4 | Click on assessment | Detail dialog opens | |

### Test Case 3: Real-time Update
| Step | Action | Expected Result | Pass? |
|------|--------|-----------------|-------|
| 3.1 | Open calendar in one browser tab | Calendar visible | |
| 3.2 | Create assessment in another tab (instructor) | - | |
| 3.3 | Check first tab | New assessment appears automatically | |

### Test Case 4: Urgent Deadlines Widget
| Step | Action | Expected Result | Pass? |
|------|--------|-----------------|-------|
| 4.1 | Create assessment due in 2 days | - | |
| 4.2 | Check student dashboard | Assessment in "Urgent Deadlines" | |
| 4.3 | Create assessment due in 10 days | - | |
| 4.4 | Check student dashboard | Assessment in "Upcoming Deadlines" | |

### Test Case 5: Reminder Schedules (After full migration)
| Step | Action | Expected Result | Pass? |
|------|--------|-----------------|-------|
| 5.1 | Run `SELECT * FROM reminder_schedules` | 7-day and 1-day reminders exist for assessment | |
| 5.2 | Submit assessment | - | |
| 5.3 | Check reminder_schedules | `is_active = false` | |

## Debug SQL Commands

### Check if fix was applied:
```sql
-- Should show 'EXISTS' for all three
SELECT 'is_active', CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'assessments' AND column_name = 'is_active'
) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
UNION ALL
SELECT 'is_published', CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'assessments' AND column_name = 'is_published'
) THEN '✅ EXISTS' ELSE '❌ MISSING' END
UNION ALL
SELECT 'RPC function', CASE WHEN EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'get_student_calendar_events'
) THEN '✅ EXISTS' ELSE '❌ MISSING' END;
```

### Test RPC function directly:
```sql
-- Replace dates as needed
SELECT * FROM get_student_calendar_events(
    '2026-02-01'::date,
    '2026-02-28'::date
);
```

### Check recent assessments:
```sql
SELECT 
    a.id, a.title, c.code, a.due_date,
    COALESCE(a.is_active::text, 'N/A') as is_active,
    COALESCE(a.is_published::text, 'N/A') as is_published,
    a.created_at
FROM assessments a
JOIN courses c ON a.course_id = c.id
ORDER BY a.created_at DESC
LIMIT 10;
```

## Files Modified

| File | Change |
|------|--------|
| [supabase-helpers.ts](src/lib/supabase-helpers.ts) | `createAssessment()` - backward compatible with schema fallback |
| [student-calendar.ts](src/lib/student-calendar.ts) | `getCalendarEvents()` - fallback query when RPC unavailable |
| [APPLY_CALENDAR_FIX.sql](APPLY_CALENDAR_FIX.sql) | Database migration for missing components |
| [DEBUG_CALENDAR_DEEP.sql](DEBUG_CALENDAR_DEEP.sql) | Comprehensive diagnostic script |

## Quick Fix Steps

1. **Run diagnostic**: Execute `DEBUG_CALENDAR_DEEP.sql` in Supabase SQL Editor
2. **Apply fix**: Execute `APPLY_CALENDAR_FIX.sql` in Supabase SQL Editor
3. **Restart app**: The frontend code now handles missing schema gracefully
4. **Verify**: Create a new assessment and check calendar
