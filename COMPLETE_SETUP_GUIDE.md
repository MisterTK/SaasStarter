# Complete Setup Guide for ReviewAI Pro

This comprehensive guide will walk you through setting up the entire ReviewAI Pro platform from scratch, including all integrations and configurations.

## Prerequisites

- Node.js 18+ installed
- npm or pnpm package manager
- Google Cloud account with billing enabled
- Google My Business account (for testing)
- Vercel account (for deployment)
- GitHub account (for version control)
- Supabase account (free tier works)
- Stripe account (optional, for payments)

## Step 1: Clone and Install

```bash
# Clone the repository
git clone https://github.com/yourusername/reviewaipro.git
cd reviewaipro

# Install dependencies
npm install

# Or using pnpm
pnpm install
```

## Step 2: Supabase Setup

### Create a New Supabase Project

1. Go to https://supabase.com/dashboard
2. Click "New project"
3. Configure:
   - Name: ReviewAI Pro
   - Database Password: (save this securely)
   - Region: Choose closest to your users
   - Pricing Plan: Free tier is sufficient to start

### Apply Database Schema

1. Go to SQL Editor in Supabase Dashboard
2. Run each migration file in order:
   ```sql
   -- Run these in sequence:
   -- 1. supabase/migrations/20240730010101_initial.sql
   -- 2. supabase/migrations/20240731051052_add_unsubscribed_to_profiles.sql
   -- 3. supabase/migrations/20240806000000_create_reviews_table.sql
   ```

3. Additional tables needed (run this SQL):
   ```sql
   -- Organizations table
   CREATE TABLE organizations (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     name TEXT NOT NULL,
     slug TEXT NOT NULL UNIQUE,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   -- Organization members
   CREATE TABLE organization_members (
     organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
     user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
     role TEXT DEFAULT 'member',
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     PRIMARY KEY (organization_id, user_id)
   );

   -- Google tokens
   CREATE TABLE google_tokens (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
     user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
     access_token TEXT,
     refresh_token TEXT,
     expires_at TIMESTAMP WITH TIME ZONE,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   -- Service account keys
   CREATE TABLE service_account_keys (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
     project_id TEXT,
     key_data JSONB,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   -- Enable RLS
   ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
   ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
   ALTER TABLE google_tokens ENABLE ROW LEVEL SECURITY;
   ALTER TABLE service_account_keys ENABLE ROW LEVEL SECURITY;
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
# Create service account
gcloud iam service-accounts create reviewai-vertex \
  --display-name="ReviewAI Vertex AI Service"

# Grant necessary permissions
gcloud projects add-iam-policy-binding reviews-app-prod \
  --member="serviceAccount:reviewai-vertex@reviews-app-prod.iam.gserviceaccount.com" \
  --role="roles/aiplatform.user"

# Create and download key
gcloud iam service-accounts keys create vertex-ai-key.json \
  --iam-account=reviewai-vertex@reviews-app-prod.iam.gserviceaccount.com

# IMPORTANT: Keep this key secure and never commit to git!
```

## Step 4: Google OAuth Setup (For User Authentication & My Business API)

1. Go to https://console.cloud.google.com/apis/credentials
2. Click "Create Credentials" → "OAuth client ID"
3. Configure OAuth consent screen first:

   - User Type: External
   - App name: ReviewAI Pro
   - Support email: your-email@example.com
   - Authorized domains: 
     - vercel.app
     - supabase.co
     - Your custom domain (if any)
   - Scopes to add:
     - openid
     - email  
     - profile
     - https://www.googleapis.com/auth/business.manage
   - Test users: Add your email for testing while in development

4. Create OAuth client:

   - Application type: Web application
   - Name: ReviewAI Pro OAuth Client
   - Authorized JavaScript origins:
     - https://YOUR-PROJECT.supabase.co
     - https://YOUR-APP.vercel.app  
     - http://localhost:5173
     - http://localhost:54321 (Supabase local)
   - Authorized redirect URIs:
     - https://YOUR-PROJECT.supabase.co/auth/v1/callback
     - https://YOUR-APP.vercel.app/auth/callback
     - https://YOUR-APP.vercel.app/account/integrations
     - http://localhost:5173/auth/callback
     - http://localhost:5173/account/integrations
     - http://localhost:54321/auth/v1/callback

5. Save the Client ID and Client Secret

## Step 5: Configure Supabase Authentication

1. Go to your Supabase Dashboard → Authentication → Providers
2. Enable Google provider:
   - Client ID: (from step 4)
   - Client Secret: (from step 4)
   - Authorized Client IDs: (same as Client ID)
3. Configure Auth settings (Authentication → URL Configuration):
   - Site URL: http://localhost:5173 (for development)
   - Redirect URLs (add all of these):
     ```
     http://localhost:5173/**
     https://YOUR-APP.vercel.app/**
     https://YOUR-CUSTOM-DOMAIN.com/**
     ```
4. Configure Email Templates (Authentication → Email Templates):
   - Customize templates to match ReviewAI Pro branding

## Step 6: Environment Variables

### Local Development (.env.local)

Create a `.env.local` file in the project root:

