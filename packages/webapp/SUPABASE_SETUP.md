# Supabase Setup Guide

This guide will help you set up Supabase for the Herlev Hjorten webapp.

## Prerequisites

1. A Supabase account (free tier is sufficient)
2. A Supabase project created

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Fill in:
   - **Name**: Herlev Hjorten (or your preferred name)
   - **Database Password**: Choose a strong password (save it!)
   - **Region**: Choose closest to your users
4. Click "Create new project"
5. Wait for the project to be provisioned (2-3 minutes)

## Step 2: Get Your Credentials

1. In your Supabase project dashboard, go to **Settings** → **API**
2. Find these values:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon/public key** (starts with `eyJ...`)

## Step 3: Run Database Migration

1. In your Supabase project dashboard, go to **SQL Editor**
2. Click "New query"
3. Open the file `supabase/migrations/001_initial_schema.sql` from this repository
4. Copy and paste the entire SQL content into the SQL Editor
5. Click "Run" (or press Cmd/Ctrl + Enter)
6. Verify the migration succeeded (you should see "Success. No rows returned")

## Step 4: Configure Environment Variables

1. Create a `.env.local` file in `packages/webapp/` if it doesn't exist:
   ```bash
   cd packages/webapp
   touch .env.local
   ```

2. Add your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=https://xxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

   Replace:
   - `https://xxxxx.supabase.co` with your Project URL
   - `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` with your anon/public key

3. **Important**: Add `.env.local` to `.gitignore` if it's not already there (never commit secrets!)

## Step 5: (Optional) Migrate Existing Data

If you have existing data in localStorage that you want to migrate:

1. **Export from localStorage**:
   - Open your app in the browser
   - Open the browser console (F12)
   - Run:
     ```javascript
     const data = localStorage.getItem('herlev-hjorten-db')
     console.log(data)
     ```
   - Copy the output
   - Save it to `packages/webapp/localStorage-export.json`

2. **Run the migration script**:
   ```bash
   cd packages/webapp
   pnpm tsx scripts/migrate-to-supabase.ts
   ```

   Note: You may need to install `tsx` first:
   ```bash
   pnpm add -D tsx
   ```
   
   Or use Node.js directly (if you have a TypeScript runner configured):
   ```bash
   node --loader tsx scripts/migrate-to-supabase.ts
   ```

## Step 6: Test the Setup

1. Start the development server:
   ```bash
   pnpm dev
   ```

2. Open the app in your browser
3. Try creating a player, starting a session, etc.
4. Check your Supabase dashboard → **Table Editor** to verify data is being saved

## Troubleshooting

### "Supabase URL and Anon Key must be provided"
- Make sure `.env.local` exists in `packages/webapp/`
- Make sure the environment variables are prefixed with `VITE_`
- Restart your dev server after adding/changing environment variables

### "relation does not exist" or "table does not exist"
- Make sure you ran the SQL migration (Step 3)
- Check the SQL Editor in Supabase for any errors

### "permission denied" or RLS errors
- The migration sets up Row Level Security (RLS) policies
- Make sure the migration ran successfully
- Check **Authentication** → **Policies** in Supabase dashboard

### Data not persisting
- Check the browser console for errors
- Check the Supabase dashboard → **Logs** for API errors
- Verify your environment variables are correct

## Security Notes

- The `anon` key is safe to use in client-side code (it's public)
- RLS policies control access to data
- Never commit `.env.local` to git
- For production, consider using environment variables in your hosting platform

## Next Steps

- The app is now using Supabase for all data persistence
- Data will persist across browser sessions and devices
- Multiple users can access the same data simultaneously
- You can view and manage data in the Supabase dashboard

