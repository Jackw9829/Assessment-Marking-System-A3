# Student Grades Dashboard Feature

## EduConnect Assessment Marking System (AMS)

**Document Version:** 1.0  
**Date:** January 31, 2026  
**Feature Category:** Student Experience Enhancement

---

## 1. Overview

The Student Grades Dashboard provides students with a comprehensive, interactive interface to view their academic performance across all enrolled courses. This feature presents grades in dual formats—tabular and graphical—enabling students to analyse their results from different perspectives. The dashboard adheres to strict data privacy principles, ensuring students can only access their own grades, and displays only grades that have been officially released by instructors.

---

## 2. User Story

### Primary User Story

> **As an** authenticated student enrolled in one or more courses,  
> **I want to** view my released grades in both table and graph formats, grouped by course and assessment,  
> **So that I can** comprehensively understand my academic performance, identify trends across assessments, and track my progress throughout the semester.

### Supporting User Stories

| ID | User Story |
|----|------------|
| US-G01 | As a student, I want to see my grades in a table format so that I can view detailed information about each assessment. |
| US-G02 | As a student, I want to see my grades visualised in graphs so that I can quickly identify performance trends and patterns. |
| US-G03 | As a student, I want to switch between table and graph views so that I can analyse my grades in my preferred format. |
| US-G04 | As a student, I want my grades grouped by course so that I can evaluate my performance in each subject separately. |
| US-G05 | As a student, I want to see only my released grades so that I am viewing official, finalised results. |
| US-G06 | As a student, I want the dashboard to update automatically when new grades are released so that I always see current information. |
| US-G07 | As a student, I want a clear message when I have no grades yet so that I understand my current status. |

---

## 3. Acceptance Criteria

The following acceptance criteria define the conditions that must be satisfied for the Student Grades Dashboard feature to be considered complete and functional:

| ID | Acceptance Criterion | Priority |
|----|---------------------|----------|
| AC-01 | **Released Grades Only:** The dashboard SHALL display only grades that have been marked as released/published by the instructor (`is_released = true`). Unreleased grades SHALL NOT be visible to students under any circumstances, ensuring students only see official, finalised results. | Critical |
| AC-02 | **Data Privacy Enforcement:** The system SHALL enforce strict data privacy by ensuring students can ONLY access their own grade records. Database queries SHALL be filtered at the Row-Level Security (RLS) layer using `auth.uid()` to prevent any cross-student data access. Under no circumstances SHALL a student view another student's grades. | Critical |
| AC-03 | **Table View Display:** The system SHALL provide a table view displaying grades with the following columns: Course Code, Assessment Title, Assessment Type, Score, Total Marks, Percentage, Grade Label (e.g., HD, D, C, P, F), Graded Date, and Feedback (expandable). The table SHALL be sortable by any column. | High |
| AC-04 | **Graph View Display:** The system SHALL provide graphical visualisations including: (a) a bar chart comparing scores across assessments, (b) a line graph showing performance trends over time, and (c) a pie/donut chart showing grade distribution by category. Users SHALL be able to filter graphs by course. | High |
| AC-05 | **View Toggle:** The system SHALL provide a clearly visible toggle or tab mechanism allowing students to switch between table view and graph view. The selected view preference MAY be persisted for the duration of the session. | High |
| AC-06 | **Course Grouping:** In table view, grades SHALL be groupable by course, with expandable/collapsible course sections. Each course section SHALL display a course summary including the number of assessments, average percentage, and overall course grade. | High |
| AC-07 | **Assessment Grouping:** Within each course, grades SHALL be organised by assessment type (Assignment, Quiz, Examination, Project, Practical) with subtotals where applicable. | Medium |
| AC-08 | **Automatic Updates:** The dashboard SHALL automatically refresh when new grades are released by instructors. Updates SHALL be reflected within 30 seconds of the grade being marked as released, utilising real-time subscription technology without requiring a manual page refresh. | Medium |
| AC-09 | **Empty State Handling:** When a student has no released grades, the system SHALL display a friendly, informative message such as: "No grades available yet. Your grades will appear here once your instructors release them." The message SHALL NOT imply an error condition. | High |
| AC-10 | **Performance Summary:** The dashboard SHALL display an aggregate performance summary including: total assessments graded, overall average percentage, highest and lowest scores, and a visual indicator (progress bar or gauge) representing overall academic standing. | Medium |

