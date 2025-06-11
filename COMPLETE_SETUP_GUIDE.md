# Complete Setup Guide for Reviews App

This guide will walk you through setting up the entire Reviews Management application from scratch.

## Prerequisites

- Node.js 18+ installed
- Google Cloud account with billing enabled
- Vercel account
- GitHub account
- Supabase account (or use the provided staging project)

## Step 1: Clone and Install

```bash
git clone https://github.com/yourusername/reviews.git
cd reviews
npm install
```

## Step 2: Supabase Setup

### Option A: Use Existing Staging Project

The staging Supabase project is already configured: `dchddqxaelzokyjsebpx`

### Option B: Create Your Own Project

1. Go to https://supabase.com/dashboard
2. Create a new project
3. Run migrations:
   ```bash
   supabase link --project-ref your-project-id
   supabase db push
   ```

## Step 3: Google Cloud Setup

### 3.1 Create Google Cloud Project

```bash
gcloud projects create reviews-app-prod --name="Reviews App"
gcloud config set project reviews-app-prod
gcloud auth application-default login
```

### 3.2 Enable Required APIs

```bash
# Enable billing first via console
gcloud services enable aiplatform.googleapis.com
gcloud services enable mybusinessbusinessinformation.googleapis.com
gcloud services enable mybusinessaccountmanagement.googleapis.com
```

### 3.3 Create Service Account for Vertex AI

```bash
gcloud iam service-accounts create reviews-vertex-ai \
  --display-name="Reviews App Vertex AI"

gcloud projects add-iam-policy-binding reviews-app-prod \
  --member="serviceAccount:reviews-vertex-ai@reviews-app-prod.iam.gserviceaccount.com" \
  --role="roles/aiplatform.user"

gcloud iam service-accounts keys create vertex-ai-key.json \
  --iam-account=reviews-vertex-ai@reviews-app-prod.iam.gserviceaccount.com
```

## Step 4: Google OAuth Setup (For User Authentication & My Business API)

1. Go to https://console.cloud.google.com/apis/credentials
2. Click "Create Credentials" → "OAuth client ID"
3. Configure OAuth consent screen first:

   - User Type: External
   - App name: Reviews App
   - Support email: your-email@example.com
   - Authorized domains: vercel.app (and your custom domain if any)
   - Scopes:
     - openid
     - email
     - profile
     - https://www.googleapis.com/auth/business.manage

4. Create OAuth client:

   - Application type: Web application
   - Name: Reviews App Web Client
   - Authorized JavaScript origins:
     - https://dchddqxaelzokyjsebpx.supabase.co
     - https://reviews-dusky.vercel.app
     - http://localhost:5173
   - Authorized redirect URIs:
     - https://dchddqxaelzokyjsebpx.supabase.co/auth/v1/callback
     - https://reviews-dusky.vercel.app/account/integrations
     - http://localhost:5173/auth/callback
     - http://localhost:5173/account/integrations

5. Save the Client ID and Client Secret

## Step 5: Configure Supabase Authentication

1. Go to https://supabase.com/dashboard/project/dchddqxaelzokyjsebpx/auth/providers
2. Enable Google provider:
   - Client ID: (from step 4)
   - Client Secret: (from step 4)
3. Configure Auth settings:
   - Site URL: https://reviews-dusky.vercel.app
   - Redirect URLs:
     - https://reviews-dusky.vercel.app/**
     - http://localhost:5173/\*\*

## Step 6: Environment Variables

### Local Development (.env.local)

```bash
# Supabase
PUBLIC_SUPABASE_URL=https://dchddqxaelzokyjsebpx.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your-anon-key
PRIVATE_SUPABASE_SERVICE_ROLE=your-service-role-key

# Google OAuth (for My Business integration)
PUBLIC_GOOGLE_CLIENT_ID=your-oauth-client-id
GOOGLE_CLIENT_SECRET=your-oauth-client-secret

# Vertex AI
GOOGLE_CLOUD_PROJECT=reviews-app-prod
GOOGLE_CLOUD_LOCATION=us-central1
GOOGLE_APPLICATION_CREDENTIALS=./vertex-ai-key.json

# Optional
PRIVATE_STRIPE_API_KEY=your-stripe-key
PRIVATE_RESEND_API_KEY=your-resend-key
PRIVATE_ADMIN_EMAIL=admin@example.com
```

### Vercel Environment Variables

1. Go to your Vercel project settings
2. Add all the above variables
3. For Vertex AI credentials in Vercel:
   ```bash
   # Convert service account key to base64 and add as:
   GOOGLE_APPLICATION_CREDENTIALS_JSON={"type":"service_account",...}
   ```

## Step 7: GitHub Actions Setup

1. Go to your GitHub repository settings
2. Navigate to Secrets and Variables → Actions
3. Add these secrets:

   ```
   VERCEL_TOKEN
   VERCEL_ORG_ID
   VERCEL_PROJECT_ID
   SUPABASE_ACCESS_TOKEN
   STAGING_PROJECT_ID=dchddqxaelzokyjsebpx
   STAGING_DB_PASSWORD
   PRODUCTION_PROJECT_ID
   PRODUCTION_DB_PASSWORD
   ```

4. Add these variables:
   ```
   STAGING_URL=https://reviews-dusky.vercel.app
   PRODUCTION_URL=https://your-production-url.com
   ```

## Step 8: Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Link to Vercel project
vercel link

# Deploy to staging
vercel

# Deploy to production
vercel --prod
```

## Step 9: Test the Application

1. Visit https://reviews-dusky.vercel.app
2. Sign up with Google
3. Create your organization
4. Connect Google My Business account
5. View and respond to reviews
6. Test AI response generation

## Step 10: Production Checklist

- [ ] Set up custom domain in Vercel
- [ ] Configure production Supabase project
- [ ] Set up production Google Cloud project
- [ ] Enable Google Cloud billing alerts
- [ ] Set up error monitoring (Sentry)
- [ ] Configure backup strategy
- [ ] Set up SSL certificates
- [ ] Review and update security policies
- [ ] Configure rate limiting
- [ ] Set up monitoring and alerts

## Troubleshooting

### Google OAuth Issues

- Ensure redirect URIs match exactly
- Check that all required scopes are added
- Verify client ID and secret are correct

### Vertex AI Issues

- Check service account has correct permissions
- Verify project has billing enabled
- Ensure APIs are enabled

### Supabase Issues

- Check RLS policies are correctly set
- Verify service role key has correct permissions
- Ensure database migrations ran successfully

## Support

For issues or questions:

1. Check the documentation in `/docs`
2. Review error logs in Vercel dashboard
3. Check Supabase logs
4. Open an issue on GitHub
