# Email Notification Setup Guide

## Current Status
The email notification system requires external configuration to work.

## Option 1: Resend API (Recommended)

### Step 1: Create Resend Account
1. Go to [resend.com](https://resend.com)
2. Sign up for free account (100 emails/day free)
3. Verify your domain or use their test domain

### Step 2: Get API Key
1. Go to Resend Dashboard → API Keys
2. Create a new API key
3. Copy the key (starts with `re_`)

### Step 3: Configure Supabase Secrets
In Supabase Dashboard → Project Settings → Edge Functions → Secrets:

```
RESEND_API_KEY=re_your_api_key_here
FROM_EMAIL=noreply@yourdomain.com
APP_URL=https://your-app-url.com
```

### Step 4: Deploy Edge Function
```bash
supabase functions deploy process-reminders
```

### Step 5: Set up Scheduled Invocation
In Supabase Dashboard → Database → Extensions:
1. Enable `pg_cron` extension
2. Run this SQL:

```sql
SELECT cron.schedule(
    'process-reminders',
    '*/5 * * * *',  -- Every 5 minutes
    $$
    SELECT net.http_post(
        url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/process-reminders',
        headers := '{"Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
    );
    $$
);
```

---

## Option 2: Supabase Built-in Email (Simpler)

If you don't want to set up Resend, you can use a simpler database-only approach:

### Run this SQL in Supabase SQL Editor:

```sql
-- See EMAIL_NOTIFICATIONS_SIMPLE.sql
```

This approach:
- Stores emails in `email_queue` table
- Can be integrated with any email service later
- Shows pending emails in admin dashboard

---

## Testing Email Notifications

1. Create a new assessment
2. Check the `notifications` table for new records
3. Check the `email_queue` table for pending emails
4. If using Resend, check Resend dashboard for sent emails

---

## Troubleshooting

### Emails not sending?
1. Check `RESEND_API_KEY` is set in Supabase secrets
2. Check Edge Function logs: Supabase Dashboard → Edge Functions → Logs
3. Check `email_queue` table for error messages

### Notifications not appearing?
1. Run `SELECT * FROM notifications ORDER BY created_at DESC LIMIT 10;`
2. Check RLS policies allow users to see their notifications

### Edge Function not running?
1. Check pg_cron is enabled
2. Check cron job is scheduled: `SELECT * FROM cron.job;`
3. Manually test: Call the function URL directly
