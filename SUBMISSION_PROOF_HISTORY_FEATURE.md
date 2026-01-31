# Submission Proof & History Feature

## EduConnect Assessment Marking System (AMS)

**Document Version:** 1.0  
**Date:** 31 January 2026  
**Author:** Development Team  
**Status:** Design Complete

---

## 1. Feature Overview

The Submission Proof & History feature provides students with a secure, auditable record of all their assessment submissions. Students can view submission receipts, track attempt history, and confirm successful uploads with tamper-proof evidence. This feature integrates with the deadline reminder system to automatically cease notifications upon confirmed submission.

---

## 2. Refined User Story

### Primary User Story (Student)

> **As a** student enrolled in one or more courses,  
> **I want to** receive proof of my submissions and view my complete submission history,  
> **So that I** have auditable evidence of on-time submission, can track my attempts against assessment policies, and have confidence that my work was successfully received.

### Supporting User Stories

> **As a** student submitting an assessment,  
> **I want to** receive an immediate confirmation receipt with a unique reference number,  
> **So that I** have verifiable proof of submission for academic integrity purposes.

> **As a** student reviewing my submission history,  
> **I want to** see all my submission attempts with timestamps and status indicators,  
> **So that I** can verify which version is being graded and understand my remaining attempts.

> **As a** student who has submitted an assessment,  
> **I want** deadline reminders to stop automatically,  
> **So that I** am not unnecessarily notified about completed work.

---

## 3. Acceptance Criteria

### AC-1: Authentication Required
- **Given** an unauthenticated user attempts to access submission history
- **When** they navigate to the submissions page or attempt to view receipts
- **Then** they are redirected to the login page with a return URL preserved
- **And** only authenticated students can view their own submission records

### AC-2: Submission Receipt Generation
- **Given** a student successfully submits an assessment file
- **When** the upload completes and is recorded in the database
- **Then** a submission receipt is generated containing:
  - Unique submission reference ID (format: `SUB-YYYYMMDD-XXXXXX`)
  - Student name and ID
  - Assessment title and course code
  - Submission timestamp (UTC and local time)
  - File name and file size
  - SHA-256 file hash for integrity verification
- **And** the receipt can be downloaded as a PDF or printed

### AC-3: Accurate Timestamps
- **Given** a student submits an assessment at any time
- **When** the submission is recorded
- **Then** the system captures:
  - Server-side UTC timestamp (authoritative)
  - Displayed local time based on student's timezone preference
  - Relative time indicator (e.g., "2 hours before deadline")
- **And** timestamps are immutable once recorded
- **And** all times are displayed consistently across the application

### AC-4: File Name and Version Tracking
- **Given** a student makes multiple submission attempts
- **When** each file is uploaded
- **Then** the system records:
  - Original file name as uploaded
  - File type/extension validation
  - File size in human-readable format
  - Version number (Attempt 1, Attempt 2, etc.)
  - Storage path reference (internal, not exposed to user)
- **And** file metadata is displayed in the submission history

### AC-5: Latest Submission Indication
- **Given** a student has made multiple submission attempts
- **When** they view their submission history for an assessment
- **Then** the most recent submission is clearly marked as "Latest" or "Current"
- **And** a visual indicator (badge, icon, highlight) distinguishes it from previous attempts
- **And** the grading status reflects the latest submission only
- **And** students understand which version will be graded

### AC-6: Submission Status (On-Time/Late)
- **Given** an assessment has a defined due date
- **When** a student submits before, on, or after the deadline
- **Then** the submission is marked with status:
  - **On-Time**: Submitted before due date (green indicator)
  - **Late**: Submitted after due date (orange/red indicator with time elapsed)
  - **Grace Period**: If applicable, shows within grace window (yellow indicator)
- **And** late submissions display the duration past deadline
- **And** status is determined by server timestamp, not client time

### AC-7: View Allowed Attempts
- **Given** an assessment has an attempt policy (e.g., max 3 attempts)
- **When** a student views the assessment submission page
- **Then** they see:
  - Total allowed attempts (from assessment configuration)
  - Attempts used (count of submissions made)
  - Remaining attempts available
  - Visual progress indicator (e.g., "2 of 3 attempts used")
- **And** if no attempt limit exists, display "Unlimited attempts"
- **And** submission is blocked with clear message when limit is reached

### AC-8: Immutable Submission Records
- **Given** a submission has been recorded in the system
- **When** a student views their submission history
- **Then** they cannot edit, delete, or modify any submission records
- **And** all edit/delete controls are hidden from student interface
- **And** API endpoints reject any modification requests from students
- **And** database RLS policies enforce read-only access for students
- **And** audit trail maintains complete history of all submissions

### AC-9: Reminder System Integration
- **Given** a student has active deadline reminders for an assessment
- **When** they successfully submit the assessment
- **Then** pending reminders for that assessment are automatically cancelled
- **And** no further reminder notifications are sent for that assessment
- **And** the reminder status updates to "Completed - Submitted"
- **And** if the submission is deleted (by instructor), reminders may resume

