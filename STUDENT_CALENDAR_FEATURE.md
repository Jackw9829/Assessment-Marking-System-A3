# Student Calendar Feature

## EduConnect Assessment Marking System (AMS)

**Document Version:** 1.0  
**Date:** January 31, 2026  
**Feature Category:** Student Experience Enhancement

---

## 1. Overview

The Student Calendar feature provides students with a visual, interactive calendar interface to view and manage their assessment deadlines. This feature integrates seamlessly with the existing deadline reminder system and supports multiple calendar views to accommodate different planning preferences. The calendar displays only assessments from courses in which the student is enrolled and filters to show only active, published assessments eligible for reminder notifications.

---

## 2. User Story

### Primary User Story

> **As an** authenticated student enrolled in one or more courses,  
> **I want to** view all my assessment deadlines in an interactive calendar format with month and week views,  
> **So that I can** visualise my workload, plan my study schedule effectively, identify potential deadline conflicts, and ensure timely submission of all assessments.

### Supporting User Stories

| ID | User Story |
|----|------------|
| US-C01 | As a student, I want to switch between month and week calendar views so that I can see my deadlines at different levels of detail. |
| US-C02 | As a student, I want to see assessment titles and due times on the calendar so that I understand what is due and when. |
| US-C03 | As a student, I want to click on a calendar entry to view the full assessment details so that I can access submission requirements. |
| US-C04 | As a student, I want overdue and upcoming deadlines to be clearly labelled so that I can prioritise urgent tasks. |
| US-C05 | As a student, I want the calendar to automatically update when instructors modify deadlines so that I always see accurate information. |
| US-C06 | As a student, I want to see only assessments from my enrolled courses so that my calendar is relevant and uncluttered. |

---

## 3. Acceptance Criteria

The following acceptance criteria define the conditions that must be satisfied for the Student Calendar feature to be considered complete and functional:

| ID | Acceptance Criterion | Priority |
|----|---------------------|----------|
| AC-01 | **Authentication Required:** The system SHALL require the user to be authenticated before accessing the calendar. Unauthenticated users attempting to access the calendar SHALL be redirected to the login page. | Critical |
| AC-02 | **Enrolled Courses Only:** The calendar SHALL display assessment deadlines exclusively from courses in which the authenticated student is currently enrolled. Assessments from non-enrolled courses SHALL NOT appear on the student's calendar. | Critical |
| AC-03 | **Active Assessments Only:** The calendar SHALL display only assessments that are marked as active and published. Draft, archived, or unpublished assessments SHALL NOT appear on the calendar, consistent with the reminder system which only sends notifications for active assessments. | High |
| AC-04 | **Month View:** The system SHALL provide a month view displaying all days of the current month in a grid format. Assessment deadlines SHALL be displayed on their respective due dates with the assessment title visible. Users SHALL be able to navigate to previous and next months. | High |
| AC-05 | **Week View:** The system SHALL provide a week view displaying all seven days of the current week with time slots. Assessment deadlines SHALL be positioned according to their due date and time. Users SHALL be able to navigate to previous and next weeks. | High |
| AC-06 | **Deadline Entry Display:** Each calendar entry SHALL display at minimum: the assessment title and the due date/time. Entries SHALL be colour-coded by course for easy identification. Clicking on an entry SHALL navigate to or display the full assessment details. | High |
| AC-07 | **Assessment Details Access:** When a student clicks on a calendar deadline entry, the system SHALL display the assessment details including: title, description, course name, due date/time, total marks, submission status, and a link to submit (if applicable). | High |
| AC-08 | **Automatic Updates:** The calendar SHALL automatically refresh or update when assessment deadlines are modified by instructors. Updates SHALL be reflected within 30 seconds of the change without requiring a manual page refresh, utilising real-time subscription technology. | Medium |
| AC-09 | **Overdue/Upcoming Labels:** The system SHALL clearly distinguish deadline entries with visual labels: "Overdue" (red) for past deadlines with no submission, "Due Soon" (orange) for deadlines within the next 48 hours, "Upcoming" (blue) for future deadlines, and "Submitted" (green) for assessments already submitted. | High |
| AC-10 | **Today Indicator:** The calendar SHALL prominently highlight the current date with a distinct visual indicator (e.g., highlighted background, border) so that students can easily identify today's position relative to their deadlines. | Medium |

---

## 4. Integration with Reminder System

The Student Calendar feature aligns with the existing Automated Deadline Reminder system:

### 4.1 Shared Data Source

