// =============================================
// AI Chatbot Helper Library
// =============================================

import { supabase } from './supabase-client';

// =============================================
// TYPES
// =============================================

export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
    metadata?: {
        category?: QueryCategory;
        links?: NavigationLink[];
        isEscalation?: boolean;
        ticketReference?: string;
    };
}

export interface NavigationLink {
    label: string;
    tab: string;
    icon?: string;
}

export interface ChatbotContext {
    student_name: string | null;
    enrolled_courses: Array<{
        course_id: string;
        code: string;
        title: string;
    }>;
    assessments: Array<{
        id: string;
        title: string;
        description: string | null;
        course_code: string;
        course_title: string;
        due_date: string;
        total_marks: number;
        assessment_type: string;
        has_rubric: boolean;
    }>;
    submissions: Array<{
        assessment_id: string;
        status: string;
        attempt_number: number;
        submitted_at: string;
    }>;
    released_grades: Array<{
        assessment_title: string;
        score: number;
        total_marks: number;
        feedback: string | null;
    }>;
}

export interface SupportTicket {
    id: string;
    ticket_reference: string;
    subject: string;
    status: string;
    priority: string;
    category: string;
    created_at: string;
    updated_at: string;
    resolved_at: string | null;
}

export type QueryCategory =
    | 'deadline'
    | 'assessment_info'
    | 'rubric'
    | 'submission_help'
    | 'grades'
    | 'navigation'
    | 'general'
    | 'unknown';

export type ResponseType = 'success' | 'fallback' | 'escalation';

// =============================================
// CONSTANTS
// =============================================

export const QUICK_ACTIONS = [
    { label: 'View my deadlines', query: 'What are my upcoming deadlines?' },
    { label: 'How to submit', query: 'How do I submit an assignment?' },
    { label: 'Check my grades', query: 'Where can I see my grades?' },
    { label: 'Grading criteria', query: 'How will my work be graded?' },
];

export const NAVIGATION_MAP: Record<string, NavigationLink> = {
    materials: { label: 'Learning Materials', tab: 'materials' },
    assessments: { label: 'Assessments', tab: 'assessments' },
    calendar: { label: 'Calendar', tab: 'calendar' },
    filter: { label: 'Assessment Filter', tab: 'filter' },
    submissions: { label: 'Submissions', tab: 'submission-history' },
    grades: { label: 'Grades Dashboard', tab: 'grades-dashboard' },
    transcript: { label: 'Transcript', tab: 'transcript' },
    deadlines: { label: 'Deadlines', tab: 'deadlines' },
};

// =============================================
// API FUNCTIONS
// =============================================

/**
 * Fetch chatbot context data for the current student
 */
export async function getChatbotContext(): Promise<ChatbotContext | null> {
    try {
        const { data, error } = await (supabase as any).rpc('get_chatbot_context');

        if (error) {
            console.error('Error fetching chatbot context:', error);
            return null;
        }

        return data as ChatbotContext;
    } catch (error) {
        console.error('Error in getChatbotContext:', error);
        return null;
    }
}

/**
 * Create a support ticket for escalation
 */
export async function createSupportTicket(
    subject: string,
    category: string,
    conversationContext: ChatMessage[]
): Promise<{ success: boolean; reference?: string; error?: string }> {
    try {
        // Sanitise conversation for storage (remove system messages)
        const sanitisedConversation = conversationContext
            .filter(m => m.role !== 'system')
            .map(m => ({
                role: m.role,
                content: m.content,
                timestamp: m.timestamp.toISOString(),
            }));

        const { data, error } = await (supabase as any).rpc('create_support_ticket', {
            p_subject: subject,
            p_category: category,
            p_conversation_context: sanitisedConversation,
        });

        if (error) {
            console.error('Error creating support ticket:', error);
            return { success: false, error: error.message };
        }

        if (data?.success) {
            return { success: true, reference: data.reference };
        }

        return { success: false, error: data?.error || 'Unknown error' };
    } catch (error) {
        console.error('Error in createSupportTicket:', error);
        return { success: false, error: 'Failed to create ticket' };
    }
}

