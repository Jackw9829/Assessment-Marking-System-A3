# Assessment-Calendar-Reminder Integration Test Cases

## Overview

This document provides test cases for verifying the integration between the Assessment Creation Module, Calendar Module, and Automated Deadline Reminder Module after the fixes applied in migration `20260212000017_calendar_reminder_integration_fix.sql`.

---

## Pre-requisites for Testing

1. Apply the migration: `20260212000017_calendar_reminder_integration_fix.sql`
2. Have test users with roles: Admin, Instructor, Student
3. Have at least one course with enrolled students
4. Dev server running at `localhost:5173`

---

## Test Suite 1: Assessment Creation with New Columns

### TC-INT-001: Create Assessment with Default Values
**Steps:**
1. Login as Instructor
2. Navigate to a course
3. Create a new assessment with title, description, due date, marks only
4. Submit the form

**Expected Results:**
- Assessment created successfully
- `assessment_type` defaults to 'assignment'
- `is_active` defaults to true
- `is_published` defaults to true
- Assessment appears in database with all columns populated

**SQL Verification:**
```sql
SELECT id, title, assessment_type, is_active, is_published 
FROM assessments 
ORDER BY created_at DESC 
LIMIT 1;
```

### TC-INT-002: Create Assessment with Custom Type
**Steps:**
1. Login as Instructor
2. Create assessment with `assessment_type = 'examination'`

**Expected Results:**
- Assessment created with `assessment_type = 'examination'`

### TC-INT-003: Create Unpublished Assessment (Draft)
**Steps:**
1. Login as Instructor
2. Create assessment with `is_published = false`

**Expected Results:**
- Assessment created but NOT visible to students
- NO reminder schedules created for this assessment

**SQL Verification:**
```sql
SELECT COUNT(*) FROM reminder_schedules 
WHERE assessment_id = '<new_assessment_id>';
-- Should return 0
```

---

## Test Suite 2: Calendar Integration

### TC-INT-010: Calendar Shows Newly Created Assessment
**Steps:**
1. Login as Student enrolled in a course
2. Open Assessment Calendar
3. Note current assessments displayed
4. (In another session) Instructor creates new assessment for the course
5. Refresh calendar view

**Expected Results:**
- New assessment appears in calendar
- Assessment shows correct due date position
- Assessment shows correct course colour

### TC-INT-011: Calendar Filters by Enrollment
**Steps:**
1. Login as Student enrolled in Course A but NOT Course B
2. Instructor creates assessment in Course B
3. Student refreshes calendar

**Expected Results:**
- Assessment from Course B does NOT appear
- Only enrolled course assessments shown

### TC-INT-012: Calendar Shows Submission Status
**Steps:**
1. Login as Student
2. View calendar with unsubmitted assessment
3. Submit the assessment
4. Refresh calendar

**Expected Results:**
- Assessment status changes from 'pending' to 'submitted'
- Visual indicator changes (green colour)

### TC-INT-013: Calendar Shows Overdue Status
**Steps:**
1. Login as Student
2. View assessment with past due date (not submitted)

**Expected Results:**
- Assessment shows 'overdue' status
- Visual indicator shows red

### TC-INT-014: Unpublished Assessment Not in Calendar
**Steps:**
1. Instructor creates assessment with `is_published = false`
2. Student views calendar

**Expected Results:**
- Assessment does NOT appear in student's calendar

### TC-INT-015: Inactive Assessment Not in Calendar
**Steps:**
1. Instructor creates assessment then sets `is_active = false`
2. Student views calendar

**Expected Results:**
- Assessment does NOT appear in student's calendar

---

## Test Suite 3: Reminder Scheduling on Assessment Creation

### TC-INT-020: Reminders Scheduled on Assessment Create
**Steps:**
1. Create assessment with due date 10 days from now
2. Course has 3 enrolled students

**Expected Results:**
- 6 reminder_schedules records created (2 per student: 7-day and 1-day)
- scheduled_for times calculated correctly

**SQL Verification:**
```sql
SELECT rs.*, p.full_name 
FROM reminder_schedules rs
JOIN profiles p ON rs.user_id = p.id
WHERE rs.assessment_id = '<assessment_id>'
ORDER BY rs.scheduled_for;
```

### TC-INT-021: Only 1-Day Reminder for Near Due Date
**Steps:**
1. Create assessment with due date 3 days from now

**Expected Results:**
- Only 1-day reminders scheduled (7-day already passed)

### TC-INT-022: No Reminders for Past Due Date
**Steps:**
1. Create assessment with due date in the past

**Expected Results:**
- No reminders scheduled

### TC-INT-023: No Reminders for Unpublished Assessment
**Steps:**
1. Create assessment with `is_published = false`

**Expected Results:**
- No reminder_schedules records created

### TC-INT-024: No Reminders for Inactive Assessment
**Steps:**
1. Create assessment with `is_active = false`

**Expected Results:**
- No reminder_schedules records created

---

## Test Suite 4: Reminder Scheduling on Enrollment

### TC-INT-030: Reminders Scheduled on Late Enrollment
**Steps:**
1. Create assessment with due date 10 days from now
2. New student enrolls in the course AFTER assessment creation

**Expected Results:**
- Reminders automatically scheduled for the new student
- Both 7-day and 1-day reminders created

**SQL Verification:**
```sql
SELECT rs.* 
FROM reminder_schedules rs
WHERE rs.user_id = '<new_student_id>'
AND rs.assessment_id = '<assessment_id>';
```

