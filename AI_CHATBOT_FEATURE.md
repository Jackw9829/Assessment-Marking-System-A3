# AI-Powered Student Support Chatbot Feature Design

## EduConnect Assessment Marking System (AMS)

**Document Version:** 1.0  
**Date:** 31 January 2026  
**Author:** System Analyst  
**Status:** Design Specification

---

## 1. Executive Summary

This document specifies the design of an AI-powered chatbot feature for the EduConnect Assessment Marking System (AMS). The chatbot provides students with immediate, self-service support for assessment-related queries, reducing dependency on staff availability while maintaining strict data privacy and system integrity boundaries.

---

## 2. User Story

### 2.1 Original User Story

> As a student, I want to use an AI chatbot to ask questions about assessments and deadlines so that I can get quick support without waiting for staff.

### 2.2 Refined User Story

> **As an authenticated student** enrolled in the EduConnect AMS, **I want to interact with an AI-powered support chatbot** that can answer my questions about assessment instructions, deadlines, grading criteria, and submission procedures, **so that I can receive immediate, accurate guidance** without waiting for staff availability, while being confident that my personal academic data remains private and that the chatbot operates within clearly defined support boundaries.

### 2.3 Story Decomposition

| Sub-Story ID | Description |
|--------------|-------------|
| US-CB-01 | As a student, I want to ask about assessment deadlines so I can plan my workload |
| US-CB-02 | As a student, I want to understand grading criteria so I know what is expected |
| US-CB-03 | As a student, I want submission guidance so I can submit correctly |
| US-CB-04 | As a student, I want navigation help so I can find the right pages in AMS |
| US-CB-05 | As a student, I want to escalate complex issues to staff when the chatbot cannot help |

---

## 3. Feature Scope

### 3.1 In Scope

| Category | Capabilities |
|----------|--------------|
| **Assessment Information** | Instructions, requirements, weightings, allowed file types |
| **Deadline Queries** | Due dates, time remaining, late submission policies |
| **Grading Criteria** | Rubric explanations, marking schemes, grade boundaries |
| **Submission Guidance** | How to submit, file format requirements, resubmission rules |
| **Navigation Assistance** | Direct links to relevant AMS pages and features |
| **General Support** | FAQ responses, policy explanations, process guidance |
| **Escalation** | Support ticket creation for unresolved queries |

### 3.2 Out of Scope (Explicit Limitations)

| Limitation | Rationale |
|------------|-----------|
| **Cannot submit assessments** | Submissions require explicit student action and file upload |
| **Cannot modify grades** | Grade integrity must be maintained by authorised staff only |
| **Cannot change deadlines** | Academic policy decisions require staff authorisation |
| **Cannot access other students' data** | Strict data privacy and RLS enforcement |
| **Cannot override system policies** | Business rules are immutable by conversational interface |
| **Cannot provide unofficial grade predictions** | Only released, verified grades are authoritative |

---

## 4. Acceptance Criteria

The following acceptance criteria define the testable conditions for successful implementation of the AI Chatbot feature.

### AC-01: Authentication Required

**Given** a user is not authenticated  
**When** they attempt to access the chatbot interface  
**Then** they shall be redirected to the login page with a message indicating authentication is required

**Verification:** Attempt chatbot access without valid session token; confirm redirect to `/auth`

---

### AC-02: Chatbot Availability on Student Pages

**Given** an authenticated student is on any student dashboard page  
**When** the page loads  
**Then** a chatbot widget shall be visible and accessible (floating button or sidebar panel)

**Verification:** Navigate to Materials, Assessments, Submissions, Grades, Calendar, and Transcript tabs; confirm chatbot presence on all pages

---

### AC-03: Assessment Instruction Queries

**Given** a student asks about a specific assessment's instructions or requirements  
**When** the chatbot processes the query  
**Then** it shall retrieve and display the assessment description, requirements, allowed file types, and total marks from the published assessment data

**Verification:** Ask "What are the requirements for Assignment 1?"; confirm accurate retrieval from `assessments` table

---

### AC-04: Deadline and Due Date Queries

**Given** a student asks about assessment deadlines  
**When** the chatbot processes the query  
**Then** it shall display:
- The due date and time in the student's local timezone
- Time remaining until deadline (days, hours, minutes)
- Whether the deadline has passed
- Late submission policy if applicable

**Verification:** Ask "When is the Web Development project due?"; confirm timezone-aware response with countdown

---

### AC-05: Grading Criteria and Rubric Queries

**Given** a student asks about how an assessment will be graded  
**When** the chatbot processes the query  
**Then** it shall retrieve and explain:
- The rubric components and their weightings
- Grade boundaries (HD: 85-100%, D: 75-84%, etc.)
- Specific criteria descriptions if available

**Verification:** Ask "How will Assignment 2 be marked?"; confirm rubric component retrieval from `rubric_templates` and `rubric_components`

---