```bash
# Supabase (from dashboard → Settings → API)
PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your-anon-key
PRIVATE_SUPABASE_SERVICE_ROLE=your-service-role-key

# Google OAuth (from step 4)
PUBLIC_GOOGLE_CLIENT_ID=your-oauth-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-oauth-client-secret

# Vertex AI
GOOGLE_CLOUD_PROJECT=reviews-app-prod
GOOGLE_CLOUD_LOCATION=us-central1
GOOGLE_APPLICATION_CREDENTIALS=./vertex-ai-key.json

# Optional but recommended
PRIVATE_STRIPE_API_KEY=sk_test_...
PRIVATE_RESEND_API_KEY=re_...
PRIVATE_ADMIN_EMAIL=admin@example.com
CRON_SECRET=your-random-secret-for-cron-jobs
```

### Vercel Environment Variables

1. Install Vercel CLI: `npm i -g vercel`
2. Link your project: `vercel link`
3. Add environment variables:
   ```bash
   # Add each variable
   vercel env add PUBLIC_SUPABASE_URL
   vercel env add PUBLIC_SUPABASE_ANON_KEY
   vercel env add PRIVATE_SUPABASE_SERVICE_ROLE
   # ... add all variables
   
   # For Vertex AI credentials, first encode the JSON:
   cat vertex-ai-key.json | base64 | tr -d '\n' > vertex-ai-key-base64.txt
   # Then add as GOOGLE_APPLICATION_CREDENTIALS_JSON
   ```

4. Or add via Vercel Dashboard:
   - Go to Project Settings → Environment Variables
   - Add each variable for Production, Preview, and Development

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

### Initial Deployment

```bash
# Build locally first to catch any errors
npm run build

# Deploy to Vercel
vercel

# Follow prompts:
# - Set up and deploy: Y
# - Which scope: Select your account
# - Link to existing project? N (first time)
# - Project name: reviewai-pro
# - Directory: ./
# - Override settings? N
```

### Configure Vercel Project

1. Go to Vercel Dashboard → Project Settings
2. Configure Build & Development Settings:
   - Framework Preset: SvelteKit
   - Build Command: `npm run build`
   - Output Directory: `.svelte-kit/cloudflare`
3. Configure Functions:
   - Region: Choose closest to your users
4. Set up custom domain (optional)

## Step 9: Test the Application

### Local Testing

```bash
# Start development server
npm run dev

# Open http://localhost:5173
```

### Testing Checklist

1. **Authentication Flow**:
   - Sign up with Google
   - Verify profile creation
   - Test sign out/sign in

2. **Organization Setup**:
   - Create organization
   - Verify slug generation
   - Check organization switching

3. **Google My Business Integration**:
   - Click "Connect Google Account"
   - Authorize with business.manage scope
   - Select a business account
   - Verify reviews import

4. **AI Response Generation**:
   - Select a review
   - Click "Generate Response"
   - Test different tones/styles
   - Verify streaming works

5. **Background Sync** (if configured):
   - Trigger manual sync
   - Check for new reviews
   - Verify token refresh

## Step 10: Production Checklist

### Essential Tasks

- [ ] **Custom Domain**: Configure in Vercel settings
- [ ] **Production Database**: 
  - Create production Supabase project
  - Run all migrations
  - Configure RLS policies
- [ ] **Google Cloud Production**:
  - Create production GCP project
  - Set up billing alerts at $100, $500, $1000
  - Create production OAuth credentials
  - Generate new service account key
- [ ] **Environment Variables**:
  - Update all production variables in Vercel
  - Rotate all keys/secrets
  - Document in secure location

### Security & Monitoring

- [ ] **Error Tracking**: 
  - Set up Sentry or similar
  - Configure error alerts
- [ ] **Security**:
  - Enable 2FA on all service accounts
  - Review OAuth scopes
  - Audit RLS policies
  - Set up security headers
- [ ] **Monitoring**:
  - Set up uptime monitoring
  - Configure performance alerts
  - Monitor API usage
  - Track Vertex AI costs

### Performance

- [ ] **Optimization**:
  - Enable Vercel Analytics
  - Set up caching headers
  - Configure CDN
  - Optimize images
- [ ] **Scaling**:
  - Configure auto-scaling
  - Set up rate limiting
  - Plan for database connection pooling

## Troubleshooting

### Common Issues and Solutions

#### Google OAuth "Redirect URI mismatch"
- Exact match required including protocol and trailing slashes
- Wait 5-10 minutes after adding new URIs
- Clear browser cache and cookies
- Check for whitespace in environment variables

#### Vertex AI "Permission denied"
```bash
# Verify service account permissions
gcloud projects get-iam-policy reviews-app-prod \
  --flatten="bindings[].members" \
  --filter="bindings.members:serviceAccount:reviewai-vertex@*"

# Re-enable APIs if needed
gcloud services enable aiplatform.googleapis.com
```

#### Supabase "Invalid API key"
- Verify you're using anon key for client, service role for server
- Check for trailing/leading whitespace
- Ensure keys match the correct project
- Regenerate keys if compromised

#### "No reviews showing up"
- Check Google My Business account has reviews
- Verify OAuth token has business.manage scope
- Check browser console for API errors
- Try manual sync from integrations page

#### Build Failures
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build

# Check for TypeScript errors
npm run check
```

### Debug Mode

Enable debug logging:
```typescript
// In your code
if (import.meta.env.DEV) {
  console.log('Debug info:', data);
}
```

### Getting Help

1. **Documentation**: Check `/docs` folder for detailed guides
2. **Logs**: 
   - Vercel: Function logs in dashboard
   - Supabase: Logs explorer in dashboard
   - Browser: Console and Network tabs
3. **Community**: Open an issue with:
   - Error messages
   - Steps to reproduce
   - Environment details
   - Relevant logs