```
┌─────────────────────────────────────────────────────────────────────┐
│                        ASSESSMENTS TABLE                            │
│  (Source of truth for both Calendar and Reminder systems)          │
├─────────────────────────────────────────────────────────────────────┤
│  • id, title, description, due_date, total_marks                   │
│  • course_id (for enrollment filtering)                            │
│  • assessment_type (assignment, quiz, examination, etc.)           │
│  • is_active (only active assessments shown/reminded)              │
│  • is_published (only published assessments shown/reminded)        │
└─────────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              │                               │
              ▼                               ▼
   ┌─────────────────────┐       ┌─────────────────────┐
   │  STUDENT CALENDAR   │       │  REMINDER SYSTEM    │
   │                     │       │                     │
   │  • Visual display   │       │  • Scheduled alerts │
   │  • Month/Week views │       │  • Email/Dashboard  │
   │  • Click for details│       │  • 7d, 3d, 1d, 6h   │
   └─────────────────────┘       └─────────────────────┘
```

### 4.2 Consistency Rules

| Rule | Description |
|------|-------------|
| **Active Filter** | Both calendar and reminder system only show/process assessments where `is_active = true` |
| **Published Filter** | Both systems only display assessments where `is_published = true` (once implemented) |
| **Enrollment Check** | Both systems verify student enrollment before displaying or sending reminders |
| **Real-time Sync** | Both systems subscribe to assessment changes for immediate updates |

---

## 5. Visual Design Specification

### 5.1 Calendar Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ASSESSMENT CALENDAR                              [Month ▼] [Week ▼]    │
├─────────────────────────────────────────────────────────────────────────┤
│  ◀ Previous          FEBRUARY 2026              Next ▶   [Today]        │
├─────────────────────────────────────────────────────────────────────────┤
│   Sun    │   Mon    │   Tue    │   Wed    │   Thu    │   Fri    │  Sat  │
├──────────┼──────────┼──────────┼──────────┼──────────┼──────────┼───────┤
│    1     │    2     │    3     │    4     │    5     │    6     │   7   │
│          │          │          │          │ ┌──────┐ │          │       │
│          │          │          │          │ │Quiz 1│ │          │       │
│          │          │          │          │ │DSA   │ │          │       │
│          │          │          │          │ └──────┘ │          │       │
├──────────┼──────────┼──────────┼──────────┼──────────┼──────────┼───────┤
│    8     │    9     │   10     │   11     │   12     │   13     │  14   │
│          │ ┌──────┐ │          │          │          │          │       │
│          │ │Assign│ │          │          │          │          │       │
│          │ │SNA   │ │          │          │          │          │       │
│          │ └──────┘ │          │          │          │          │       │
├──────────┼──────────┼──────────┼──────────┼──────────┼──────────┼───────┤
│   15     │   16     │   17     │   18     │   19     │   20     │  21   │
│          │          │ ┌──────┐ │          │          │ ┌──────┐ │       │
│          │          │ │Project│ │          │          │ │Exam  │ │       │
│          │          │ │CS101 │ │          │          │ │MATH  │ │       │
│          │          │ │⚠ SOON│ │          │          │ └──────┘ │       │
│          │          │ └──────┘ │          │          │          │       │
└──────────┴──────────┴──────────┴──────────┴──────────┴──────────┴───────┘

LEGEND:  🔴 Overdue   🟠 Due Soon (48h)   🔵 Upcoming   🟢 Submitted
```

### 5.2 Colour Coding

| Status | Colour | Hex Code | Usage |
|--------|--------|----------|-------|
| Overdue | Red | `#EF4444` | Past deadline, no submission |
| Due Soon | Orange | `#F97316` | Within 48 hours |
| Upcoming | Blue | `#3B82F6` | Future deadline |
| Submitted | Green | `#22C55E` | Assessment submitted |
| Today | Purple Border | `#8B5CF6` | Current date highlight |

### 5.3 Course Colour Assignment

Each enrolled course is assigned a unique colour from a predefined palette for visual distinction:

```typescript
const courseColours = [
    '#3B82F6', // Blue
    '#10B981', // Emerald
    '#F59E0B', // Amber
    '#EF4444', // Red
    '#8B5CF6', // Violet
    '#EC4899', // Pink
    '#06B6D4', // Cyan
    '#84CC16', // Lime
];
```

---

## 6. Technical Specification

### 6.1 Database Query

