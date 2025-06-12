# ReviewAI Pro

<p align="center">
  <img width="420" alt="ReviewAI Pro - Transform customer reviews into growth opportunities with AI" src="https://github.com/reviewaipro/reviewaipro/assets/placeholder.png">
</p>

<p align="center">
  <a href="https://github.com/reviewaipro/reviewaipro/actions/workflows/build.yml" target="_blank"><img src="https://github.com/reviewaipro/reviewaipro/actions/workflows/build.yml/badge.svg?branch=main" alt="Build Status"></a>
  <a href="https://github.com/reviewaipro/reviewaipro/actions/workflows/format.yml" target="_blank"><img src="https://github.com/reviewaipro/reviewaipro/actions/workflows/format.yml/badge.svg?branch=main" alt="Format Check"></a>
  <a href="https://github.com/reviewaipro/reviewaipro/actions/workflows/linting.yml" target="_blank"><img src="https://github.com/reviewaipro/reviewaipro/actions/workflows/linting.yml/badge.svg?branch=main" alt="Linting"></a>
  <a href="https://github.com/reviewaipro/reviewaipro/blob/main/LICENSE" target="_blank"><img src="https://img.shields.io/badge/License-MIT-brightgreen?labelColor=32383f" alt="License"></a>
</p>

<p align="center">
  <a href="https://reviewaipro.com"><strong>Homepage</strong></a> •
  <a href="#quick-start"><strong>Quick Start Guide</strong></a> • 
  <a href="https://github.com/reviewaipro/reviewaipro/issues"><strong>Issues</strong></a>
</p>

<br/>

## Transform Customer Reviews Into Growth Opportunities

ReviewAI Pro is an AI-powered review management platform that helps businesses respond to customer feedback efficiently and professionally. Built with modern web technologies and designed for scale.

### Key Features

- **AI-Powered Response Generation**: Generate personalized, professional responses using Google's Gemini models
- **Google My Business Integration**: Direct OAuth integration for seamless review management
- **Automated Background Sync**: Keep reviews up-to-date with configurable sync schedules
- **Multi-Tenant Architecture**: Secure organization-based data isolation with team collaboration
- **Real-Time Streaming**: AI responses stream in real-time for better UX
- **Token Management**: Secure OAuth token storage with automatic refresh
- **Enterprise Security**: Row-level security with encrypted token storage
- **Lightning Fast**: Built for performance with edge runtime compatibility

## Tech Stack

Built on the robust foundation of CMSaasStarter with additional AI capabilities:

- **Web Framework**: SvelteKit (v2.21.4) with Svelte 5
- **CSS / Styling**
  - Framework: TailwindCSS (v4.1.8)
  - Component library: DaisyUI (v5.0.43)
- **AI Integration**
  - Vercel AI SDK for streaming responses
  - Google Vertex AI (Gemini models) for advanced language understanding
  - Edge runtime compatible for global performance
- **Google Integration**
  - Google My Business API for review management
  - OAuth 2.0 for secure authentication
  - Automatic token refresh mechanism
- **Backend Services**
  - Database: PostgreSQL via Supabase with RLS
  - Authentication: Supabase Auth with Google OAuth
  - Background Jobs: Vercel Cron or Supabase Edge Functions
  - Payments: Stripe Checkout & Subscriptions
  - Email: Handlebars templates + Resend API
- **Development Tools**
  - TypeScript (v5.8.3) for type safety
  - ESLint (v9.28.0) with flat config
  - Prettier (v3.5.3) for code formatting
  - Vitest (v3.2.3) for testing

## Quick Start

### Prerequisites

- Node.js 18+
- A Supabase account (free tier works)
- Google Cloud account with:
  - Billing enabled
  - Vertex AI API enabled
  - OAuth consent screen configured
- A Stripe account for payments (optional)
- Google My Business account for testing

### Installation

1. Clone the repository:

```bash
git clone https://github.com/reviewaipro/reviewaipro.git
cd reviewaipro
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

```bash
cp .env.example .env.local
```

4. Configure your `.env.local` file:

```
# Supabase
PUBLIC_SUPABASE_URL=your_supabase_url
PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
PRIVATE_SUPABASE_SERVICE_ROLE=your_service_role_key

# Google OAuth (for My Business integration)
PUBLIC_GOOGLE_CLIENT_ID=your_oauth_client_id
GOOGLE_CLIENT_SECRET=your_oauth_client_secret