### AC-10: Submission History View
- **Given** a student navigates to their submission history
- **When** the page loads
- **Then** they see a chronological list of all submissions containing:
  - Assessment name and course
  - Submission date/time
  - File name and size
  - Attempt number
  - Status (on-time/late)
  - Latest indicator where applicable
  - Link to view/download receipt
- **And** the list supports filtering by course and date range
- **And** the list supports sorting by date, course, or status

### AC-11: Receipt Download and Verification
- **Given** a student wants proof of submission
- **When** they click "Download Receipt" for any submission
- **Then** a PDF receipt is generated containing all submission details
- **And** the receipt includes a QR code linking to verification endpoint
- **And** instructors/administrators can verify receipt authenticity
- **And** receipt generation is logged for audit purposes

### AC-12: Real-Time Submission Confirmation
- **Given** a student is on the submission page
- **When** they upload and submit a file
- **Then** they receive immediate visual confirmation:
  - Success animation/indicator
  - Toast notification with submission ID
  - Updated submission history (real-time)
  - Option to view receipt immediately
- **And** if submission fails, clear error message with retry option
- **And** duplicate submission within seconds is prevented

---

## 4. Technical Requirements

### Database Schema Enhancements

```sql
-- Submissions table enhancements
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS
  submission_reference VARCHAR(20) UNIQUE,  -- SUB-YYYYMMDD-XXXXXX
  file_hash VARCHAR(64),                     -- SHA-256 hash
  file_size_bytes BIGINT,
  attempt_number INTEGER DEFAULT 1,
  is_latest BOOLEAN DEFAULT TRUE,
  submission_status VARCHAR(20),             -- on_time, late, grace_period
  late_duration INTERVAL,
  receipt_generated_at TIMESTAMPTZ,
  client_timezone VARCHAR(50);

-- Function to generate unique submission reference
CREATE OR REPLACE FUNCTION generate_submission_reference()
RETURNS TRIGGER AS $$
BEGIN
  NEW.submission_reference := 'SUB-' || 
    TO_CHAR(NOW(), 'YYYYMMDD') || '-' ||
    UPPER(SUBSTR(MD5(RANDOM()::TEXT), 1, 6));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### RLS Policies

```sql
-- Students can only read their own submissions
CREATE POLICY "students_read_own_submissions" ON submissions
  FOR SELECT
  USING (student_id = auth.uid());

-- Students cannot update or delete submissions
CREATE POLICY "students_cannot_modify_submissions" ON submissions
  FOR UPDATE
  USING (FALSE);

CREATE POLICY "students_cannot_delete_submissions" ON submissions
  FOR DELETE
  USING (FALSE);
```

### Reminder Integration

```sql
-- Update reminder status when submission is made
CREATE OR REPLACE FUNCTION cancel_reminders_on_submission()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE deadline_reminders
  SET status = 'cancelled',
      cancelled_reason = 'assessment_submitted',
      updated_at = NOW()
  WHERE assessment_id = NEW.assessment_id
    AND student_id = NEW.student_id
    AND status = 'pending';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_cancel_reminders_on_submission
  AFTER INSERT ON submissions
  FOR EACH ROW
  EXECUTE FUNCTION cancel_reminders_on_submission();
```

---

## 5. UI Components

### Submission History Tab
- Filterable list of all submissions
- Expandable rows showing full details
- Receipt download buttons
- Status badges with colour coding

### Submission Confirmation Modal
- Success/failure indication
- Submission reference display
- Receipt preview
- "View History" navigation

### Receipt PDF Template
- University/system branding
- All submission metadata
- QR code for verification
- Timestamp and signature

---

## 6. Integration Points

| System | Integration |
|--------|-------------|
| **Deadline Reminders** | Cancel pending reminders on submission |
| **Notifications** | Send confirmation notification on submit |
| **Grades Dashboard** | Link submissions to grades when released |
| **Assessment Filter** | Show submission status in filtered results |
| **Student Calendar** | Update event status when submitted |

---

## 7. Security Considerations

- **Immutability**: Students cannot modify submission records
- **Audit Trail**: All actions logged with timestamps
- **File Integrity**: SHA-256 hash ensures file wasn't altered
- **Authentication**: All endpoints require valid session
- **Authorization**: RLS enforces student-only access to own data
- **Receipt Verification**: Signed receipts can be validated

---

## 8. Success Metrics

| Metric | Target |
|--------|--------|
| Receipt generation success rate | 99.9% |
| Time to generate receipt | < 2 seconds |
| Student satisfaction with proof system | > 90% |
| Disputes resolved with receipt evidence | 100% |
| False "late" status reports | 0% |

---

## 9. Out of Scope

- Instructor-side submission management (separate feature)
- Bulk submission downloads
- Submission similarity/plagiarism detection
- Grade appeals workflow
- External LMS integration

---

*Document approved for implementation.*
