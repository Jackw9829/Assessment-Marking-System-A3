// =============================================
// Supabase Edge Function: Process Deadline Reminders
// =============================================
// This edge function runs on a schedule (e.g., every 5 minutes)
// to process pending reminders and send notifications.
// 
// Trigger: Cron schedule or HTTP request
// =============================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Email sending configuration (using Resend, SendGrid, or similar)
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") || "noreply@educonnect.com";
const APP_URL = Deno.env.get("APP_URL") || "https://your-app.com";

interface DueReminder {
    reminder_id: string;
    assessment_id: string;
    student_id: string;
    student_email: string;
    student_name: string;
    assessment_title: string;
    course_title: string;
    due_date: string;
    days_before: number;
    hours_before: number;
}

interface ProcessResult {
    success: boolean;
    reminder_id: string;
    notification_id?: string;
    email_sent?: boolean;
    error?: string;
}

Deno.serve(async (req: Request) => {
    try {
        // Verify the request (cron job or admin)
        const authHeader = req.headers.get("Authorization");

        // Create Supabase client with service role for background processing
        const supabaseAdmin = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false,
                },
            }
        );

        // Get batch size from query params or use default
        const url = new URL(req.url);
        const batchSize = parseInt(url.searchParams.get("batch_size") || "50");

        // Step 1: Fetch due reminders
        const { data: dueReminders, error: fetchError } = await supabaseAdmin.rpc(
            "get_due_reminders",
            { p_batch_size: batchSize }
        );

        if (fetchError) {
            console.error("Error fetching due reminders:", fetchError);
            return new Response(
                JSON.stringify({ error: "Failed to fetch reminders", details: fetchError }),
                { status: 500, headers: { "Content-Type": "application/json" } }
            );
        }

        if (!dueReminders || dueReminders.length === 0) {
            return new Response(
                JSON.stringify({ message: "No reminders due", processed: 0 }),
                { status: 200, headers: { "Content-Type": "application/json" } }
            );
        }

        console.log(`Processing ${dueReminders.length} due reminders`);

        // Step 2: Process each reminder
        const results: ProcessResult[] = [];

        for (const reminder of dueReminders as DueReminder[]) {
            try {
                // Process reminder and create notification
                const { data: notificationId, error: processError } = await supabaseAdmin.rpc(
                    "process_reminder",
                    {
                        p_reminder_id: reminder.reminder_id,
                        p_channel: "both",
                    }
                );

                if (processError) {
                    console.error(`Error processing reminder ${reminder.reminder_id}:`, processError);
                    results.push({
                        success: false,
                        reminder_id: reminder.reminder_id,
                        error: processError.message,
                    });
                    continue;
                }

                // Send email notification
                let emailSent = false;
                if (RESEND_API_KEY) {
                    emailSent = await sendEmailNotification(reminder);
                }

                results.push({
                    success: true,
                    reminder_id: reminder.reminder_id,
                    notification_id: notificationId,
                    email_sent: emailSent,
                });
            } catch (err) {
                console.error(`Error processing reminder ${reminder.reminder_id}:`, err);
                results.push({
                    success: false,
                    reminder_id: reminder.reminder_id,
                    error: err instanceof Error ? err.message : "Unknown error",
                });
            }
        }

        // Step 3: Process email queue
        await processEmailQueue(supabaseAdmin);

        // Return summary
        const successCount = results.filter((r) => r.success).length;
        const failCount = results.filter((r) => !r.success).length;

        return new Response(
            JSON.stringify({
                message: "Reminders processed",
                total: dueReminders.length,
                success: successCount,
                failed: failCount,
                results: results,
            }),
            {
                status: 200,
                headers: { "Content-Type": "application/json" },
            }
        );
    } catch (error) {
        console.error("Unexpected error:", error);
        return new Response(
            JSON.stringify({
                error: "Internal server error",
                details: error instanceof Error ? error.message : "Unknown error",
            }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
});

// =============================================
// Email Sending Function
// =============================================
async function sendEmailNotification(reminder: DueReminder): Promise<boolean> {
    if (!RESEND_API_KEY) {
        console.log("Email sending disabled - no API key configured");
        return false;
    }

    const urgency = reminder.days_before === 0 ? "URGENT: " : "";
    const timeText =
        reminder.days_before > 0
            ? `${reminder.days_before} day(s)`
            : `${reminder.hours_before} hour(s)`;

    const subject = `${urgency}Assessment Due in ${timeText}: ${reminder.assessment_title}`;

    const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9fafb; }
        .button { display: inline-block; background: #4F46E5; color: white; padding: 12px 24px; 
                  text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .deadline { background: ${reminder.days_before <= 1 ? "#FEE2E2" : "#FEF3C7"}; 
                    padding: 15px; border-radius: 6px; margin: 15px 0; }
        .footer { text-align: center; padding: 20px; color: #6B7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📚 EduConnect AMS</h1>
        </div>
        <div class="content">
          <p>Hi ${reminder.student_name || "Student"},</p>
          
          <div class="deadline">
            <strong>⏰ Deadline Reminder</strong><br>
            Your assessment <strong>"${reminder.assessment_title}"</strong> 
            for <strong>${reminder.course_title}</strong> is due in 
            <strong>${timeText}</strong>.
          </div>
          
          <p><strong>Due Date:</strong> ${new Date(reminder.due_date).toLocaleString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    })}</p>
          
          <p>Don't miss the deadline! Submit your work now:</p>
          
          <a href="${APP_URL}/dashboard?assessment=${reminder.assessment_id}" class="button">
            Submit Assessment
          </a>
          
          <p>If you've already submitted, you can ignore this reminder.</p>
        </div>
        <div class="footer">
          <p>This is an automated reminder from EduConnect Assessment & Marking System.</p>
          <p>You can manage your notification preferences in your dashboard settings.</p>
        </div>
      </div>
    </body>
    </html>
  `;

    try {
        const response = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
                from: FROM_EMAIL,
                to: reminder.student_email,
                subject: subject,
                html: htmlBody,
            }),
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.error("Email send failed:", errorData);
            return false;
        }

        console.log(`Email sent to ${reminder.student_email}`);
        return true;
    } catch (error) {
        console.error("Email send error:", error);
        return false;
    }
}

// =============================================
// Email Queue Processor
// =============================================
async function processEmailQueue(supabase: any): Promise<void> {
    // Get pending emails from queue
    const { data: pendingEmails, error } = await supabase
        .from("email_queue")
        .select("*")
        .eq("status", "pending")
        .lte("scheduled_for", new Date().toISOString())
        .lt("attempts", 3)
        .limit(20);

    if (error || !pendingEmails?.length) {
        return;
    }

    for (const email of pendingEmails) {
        try {
            if (!RESEND_API_KEY) {
                continue;
            }

            const response = await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${RESEND_API_KEY}`,
                },
                body: JSON.stringify({
                    from: FROM_EMAIL,
                    to: email.recipient_email,
                    subject: email.subject,
                    html: email.body_html,
                }),
            });

            if (response.ok) {
                // Mark as sent
                await supabase
                    .from("email_queue")
                    .update({
                        status: "sent",
                        sent_at: new Date().toISOString(),
                        attempts: email.attempts + 1,
                    })
                    .eq("id", email.id);

                // Update notification
                if (email.notification_id) {
                    await supabase
                        .from("notifications")
                        .update({
                            email_sent: true,
                            email_sent_at: new Date().toISOString(),
                        })
                        .eq("id", email.notification_id);
                }
            } else {
                // Mark for retry
                await supabase
                    .from("email_queue")
                    .update({
                        status: email.attempts + 1 >= email.max_attempts ? "failed" : "retry",
                        attempts: email.attempts + 1,
                        last_attempt_at: new Date().toISOString(),
                        error_message: await response.text(),
                    })
                    .eq("id", email.id);
            }
        } catch (err) {
            await supabase
                .from("email_queue")
                .update({
                    attempts: email.attempts + 1,
                    last_attempt_at: new Date().toISOString(),
                    error_message: err instanceof Error ? err.message : "Unknown error",
                })
                .eq("id", email.id);
        }
    }
}
