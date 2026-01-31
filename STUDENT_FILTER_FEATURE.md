# Student Filter Feature (Assessments / Results)

## EduConnect Assessment Marking System (AMS)

**Document Version:** 1.0  
**Date:** January 31, 2026  
**Feature Category:** Student Experience Enhancement

---

## 1. Overview

The Student Filter feature provides students with a comprehensive filtering mechanism to efficiently navigate and locate their assessments and results within the EduConnect Assessment Marking System. This feature aligns with the system's core workflow: **Assessments → Submission → Grading → Results Release**.

---

## 2. User Story

### Primary User Story

> **As a** student enrolled in one or more courses,  
> **I want to** filter and search my assessments and results using multiple criteria such as course, submission status, due date range, and results release status,  
> **So that I can** quickly locate specific assessments, track my submission progress, identify pending tasks, and review my academic performance efficiently.

### Supporting User Stories

| ID | User Story |
|----|------------|
| US-F01 | As a student, I want to filter assessments by course so that I can focus on a specific subject's requirements. |
| US-F02 | As a student, I want to filter by assessment status (not submitted, submitted, graded) so that I can prioritise my workload. |
| US-F03 | As a student, I want to filter by due date range so that I can identify upcoming deadlines. |
| US-F04 | As a student, I want to filter by results release status so that I can quickly find assessments with available feedback. |
| US-F05 | As a student, I want to reset all filters with a single action so that I can return to the default view instantly. |

---

## 3. Acceptance Criteria

The following acceptance criteria define the conditions that must be satisfied for the Student Filter feature to be considered complete and functional:

| ID | Acceptance Criterion | Priority |
|----|---------------------|----------|
| AC-01 | **Course Filter:** The system SHALL provide a dropdown selector allowing students to filter assessments by enrolled course(s). The dropdown SHALL only display courses in which the student is currently enrolled. | High |
| AC-02 | **Assessment Status Filter:** The system SHALL provide filter options for assessment status including: "Not Submitted" (assessments with no submission record), "Submitted" (assessments with a pending submission awaiting grading), and "Graded" (assessments that have received a grade). | High |
| AC-03 | **Due Date Range Filter:** The system SHALL provide date picker controls allowing students to specify a start date and end date range. Only assessments with due dates falling within the specified range SHALL be displayed. | High |
| AC-04 | **Submission Date Range Filter:** The system SHALL provide date picker controls allowing students to filter assessments by the date their submission was recorded, enabling review of historical submission activity. | Medium |
| AC-05 | **Results Release Status Filter:** The system SHALL provide filter options including: "Results Pending" (graded but not yet released), "Results Available" (grades released and viewable), and "Not Applicable" (not yet graded). | High |
| AC-06 | **Assessment Type Filter:** The system SHALL provide filter options for assessment types as defined in the system (e.g., Assignment, Quiz, Examination, Project, Practical) to allow categorisation-based filtering. | Medium |
| AC-07 | **Data Privacy Enforcement:** The system SHALL enforce data privacy by ensuring students can ONLY view and filter their own assessment records. Under no circumstances SHALL a student's filter results include another student's submissions, grades, or personal data. | Critical |
| AC-08 | **Real-Time Filter Updates:** The system SHALL update the displayed results in real-time (within 500 milliseconds) as filter criteria are modified, without requiring a manual refresh or submission action. | High |
| AC-09 | **Reset/Clear Filter Function:** The system SHALL provide a clearly labelled "Reset Filters" button that clears ALL active filter criteria and restores the default unfiltered view in a single user action. | High |
| AC-10 | **Filter State Persistence:** The system SHALL maintain the student's active filter selections during the current session. Filter states MAY be cleared upon logout or session expiration. | Low |

---

## 4. Filter Options Specification

### 4.1 Filter Categories

The following table defines all available filter options aligned with the AMS workflow:

| Filter Category | Filter Type | Options / Values | Default State |
|----------------|-------------|------------------|---------------|
| **Course** | Single/Multi-Select Dropdown | List of enrolled courses | All Courses |
| **Assessment Status** | Checkbox Group | ☐ Not Submitted, ☐ Submitted (Pending), ☐ Graded | All Selected |
| **Due Date Range** | Date Range Picker | Start Date — End Date | No restriction |
| **Submission Date Range** | Date Range Picker | Start Date — End Date | No restriction |
| **Results Release Status** | Checkbox Group | ☐ Results Available, ☐ Results Pending, ☐ Not Applicable | All Selected |
| **Assessment Type** | Multi-Select Dropdown | Assignment, Quiz, Examination, Project, Practical, Other | All Types |

### 4.2 Filter Logic

- **AND Logic:** Filters across different categories are combined using AND logic (e.g., Course = "Mathematics" AND Status = "Submitted" returns only submitted Mathematics assessments).
- **OR Logic:** Multiple selections within the same category use OR logic (e.g., Status = "Submitted" OR "Graded" returns all submitted and graded assessments).
- **Empty Results Handling:** When no assessments match the applied filters, the system SHALL display a clear message: "No assessments match your filter criteria. Try adjusting your filters or click 'Reset Filters' to view all assessments."

---

## 5. Data Privacy Rules

### 5.1 Access Control Requirements

The Student Filter feature adheres to strict data privacy principles to protect student information:

