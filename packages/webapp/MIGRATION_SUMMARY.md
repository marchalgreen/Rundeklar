# Supabase Migration Summary

## ✅ Completed Tasks

### 1. Infrastructure Setup
- ✅ Installed `@supabase/supabase-js` package
- ✅ Created Supabase client initialization (`src/lib/supabase.ts`)
- ✅ Created SQL migration file (`supabase/migrations/001_initial_schema.sql`)

### 2. Data Layer Migration
- ✅ Created new Supabase storage layer (`src/api/supabase.ts`)
  - All CRUD operations for players, sessions, check-ins, courts, matches, match_players, and statistics_snapshots
  - Caching layer for performance
  - Data mapping functions (rowToPlayer, rowToSession, etc.)

### 3. API Layer Updates
- ✅ Updated `src/api/index.ts` to use Supabase instead of localStorage
  - All player operations migrated
  - All session operations migrated
  - All check-in operations migrated
  - All match operations migrated
  - All match player operations migrated
  - `movePlayer` function fully migrated

### 4. Statistics API Migration
- ✅ Updated `src/api/stats.ts` to use Supabase
  - All statistics snapshot operations migrated
  - All statistics query functions updated
  - `generateDummyHistoricalData` updated to use Supabase

### 5. Migration Tools & Documentation
- ✅ Created data migration script (`scripts/migrate-to-supabase.ts`)
- ✅ Created setup guide (`SUPABASE_SETUP.md`)
- ✅ Created environment variable example (`.env.example`)

## 📋 What You Need to Do

### Step 1: Set Up Supabase
1. Create a Supabase account and project
2. Run the SQL migration from `supabase/migrations/001_initial_schema.sql`
3. Get your Project URL and anon key from Supabase dashboard

### Step 2: Configure Environment Variables
1. Copy `.env.example` to `.env.local` in `packages/webapp/`
2. Add your Supabase credentials:
   ```
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

### Step 3: (Optional) Migrate Existing Data
If you have data in localStorage:
1. Export it from the browser console
2. Save it to `localStorage-export.json`
3. Run the migration script: `pnpm tsx scripts/migrate-to-supabase.ts`

### Step 4: Test
1. Start the dev server: `pnpm dev`
2. Test all operations:
   - Create/edit/delete players
   - Start/end sessions
   - Check in players
   - Create matches
   - Move players between matches
   - View statistics

## 🔍 Key Changes

### Before (localStorage)
- Data stored in browser's localStorage
- Data lost when clearing browser data
- No multi-user support
- No data persistence across devices

### After (Supabase)
- Data stored in PostgreSQL database
- Persistent across all devices and sessions
- Multi-user support
- Real-time updates possible
- Scalable and production-ready

## 📁 Files Changed

### New Files
- `src/lib/supabase.ts` - Supabase client initialization
- `src/api/supabase.ts` - Supabase storage layer
- `supabase/migrations/001_initial_schema.sql` - Database schema
- `scripts/migrate-to-supabase.ts` - Data migration script
- `SUPABASE_SETUP.md` - Setup guide
- `.env.example` - Environment variable template

### Modified Files
- `src/api/index.ts` - Updated to use Supabase
- `src/api/stats.ts` - Updated to use Supabase
- `package.json` - Added @supabase/supabase-js dependency

### Deprecated Files
- `src/api/storage.ts` - Still exists but no longer used (can be removed later)

## 🚀 Next Steps

1. **Set up Supabase** (see `SUPABASE_SETUP.md`)
2. **Test the application** thoroughly
3. **Deploy** - The app is now ready for production deployment
4. **Monitor** - Check Supabase dashboard for usage and performance

## ⚠️ Important Notes

- **Environment Variables**: Never commit `.env.local` to git (already in `.gitignore`)
- **RLS Policies**: The migration sets up permissive RLS policies. For production, consider tightening security
- **Backup**: Supabase provides automatic backups, but consider setting up additional backup strategies
- **Rate Limits**: Free tier has rate limits. Monitor usage in Supabase dashboard

## 🐛 Troubleshooting

See `SUPABASE_SETUP.md` for detailed troubleshooting steps.

Common issues:
- "Supabase URL and Anon Key must be provided" → Check `.env.local` exists and has correct values
- "relation does not exist" → Run the SQL migration
- "permission denied" → Check RLS policies in Supabase dashboard