/**
 * Get student's support tickets
 */
export async function getStudentTickets(): Promise<SupportTicket[]> {
    try {
        const { data, error } = await (supabase as any).rpc('get_student_tickets');

        if (error) {
            console.error('Error fetching tickets:', error);
            return [];
        }

        return data || [];
    } catch (error) {
        console.error('Error in getStudentTickets:', error);
        return [];
    }
}

/**
 * Log chatbot analytics (anonymised)
 */
export async function logChatbotQuery(
    sessionId: string,
    category: QueryCategory,
    responseType: ResponseType
): Promise<void> {
    try {
        await (supabase as any).rpc('log_chatbot_query', {
            p_session_id: sessionId,
            p_category: category,
            p_response_type: responseType,
        });
    } catch (error) {
        // Silently fail - analytics should not break UX
        console.error('Error logging chatbot query:', error);
    }
}

// =============================================
// QUERY CLASSIFICATION
// =============================================

/**
 * Classify a user query into a category
 */
export function classifyQuery(query: string): QueryCategory {
    const lowerQuery = query.toLowerCase();

    // Deadline-related
    if (/deadline|due|when.*due|due.*date|time.*left|countdown/i.test(lowerQuery)) {
        return 'deadline';
    }

    // Assessment info
    if (/what.*assignment|requirements|instructions|description|about.*assessment/i.test(lowerQuery)) {
        return 'assessment_info';
    }

    // Rubric/grading criteria
    if (/rubric|grading criteria|how.*graded|how.*marked|marking|criteria|weight/i.test(lowerQuery)) {
        return 'rubric';
    }

    // Submission help
    if (/submit|upload|how.*submit|submission|file.*type|file.*format|resubmit/i.test(lowerQuery)) {
        return 'submission_help';
    }

    // Grades
    if (/grade|score|result|marks|feedback|released/i.test(lowerQuery)) {
        return 'grades';
    }

    // Navigation
    if (/where.*find|how.*get.*to|navigate|show.*me|take.*me/i.test(lowerQuery)) {
        return 'navigation';
    }

    // General queries that might be answerable
    if (/help|support|question|can.*you|what.*can/i.test(lowerQuery)) {
        return 'general';
    }

    return 'unknown';
}

// =============================================
// RESPONSE GENERATION
// =============================================

/**
 * Generate a unique message ID
 */
export function generateMessageId(): string {
    return `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Generate a session ID for analytics
 */
export function generateSessionId(): string {
    return crypto.randomUUID();
}

/**
 * Format a deadline with countdown
 */
export function formatDeadlineWithCountdown(dueDate: string): string {
    const due = new Date(dueDate);
    const now = new Date();
    const diffMs = due.getTime() - now.getTime();

    if (diffMs < 0) {
        const overdue = formatDuration(Math.abs(diffMs));
        return `**OVERDUE** by ${overdue}`;
    }

    const remaining = formatDuration(diffMs);
    return `${due.toLocaleDateString('en-AU', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    })} (**${remaining} remaining**)`;
}

function formatDuration(ms: number): string {
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));
    const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));

    const parts = [];
    if (days > 0) parts.push(`${days} day${days !== 1 ? 's' : ''}`);
    if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
    if (minutes > 0 && days === 0) parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);

    return parts.join(', ') || 'less than a minute';
}

/**
 * Generate response for deadline queries
 */
export function generateDeadlineResponse(context: ChatbotContext): string {
    const now = new Date();
    const upcoming = context.assessments
        .filter(a => new Date(a.due_date) > now)
        .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());

    if (upcoming.length === 0) {
        return "You don't have any upcoming deadlines. All your assessments are either past due or not yet published.";
    }

    let response = "Here are your upcoming deadlines:\n\n";

    for (const assessment of upcoming.slice(0, 5)) {
        response += `**${assessment.title}** (${assessment.course_code})\n`;
        response += `📅 ${formatDeadlineWithCountdown(assessment.due_date)}\n\n`;
    }

    if (upcoming.length > 5) {
        response += `\n...and ${upcoming.length - 5} more. Check the Calendar tab for the full list.`;
    }

    return response;
}

/**
 * Generate response for assessment info queries
 */
export function generateAssessmentInfoResponse(
    query: string,
    context: ChatbotContext
): string {
    // Try to find the specific assessment mentioned
    const assessment = findMatchingAssessment(query, context.assessments);

    if (!assessment) {
        // List all assessments
        if (context.assessments.length === 0) {
            return "You don't have any assessments in your enrolled courses yet.";
        }

        let response = "I couldn't identify a specific assessment. Here are your current assessments:\n\n";
        for (const a of context.assessments) {
            response += `- **${a.title}** (${a.course_code}) - Due: ${new Date(a.due_date).toLocaleDateString()}\n`;
        }
        response += "\nPlease specify which assessment you'd like to know more about.";
        return response;
    }

    let response = `## ${assessment.title}\n\n`;
    response += `**Course:** ${assessment.course_code} - ${assessment.course_title}\n`;
    response += `**Type:** ${formatAssessmentType(assessment.assessment_type)}\n`;
    response += `**Total Marks:** ${assessment.total_marks}\n`;
    response += `**Due Date:** ${formatDeadlineWithCountdown(assessment.due_date)}\n\n`;

    if (assessment.description) {
        response += `**Description:**\n${assessment.description}\n\n`;
    }

    if (assessment.has_rubric) {
        response += "📋 This assessment has a rubric available. Ask me about grading criteria for details.";
    }

    return response;
}

