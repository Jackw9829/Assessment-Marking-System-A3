# Deadline Reminder System - Test Plan

**System:** EduConnect Assessment & Marking System (AMS)  
**Feature:** Automated Deadline Reminder System  
**Date:** February 13, 2026  
**Version:** 1.0

---

## Table of Contents

1. [End-to-End Test Plan](#1-end-to-end-test-plan)
2. [Notification Logic Test Cases](#2-notification-logic-test-cases)
3. [UI Notification Panel Test Cases](#3-ui-notification-panel-test-cases)

---

## 1. End-to-End Test Plan

### 1.1 Preconditions

| ID | Precondition | Verification Method |
|----|--------------|---------------------|
| PRE-01 | Student account exists and is authenticated | Check Supabase auth session |
| PRE-02 | Student is enrolled in at least one course | Query `course_enrollments` table |
| PRE-03 | Course has at least one active assessment with future due date | Query `assessments` table |
| PRE-04 | Student notification preferences are enabled | Query `notification_preferences` table |
| PRE-05 | Student has valid email address | Check `profiles` table |
| PRE-06 | Reminder schedules are active (7d, 3d, 1d, 6h) | Query `reminder_schedules` table |

### 1.2 Test Cases

| Test Case ID | Scenario | Steps | Expected Result | Pass/Fail |
|--------------|----------|-------|-----------------|-----------|
| **E2E-001** | **Preconditions: Student Login** | 1. Navigate to login page<br>2. Enter student credentials<br>3. Click "Sign In" | Student dashboard loads with courses visible | |
| **E2E-002** | **Preconditions: Course Visibility** | 1. Login as student<br>2. View dashboard | All enrolled courses are displayed with assessment counts | |
| **E2E-003** | **Preconditions: Assessment Exists** | 1. Login as student<br>2. Navigate to enrolled course<br>3. View assessments | Assessment list shows at least one assessment with visible due date | |
| **E2E-004** | **7-Day Reminder Scheduling** | 1. Create assessment due in 8 days<br>2. Enroll student in course<br>3. Query `scheduled_reminders` | Reminder scheduled for exactly 7 days before due date with status='pending' | |
| **E2E-005** | **1-Day Reminder Scheduling** | 1. Create assessment due in 2 days<br>2. Wait for cron job (5 min intervals)<br>3. Check scheduled reminders | Reminder scheduled for 1 day before due date with status='pending' | |
| **E2E-006** | **Dashboard Notification Delivery** | 1. Trigger reminder processing (cron job)<br>2. Login as student<br>3. Check notification bell icon | Notification badge shows unread count; notification appears in panel | |
| **E2E-007** | **Email Notification Delivery** | 1. Set student email preferences to enabled<br>2. Trigger reminder processing<br>3. Check `email_queue` table<br>4. Check student email inbox | Email queued, sent, and received with correct content | |
| **E2E-008** | **Notification Content: Title** | 1. Receive reminder notification<br>2. View notification panel | Notification title includes assessment title (e.g., "Reminder: Assignment 1") | |
| **E2E-009** | **Notification Content: Due Date/Time** | 1. Receive reminder notification<br>2. View notification details | Due date and time displayed correctly (e.g., "Due: Feb 7, 2026 11:59 PM") | |
| **E2E-010** | **Notification Content: Submission Link** | 1. Receive reminder notification<br>2. Click "Go to Submission" link | Navigation to correct assessment submission page | |
| **E2E-011** | **Stop Condition: Submission Detected** | 1. Have pending reminders for assessment<br>2. Submit the assessment<br>3. Query `scheduled_reminders` | All pending reminders for this assessment change to status='cancelled' | |
| **E2E-012** | **Stop Condition: No Further Reminders** | 1. Submit assessment<br>2. Wait for next cron cycle<br>3. Check notifications | No new reminders generated after submission | |
| **E2E-013** | **Reminder History: Saved** | 1. Receive multiple reminders<br>2. Navigate to notification settings/history<br>3. View reminder history tab | All sent reminders appear in history with timestamps | |
| **E2E-014** | **Reminder History: Timestamp** | 1. View reminder history<br>2. Check sent reminder entry | Shows correct sent_at timestamp matching actual delivery time | |
| **E2E-015** | **Visibility: Own Reminders Only** | 1. Login as Student A<br>2. View notifications<br>3. Query database for Student B notifications | Student A sees only their own notifications; DB query confirms RLS policy | |
| **E2E-016** | **Edge Case: Past Due Date** | 1. Create assessment with past due date<br>2. Check scheduled reminders | No reminders scheduled (reminder_time must be > NOW()) | |
| **E2E-017** | **Edge Case: Due Date Changed** | 1. Have assessment with scheduled reminders<br>2. Instructor changes due date to later<br>3. Check scheduled reminders | Old reminders cancelled; new reminders created for new schedule | |
| **E2E-018** | **Edge Case: Due Date Changed Earlier** | 1. Have assessment due in 10 days (7-day reminder scheduled)<br>2. Change due date to 5 days away<br>3. Check reminders | 7-day reminder cancelled (now past); 3-day and 1-day reminders remain/rescheduled | |
| **E2E-019** | **Edge Case: Assessment Deleted** | 1. Have pending reminders for assessment<br>2. Instructor deletes assessment<br>3. Query scheduled_reminders | All reminders cascade deleted (ON DELETE CASCADE) | |
| **E2E-020** | **Edge Case: Assessment Hidden** | 1. Have pending reminders for assessment<br>2. Instructor sets assessment to hidden/unpublished<br>3. Wait for cron job | Reminders not processed; remain pending but not sent | |
| **E2E-021** | **Edge Case: Multiple Assessments** | 1. Have 3 assessments with different due dates<br>2. Trigger reminder processing<br>3. View notifications | Separate reminders for each assessment; all displayed correctly | |
| **E2E-022** | **Edge Case: Timezone Correctness** | 1. Set student timezone to "America/New_York"<br>2. Create assessment due at specific UTC time<br>3. View reminder time in notification | Time displayed in student's local timezone (EST/EDT) | |
| **E2E-023** | **Edge Case: Same Day Multiple Reminders** | 1. Have 2 assessments with same due date<br>2. Trigger reminder processing | Both assessments have separate reminder entries; both notifications delivered | |
| **E2E-024** | **Edge Case: Immediate Due Date** | 1. Create assessment due in 4 hours<br>2. Check scheduled reminders | Only 6-hour reminder should be skipped (already past); no reminders scheduled | |

---

## 2. Notification Logic Test Cases

### Reminder Scheduling Rules Verification

| Test Case ID | Scenario | Steps | Expected Result | Pass/Fail |
|--------------|----------|-------|-----------------|-----------|
| **NL-001** | **7-Day Trigger Timing** | 1. Create assessment due in exactly 14 days at 11:59 PM<br>2. Query scheduled_reminders<br>3. Verify scheduled_for timestamp | Reminder scheduled for exactly 7 days before: `due_date - 7 days` | |
| **NL-002** | **1-Day Trigger Timing** | 1. Create assessment due in 7 days<br>2. Query scheduled_reminders for 1-day schedule | Reminder scheduled for exactly 1 day before: `due_date - 1 day` | |
| **NL-003** | **3-Day Trigger Timing** | 1. Create assessment due in 10 days<br>2. Query scheduled_reminders for 3-day schedule | Reminder scheduled for exactly 3 days before: `due_date - 3 days` | |
| **NL-004** | **6-Hour Trigger Timing** | 1. Create assessment due in 3 days at 6:00 PM<br>2. Query scheduled_reminders for 6-hour schedule | Reminder scheduled for 6 hours before: `due_date - 6 hours` = 12:00 PM same day | |
| **NL-005** | **Only Active Assessments** | 1. Create assessment with is_published = false<br>2. Check scheduled_reminders | No reminders created for unpublished assessment | |
| **NL-006** | **Published Assessment Generates Reminders** | 1. Create assessment with is_published = true<br>2. Check scheduled_reminders | Reminders created for all active schedules (7d, 3d, 1d, 6h) where applicable | |
| **NL-007** | **Stop on Submission - Pending Status** | 1. Have reminder with status='pending'<br>2. Submit assessment via submission form<br>3. Query reminder status | Reminder status changed to 'cancelled' | |
| **NL-008** | **Stop on Submission - Audit Log** | 1. Submit assessment with pending reminders<br>2. Query reminder_audit_log | Log entry created with action='cancelled', details include 'submission received' | |
| **NL-009** | **Stop on Submission - Multiple Reminders** | 1. Have 4 pending reminders (7d, 3d, 1d, 6h)<br>2. Submit assessment<br>3. Check all reminder statuses | All 4 reminders changed to status='cancelled' simultaneously | |
| **NL-010** | **No Duplicate Reminders** | 1. Trigger enrollment twice for same student/course<br>2. Query scheduled_reminders | Only one set of reminders exists (UNIQUE constraint on assessment_id, student_id, schedule_id) | |
| **NL-011** | **Deadline Change - Extension** | 1. Have assessment due Feb 10 with scheduled reminders<br>2. Change due date to Feb 20<br>3. Query scheduled_reminders | Old reminders cancelled; new reminders calculated from Feb 20 | |
| **NL-012** | **Deadline Change - Shortened** | 1. Have assessment due Feb 20 (7-day reminder Feb 13)<br>2. Change due date to Feb 15 (current date is Feb 13)<br>3. Query scheduled_reminders | 7-day reminder cancelled (now in past); 3-day, 1-day, 6-hour reminders rescheduled | |
| **NL-013** | **Deadline Change - Past Due** | 1. Have assessment with pending reminders<br>2. Change due date to yesterday<br>3. Query scheduled_reminders | All reminders cancelled (due_date must be > NOW()) | |
| **NL-014** | **Enrollment Creates Reminders** | 1. Have existing assessment in course<br>2. Enroll new student<br>3. Query scheduled_reminders for new student | Reminders created for all future-applicable schedules | |
| **NL-015** | **Unenrollment Cancels Reminders** | 1. Have pending reminders for student<br>2. Unenroll student from course<br>3. Query scheduled_reminders | All reminders for that student in course cascade deleted | |
| **NL-016** | **Already Submitted - No Reminders** | 1. Student already submitted assessment<br>2. Trigger reminder scheduling<br>3. Check scheduled_reminders | No new reminders created (submission exists check) | |
| **NL-017** | **Preference Disabled - 7 Day** | 1. Disable reminder_7_days in notification_preferences<br>2. Create new assessment<br>3. Check scheduled_reminders | 7-day reminder not created; others still created | |
| **NL-018** | **Preference Disabled - All Reminders** | 1. Disable all reminder preferences<br>2. Create new assessment<br>3. Check scheduled_reminders | No reminders created for this student | |
| **NL-019** | **Processing Only Due Reminders** | 1. Have reminders scheduled for future (not yet due)<br>2. Run process-reminders function<br>3. Check reminder statuses | Only reminders where scheduled_for <= NOW() are processed | |
| **NL-020** | **Failed Reminder Retry** | 1. Force reminder to fail (email service down)<br>2. Check reminder status<br>3. Run process-reminders again | Status shows 'failed' with error_message; retry logic attempts reprocessing | |

---

## 3. UI Notification Panel Test Cases

### Dashboard Notification Display

| Test Case ID | Scenario | Steps | Expected Result | Pass/Fail |
|--------------|----------|-------|-----------------|-----------|
| **UI-001** | **Notification Bell Visible** | 1. Login as student<br>2. View top navigation bar | Bell icon (🔔) is visible in header | |
| **UI-002** | **Unread Badge Display** | 1. Have 3 unread notifications<br>2. View notification bell | Badge shows "3" next to bell icon | |
| **UI-003** | **Badge Overflow (9+)** | 1. Have 15 unread notifications<br>2. View notification bell | Badge shows "9+" (not "15") | |
| **UI-004** | **No Badge When Read** | 1. Mark all notifications as read<br>2. View notification bell | No badge displayed; static bell icon shown | |
| **UI-005** | **Panel Opens on Click** | 1. Click notification bell icon<br>2. Observe UI | Popover panel opens showing notification list | |
| **UI-006** | **Notification Title Displayed** | 1. Open notification panel<br>2. View reminder notification | Title shows "Reminder: [Assessment Title]" | |
| **UI-007** | **Due Date/Time Displayed** | 1. Open notification panel<br>2. View reminder notification details | Due date shows as "Due: [Date] [Time]" format | |
| **UI-008** | **Submission Link Present** | 1. Open notification panel<br>2. View reminder notification | "Go to Submission" or similar link/button is visible | |
| **UI-009** | **Submission Link Works** | 1. Click "Go to Submission" link<br>2. Observe navigation | Navigates to correct assessment submission page | |
| **UI-010** | **Newest First Ordering** | 1. Have notifications from different times<br>2. Open notification panel | Most recent notification appears at top; older ones below | |
| **UI-011** | **Timestamp Display** | 1. Open notification panel<br>2. View notification timestamps | Shows relative time (e.g., "Just now", "5m ago", "2h ago", "3d ago") | |
| **UI-012** | **Mark Single as Read** | 1. Open notification panel<br>2. Click "Mark as read" on single notification | Notification status changes to 'read'; visual indicator updates (e.g., lighter background) | |
| **UI-013** | **Mark All as Read** | 1. Have multiple unread notifications<br>2. Click "Mark all read" button | All notifications marked as read; unread count becomes 0 | |
| **UI-014** | **Dismiss Notification** | 1. Open notification panel<br>2. Click dismiss (X) on notification | Notification removed from list; database status='dismissed' | |
| **UI-015** | **Reminder History Tab** | 1. Open notification settings<br>2. Navigate to "History" tab | Reminder history list displayed with all past reminders | |
| **UI-016** | **History Shows Sent Reminders** | 1. View reminder history<br>2. Check sent reminder entries | Shows assessment name, course, sent timestamp, and status='sent' | |
| **UI-017** | **History Shows Cancelled Reminders** | 1. Submit assessment with pending reminders<br>2. View reminder history | Shows cancelled entries with reason "Submission received" | |
| **UI-018** | **Settings Dialog Opens** | 1. Click settings (gear) icon in notification panel<br>2. Observe UI | Settings dialog opens with notification preferences | |
| **UI-019** | **Toggle Email Notifications** | 1. Open notification settings<br>2. Toggle "Email notifications" switch<br>3. Save | Preference saved; database reflects change | |
| **UI-020** | **Toggle Individual Reminders** | 1. Open notification settings<br>2. Toggle "7-day reminder" off<br>3. Save | Only 7-day reminders disabled; others remain enabled | |
| **UI-021** | **Realtime Notification Arrival** | 1. Have notification panel open<br>2. Trigger new reminder (from another session/cron)<br>3. Observe panel | New notification appears at top without page refresh | |
| **UI-022** | **Toast on New Notification** | 1. Be on dashboard (panel closed)<br>2. Receive new notification<br>3. Observe UI | Toast notification appears with title and "View" action | |
| **UI-023** | **Urgency Color Coding** | 1. Have reminders at different urgency levels<br>2. Open notification panel | 7-day: Blue, 3-day: Yellow, 1-day: Orange, 6-hour: Red indicators | |
| **UI-024** | **Own Notifications Only** | 1. Login as Student A<br>2. Open notification panel<br>3. Login as Student B in incognito<br>4. Compare notifications | Each student sees only their own notifications | |
| **UI-025** | **Scroll for Many Notifications** | 1. Have 50+ notifications<br>2. Open notification panel | ScrollArea allows scrolling through all notifications | |
| **UI-026** | **Empty State Display** | 1. Have no notifications<br>2. Open notification panel | Shows "No notifications" or similar empty state message | |
| **UI-027** | **Loading State** | 1. Click notification bell (slow network)<br>2. Observe panel | Loading spinner displayed while fetching notifications | |
| **UI-028** | **Error State** | 1. Simulate network error during fetch<br>2. Open notification panel | Error message displayed; retry option available | |
| **UI-029** | **Timezone in Preferences** | 1. Open notification settings<br>2. View timezone setting | Current timezone displayed with option to change | |
| **UI-030** | **Close Panel** | 1. Open notification panel<br>2. Click outside panel | Panel closes | |

---

## Test Execution Summary

| Section | Total Tests | Passed | Failed | Blocked |
|---------|-------------|--------|--------|---------|
| End-to-End | 24 | | | |
| Notification Logic | 20 | | | |
| UI Panel | 30 | | | |
| **Total** | **74** | | | |

---

## Test Environment

| Component | Details |
|-----------|---------|
| **Frontend** | React 18 + TypeScript + Vite |
| **Backend** | Supabase (PostgreSQL + Edge Functions) |
| **Email Service** | Resend API |
| **Auth** | Supabase Auth with RLS policies |
| **Cron** | Supabase Edge Function scheduled every 5 minutes |

---

## Sign-Off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| QA Tester | | | |
| Developer | | | |
| Project Lead | | | |
