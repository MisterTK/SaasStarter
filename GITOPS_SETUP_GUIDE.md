# GitOps Setup Guide for Reviews App

This guide walks through the complete GitOps setup for your reviews application.

## Current Status

✅ **Completed:**
- Supabase local development initialized and linked to `supabase-reviews-787coffee` project (temporary production)
- GitHub Actions workflows created for CI/CD pipeline
- Develop branch created and pushed to GitHub
- GitOps architecture documentation added
- Staging project created in r7ai organization

## Next Steps

### 1. GitHub Repository Configuration

#### Set up GitHub Secrets
Go to your repository settings at https://github.com/MisterTK/reviews/settings/secrets/actions and add:

**Required Secrets:**
- `SUPABASE_ACCESS_TOKEN`: Your personal access token from https://supabase.com/dashboard/account/tokens
- `PRODUCTION_PROJECT_ID`: `roqilgdahmmxisrswbsi` (temporary - will change when test site is retired)
- `PRODUCTION_DB_PASSWORD`: Get from Supabase dashboard > Settings > Database
- `STAGING_PROJECT_ID`: `dchddqxaelzokyjsebpx` (r7ai organization)
- `STAGING_DB_PASSWORD`: Get from Supabase dashboard > Settings > Database for staging project
- `VERCEL_TOKEN`: Get from https://vercel.com/account/tokens
- `VERCEL_ORG_ID`: Your Vercel team/org ID
- `VERCEL_PROJECT_ID`: (Will be created when linking project)

**Optional Secrets:**
- `SLACK_WEBHOOK_URL`: For deployment notifications

#### Set up Branch Protection
1. Go to Settings > Branches
2. Add rule for `main` branch:
   - Require pull request reviews before merging
   - Require status checks to pass before merging
   - Require branches to be up to date before merging
   - Include administrators
3. Add rule for `develop` branch:
   - Require status checks to pass before merging

### 2. Supabase Environment Setup

✅ **Current Setup:**
- **Staging**: `staging project` in r7ai organization (ID: `dchddqxaelzokyjsebpx`)
- **Production**: `supabase-reviews-787coffee` (temporary - using existing test site)

**Future Migration Plan:**
When the test site is retired, create a new production project in the r7ai organization alongside staging.

### 3. Vercel Setup

```bash
# Link your project to Vercel
vercel link

# Configure production domain
vercel domains add your-domain.com

# Set up environment variables for production
vercel env add PUBLIC_SUPABASE_URL production
vercel env add PUBLIC_SUPABASE_ANON_KEY production
vercel env add PRIVATE_SUPABASE_SERVICE_ROLE production
vercel env add PRIVATE_STRIPE_API_KEY production
vercel env add GOOGLE_CLOUD_PROJECT production

# Set up preview environment variables (for staging)
vercel env add PUBLIC_SUPABASE_URL preview
# ... (add all staging env vars)
```

### 4. Database Migrations Setup

```bash
# Create your first migration
supabase migration new initial_schema

# Edit the migration file in supabase/migrations/
# Then apply it locally
supabase db reset

# Generate TypeScript types
supabase gen types typescript --local > src/DatabaseDefinitions.ts
```

### 5. Development Workflow

#### Daily Development
```bash
# Start your day
git checkout develop
git pull origin develop
supabase start
npm run dev

# Create feature branch
git checkout -b feature/your-feature

# After making changes
npm run check
npm run lint
npm run format
npm run test_run

# Commit and push
git add .
git commit -m "feat: your feature"
git push origin feature/your-feature

# Create PR to develop branch
```

#### Weekly Release Process
```bash
# Thursday: Create release branch
git checkout develop
git checkout -b release/v1.0.0

# Friday: Merge to main
git checkout main
git merge release/v1.0.0
git push origin main

# Tag release
git tag v1.0.0
git push origin v1.0.0

# Merge back to develop
git checkout develop
git merge main
git push origin develop
```

### 6. Environment Variables Summary

Create `.env.local` for local development:
```env
# Already configured
PUBLIC_SUPABASE_URL='https://roqilgdahmmxisrswbsi.supabase.co'
PUBLIC_SUPABASE_ANON_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'

# Still needed
PRIVATE_SUPABASE_SERVICE_ROLE='your-service-role-key'
PRIVATE_STRIPE_API_KEY='your-stripe-key'

# Optional
PRIVATE_RESEND_API_KEY='your-resend-key'
PRIVATE_ADMIN_EMAIL='admin@yourdomain.com'
```

### 7. Testing the Setup

1. **Test CI Pipeline:**
   ```bash
   # Create a test PR
   git checkout -b test/ci-pipeline
   echo "# Test" >> README.md
   git add . && git commit -m "test: CI pipeline"
   git push origin test/ci-pipeline
   # Create PR and watch GitHub Actions run
   ```

2. **Test Staging Deployment:**
   ```bash
   # Merge test PR to develop
   # Watch staging deployment in GitHub Actions
   ```

3. **Test Production Deployment:**
   ```bash
   # Merge develop to main
   # Watch production deployment
   ```

## Monitoring & Maintenance

- Check GitHub Actions for build status
- Monitor Supabase dashboard for database health
- Review Vercel analytics for performance
- Set up error tracking (Sentry free tier)

## Troubleshooting

### Migration Failures
```bash
supabase migration list
supabase db reset
supabase migration repair --status applied
```

### Type Generation Issues
```bash
supabase gen types typescript --local > src/DatabaseDefinitions.ts
git add src/DatabaseDefinitions.ts
git commit -m "chore: update database types"
```

### Vercel Deployment Issues
```bash
vercel logs
vercel env pull
vercel --prod --force
```

## Next Actions

1. Decide on staging strategy (Option A, B, or C above)
2. Set up GitHub secrets
3. Configure Vercel project
4. Test the complete pipeline

Would you like me to help you with any specific step?