### AC-06: Submission Guidance

**Given** a student asks how to submit an assessment  
**When** the chatbot processes the query  
**Then** it shall provide step-by-step guidance including:
- Navigation path to the submission page
- Accepted file formats and size limits
- Number of attempts allowed (if applicable)
- A direct link to the Submissions tab

**Verification:** Ask "How do I submit my assignment?"; confirm actionable guidance with navigation link

---

### AC-07: Navigation Links to AMS Features

**Given** a student asks for help finding a feature  
**When** the chatbot identifies the relevant page  
**Then** it shall provide a clickable navigation link that opens the correct tab or page within the AMS

**Verification:** Ask "Where can I see my grades?"; confirm link navigates to Grades Dashboard tab

---

### AC-08: Fallback Response for Unsupported Queries

**Given** a student asks a question outside the chatbot's knowledge base  
**When** the chatbot cannot provide a confident answer  
**Then** it shall:
- Acknowledge that it cannot answer the specific question
- Suggest rephrasing or provide related topics it can help with
- Offer to create a support ticket for staff follow-up

**Verification:** Ask an unrelated question (e.g., "What is the cafeteria menu?"); confirm graceful fallback with escalation option

---

### AC-09: Support Ticket Escalation

**Given** the chatbot cannot resolve a student's query  
**When** the student requests human support or accepts the escalation offer  
**Then** the system shall:
- Create a support ticket with the conversation context
- Provide a ticket reference number to the student
- Notify relevant staff of the pending ticket
- Confirm successful ticket creation to the student

**Verification:** Trigger fallback, accept escalation; confirm ticket creation in database with conversation metadata

---

### AC-10: Data Privacy - Own Data Only

**Given** a student interacts with the chatbot  
**When** the chatbot retrieves contextual data  
**Then** it shall only access data that the authenticated student is authorised to view:
- Assessments from enrolled courses only
- Own submissions and grades only
- No access to other students' data under any circumstances

**Verification:** Attempt to query another student's grades via prompt injection; confirm denial and no data leakage

---

### AC-11: Read-Only Operation Mode

**Given** a student issues any command to the chatbot  
**When** the command would require data modification  
**Then** the chatbot shall:
- Refuse to perform the action
- Explain that it provides guidance only
- Direct the student to the appropriate interface for the action

**Verification:** Ask "Submit my assignment for me" or "Change my deadline"; confirm refusal with helpful redirect

---

### AC-12: Conversation Context and History

**Given** a student is engaged in a multi-turn conversation  
**When** they ask a follow-up question  
**Then** the chatbot shall maintain conversation context within the session to provide coherent responses

**Given** a student closes and reopens the chatbot  
**When** the session ends  
**Then** conversation history shall not persist beyond the session (privacy by design)

**Verification:** Ask follow-up questions; confirm context retention. Close/reopen chatbot; confirm history cleared

---

## 5. Data Privacy Rules

### 5.1 Privacy Principles

| Principle | Implementation |
|-----------|----------------|
| **Data Minimisation** | Chatbot retrieves only the minimum data required to answer the specific query |
| **Purpose Limitation** | Retrieved data is used solely for generating the response, not stored or logged beyond session |
| **Access Control** | All data retrieval respects existing RLS policies; no privilege escalation |
| **No PII Exposure** | Chatbot never displays other students' names, emails, IDs, or academic records |
| **Conversation Ephemeral** | Chat history is not persisted after session ends; no long-term storage of queries |

### 5.2 Prohibited Data Access

The chatbot shall **never** retrieve, display, or reference:

- Other students' personal information
- Other students' submissions, grades, or academic records
- Staff personal contact information beyond official channels
- System credentials, API keys, or internal configuration
- Unreleased grades or pending assessment results
- Administrative logs or audit trails

### 5.3 Prompt Injection Mitigation

| Threat | Mitigation |
|--------|------------|
| User attempts to impersonate another student | All queries execute with authenticated user's RLS context |
| User attempts to access system prompts | System prompts are server-side only, never returned to client |
| User attempts SQL injection via natural language | Parameterised queries; no raw SQL from user input |
| User attempts to modify behaviour via prompt | Clear system boundaries; modifier commands are ignored |

---

## 6. Technical Constraints

### 6.1 Read-Only Limitation

**The chatbot is strictly a guidance and information retrieval system.** It shall:

- ✅ READ assessment data, deadlines, rubrics
- ✅ READ the student's own submissions and grades (if released)
- ✅ GENERATE navigation links to action pages
- ✅ CREATE support tickets (append-only, student-initiated)
- ❌ NEVER submit assessments on behalf of students
- ❌ NEVER modify grades, deadlines, or academic records
- ❌ NEVER delete or alter any existing data
- ❌ NEVER bypass authentication or authorisation

### 6.2 System Integration Points

