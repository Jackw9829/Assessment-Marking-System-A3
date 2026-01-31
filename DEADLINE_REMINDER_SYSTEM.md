# Automated Deadline Reminder System - Design Document

## Overview

This document describes the design and implementation of the **Automated Deadline Reminder System** for the EduConnect Assessment & Marking System. The system automatically notifies students before assessment deadlines, helping them avoid missed submissions.

---

## User Story

> **As a student, I want to receive automated reminders before assessment deadlines so that I do not miss submissions.**

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        AUTOMATED DEADLINE REMINDER SYSTEM                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌────────────┐ │
│  │   Student    │    │  Instructor  │    │    Admin     │    │   Cron     │ │
│  │  Dashboard   │    │  Dashboard   │    │   Console    │    │  Scheduler │ │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘    └──────┬─────┘ │
│         │                   │                   │                   │       │
│         └───────────────────┴───────────────────┴───────────────────┘       │
│                                     │                                        │
│                          ┌──────────▼──────────┐                            │
│                          │    Supabase Edge    │                            │
│                          │      Functions      │                            │
│                          │  (process-reminders)│                            │
│                          └──────────┬──────────┘                            │
│                                     │                                        │
│         ┌───────────────────────────┼───────────────────────────┐           │
│         ▼                           ▼                           ▼           │
│  ┌─────────────┐           ┌─────────────┐           ┌─────────────┐       │
│  │ Notification│           │  Scheduled  │           │   Email     │       │
│  │   Table     │           │  Reminders  │           │   Queue     │       │
│  └─────────────┘           └─────────────┘           └──────┬──────┘       │
│         │                         │                         │               │
│         │                         │                         ▼               │
│         │                         │                  ┌─────────────┐       │
│         │                         │                  │   Email     │       │
│         │                         │                  │   Service   │       │
│         │                         │                  │  (Resend)   │       │
│         │                         │                  └─────────────┘       │
│         │                         │                                         │
│         └─────────────────────────┼─────────────────────────────────────┐   │
│                                   ▼                                     │   │
│                          ┌─────────────────┐                           │   │
│                          │    PostgreSQL   │                           │   │
│                          │    Database     │                           │   │
│                          │  (Supabase)     │                           │   │
│                          └─────────────────┘                           │   │
│                                                                         │   │
│  ┌──────────────────────────────────────────────────────────────────┐  │   │
│  │                    REALTIME SUBSCRIPTIONS                         │  │   │
│  │  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐          │  │   │
│  │  │  Dashboard  │◄───│  Supabase   │◄───│   Insert    │          │  │   │
│  │  │   Update    │    │  Realtime   │    │   Trigger   │──────────┼──┘   │
│  │  └─────────────┘    └─────────────┘    └─────────────┘          │      │
│  └──────────────────────────────────────────────────────────────────┘      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### 1. Reminder Schedules Table
Defines the predefined intervals for reminders:

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | TEXT | Human-readable name (e.g., "One Week Before") |
| days_before | INTEGER | Days before deadline |
| hours_before | INTEGER | Additional hours before deadline |
| is_default | BOOLEAN | Whether this is a system default |
| is_active | BOOLEAN | Whether schedule is currently active |

**Default Schedules:**
- 7 days before deadline
- 3 days before deadline  
- 1 day before deadline
- 6 hours before deadline

### 2. Scheduled Reminders Table
Tracks individual scheduled reminders for each student-assessment combination:

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| assessment_id | UUID | Reference to assessment |
| student_id | UUID | Reference to student profile |
| schedule_id | UUID | Reference to reminder schedule |
| scheduled_for | TIMESTAMPTZ | When reminder should be sent |
| status | ENUM | 'pending', 'sent', 'cancelled', 'failed' |
| sent_at | TIMESTAMPTZ | When reminder was actually sent |

