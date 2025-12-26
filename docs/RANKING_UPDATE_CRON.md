# Ranking Update Cron Job Setup

## Overview

The ranking update system automatically scrapes player rankings from BadmintonPlayer.dk and updates the database. This runs as a scheduled Vercel Cron Job.

## Configuration

### Vercel Cron Job

The cron job is configured in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/rankings/update",
      "schedule": "0 2 * * *"
    }
  ]
}
```

**Schedule:** `0 2 * * *` means it runs daily at 02:00 UTC (03:00 CET / 04:00 CEST)

### API Endpoint

The endpoint `/api/rankings/update` handles:
- **Cron requests**: Updates all tenants automatically
- **Manual requests**: Can update a specific tenant with `?tenantId=xxx`

## How It Works

1. **Fast Ranking List Scraper** (primary method):
   - Scrapes 6 ranking lists in parallel (~6 seconds)
   - Covers Single/Double/Mix for both Herre and Dame
   - Much faster than individual scraping

2. **Individual Scraper** (fallback):
   - Used for players not found in ranking lists
   - Scrapes individual player profiles (~4 seconds per player)
   - Only used when needed

3. **Database Update**:
   - Updates `level_single`, `level_double`, `level_mix` columns
   - Only updates players with `badmintonplayer_id` set

## Verification

### Check Cron Job Status

1. Go to Vercel Dashboard → Your Project → Settings → Cron Jobs
2. You should see `/api/rankings/update` listed
3. Check execution logs to verify it's running

### Manual Testing

You can manually trigger the update:

```bash
# Update all tenants
curl https://your-domain.vercel.app/api/rankings/update

# Update specific tenant
curl https://your-domain.vercel.app/api/rankings/update?tenantId=herlev-hjorten
```

### Check Logs

1. Go to Vercel Dashboard → Your Project → Functions
2. Click on `/api/rankings/update`
3. View execution logs to see:
   - How many players were scraped
   - How many were updated
   - Any errors or skipped players

## Expected Output

When running successfully, you should see logs like:

```
[Ranking Service] 📊 Scraped 77 unique players from ranking lists
[Ranking Service] 📊 77 players have ranking data
[Ranking Service] ✅ Updated: 60 players
[Ranking Service] ⚠️  Players not found in scraped data (3):
   - Player Name (BadmintonPlayer ID: xxxxx)
```

## Troubleshooting

### Cron Job Not Running

1. **Check Vercel Cron Jobs Settings**:
   - Go to Settings → Cron Jobs
   - Verify the job is enabled
   - Check if it's only enabled for Production (not Preview)

2. **Check Deployment**:
   - Cron jobs only work on Production deployments
   - Make sure `vercel.json` is in the root of your project
   - Redeploy if you just added the cron configuration

3. **Check Environment Variables**:
   - Ensure `DATABASE_URL` is set in Vercel
   - Check that all required env vars are present

### Players Not Updating

1. **Check `badmintonplayer_id`**:
   - Players need `badmintonplayer_id` set in database
   - Run the matching script first: `pnpm exec tsx scripts/match-players-badmintonplayer.ts`

2. **Check Tenant Config**:
   - Ensure tenant has `badmintonplayerRankingLists` configured
   - See `packages/webapp/src/config/tenants/herlev-hjorten.json` for example

3. **Check Logs**:
   - Look for "Players not found in scraped data" messages
   - These players will be scraped individually as fallback

## Schedule Customization

To change when the cron job runs, update the schedule in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/rankings/update",
      "schedule": "0 3 * * *"  // 03:00 UTC instead of 02:00
    }
  ]
}
```

**Cron Schedule Format:** `minute hour day month weekday`
- `0 2 * * *` = Daily at 02:00 UTC
- `0 */6 * * *` = Every 6 hours
- `0 2 * * 1` = Every Monday at 02:00 UTC

## Performance

- **Fast method**: ~6 seconds for 6 ranking lists
- **Fallback method**: ~4 seconds per player (only when needed)
- **Total time**: Usually 10-30 seconds depending on how many players need individual scraping

## Monitoring

Set up monitoring/alerts:
1. Vercel Dashboard → Functions → `/api/rankings/update` → View logs
2. Check for errors or failed executions
3. Monitor execution time (should be < 60 seconds)