/**
 * Generate response for submission help queries
 */
export function generateSubmissionHelpResponse(context: ChatbotContext): string {
    let response = "## How to Submit an Assessment\n\n";
    response += "Follow these steps to submit your work:\n\n";
    response += "1. **Go to the Assessments tab** and find your assessment\n";
    response += "2. **Click on the assessment** to view details\n";
    response += "3. **Select your file** using the file picker\n";
    response += "4. **Click Submit** to upload your work\n\n";
    response += "### Accepted File Types\n";
    response += "- PDF documents (.pdf)\n";
    response += "- Word documents (.doc, .docx)\n";
    response += "- Images (.png, .jpg, .jpeg)\n";
    response += "- Archives (.zip)\n\n";
    response += "### Important Notes\n";
    response += "- You'll receive a confirmation with a submission reference number\n";
    response += "- Check the **Submissions** tab to view your submission history\n";
    response += "- If resubmission is allowed, you can submit again before the deadline\n";

    return response;
}

/**
 * Generate response for grade queries
 */
export function generateGradesResponse(context: ChatbotContext): string {
    if (context.released_grades.length === 0) {
        return "You don't have any released grades yet. Grades will appear here once your instructors officially release them.\n\n" +
            "Check the **Grades Dashboard** tab for updates, or view your **Transcript** for a formal summary.";
    }

    let response = "## Your Released Grades\n\n";

    for (const grade of context.released_grades) {
        const percentage = Math.round((grade.score / grade.total_marks) * 100);
        response += `**${grade.assessment_title}**: ${grade.score}/${grade.total_marks} (${percentage}%)\n`;
        if (grade.feedback) {
            response += `> Feedback: ${grade.feedback.substring(0, 100)}${grade.feedback.length > 100 ? '...' : ''}\n`;
        }
        response += "\n";
    }

    response += "For a complete view, check the **Grades Dashboard** or download your **Transcript**.";

    return response;
}

/**
 * Generate response for navigation queries
 */