# Vertex AI
GOOGLE_CLOUD_PROJECT=your_gcp_project
GOOGLE_CLOUD_LOCATION=us-central1
GOOGLE_APPLICATION_CREDENTIALS=path_to_service_account.json

# Optional
PRIVATE_STRIPE_API_KEY=your_stripe_key
PRIVATE_RESEND_API_KEY=your_resend_key
CRON_SECRET=your_cron_secret  # For background sync
```

5. Apply database schema:

   - If using an existing Supabase project, run the migrations in the SQL editor
   - See `supabase/migrations/` for the schema files

6. Configure Google OAuth in Supabase:

   - Go to Authentication → Providers → Google
   - Add your Google OAuth credentials
   - Configure redirect URLs

7. Start the development server:

```bash
npm run dev
```

Visit `http://localhost:5173` to see your app running!

## Deployment

### Recommended Hosting Stack

- **Host + CDN**: Cloudflare Pages (free tier available)
- **Serverless Compute**: Cloudflare Workers
- **Database**: Supabase (free tier includes 500MB)
- **AI Processing**: Google Vertex AI (pay per use)

### Deploy to Production

1. Build the application:

```bash
npm run build
```

2. Deploy to Cloudflare Pages:

```bash
npx wrangler pages deploy .svelte-kit/cloudflare
```

See our [deployment guide](docs/deployment.md) for detailed instructions.

## Development

### Available Commands

```bash
# Development
npm run dev              # Start development server
npm run build            # Build for production
npm run preview         # Preview production build

# Code Quality
npm run lint            # Run ESLint
npm run format          # Format with Prettier
npm run check           # Type-check with svelte-check
npm test                # Run tests

# Full validation
./checks.sh             # Run all checks before committing
```

### Project Structure

```
src/
├── routes/
│   ├── (marketing)/    # Public pages (homepage, pricing, blog)
│   ├── (admin)/        # Authenticated user area
│   └── api/            # API endpoints
├── lib/
│   ├── components/     # Reusable Svelte components
│   ├── services/       # Business logic and API clients
│   └── emails/         # Email templates
└── app.html            # Main HTML template
```

## Core Features

### Google My Business Integration

1. **OAuth Flow**: Users connect their Google account with business.manage scope
2. **Account Selection**: Choose from accessible Google Business accounts
3. **Location Management**: View and manage reviews for all business locations
4. **Automatic Sync**: Background jobs keep reviews updated

### AI Response Generation

ReviewAI Pro uses Google Vertex AI for intelligent response generation:

1. **Setup**: See [docs/vertex-ai-integration.md](docs/vertex-ai-integration.md)
2. **Models**: Configurable Gemini models in `src/lib/config/gemini-models.json`
3. **API Endpoints**:
   - `POST /api/reviews/generate` - Generate AI responses
   - `POST /account/api/reviews` - Fetch reviews from Google
   - `GET /account/api/reviews/sync` - Manual sync trigger

### Background Sync

Automated review syncing keeps your database current:

1. **Vercel Cron**: Runs every 6 hours (configurable)
2. **Token Management**: Automatic refresh of expired OAuth tokens
3. **Error Handling**: Graceful failure recovery
4. **Monitoring**: Detailed sync status reporting

See [BACKGROUND_SYNC_SETUP.md](BACKGROUND_SYNC_SETUP.md) for details.

## Contributing

We welcome contributions! Please see our [contributing guide](CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Database Schema

Key tables for the review management system:

- **organizations**: Multi-tenant organization management
- **organization_members**: User-organization relationships
- **reviews**: Imported reviews with platform metadata
- **google_tokens**: Encrypted OAuth tokens for Google integration
- **service_account_keys**: Vertex AI service account storage

## Security

- **Row-Level Security**: All tables protected with RLS policies
- **Token Encryption**: OAuth tokens encrypted with AES-256-CBC
- **Organization Isolation**: Users only access their organization's data
- **Service Role**: Background jobs use separate authentication

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

Built on top of the excellent [CMSaasStarter](https://github.com/CriticalMoments/CMSaasStarter) template.

## Support

- Documentation: See `/docs` directory
- Setup Guide: [COMPLETE_SETUP_GUIDE.md](COMPLETE_SETUP_GUIDE.md)
- Background Sync: [BACKGROUND_SYNC_SETUP.md](BACKGROUND_SYNC_SETUP.md)
- Issues: [GitHub Issues](https://github.com/reviewaipro/reviewaipro/issues)

---

Made with ❤️ by the ReviewAI Pro team