| Rule ID | Privacy Rule | Implementation |
|---------|--------------|----------------|
| PR-01 | **Row-Level Security (RLS):** All database queries SHALL be filtered at the database level using RLS policies to ensure students can only access their own records. | Supabase RLS policies on `submissions`, `grades`, and related tables |
| PR-02 | **User Context Validation:** Every filter query SHALL validate the authenticated user's identity and restrict results to records where `student_id` matches the authenticated user's profile ID. | Server-side validation via `auth.uid()` |
| PR-03 | **No Cross-Student Data Leakage:** Filter operations SHALL NOT expose aggregate data, metadata, or any information that could reveal other students' submissions, grades, or performance. | Query isolation and result sanitisation |
| PR-04 | **Audit Logging:** Filter operations on sensitive grade data MAY be logged for security auditing purposes. | Optional audit trail implementation |

### 5.2 Technical Implementation

```sql
-- Example RLS Policy for Student Submissions View
CREATE POLICY "students_view_own_submissions"
ON submissions FOR SELECT
TO authenticated
USING (
    student_id = auth.uid()
);

-- Example RLS Policy for Student Grades View  
CREATE POLICY "students_view_own_grades"
ON grades FOR SELECT
TO authenticated
USING (
    student_id = auth.uid()
    AND is_released = true
);
```

---

## 6. Reset/Clear Filter Behaviour

### 6.1 Reset Functionality Specification

| Behaviour | Description |
|-----------|-------------|
| **Trigger:** | User clicks the "Reset Filters" button |
| **Action:** | All filter inputs are cleared and restored to default values |
| **Result:** | The assessment list displays all assessments without any filter restrictions |
| **Visual Feedback:** | A brief toast notification confirms: "Filters have been reset" |
| **State Reset:** | All checkboxes return to default, date pickers are cleared, dropdowns reset to "All" |

### 6.2 Individual Filter Clear

Each filter category SHALL include an individual clear option (×) allowing students to remove a specific filter without affecting other active filters.

### 6.3 Default State Definition

| Filter | Default Value |
|--------|---------------|
| Course | All enrolled courses |
| Assessment Status | All statuses (Not Submitted, Submitted, Graded) |
| Due Date Range | No date restriction (all dates) |
| Submission Date Range | No date restriction (all dates) |
| Results Release Status | All statuses |
| Assessment Type | All types |

---

## 7. Real-Time Update Behaviour

### 7.1 Update Mechanism

The Student Filter feature implements real-time updates to provide immediate visual feedback:

| Aspect | Specification |
|--------|---------------|
| **Update Trigger:** | Any change to filter criteria (selection, deselection, date change) |
| **Response Time:** | Results SHALL update within 500 milliseconds of user interaction |
| **Loading Indicator:** | A subtle loading spinner SHALL appear during data fetching |
| **Debouncing:** | Text-based inputs (if any) SHALL implement 300ms debounce to prevent excessive queries |
| **Optimistic UI:** | Filter UI elements remain responsive during data fetching |

### 7.2 Implementation Approach

```typescript
// Debounced filter update implementation
const debouncedFilterUpdate = useMemo(
    () => debounce((filters: FilterState) => {
        fetchFilteredAssessments(filters);
    }, 300),
    []
);

// Real-time subscription for grade releases
useEffect(() => {
    const subscription = supabase
        .channel('grade-updates')
        .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'grades',
            filter: `student_id=eq.${userId}`
        }, (payload) => {
            // Refresh filtered results when grades are updated
            refetchAssessments();
        })
        .subscribe();
    
    return () => subscription.unsubscribe();
}, [userId]);
```

### 7.3 Performance Considerations

- **Indexed Queries:** Database queries utilise indexed columns (`course_id`, `student_id`, `due_date`, `status`) for optimal performance.
- **Pagination:** Large result sets are paginated (default: 20 items per page) to maintain responsiveness.
- **Caching:** Recently fetched filter results MAY be cached client-side to reduce redundant queries.

---

## 8. User Interface Wireframe

```
┌─────────────────────────────────────────────────────────────────────────┐
│  MY ASSESSMENTS                                           [Reset Filters]│
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────┐ ┌──────────────────┐ ┌──────────────────────────────┐ │
│  │ Course    ▼  │ │ Assessment Type ▼│ │ Due Date: [Start] to [End]  │ │
│  └──────────────┘ └──────────────────┘ └──────────────────────────────┘ │
│                                                                          │
│  Status:  ☑ Not Submitted  ☑ Submitted  ☑ Graded                        │
│  Results: ☑ Available  ☑ Pending  ☑ N/A                                 │
│                                                                          │
│  Active Filters: [Mathematics ×] [Due: Jan 2026 ×] [Status: Submitted ×]│
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Showing 12 of 45 assessments                                           │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │ 📝 Assignment 1: Data Analysis        Mathematics     Due: Feb 5    ││
│  │    Status: Not Submitted              Type: Assignment              ││
│  └─────────────────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │ 📝 Quiz 3: Statistical Methods        Mathematics     Due: Jan 28   ││
│  │    Status: Graded (85%)               Results: Available            ││
│  └─────────────────────────────────────────────────────────────────────┘│
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 9. Workflow Integration

The Student Filter feature integrates with the AMS core workflow as follows:

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ ASSESSMENTS │ ──▶ │ SUBMISSION  │ ──▶ │   GRADING   │ ──▶ │   RESULTS   │
│   Created   │     │  Uploaded   │     │  Completed  │     │  Released   │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
       │                   │                   │                   │
       ▼                   ▼                   ▼                   ▼
  Filter Status:      Filter Status:      Filter Status:      Filter Status:
  "Not Submitted"     "Submitted"         "Graded"            "Results Available"
```

---

## 10. Summary

The Student Filter feature enhances the student experience within the EduConnect Assessment Marking System by providing intuitive, real-time filtering capabilities. Through strict data privacy enforcement, responsive interface design, and seamless workflow integration, students can efficiently manage their academic responsibilities while maintaining the security and integrity of their personal academic records.

---

**Document End**
