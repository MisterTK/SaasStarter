# Background Review Sync Setup

The ReviewAI Pro platform includes support for automated background syncing of reviews. This ensures your database always has the latest reviews without requiring manual imports.

## How It Works

1. **Token Storage**: OAuth tokens are stored encrypted in the database with:
   - Access tokens (auto-refresh when expired)
   - Refresh tokens (for getting new access tokens)
   - Expiration timestamps
   - Organization association

2. **Automatic Token Refresh**: The `GoogleMyBusinessService` automatically refreshes expired tokens during API calls, updating the database with new tokens.

3. **Service-Level Access**: Background jobs use the Supabase service role to access tokens for all organizations, independent of user sessions.

## Sync Options

### Option 1: Vercel Cron Jobs (Recommended)

The repository includes a pre-configured Vercel cron job that runs every 6 hours:

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/sync-reviews",
      "schedule": "0 */6 * * *"  // Every 6 hours
    }
  ]
}
```

**Setup**:
1. Set the `CRON_SECRET` environment variable in Vercel
2. Deploy to Vercel
3. The cron job will automatically start running

### Option 2: Supabase Edge Functions

Use the included Edge Function for more control:

```bash
# Deploy the edge function
supabase functions deploy sync-reviews

# Schedule it (using pg_cron extension)
SELECT cron.schedule(
  'sync-reviews',
  '0 */6 * * *',  -- Every 6 hours
  $$
  SELECT net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/sync-reviews',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
    )
  );
  $$
);
```

### Option 3: External Schedulers

Call the sync endpoint from any external scheduler:

```bash
# Using curl
curl -X POST https://your-app.vercel.app/api/cron/sync-reviews \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# Using GitHub Actions
# .github/workflows/sync-reviews.yml
name: Sync Reviews
on:
  schedule:
    - cron: '0 */6 * * *'
jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger sync
        run: |
          curl -X POST ${{ secrets.APP_URL }}/api/cron/sync-reviews \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

## What Gets Synced

The sync job:
1. Fetches all organizations with connected Google accounts
2. For each organization:
   - Gets all accessible locations (owned + shared)
   - Fetches all reviews for each location
   - Inserts new reviews into the database
   - Updates existing reviews if reply status changed
3. Returns summary of new and unanswered reviews

## Monitoring

### Sync Status
The sync endpoint returns:
```json
{
  "success": true,
  "synced": 3,  // Number of organizations processed
  "results": [
    {
      "organization_id": "uuid",
      "success": true,
      "newReviews": 5,
      "unansweredReviews": 12
    }
  ]
}
```

### Error Handling
- Token refresh failures are logged but don't stop the sync
- Individual location failures don't affect other locations
- Organization failures don't affect other organizations

### Logs
- Vercel: Check Function Logs in Vercel Dashboard
- Supabase: Check Edge Function logs
- Custom: Implement your own logging solution

## Security Considerations

1. **Token Encryption**: All tokens are encrypted at rest using AES-256-CBC
2. **Service Role**: Background jobs use service role key (keep secure)
3. **Cron Authentication**: Use `CRON_SECRET` to prevent unauthorized triggers
4. **Rate Limiting**: Google My Business API has rate limits - adjust schedule accordingly

## Customization

### Change Sync Frequency
Edit the cron schedule in `vercel.json` or your scheduler:
- `0 * * * *` - Every hour
- `0 */4 * * *` - Every 4 hours
- `0 0 * * *` - Daily at midnight
- `0 0 * * 1` - Weekly on Monday

### Filter What Gets Synced
Modify `sync-unanswered-reviews.ts` to:
- Only sync reviews from last X days
- Only sync specific ratings
- Skip locations with recent syncs
- Add notification webhooks

### Add Notifications
Extend the sync job to:
- Send email alerts for new negative reviews
- Post to Slack for unanswered reviews
- Trigger AI response generation
- Update analytics dashboards