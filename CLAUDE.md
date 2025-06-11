# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Development
npm run dev              # Start development server

# Building & Production
npm run build            # Build for production
npm run preview         # Preview production build locally

# Code Quality
npm run lint            # Run ESLint
npm run format          # Format code with Prettier
npm run format_check    # Check formatting without fixing
npm run check           # Type-check with svelte-check
npm run check:watch     # Type-check in watch mode

# Testing
npm test                # Run tests in watch mode
npm run test_run        # Run tests once

# Full validation (run before committing)
./checks.sh             # Runs build, lint, format, and type checks
```

## Architecture Overview

ReviewAI Pro is a **SvelteKit** application for AI-powered review management with the following architecture:

### Tech Stack

- **Frontend**: SvelteKit with Svelte 5, TypeScript, Tailwind CSS v4, DaisyUI
- **Backend**: Supabase (Auth, PostgreSQL with RLS, Storage)
- **AI Integration**: Google Vertex AI with Vercel AI SDK for streaming
- **Review Platform**: Google My Business API with OAuth 2.0
- **Background Jobs**: Vercel Cron or Supabase Edge Functions
- **Payments**: Stripe (Checkout, Subscriptions, Customer Portal)
- **Email**: Handlebars templates + Resend API
- **Search**: Pre-built Fuse.js index generated at build time

### Route Structure

- `/(marketing)/` - Public pages (pre-rendered for performance)
  - Homepage, pricing, blog, login/signup, contact
  - SEO optimized with sitemap.xml and RSS feed
- `/(admin)/` - Authenticated user area
  - Account dashboard, billing, settings
  - Reviews management with AI response generation
  - Google My Business integration
  - Organization management
  - Protected by server-side auth checks
- `/api/` - API endpoints
  - Review generation and sync
  - Cron jobs for background tasks

### Key Patterns

#### Authentication Flow

- Server hooks in `src/hooks.server.ts` create Supabase clients
- `safeGetSession` validates JWTs server-side
- Auth state persisted in cookies
- OAuth providers configured in `src/routes/(marketing)/login/login_config.ts`

#### Database Schema

- `profiles` - User profiles with RLS
- `organizations` - Multi-tenant organization data
- `organization_members` - User-organization relationships
- `reviews` - Imported reviews from various platforms
- `google_tokens` - Encrypted OAuth tokens
- `service_account_keys` - Vertex AI credentials
- `stripe_customers` - Payment mapping
- `contact_requests` - Form submissions
- Migrations in `supabase/migrations/`

#### Subscription Management

- Plans defined in `src/routes/(marketing)/pricing/pricing_plans.ts`
- Stripe integration for payments
- Subscription helpers in `src/routes/(admin)/account/subscription_helpers.server.ts`

#### Build-time Optimizations

- Search index generation via Vite plugin
- Marketing pages pre-rendered as static HTML
- Large inline styles (150KB threshold) for faster initial load

## Environment Variables

Required for development and production:

```
# Supabase
PUBLIC_SUPABASE_URL
PUBLIC_SUPABASE_ANON_KEY
PRIVATE_SUPABASE_SERVICE_ROLE

# Google OAuth (for My Business integration)
PUBLIC_GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET

# Vertex AI
GOOGLE_CLOUD_PROJECT
GOOGLE_CLOUD_LOCATION           # Optional - defaults to us-central1
GOOGLE_APPLICATION_CREDENTIALS  # Path to service account JSON

# Optional Services
PRIVATE_STRIPE_API_KEY         # For payments
PRIVATE_RESEND_API_KEY         # For sending emails
PRIVATE_ADMIN_EMAIL           # Admin notifications
CRON_SECRET                   # For background sync authentication
```

## Common Tasks

### Adding a New Page

- Marketing pages: Add to `src/routes/(marketing)/` with `+page.svelte`
- Admin pages: Add to `src/routes/(admin)/` with auth checks
- Pre-render static pages by keeping default settings
- Dynamic pages: Set `export const prerender = false` in `+page.ts`

### Working with the Database

- Use Supabase dashboard SQL editor for schema changes
- Add RLS policies for security
- Use service role client only in server-side code (+page.server.ts)
- Organization-scoped queries use `getUserOrganization()` helper
- Token encryption/decryption handled automatically by services

### Modifying Subscription Plans

- Update `src/routes/(marketing)/pricing/pricing_plans.ts`
- Ensure Stripe product/price IDs match
- Free plan has no stripe_price_id

### Email Templates

- Templates in `src/lib/emails/` using Handlebars
- Send via `sendEmail()` from `src/lib/mailer.ts`
- Configure SMTP in Supabase Auth settings

### Testing Payments

- Use Stripe test mode keys in development
- Test card: 4242 4242 4242 4242
- Webhook testing requires Stripe CLI or live deployment

## Key Integrations

### Google Vertex AI

AI-powered review response generation using Google's Gemini models:

- **Service**: `ResponseGeneratorService` with streaming support
- **Models**: Configurable in `/src/lib/config/gemini-models.json`
- **Endpoint**: `POST /api/reviews/generate`
- **Demo**: `/account/ai-demo` page

### Google My Business

OAuth-based integration for review management:

- **Service**: `GoogleMyBusinessService` with automatic token refresh
- **Token Storage**: Encrypted in `google_tokens` table
- **Endpoints**:
  - `POST /account/api/reviews` - Fetch reviews
  - `GET /account/api/reviews/sync` - Manual sync
  - `POST /api/cron/sync-reviews` - Background sync

### Background Sync

Automated review syncing:

- **Vercel Cron**: Configured in `vercel.json`
- **Schedule**: Every 6 hours (configurable)
- **Security**: Protected by `CRON_SECRET`
- **Monitoring**: Returns sync status and statistics

## Security Patterns

- **Organization Isolation**: All queries scoped to user's organization
- **Token Encryption**: OAuth tokens encrypted with AES-256-CBC
- **RLS Policies**: Database-level security for all tables
- **Service Role**: Background jobs use separate authentication