---

## 4. Data Privacy Requirements

### 4.1 Privacy Principles

The Student Grades Dashboard is designed with privacy as a foundational requirement:

| Principle | Implementation |
|-----------|----------------|
| **Data Minimisation** | Only essential grade data is retrieved and displayed |
| **Purpose Limitation** | Grade data is used solely for student self-review |
| **Access Control** | Strict authentication and authorisation checks |
| **Audit Trail** | Grade access events may be logged for security auditing |

### 4.2 Technical Privacy Controls

```sql
-- RLS Policy: Students can only view their own released grades
CREATE POLICY "students_view_own_released_grades"
ON grades FOR SELECT
TO authenticated
USING (
    -- Must be the student's own grade
    EXISTS (
        SELECT 1 FROM submissions s
        WHERE s.id = grades.submission_id
        AND s.student_id = auth.uid()
    )
    -- Grade must be released
    AND is_released = true
);
```

### 4.3 Privacy Verification Checklist

| Check | Description | Status |
|-------|-------------|--------|
| PR-01 | All grade queries filter by `student_id = auth.uid()` | Required |
| PR-02 | RLS policies enforce row-level access control | Required |
| PR-03 | API endpoints validate user authentication | Required |
| PR-04 | No aggregate data reveals other students' performance | Required |
| PR-05 | Client-side code cannot bypass server-side controls | Required |

---

## 5. View Specifications

### 5.1 Table View

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  MY GRADES                                    [Table View ▼] [Graph View]   │
├─────────────────────────────────────────────────────────────────────────────┤
│  Overall Performance: 78.5%  |  12 Assessments Graded  |  Avg: Credit      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ▼ DSA - Data Structures & Algorithms          Avg: 82%  |  4 Assessments  │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ Assessment      │ Type       │ Score │ Total │   %   │ Grade │ Date    ││
│  ├─────────────────┼────────────┼───────┼───────┼───────┼───────┼─────────┤│
│  │ Assignment 1    │ Assignment │  85   │  100  │  85%  │  HD   │ Jan 15  ││
│  │ Quiz 1          │ Quiz       │  18   │   20  │  90%  │  HD   │ Jan 22  ││
│  │ Midterm Exam    │ Exam       │  72   │  100  │  72%  │  CR   │ Feb 10  ││
│  │ Project Phase 1 │ Project    │  45   │   50  │  90%  │  HD   │ Feb 20  ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                             │
│  ▶ SNA - System & Network Administration       Avg: 75%  |  3 Assessments  │
│                                                                             │
│  ▶ MATH101 - Discrete Mathematics              Avg: 68%  |  5 Assessments  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

