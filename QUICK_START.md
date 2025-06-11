# ReviewAI Pro Quick Start Guide

This is a condensed setup guide for experienced developers. For detailed instructions, see [COMPLETE_SETUP_GUIDE.md](COMPLETE_SETUP_GUIDE.md).

## Prerequisites Checklist

- [ ] Node.js 18+
- [ ] Google Cloud account with billing
- [ ] Supabase account
- [ ] Google My Business account (for testing)
- [ ] Vercel account (for deployment)

## 1. Clone and Install

```bash
git clone <repository-url>
cd reviewaipro
npm install
cp .env.example .env.local
```

## 2. Google Cloud Setup

```bash
# Create project
gcloud projects create reviewai-prod --name="ReviewAI Pro"
gcloud config set project reviewai-prod

# Enable APIs
gcloud services enable aiplatform.googleapis.com
gcloud services enable mybusinessbusinessinformation.googleapis.com
gcloud services enable mybusinessaccountmanagement.googleapis.com

# Create service account
gcloud iam service-accounts create reviewai-vertex \
  --display-name="ReviewAI Vertex AI"

gcloud projects add-iam-policy-binding reviewai-prod \
  --member="serviceAccount:reviewai-vertex@reviewai-prod.iam.gserviceaccount.com" \
  --role="roles/aiplatform.user"

gcloud iam service-accounts keys create vertex-ai-key.json \
  --iam-account=reviewai-vertex@reviewai-prod.iam.gserviceaccount.com
```

## 3. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Configure OAuth consent screen:
   - Add scopes: `openid`, `email`, `profile`, `https://www.googleapis.com/auth/business.manage`
3. Create OAuth 2.0 Client ID:
   - Type: Web application
   - Add redirect URIs for Supabase and your app

## 4. Supabase Setup

1. Create new project at [supabase.com](https://supabase.com)
2. Run migrations in SQL editor (see `supabase/migrations/`)
3. Enable Google auth provider with OAuth credentials
4. Configure redirect URLs

## 5. Environment Variables

```bash
# .env.local
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your-anon-key
PRIVATE_SUPABASE_SERVICE_ROLE=your-service-role

PUBLIC_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret

GOOGLE_CLOUD_PROJECT=reviewai-prod
GOOGLE_APPLICATION_CREDENTIALS=./vertex-ai-key.json

CRON_SECRET=generate-random-secret
```

## 6. Run Locally

```bash
npm run dev
# Open http://localhost:5173
```

## 7. Deploy to Vercel

```bash
vercel
# Follow prompts, then configure environment variables in dashboard
```

## Key Features to Test

1. **Authentication**: Sign up/in with Google
2. **Organization**: Create and switch organizations
3. **Google Integration**: Connect Google My Business account
4. **Reviews**: Import and view reviews
5. **AI Responses**: Generate responses with different tones
6. **Background Sync**: Check cron job at `/api/cron/sync-reviews`

## Common Issues

| Issue | Solution |
|-------|----------|
| OAuth redirect mismatch | Ensure exact URI match including trailing slashes |
| Vertex AI permission denied | Check service account has aiplatform.user role |
| No reviews showing | Verify Google account has business.manage scope |
| Build failures | Run `npm run check` to find TypeScript errors |

## Project Structure

```
src/
├── routes/
│   ├── (marketing)/     # Public pages
│   ├── (admin)/         # Protected pages
│   └── api/            # API endpoints
├── lib/
│   ├── services/       # Business logic
│   │   ├── ai/        # Vertex AI integration
│   │   └── google-my-business.ts
│   └── components/     # Reusable UI
└── DatabaseDefinitions.ts
```

## Next Steps

1. Set up production environment
2. Configure custom domain
3. Enable monitoring and alerts
4. Review security settings
5. Set up backup strategy

For detailed documentation, see:
- [Complete Setup Guide](COMPLETE_SETUP_GUIDE.md)
- [Environment Variables](ENVIRONMENT_VARIABLES.md)
- [Database Schema](DATABASE_SCHEMA.md)
- [Background Sync Setup](BACKGROUND_SYNC_SETUP.md)