export function generateNavigationResponse(query: string): { response: string; links: NavigationLink[] } {
    const lowerQuery = query.toLowerCase();
    const links: NavigationLink[] = [];

    let response = "Here's where you can find what you're looking for:\n\n";

    if (/grade|result|score|mark/i.test(lowerQuery)) {
        links.push(NAVIGATION_MAP.grades, NAVIGATION_MAP.transcript);
        response += "- **Grades Dashboard**: View detailed grade breakdown and statistics\n";
        response += "- **Transcript**: Download your interim transcript\n";
    } else if (/submit|upload|assignment/i.test(lowerQuery)) {
        links.push(NAVIGATION_MAP.assessments, NAVIGATION_MAP.submissions);
        response += "- **Assessments**: View and submit assignments\n";
        response += "- **Submissions**: View your submission history\n";
    } else if (/deadline|due|calendar/i.test(lowerQuery)) {
        links.push(NAVIGATION_MAP.calendar, NAVIGATION_MAP.deadlines);
        response += "- **Calendar**: Visual calendar with all deadlines\n";
        response += "- **Deadlines**: List of upcoming due dates\n";
    } else if (/material|resource|lecture|note/i.test(lowerQuery)) {
        links.push(NAVIGATION_MAP.materials);
        response += "- **Learning Materials**: Course resources and documents\n";
    } else {
        // General navigation help
        links.push(NAVIGATION_MAP.assessments, NAVIGATION_MAP.grades, NAVIGATION_MAP.calendar);
        response = "Here are the main sections of your dashboard:\n\n";
        response += "- **Learning Materials**: Course resources\n";
        response += "- **Assessments**: View and submit work\n";
        response += "- **Calendar**: Visual deadline view\n";
        response += "- **Submissions**: Your submission history\n";
        response += "- **Grades Dashboard**: Grade breakdown\n";
        response += "- **Transcript**: Formal grade summary\n";
    }

    return { response, links };
}

/**
 * Generate fallback response
 */
export function generateFallbackResponse(): string {
    return "I'm not sure how to help with that specific question. Here are some things I can help with:\n\n" +
        "- 📅 **Deadlines**: \"What are my upcoming deadlines?\"\n" +
        "- 📝 **Assessments**: \"Tell me about Assignment 1\"\n" +
        "- 📤 **Submissions**: \"How do I submit my work?\"\n" +
        "- 📊 **Grades**: \"Where can I see my grades?\"\n" +
        "- 📋 **Rubrics**: \"How will my work be graded?\"\n\n" +
        "If you need help with something else, I can create a support ticket for you.";
}

/**
 * Generate welcome message
 */
export function generateWelcomeMessage(studentName: string | null): string {
    const name = studentName ? `, ${studentName.split(' ')[0]}` : '';
    return `Hi${name}! 👋 I'm your EduConnect assistant. I can help you with:\n\n` +
        "- Assessment deadlines and instructions\n" +
        "- Grading criteria and rubrics\n" +
        "- Submission guidance\n" +
        "- Navigating the system\n\n" +
        "What would you like to know?";
}

// =============================================
// HELPER FUNCTIONS
// =============================================

function findMatchingAssessment(
    query: string,
    assessments: ChatbotContext['assessments']
): ChatbotContext['assessments'][0] | null {
    const lowerQuery = query.toLowerCase();

    // Try exact title match first
    for (const assessment of assessments) {
        if (lowerQuery.includes(assessment.title.toLowerCase())) {
            return assessment;
        }
    }

    // Try course code match
    for (const assessment of assessments) {
        if (lowerQuery.includes(assessment.course_code.toLowerCase())) {
            return assessment;
        }
    }

    // Try partial match on keywords
    const queryWords = lowerQuery.split(/\s+/).filter(w => w.length > 3);
    for (const assessment of assessments) {
        const titleWords = assessment.title.toLowerCase().split(/\s+/);
        for (const queryWord of queryWords) {
            if (titleWords.some(tw => tw.includes(queryWord) || queryWord.includes(tw))) {
                return assessment;
            }
        }
    }

    return null;
}

function formatAssessmentType(type: string): string {
    const labels: Record<string, string> = {
        assignment: 'Assignment',
        quiz: 'Quiz',
        examination: 'Examination',
        project: 'Project',
        practical: 'Practical',
        other: 'Other',
    };
    return labels[type] || type;
}

// =============================================
// MAIN CHAT PROCESSOR
// =============================================

export interface ChatResponse {
    message: string;
    category: QueryCategory;
    responseType: ResponseType;
    links?: NavigationLink[];
    suggestEscalation?: boolean;
}

/**
 * Process a user message and generate a response
 */