### 3. Notifications Table
Stores all notifications delivered to users:

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Reference to user profile |
| title | TEXT | Notification title |
| message | TEXT | Notification content |
| type | TEXT | 'reminder', 'grade', 'announcement' |
| channel | ENUM | 'dashboard', 'email', 'both' |
| status | ENUM | 'unread', 'read', 'dismissed' |
| reference_type | TEXT | Type of related entity |
| reference_id | UUID | ID of related entity |
| metadata | JSONB | Additional data |
| expires_at | TIMESTAMPTZ | When notification expires |

### 4. Notification Preferences Table
Allows students to customize their notification settings:

| Column | Type | Description |
|--------|------|-------------|
| user_id | UUID | Reference to user profile |
| email_enabled | BOOLEAN | Receive email notifications |
| dashboard_enabled | BOOLEAN | Receive dashboard notifications |
| reminder_7_days | BOOLEAN | Receive 7-day reminders |
| reminder_3_days | BOOLEAN | Receive 3-day reminders |
| reminder_1_day | BOOLEAN | Receive 1-day reminders |
| reminder_6_hours | BOOLEAN | Receive 6-hour reminders |
| timezone | TEXT | User's timezone |

### 5. Email Queue Table
Queue for outbound email notifications:

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| notification_id | UUID | Reference to notification |
| recipient_email | TEXT | Email address |
| subject | TEXT | Email subject |
| body_html | TEXT | HTML email content |
| status | TEXT | 'pending', 'sent', 'failed', 'retry' |
| attempts | INTEGER | Number of send attempts |

### 6. Reminder Audit Log Table
Complete audit trail of all reminder activities:

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| reminder_id | UUID | Reference to scheduled reminder |
| assessment_id | UUID | Reference to assessment |
| student_id | UUID | Reference to student |
| action | TEXT | 'scheduled', 'sent', 'cancelled', 'failed' |
| details | JSONB | Additional context |

---

## Reminder Scheduling Logic

### Automatic Scheduling Triggers

#### 1. When Assessment is Created
```
┌─────────────────────┐
│  New Assessment     │
│  Created by         │
│  Instructor         │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Trigger: schedule_ │
│  reminders_on_      │
│  assessment         │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  For each enrolled  │
│  student in course  │◄─── Get from course_enrollments
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Create scheduled   │
│  reminders for each │
│  active interval    │
└─────────────────────┘
```

#### 2. When Student Enrolls in Course
```
┌─────────────────────┐
│  New Enrollment     │
│  Created            │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Trigger: schedule_ │
│  reminders_on_      │
│  enrollment         │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  For each active    │
│  assessment in      │◄─── Where due_date > NOW()
│  course             │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Create scheduled   │
│  reminders for each │
│  active interval    │
└─────────────────────┘
```

### Scheduling Algorithm

```sql
-- For each reminder schedule (7 days, 3 days, 1 day, 6 hours):
reminder_time = due_date 
                - (days_before * INTERVAL '1 day')
                - (hours_before * INTERVAL '1 hour')

-- Only schedule if:
-- 1. reminder_time > NOW() (in the future)
-- 2. Student is enrolled in the course
-- 3. Student has not already submitted
-- 4. Reminder doesn't already exist
```

### Cancellation Logic

Reminders are automatically cancelled when:

1. **Student Submits Assessment**
   - Trigger on `submissions` table INSERT
   - Updates all pending reminders to 'cancelled'
   - Logs cancellation in audit table

2. **Assessment is Deleted**
   - CASCADE delete removes scheduled reminders

3. **Student Unenrolls**
   - CASCADE delete removes scheduled reminders

---

## Notification Workflow

### Processing Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         REMINDER PROCESSING FLOW                         │
└─────────────────────────────────────────────────────────────────────────┘

        ┌───────────────┐
        │   Cron Job    │  Runs every 5 minutes
        │  (Scheduled)  │
        └───────┬───────┘
                │
                ▼
┌───────────────────────────────┐
│  Edge Function: process-     │
│  reminders                   │
└───────────────┬───────────────┘
                │
                ▼
