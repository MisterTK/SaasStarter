# Environment Variables Documentation

This document provides a comprehensive guide to all environment variables used in the ReviewAI Pro platform.

## Required Variables

### Supabase Configuration

```bash
# The URL of your Supabase project
# Example: https://your-project.supabase.co
PUBLIC_SUPABASE_URL=

# The anonymous key for client-side Supabase access
# Found in: Supabase Dashboard → Settings → API → anon public
PUBLIC_SUPABASE_ANON_KEY=

# The service role key for server-side operations
# Found in: Supabase Dashboard → Settings → API → service_role secret
# IMPORTANT: Keep this secret! Never expose in client-side code
PRIVATE_SUPABASE_SERVICE_ROLE=
```

### Google OAuth Configuration

```bash
# OAuth Client ID for Google authentication
# Create at: https://console.cloud.google.com/apis/credentials
# Required for Google My Business integration
PUBLIC_GOOGLE_CLIENT_ID=

# OAuth Client Secret
# IMPORTANT: Keep this secret! Only use in server-side code
GOOGLE_CLIENT_SECRET=
```

### Google Vertex AI Configuration

```bash
# Your Google Cloud Project ID
# Example: my-project-123456
GOOGLE_CLOUD_PROJECT=

# The region for Vertex AI operations
# Default: us-central1
# Options: us-central1, us-east1, us-east4, us-south1, us-west1, us-west2, us-west3, us-west4, 
#          northamerica-northeast1, northamerica-northeast2, southamerica-east1, southamerica-west1,
#          europe-central2, europe-north1, europe-southwest1, europe-west1, europe-west2, 
#          europe-west3, europe-west4, europe-west6, europe-west8, europe-west9,
#          africa-south1, asia-east1, asia-east2, asia-northeast1, asia-northeast3, 
#          asia-south1, asia-southeast1, asia-southeast2, australia-southeast1, australia-southeast2,
#          me-central1, me-central2, me-west1
GOOGLE_CLOUD_LOCATION=us-central1

# Path to service account JSON file (local development)
# For production, use GOOGLE_APPLICATION_CREDENTIALS_JSON instead
GOOGLE_APPLICATION_CREDENTIALS=./service-account.json

# Base64-encoded service account JSON (production)
# Create with: base64 -i service-account.json | tr -d '\n'
# Used in Vercel/production environments where file system access is limited
GOOGLE_APPLICATION_CREDENTIALS_JSON=
```

## Optional Variables

### Payment Processing

```bash
# Stripe secret key for payment processing
# Test key: starts with sk_test_
# Live key: starts with sk_live_
# Found in: Stripe Dashboard → Developers → API keys
PRIVATE_STRIPE_API_KEY=
```

### Email Configuration

```bash
# Resend API key for sending transactional emails
# Found in: Resend Dashboard → API Keys
PRIVATE_RESEND_API_KEY=

# Admin email for system notifications
# Receives alerts for new contact form submissions, errors, etc.
PRIVATE_ADMIN_EMAIL=admin@example.com
```

### Background Sync

```bash
# Secret key for authenticating cron job requests
# Generate with: openssl rand -hex 32
# Used to protect /api/cron/* endpoints
CRON_SECRET=
```

## Environment-Specific Configuration

### Local Development (.env.local)

```bash
# Minimal configuration for local development
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your-anon-key
PRIVATE_SUPABASE_SERVICE_ROLE=your-service-role-key

PUBLIC_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret

GOOGLE_CLOUD_PROJECT=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=./vertex-ai-key.json
```

### Vercel Production

Set these in Vercel Dashboard → Settings → Environment Variables:

1. All variables from local development
2. Replace `GOOGLE_APPLICATION_CREDENTIALS` with `GOOGLE_APPLICATION_CREDENTIALS_JSON`
3. Add `CRON_SECRET` for background sync
4. Add production Stripe keys if using payments

### GitHub Actions

For CI/CD, add these secrets in GitHub → Settings → Secrets:

```bash
# Vercel deployment
VERCEL_TOKEN
VERCEL_ORG_ID
VERCEL_PROJECT_ID

# Supabase migrations
SUPABASE_ACCESS_TOKEN
SUPABASE_PROJECT_ID
SUPABASE_DB_PASSWORD

# Environment URLs
STAGING_URL=https://your-app-staging.vercel.app
PRODUCTION_URL=https://your-app.com
```

## Security Best Practices

1. **Never commit `.env` files** - Use `.env.local` for local development
2. **Separate staging/production** - Use different API keys for each environment
3. **Rotate keys regularly** - Especially after team member changes
4. **Use least privilege** - Create service accounts with minimal required permissions
5. **Monitor usage** - Set up alerts for unusual API usage

## Troubleshooting

### Common Issues

1. **"Invalid API key" errors**
   - Verify the key is correct and active
   - Check you're using the right environment's keys
   - Ensure the key has necessary permissions

2. **"CORS error" with Supabase**
   - Check PUBLIC_SUPABASE_URL doesn't have trailing slash
   - Verify redirect URLs in Supabase auth settings

3. **"Permission denied" from Vertex AI**
   - Ensure service account has "Vertex AI User" role
   - Check project has billing enabled
   - Verify APIs are enabled in GCP

4. **OAuth redirect mismatch**
   - Exact match required for redirect URIs
   - Include both localhost and production URLs
   - Don't forget the port number for localhost

## Variable Validation

Add this to your app startup to validate required variables:

```typescript
const requiredEnvVars = [
  'PUBLIC_SUPABASE_URL',
  'PUBLIC_SUPABASE_ANON_KEY',
  'PRIVATE_SUPABASE_SERVICE_ROLE',
  'PUBLIC_GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'GOOGLE_CLOUD_PROJECT'
];

for (const varName of requiredEnvVars) {
  if (!process.env[varName]) {
    throw new Error(`Missing required environment variable: ${varName}`);
  }
}
```