```sql
-- Get calendar events for a student
CREATE OR REPLACE FUNCTION get_student_calendar_events(
    p_student_id UUID,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS TABLE (
    assessment_id UUID,
    title TEXT,
    description TEXT,
    due_date TIMESTAMPTZ,
    total_marks INTEGER,
    assessment_type assessment_type,
    course_id UUID,
    course_code TEXT,
    course_title TEXT,
    submission_id UUID,
    submission_status TEXT,
    is_overdue BOOLEAN,
    is_due_soon BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id AS assessment_id,
        a.title,
        a.description,
        a.due_date,
        a.total_marks,
        a.assessment_type,
        c.id AS course_id,
        c.code AS course_code,
        c.title AS course_title,
        s.id AS submission_id,
        COALESCE(s.status::TEXT, 'not_submitted') AS submission_status,
        (a.due_date < NOW() AND s.id IS NULL) AS is_overdue,
        (a.due_date > NOW() AND a.due_date <= NOW() + INTERVAL '48 hours' AND s.id IS NULL) AS is_due_soon
    FROM assessments a
    INNER JOIN courses c ON a.course_id = c.id
    INNER JOIN course_enrollments e ON e.course_id = c.id AND e.student_id = p_student_id
    LEFT JOIN submissions s ON s.assessment_id = a.id AND s.student_id = p_student_id
    WHERE 
        a.due_date::DATE BETWEEN p_start_date AND p_end_date
        -- Only active assessments (consistent with reminder system)
        -- AND a.is_active = true  -- Uncomment when column exists
        -- AND a.is_published = true  -- Uncomment when column exists
    ORDER BY a.due_date;
END;
$$;
```

### 6.2 Real-time Subscription

```typescript
// Subscribe to assessment changes for real-time calendar updates
useEffect(() => {
    const subscription = supabase
        .channel('calendar-updates')
        .on('postgres_changes', {
            event: '*',  // INSERT, UPDATE, DELETE
            schema: 'public',
            table: 'assessments',
        }, (payload) => {
            // Refresh calendar data when assessments change
            refetchCalendarEvents();
        })
        .subscribe();

    return () => subscription.unsubscribe();
}, []);
```

### 6.3 Component Structure

```
src/app/components/
├── student-calendar.tsx         # Main calendar component
├── calendar-month-view.tsx      # Month grid view
├── calendar-week-view.tsx       # Week timeline view
├── calendar-event.tsx           # Individual event display
├── calendar-event-popover.tsx   # Event details popover
└── calendar-navigation.tsx      # Month/week navigation
```

---

## 7. User Interaction Flows

### 7.1 Viewing the Calendar

```
┌─────────┐     ┌──────────────┐     ┌─────────────────┐
│ Student │────▶│ Navigate to  │────▶│ Authenticate    │
│ Login   │     │ Calendar Tab │     │ Check           │
└─────────┘     └──────────────┘     └────────┬────────┘
                                              │
                     ┌────────────────────────┴────────────────────┐
                     │                                             │
                     ▼                                             ▼
          ┌─────────────────────┐                     ┌─────────────────────┐
          │ Fetch Enrolled      │                     │ Redirect to Login   │
          │ Courses             │                     │ (if not auth'd)     │
          └──────────┬──────────┘                     └─────────────────────┘
                     │
                     ▼
          ┌─────────────────────┐
          │ Fetch Active        │
          │ Assessments         │
          └──────────┬──────────┘
                     │
                     ▼
          ┌─────────────────────┐
          │ Render Calendar     │
          │ with Events         │
          └─────────────────────┘
```

### 7.2 Clicking on an Event

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────────┐
│ Click Calendar  │────▶│ Open Event      │────▶│ Display:            │
│ Event           │     │ Popover/Modal   │     │ • Title             │
└─────────────────┘     └─────────────────┘     │ • Description       │
                                                │ • Due Date/Time     │
                                                │ • Course Name       │
                                                │ • Total Marks       │
                                                │ • Submission Status │
                                                │ • [Submit] Button   │
                                                └─────────────────────┘
```

---

## 8. Accessibility Requirements

| Requirement | Implementation |
|-------------|----------------|
| **Keyboard Navigation** | Calendar navigable via arrow keys; Enter/Space to select events |
| **Screen Reader Support** | ARIA labels for all calendar cells and events |
| **Colour Contrast** | All text meets WCAG AA contrast ratios (4.5:1) |
| **Focus Indicators** | Visible focus states for all interactive elements |
| **Date Announcements** | Screen readers announce full date context when navigating |

---

## 9. Mobile Responsiveness

| Viewport | Behaviour |
|----------|-----------|
| **Desktop (≥1024px)** | Full month grid with detailed event display |
| **Tablet (768-1023px)** | Compact month grid; events show title only |
| **Mobile (<768px)** | Default to week view; agenda list alternative available |

---

## 10. Summary

The Student Calendar feature enhances the student experience by providing a visual, interactive interface for managing assessment deadlines. By integrating with the existing reminder system and sharing the same data filters (active/published assessments, enrolled courses), the calendar ensures consistency across all deadline-related features. Real-time updates, clear visual labelling, and multiple view options empower students to effectively plan their academic workload and submit assessments on time.

---

**Document End**