┌───────────────────────────────┐
│  Step 1: Query due reminders │
│  WHERE status = 'pending'    │
│  AND scheduled_for <= NOW()  │
│  AND due_date > NOW()        │──── Only active assessments
│  AND NOT has_submitted       │
└───────────────┬───────────────┘
                │
                ▼
┌───────────────────────────────┐
│  Step 2: For each reminder   │
└───────────────┬───────────────┘
                │
        ┌───────┴───────┐
        │               │
        ▼               ▼
┌──────────────┐ ┌──────────────┐
│  Create      │ │  Queue       │
│  Dashboard   │ │  Email       │
│  Notification│ │  Notification│
└──────────────┘ └───────┬──────┘
        │                │
        │                ▼
        │        ┌──────────────┐
        │        │  Send via    │
        │        │  Email API   │
        │        │  (Resend)    │
        │        └──────────────┘
        │
        ▼
┌───────────────────────────────┐
│  Step 3: Update reminder     │
│  status = 'sent'             │
│  sent_at = NOW()             │
└───────────────┬───────────────┘
                │
                ▼
┌───────────────────────────────┐
│  Step 4: Log to audit table  │
└───────────────────────────────┘
```

### Verification Steps

Before sending any reminder, the system verifies:

1. **Login Verification**: User must have valid Supabase auth session
2. **Enrollment Verification**: Student must be enrolled in assessment's course
3. **Active Assessment**: Assessment due date must be in the future
4. **Not Submitted**: Student must not have already submitted
5. **User Preferences**: Check if user has enabled this reminder type

```sql
-- Verification Query
SELECT sr.*
FROM scheduled_reminders sr
JOIN assessments a ON a.id = sr.assessment_id
JOIN course_enrollments ce ON ce.course_id = a.course_id 
                           AND ce.student_id = sr.student_id
WHERE sr.status = 'pending'
  AND sr.scheduled_for <= NOW()
  AND a.due_date > NOW()                    -- Active assessment
  AND NOT EXISTS (                          -- Not submitted
      SELECT 1 FROM submissions s
      WHERE s.assessment_id = sr.assessment_id
        AND s.student_id = sr.student_id
  );