| AMS Component | Chatbot Interaction |
|---------------|---------------------|
| **Assessments** | Read title, description, due date, total marks, type |
| **Rubrics** | Read rubric templates and component weightings |
| **Submissions** | Read own submission status, attempt count (no file access) |
| **Grades** | Read own released grades only (respects `is_released` flag) |
| **Course Enrollments** | Verify enrollment to scope assessment visibility |
| **Notifications** | Optionally create chatbot-sourced notifications |
| **Support Tickets** | Create new tickets with conversation context |

---

## 7. User Interface Specifications

### 7.1 Chatbot Widget

| Element | Specification |
|---------|---------------|
| **Trigger Button** | Floating action button (bottom-right), icon: `MessageCircle` or `Bot` |
| **Panel Type** | Slide-out drawer or modal dialog |
| **Input Method** | Text input field with send button; optional voice input |
| **Message Display** | Scrollable conversation thread with clear user/bot distinction |
| **Typing Indicator** | Animated indicator when bot is processing |
| **Quick Actions** | Suggested query buttons for common topics |

### 7.2 Response Formatting

| Response Type | Format |
|---------------|--------|
| **Text Answers** | Markdown-formatted prose |
| **Lists** | Bulleted or numbered lists |
| **Deadlines** | Highlighted with countdown badge |
| **Navigation Links** | Clickable buttons that trigger tab navigation |
| **Warnings** | Amber alert styling for limitations or errors |
| **Success Confirmations** | Green styling for ticket creation, etc. |

---

## 8. Error Handling

| Scenario | Response |
|----------|----------|
| **Network Error** | "I'm having trouble connecting. Please try again in a moment." |
| **AI Service Unavailable** | "The support assistant is temporarily unavailable. Please contact staff directly." |
| **Rate Limit Exceeded** | "You've sent many messages quickly. Please wait a moment before continuing." |
| **Invalid Assessment Reference** | "I couldn't find that assessment. Please check the name or browse your assessments." |
| **Permission Denied** | "I can only access information from courses you're enrolled in." |

---

## 9. Audit and Monitoring

### 9.1 Logged Events (Anonymised)

| Event | Data Captured |
|-------|---------------|
| **Session Start** | Timestamp, session ID (no user ID stored with queries) |
| **Query Category** | Topic classification (deadline, rubric, submission, etc.) |
| **Response Type** | Success, fallback, or escalation |
| **Ticket Creation** | Ticket ID, timestamp (conversation content stored in ticket only) |

### 9.2 Analytics (Aggregated Only)

- Most common query categories (for FAQ improvement)
- Fallback rate (percentage of unanswered queries)
- Escalation rate (percentage requiring human support)
- Average session length

---

## 10. Alignment with AMS Workflows

| AMS Workflow | Chatbot Support |
|--------------|-----------------|
| **Assessment Publishing** | Students can query newly published assessments immediately |
| **Submission Process** | Guidance provided; actual submission via Submissions tab |
| **Grading** | Rubric explanations available; grade queries return released only |
| **Results Release** | Students can ask about grades; only `is_released = TRUE` shown |
| **Deadline Management** | Real-time countdown; no modification capability |

---

## 11. Acceptance Test Plan

| Test ID | Description | Expected Result |
|---------|-------------|-----------------|
| TC-CB-01 | Unauthenticated access attempt | Redirect to login |
| TC-CB-02 | Chatbot visible on all student tabs | Widget present |
| TC-CB-03 | Query assessment instructions | Accurate retrieval |
| TC-CB-04 | Query deadline with timezone | Correct local time |
| TC-CB-05 | Query rubric criteria | Component list returned |
| TC-CB-06 | Request submission guidance | Step-by-step with link |
| TC-CB-07 | Request navigation to Grades | Working link |
| TC-CB-08 | Ask out-of-scope question | Graceful fallback |
| TC-CB-09 | Request human support | Ticket created |
| TC-CB-10 | Attempt to view other student data | Access denied |
| TC-CB-11 | Request chatbot to submit | Refusal with guidance |
| TC-CB-12 | Multi-turn conversation | Context maintained |

---

## 12. Dependencies

| Dependency | Purpose |
|------------|---------|
| OpenAI API / Claude API | Natural language understanding and generation |
| Supabase RLS | Data access control and privacy enforcement |
| Edge Functions | Secure server-side AI API calls |
| Support Tickets Table | Escalation ticket storage |

---

## 13. Future Enhancements (Out of Scope for v1.0)

- Voice input/output support
- Proactive notifications ("Your assignment is due in 2 hours")
- Multi-language support
- Integration with email for ticket follow-ups
- Sentiment analysis for frustrated students

---

## 14. Conclusion

The AI-powered Student Support Chatbot enhances the EduConnect AMS by providing immediate, accurate, and privacy-respecting support for assessment-related queries. By operating strictly in read-only mode and respecting all existing access controls, the chatbot augments the student experience without compromising system integrity or data privacy.

---

**Document End**