export async function processMessage(
    userMessage: string,
    context: ChatbotContext | null
): Promise<ChatResponse> {
    // Classify the query
    const category = classifyQuery(userMessage);

    // Handle case where context is not available
    if (!context) {
        return {
            message: "I'm having trouble accessing your information. Please try refreshing the page.",
            category: 'unknown',
            responseType: 'fallback',
            suggestEscalation: true,
        };
    }

    // Generate response based on category
    switch (category) {
        case 'deadline':
            return {
                message: generateDeadlineResponse(context),
                category,
                responseType: 'success',
                links: [NAVIGATION_MAP.calendar, NAVIGATION_MAP.deadlines],
            };

        case 'assessment_info':
            return {
                message: generateAssessmentInfoResponse(userMessage, context),
                category,
                responseType: 'success',
                links: [NAVIGATION_MAP.assessments],
            };

        case 'rubric':
            // For now, provide general rubric info
            return {
                message: "Grading criteria are available for assessments that have rubrics attached. " +
                    "You can view the rubric details on the Assessments tab.\n\n" +
                    "**Grade Boundaries:**\n" +
                    "- HD (High Distinction): 85-100%\n" +
                    "- D (Distinction): 75-84%\n" +
                    "- CR (Credit): 65-74%\n" +
                    "- P (Pass): 50-64%\n" +
                    "- F (Fail): 0-49%",
                category,
                responseType: 'success',
                links: [NAVIGATION_MAP.assessments],
            };

        case 'submission_help':
            return {
                message: generateSubmissionHelpResponse(context),
                category,
                responseType: 'success',
                links: [NAVIGATION_MAP.assessments, NAVIGATION_MAP.submissions],
            };

        case 'grades':
            return {
                message: generateGradesResponse(context),
                category,
                responseType: 'success',
                links: [NAVIGATION_MAP.grades, NAVIGATION_MAP.transcript],
            };

        case 'navigation':
            const navResult = generateNavigationResponse(userMessage);
            return {
                message: navResult.response,
                category,
                responseType: 'success',
                links: navResult.links,
            };

        case 'general':
            return {
                message: "I'm here to help with assessment-related questions. I can assist with:\n\n" +
                    "- Viewing your upcoming deadlines\n" +
                    "- Understanding assessment requirements\n" +
                    "- Learning about grading criteria\n" +
                    "- Guidance on submitting your work\n" +
                    "- Finding your grades and transcript\n\n" +
                    "What would you like to know?",
                category,
                responseType: 'success',
            };

        default:
            return {
                message: generateFallbackResponse(),
                category: 'unknown',
                responseType: 'fallback',
                suggestEscalation: true,
            };
    }
}

// =============================================
// READ-ONLY VALIDATION
// =============================================

/**
 * Check if a message is requesting a prohibited action
 */
export function isProhibitedRequest(message: string): { prohibited: boolean; reason?: string } {
    const lowerMessage = message.toLowerCase();

    // Submit on behalf
    if (/submit.*for me|upload.*for me|send.*my.*assignment/i.test(lowerMessage)) {
        return {
            prohibited: true,
            reason: "I can't submit assignments on your behalf. Submissions must be done by you through the Assessments tab to ensure authenticity.",
        };
    }

    // Change grades
    if (/change.*grade|modify.*grade|update.*score|fix.*grade/i.test(lowerMessage)) {
        return {
            prohibited: true,
            reason: "I can't modify grades. If you believe there's an error in your grade, please contact your instructor directly or create a support ticket.",
        };
    }

    // Change deadlines
    if (/extend.*deadline|change.*due date|postpone|move.*deadline/i.test(lowerMessage)) {
        return {
            prohibited: true,
            reason: "I can't change assessment deadlines. For deadline extensions, please contact your instructor or student administration.",
        };
    }

    // Access other students
    if (/other student|someone else|another person|classmate/i.test(lowerMessage)) {
        return {
            prohibited: true,
            reason: "I can only access your own academic information. I can't provide information about other students for privacy reasons.",
        };
    }

    return { prohibited: false };
}