```

---

## Notification Delivery Channels

### Dashboard Notifications

1. **Realtime Updates**: Uses Supabase Realtime subscriptions
2. **Bell Icon**: Shows unread count badge
3. **Notification Center**: Popover with full notification list
4. **Read/Dismiss Actions**: Mark as read or dismiss

```typescript
// Realtime subscription for new notifications
supabase
  .channel(`notifications:${userId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'notifications',
    filter: `user_id=eq.${userId}`,
  }, (payload) => {
    showNotification(payload.new);
  })
  .subscribe();
```

### Email Notifications

1. **Templated Emails**: Professional HTML email templates
2. **Retry Logic**: Up to 3 attempts with exponential backoff
3. **Queue System**: Ensures reliable delivery
4. **Tracking**: Records delivery status and timestamps

```
Email Template Structure:
┌─────────────────────────────────────────┐
│  📚 EduConnect AMS                      │
├─────────────────────────────────────────┤
│                                         │
│  Hi [Student Name],                     │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ ⏰ Deadline Reminder              │   │
│  │                                   │   │
│  │ "Assignment Title" for Course    │   │
│  │ is due in X days                 │   │
│  └─────────────────────────────────┘   │
│                                         │
│  Due Date: January 31, 2026 11:59 PM   │
│                                         │
│  [    Submit Assessment    ]            │
│                                         │
├─────────────────────────────────────────┤
│  Manage preferences in dashboard        │
└─────────────────────────────────────────┘
```

---

## Predefined Reminder Intervals

| Interval | Use Case | Urgency Level |
|----------|----------|---------------|
| **7 days** | Planning time for complex assessments | Low (Blue) |
| **3 days** | Mid-point reminder for preparation | Medium (Yellow) |
| **1 day** | Final preparation reminder | High (Orange) |
| **6 hours** | Urgent last-minute reminder | Critical (Red) |

### Interval Calculation Example

For an assessment due on **February 7, 2026 at 11:59 PM**:

| Reminder | Scheduled For |
|----------|---------------|
| 7 days before | January 31, 2026 11:59 PM |
| 3 days before | February 4, 2026 11:59 PM |
| 1 day before | February 6, 2026 11:59 PM |
| 6 hours before | February 7, 2026 5:59 PM |

---

## Reminder History & Display

### History Storage

All reminder activities are logged in the `reminder_audit_log` table:

- **scheduled**: When reminder was created
- **sent**: When reminder was delivered
- **cancelled**: When reminder was cancelled (after submission)
- **failed**: When delivery failed

### History Display

Students can view their reminder history in the dashboard:

```
┌─────────────────────────────────────────┐
│  📋 Reminder History                    │
├─────────────────────────────────────────┤
│  🔔 Sent - Assignment 1                 │
│     CS101 - Intro to Programming        │
│     Jan 31, 2026 11:59 PM               │
├─────────────────────────────────────────┤
│  ✗ Cancelled - Assignment 1             │
│     Reason: Submission received         │
│     Feb 1, 2026 10:30 AM                │
├─────────────────────────────────────────┤
│  🔔 Sent - Midterm Project              │
│     CS201 - Data Structures             │
│     Jan 30, 2026 9:00 AM                │
└─────────────────────────────────────────┘
```

---

## Security & Row Level Security (RLS)

### Policies

| Table | Policy | Description |
|-------|--------|-------------|
| notifications | Own data only | Users can only see/modify their own notifications |
| scheduled_reminders | Student view | Students see their own reminders |
| scheduled_reminders | Instructor view | Instructors see reminders for their courses |
| notification_preferences | Own data only | Users manage their own preferences |
| email_queue | Admin only | Only admins can view/manage email queue |
| reminder_audit_log | Student/Admin | Students see own, admins see all |

---

## Error Handling

### Failure Scenarios

1. **Email Delivery Failure**
   - Retry up to 3 times
   - Log error in email_queue
   - Notification still visible in dashboard

2. **Database Error**
   - Log error with details
   - Mark reminder as 'failed'
   - Alert admin via monitoring

3. **Edge Function Timeout**
   - Process in batches (default: 50)
   - Resume on next cron run

---

## Performance Considerations

1. **Indexed Queries**: All lookup fields are indexed
2. **Batch Processing**: Process reminders in configurable batches
3. **Efficient Joins**: Optimized queries with proper JOINs
4. **Realtime Efficiency**: Subscribe only to user's notifications

---

## Configuration

### Environment Variables

```env
# Supabase
SUPABASE_URL=your-project-url
SUPABASE_SERVICE_ROLE_KEY=your-service-key

# Email Service
RESEND_API_KEY=your-resend-api-key
FROM_EMAIL=noreply@educonnect.com
APP_URL=https://your-app.com
```

### Cron Schedule

```sql
-- Run every 5 minutes
SELECT cron.schedule(
  'process-reminders',
  '*/5 * * * *',
  $$SELECT net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/process-reminders',
    headers := '{"Authorization": "Bearer YOUR_SERVICE_KEY"}'
  );$$
);
```

---

## Summary

The Automated Deadline Reminder System provides:

✅ **Verification**: Login and enrollment checks before scheduling  
✅ **Automatic Scheduling**: Triggered by assessments and enrollments  
✅ **Predefined Intervals**: 7 days, 3 days, 1 day, 6 hours  
✅ **Multi-channel Delivery**: Dashboard + Email notifications  
✅ **Smart Cancellation**: Stops after submission  
✅ **Complete History**: Full audit trail of all activities  
✅ **Active Only**: Only triggers for non-expired assessments  
✅ **User Preferences**: Customizable notification settings  
