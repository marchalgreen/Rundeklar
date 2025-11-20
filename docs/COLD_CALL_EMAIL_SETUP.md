# Cold Call Email Setup Guide

## Overview

The Cold Call Email feature allows sysadmins to send personalized emails to club presidents directly from the admin interface, with full tracking of who was contacted and when.

## Setup Steps

### 1. Run Database Migration

The `cold_call_emails` table needs to be created in your database. Run the migration:

**Option A: Via Supabase Dashboard**
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy the contents of `database/migrations/014_add_cold_call_emails_tracking.sql`
4. Paste and run in SQL Editor

**Option B: Via Neon Dashboard**
1. Go to your Neon project dashboard
2. Navigate to SQL Editor
3. Copy the contents of `database/migrations/014_add_cold_call_emails_tracking.sql`
4. Paste and run in SQL Editor

### 2. Ensure API Server is Running

For local development, you need to run the API server:

```bash
# Option 1: Using Vercel CLI (recommended)
cd packages/webapp
vercel dev

# Option 2: Using dev script (if available)
cd packages/webapp
pnpm dev:api
```

The API server should be running on `http://127.0.0.1:3000`

### 3. Verify Environment Variables

Make sure these are set in your `.env.local`:

```bash
RESEND_API_KEY=re_xxxxxxxxxxxxx
RESEND_FROM_EMAIL=marc@rundeklar.dk
RESEND_FROM_NAME=Marc Halgreen
DATABASE_URL=your_database_connection_string
```

### 4. Access the Feature

1. Log in as a sysadmin user
2. Navigate to Administration page
3. Click on the "Cold Call" tab
4. Fill out the form and send emails!

## Troubleshooting

### Error: "Unexpected token '<', "<!DOCTYPE "... is not valid JSON"

This means the API endpoint is returning HTML instead of JSON. Check:

1. **Is the API server running?** 
   - Make sure `vercel dev` or `pnpm dev:api` is running
   - Check that port 3000 is accessible

2. **Does the table exist?**
   - Run the migration SQL in your database
   - The feature will work without the table (emails will send but won't be tracked)

3. **Is the route correct?**
   - The endpoint should be at `/api/admin/cold-call-emails`
   - Check browser console for the exact URL being called

### Error: "Failed to fetch email history"

- The table might not exist - run the migration
- The API server might not be running
- Check browser console for detailed error messages

### Emails Send But Don't Appear in History

- The `cold_call_emails` table doesn't exist - run the migration
- Check API server logs for database errors
- Emails will still send successfully, but won't be tracked

## Features

- **Personalized Emails**: Automatically inserts club name and president name
- **Email Preview**: See exactly what will be sent before sending
- **Email History**: Track all sent emails with timestamps and status
- **Error Handling**: Failed sends are tracked separately
- **Resend Integration**: Full tracking with Resend email IDs (future enhancement)

## Database Schema

The `cold_call_emails` table stores:

- `id`: UUID primary key
- `email`: Recipient email address
- `club_name`: Name of the club
- `president_name`: Name of the club president
- `status`: 'sent' or 'failed'
- `resend_id`: Resend email ID (for future webhook integration)
- `sent_at`: Timestamp when email was sent
- `created_at`: Record creation timestamp