GRADE SCALE:  HD (85-100)  D (75-84)  CR (65-74)  P (50-64)  F (<50)
```

### 5.2 Graph View

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  MY GRADES                                    [Table View] [Graph View ▼]   │
├─────────────────────────────────────────────────────────────────────────────┤
│  Filter by Course: [All Courses ▼]                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────┐  ┌─────────────────────────────────┐  │
│  │     SCORE BY ASSESSMENT         │  │     GRADE DISTRIBUTION          │  │
│  │                                 │  │                                 │  │
│  │  100 ┤                          │  │         ┌─────┐                 │  │
│  │   90 ┤  ██      ██              │  │         │ HD  │ 33%             │  │
│  │   80 ┤  ██  ██  ██  ██          │  │    ┌────┤     │                 │  │
│  │   70 ┤  ██  ██  ██  ██  ██      │  │    │ D  │     │ 25%             │  │
│  │   60 ┤  ██  ██  ██  ██  ██      │  │    ├────┼─────┤                 │  │
│  │   50 ┤  ██  ██  ██  ██  ██  ██  │  │    │ CR │     │ 33%             │  │
│  │      └──A1──Q1──MT──P1──A2──Q2  │  │    ├────┤     │                 │  │
│  │                                 │  │    │ P  │     │  8%             │  │
│  └─────────────────────────────────┘  └─────────────────────────────────┘  │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                    PERFORMANCE TREND OVER TIME                        │  │
│  │  100% ┤                                                               │  │
│  │   80% ┤      •────•                    •────•                         │  │
│  │   60% ┤  •──•          •────•────•                                    │  │
│  │   40% ┤                                                               │  │
│  │       └──Jan──────Feb──────Mar──────Apr──────May──────Jun────────     │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Technical Specification

### 6.1 Database Query

```sql
-- Function to get student's released grades
CREATE OR REPLACE FUNCTION get_student_grades_dashboard(p_student_id UUID)
RETURNS TABLE (
    grade_id UUID,
    assessment_id UUID,
    assessment_title TEXT,
    assessment_type assessment_type,
    course_id UUID,
    course_code TEXT,
    course_title TEXT,
    score INTEGER,
    total_marks INTEGER,
    percentage NUMERIC,
    grade_label TEXT,
    feedback TEXT,
    graded_at TIMESTAMPTZ,
    released_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        g.id AS grade_id,
        a.id AS assessment_id,
        a.title AS assessment_title,
        a.assessment_type,
        c.id AS course_id,
        c.code AS course_code,
        c.title AS course_title,
        g.score,
        g.total_marks,
        ROUND((g.score::NUMERIC / g.total_marks) * 100, 1) AS percentage,
        CASE 
            WHEN (g.score::NUMERIC / g.total_marks) >= 0.85 THEN 'HD'
            WHEN (g.score::NUMERIC / g.total_marks) >= 0.75 THEN 'D'
            WHEN (g.score::NUMERIC / g.total_marks) >= 0.65 THEN 'CR'
            WHEN (g.score::NUMERIC / g.total_marks) >= 0.50 THEN 'P'
            ELSE 'F'
        END AS grade_label,
        g.feedback,
        g.graded_at,
        g.released_at
    FROM grades g
    INNER JOIN submissions s ON s.id = g.submission_id
    INNER JOIN assessments a ON a.id = s.assessment_id
    INNER JOIN courses c ON c.id = a.course_id
    WHERE 
        s.student_id = p_student_id
        AND g.is_released = true
    ORDER BY c.code, g.graded_at DESC;
END;
$$;
```

### 6.2 Grade Statistics Function

```sql
-- Function to get grade statistics for dashboard summary
CREATE OR REPLACE FUNCTION get_student_grade_statistics(p_student_id UUID)
RETURNS TABLE (
    total_assessments INTEGER,
    overall_average NUMERIC,
    highest_score INTEGER,
    highest_percentage NUMERIC,
    lowest_score INTEGER,
    lowest_percentage NUMERIC,
    grade_distribution JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH grade_data AS (
        SELECT 
            g.score,
            g.total_marks,
            ROUND((g.score::NUMERIC / g.total_marks) * 100, 1) AS pct
        FROM grades g
        INNER JOIN submissions s ON s.id = g.submission_id
        WHERE s.student_id = p_student_id AND g.is_released = true
    )
    SELECT 
        COUNT(*)::INTEGER AS total_assessments,
        ROUND(AVG(pct), 1) AS overall_average,
        MAX(score)::INTEGER AS highest_score,
        MAX(pct) AS highest_percentage,
        MIN(score)::INTEGER AS lowest_score,
        MIN(pct) AS lowest_percentage,
        jsonb_build_object(
            'HD', COUNT(*) FILTER (WHERE pct >= 85),
            'D', COUNT(*) FILTER (WHERE pct >= 75 AND pct < 85),
            'CR', COUNT(*) FILTER (WHERE pct >= 65 AND pct < 75),
            'P', COUNT(*) FILTER (WHERE pct >= 50 AND pct < 65),
            'F', COUNT(*) FILTER (WHERE pct < 50)
        ) AS grade_distribution
    FROM grade_data;
END;
$$;
```

### 6.3 Real-time Subscription

```typescript
// Subscribe to grade releases for automatic updates
useEffect(() => {
    const subscription = supabase
        .channel('grade-releases')
        .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'grades',
            filter: `is_released=eq.true`
        }, (payload) => {
            // Check if this update is for the current student
            refetchGrades();
        })
        .subscribe();

    return () => subscription.unsubscribe();
}, [studentId]);
```

### 6.4 Component Structure

```
src/app/components/
├── grades-dashboard.tsx          # Main dashboard component
├── grades-table-view.tsx         # Table view with sorting/grouping
├── grades-graph-view.tsx         # Graph visualisations
├── grade-summary-card.tsx        # Performance summary widget
├── grade-distribution-chart.tsx  # Pie/donut chart
├── performance-trend-chart.tsx   # Line chart over time
└── assessment-score-chart.tsx    # Bar chart by assessment
```

---

## 7. Grade Scale Reference

The system uses the following grade scale, consistent with Australian higher education standards:

| Grade | Label | Percentage Range | Description |
|-------|-------|------------------|-------------|
| HD | High Distinction | 85% - 100% | Outstanding performance |
| D | Distinction | 75% - 84% | Excellent performance |
| CR | Credit | 65% - 74% | Good performance |
| P | Pass | 50% - 64% | Satisfactory performance |
| F | Fail | 0% - 49% | Unsatisfactory performance |

---

## 8. Empty State Handling

### 8.1 No Grades Available

When a student has no released grades, the dashboard displays:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│                        📊 No Grades Available Yet                       │
│                                                                         │
│      Your grades will appear here once your instructors release them.   │
│                                                                         │
│      In the meantime, you can:                                          │
│      • Check your upcoming deadlines in the Calendar                    │
│      • Review your submitted assessments                                │
│      • Contact your instructor if you expect results                    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 8.2 Partial Data States

| State | Display Behaviour |
|-------|-------------------|
| No grades for a specific course | Course section hidden or shows "No grades yet" |
| Grades pending release | Not displayed; student sees only released grades |
| Graph with single data point | Display bar chart; hide trend line |

---

## 9. Accessibility Requirements

| Requirement | Implementation |
|-------------|----------------|
| **Screen Reader Support** | All charts include accessible text descriptions |
| **Keyboard Navigation** | Full keyboard access to all interactive elements |
| **Colour Contrast** | Chart colours meet WCAG AA contrast requirements |
| **Alternative Text** | Grade data available in both visual and text formats |
| **Focus Management** | Clear focus indicators for table rows and controls |

---

## 10. Performance Considerations

| Consideration | Implementation |
|---------------|----------------|
| **Lazy Loading** | Graphs rendered only when Graph View is selected |
| **Data Caching** | Grade data cached client-side for session duration |
| **Pagination** | Table view paginated for students with many grades |
| **Optimised Queries** | Indexed database queries for fast retrieval |

---

## 11. Summary

The Student Grades Dashboard feature provides students with a comprehensive, privacy-respecting interface to view and analyse their academic performance. By offering dual view modes (table and graph), course-based grouping, and automatic real-time updates, students can effectively monitor their progress and identify areas for improvement. The strict adherence to data privacy principles ensures that each student's grade information remains confidential and accessible only to them.

---

**Document End**
