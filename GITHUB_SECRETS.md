# GitHub Actions Secrets Configuration

Add these secrets to your repository at: https://github.com/MisterTK/reviews/settings/secrets/actions

## Required Secrets:

```
VERCEL_TOKEN=<your-vercel-personal-access-token>
VERCEL_ORG_ID=team_cEJip7Nk9zOA98z99dyVpcVp
VERCEL_PROJECT_ID=prj_vcAkZgQH6QXRMKh7BzNJElxLP9Jj
STAGING_PROJECT_ID=dchddqxaelzokyjsebpx
STAGING_DB_PASSWORD=<get-from-supabase-dashboard>
STAGING_SUPABASE_URL=https://dchddqxaelzokyjsebpx.supabase.co
STAGING_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjaGRkcXhhZWx6b2t5anNlYnB4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk2MDA4NTQsImV4cCI6MjA2NTE3Njg1NH0.w3MVl8ns9WV_1hAf02Oc5ll_N1F4x2Ts1gNzhj39sNA
```

## How to get the values:

1. **VERCEL_TOKEN**: 
   - Go to https://vercel.com/account/tokens
   - Create a new token with full access

2. **STAGING_DB_PASSWORD**:
   - Go to your Supabase project dashboard
   - Settings → Database → Connection string
   - Copy the password from the connection string

Once added, pushes to `develop` branch will automatically deploy to staging!