### TC-INT-031: No Reminders for Dropped Student
**Steps:**
1. Student has reminders scheduled
2. Student is removed from course

**Expected Results:**
- Existing reminders remain (cleanup is separate process)
- No NEW reminders after unenrollment

---

## Test Suite 5: Reminder Updates on Assessment Changes

### TC-INT-040: Reminders Updated on Due Date Change
**Steps:**
1. Create assessment with due date 10 days out
2. Edit assessment, change due date to 14 days out

**Expected Results:**
- Old reminders deactivated
- New reminders scheduled with updated times

**SQL Verification:**
```sql
SELECT reminder_type, scheduled_for, is_active 
FROM reminder_schedules 
WHERE assessment_id = '<assessment_id>'
ORDER BY created_at;
```

### TC-INT-041: Reminders Deactivated on Unpublish
**Steps:**
1. Create published assessment (reminders scheduled)
2. Edit assessment, set `is_published = false`

**Expected Results:**
- All reminders for this assessment set to `is_active = false`

### TC-INT-042: Reminders Deactivated on Deactivate
**Steps:**
1. Create active assessment
2. Edit assessment, set `is_active = false`

**Expected Results:**
- All reminders deactivated

### TC-INT-043: Reminders Re-activated on Publish
**Steps:**
1. Have unpublished assessment (no active reminders)
2. Publish the assessment

**Expected Results:**
- Reminders scheduled for enrolled students

---

## Test Suite 6: End-to-End Integration Flow

### TC-INT-050: Complete Flow - Create to Reminder
**Steps:**
1. Instructor creates assessment (due in 2 days)
2. Verify reminder_schedules created
3. Student views calendar - assessment appears
4. Wait for 1-day reminder trigger
5. Student receives notification

**Expected Results:**
- All steps succeed
- Student sees assessment in calendar immediately
- Student receives reminder notification

### TC-INT-051: Complete Flow - Late Enrollment
**Steps:**
1. Create assessment (due in 10 days)
2. New student enrolls in course
3. Student views calendar
4. Verify reminders scheduled

**Expected Results:**
- Student sees existing assessment in calendar
- Reminders scheduled for new student

### TC-INT-052: Complete Flow - Submit Cancels Reminder
**Steps:**
1. Assessment has 1-day reminder scheduled
2. Student submits assessment
3. Check reminder status

**Expected Results:**
- Reminder deactivated after submission
- No reminder sent for submitted work

---

## Test Suite 7: Edge Cases

### TC-INT-060: Assessment Due in Less Than 1 Day
**Steps:**
1. Create assessment due in 12 hours

**Expected Results:**
- No reminders scheduled (both triggers missed)
- Assessment appears in calendar

### TC-INT-061: Bulk Enrollment
**Steps:**
1. Create assessment (due 10 days)
2. Bulk enroll 100 students

**Expected Results:**
- Reminders scheduled for all 100 students
- No performance degradation

### TC-INT-062: Concurrent Assessment Creation
**Steps:**
1. Two instructors create assessments simultaneously

**Expected Results:**
- Both assessments created correctly
- All reminders scheduled without conflicts

### TC-INT-063: Timezone Handling
**Steps:**
1. Create assessment with due date
2. View calendar from different timezone

**Expected Results:**
- Due date displayed in user's local timezone
- Reminders trigger at correct times

---

## Verification SQL Scripts

### Check All Assessments with New Columns
```sql
SELECT 
    a.id,
    a.title,
    a.assessment_type,
    a.is_active,
    a.is_published,
    a.due_date,
    c.code as course_code,
    COUNT(rs.id) as reminder_count
FROM assessments a
JOIN courses c ON a.course_id = c.id
LEFT JOIN reminder_schedules rs ON rs.assessment_id = a.id AND rs.is_active = true
GROUP BY a.id, c.code
ORDER BY a.due_date;
```

### Check Calendar RPC Function Works
```sql
SELECT * FROM get_student_calendar_events(
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '30 days'
);
```

### Check Reminder Schedules for Assessment
```sql
SELECT 
    rs.*,
    p.full_name as student_name,
    a.title as assessment_title
FROM reminder_schedules rs
JOIN profiles p ON rs.user_id = p.id
JOIN assessments a ON rs.assessment_id = a.id
WHERE rs.is_active = true
ORDER BY rs.scheduled_for;
```

### Verify Triggers Exist
```sql
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table
FROM information_schema.triggers
WHERE trigger_name LIKE '%reminder%' OR trigger_name LIKE '%schedule%'
ORDER BY event_object_table, trigger_name;
```

---

## Known Limitations

1. **Timezone**: All times stored in UTC; frontend converts for display
2. **Reminder Processing**: Requires Edge Function invocation (not automatic)
3. **Real-time Updates**: Calendar may require manual refresh for new assessments (Supabase real-time subscription recommended for immediate updates)

---

## Post-Migration Checklist

- [ ] Migration applied successfully
- [ ] assessments table has `assessment_type`, `is_active`, `is_published` columns
- [ ] `get_student_calendar_events` RPC function exists
- [ ] `schedule_reminders_on_enrollment` trigger exists
- [ ] `update_reminders_on_assessment` trigger exists
- [ ] Existing assessments backfilled with reminders
- [ ] Frontend displays calendar correctly
- [ ] Test assessment creation with new fields
