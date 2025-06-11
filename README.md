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

- **AI-Powered Response Generation**: Generate personalized, professional responses to customer reviews in seconds
- **Multi-Platform Support**: Manage reviews from Google Business, Yelp, TripAdvisor, Facebook, and more
- **Brand Voice Training**: AI learns your unique tone and style for authentic responses
- **Team Collaboration**: Multi-user support with role-based permissions
- **Analytics & Insights**: Track response performance and customer sentiment
- **Automated Workflows**: Set up rules for automatic response handling
- **Real-Time Notifications**: Get instant alerts for new reviews
- **Lightning Fast**: Built for performance with 100/100 Google PageSpeed scores

## Tech Stack

Built on the robust foundation of CMSaasStarter with additional AI capabilities:

- **Web Framework**: SvelteKit (v2.21.4) 
- **CSS / Styling**
  - Framework: TailwindCSS (v4.1.8)
  - Component library: DaisyUI (v5.0.43)
- **AI Integration**
  - Vercel AI SDK for streaming responses
  - Google Vertex AI (Gemini models) for advanced language understanding
  - Edge runtime compatible for global performance
- **Backend Services**
  - Database: PostgreSQL via Supabase
  - Authentication: Supabase Auth with OAuth support
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
- A Stripe account for payments (optional)
- Google Cloud account for AI features (optional)

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
PUBLIC_SUPABASE_URL=your_supabase_url
PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
PRIVATE_SUPABASE_SERVICE_ROLE=your_service_role_key
PRIVATE_STRIPE_API_KEY=your_stripe_key
PRIVATE_RESEND_API_KEY=your_resend_key
GOOGLE_CLOUD_PROJECT=your_gcp_project
GOOGLE_APPLICATION_CREDENTIALS=path_to_service_account.json
```

5. Run database migrations:
```bash
npm run db:migrate
```

6. Start the development server:
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

## AI Integration

ReviewAI Pro uses Google Vertex AI for intelligent response generation:

1. **Setup Vertex AI**: See [docs/vertex-ai-integration.md](docs/vertex-ai-integration.md)
2. **Configure Models**: Update `src/lib/config/gemini-models.json`
3. **Test Integration**: Visit `/account/ai-demo` when logged in

### API Endpoints

- `POST /api/reviews/generate` - Generate AI responses
  - Supports streaming and non-streaming modes
  - Requires authentication

## Contributing

We welcome contributions! Please see our [contributing guide](CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

Built on top of the excellent [CMSaasStarter](https://github.com/CriticalMoments/CMSaasStarter) template.

## Support

- Documentation: [docs.reviewaipro.com](https://docs.reviewaipro.com)
- Email: support@reviewaipro.com
- Issues: [GitHub Issues](https://github.com/reviewaipro/reviewaipro/issues)

---

Made with ❤️ by the ReviewAI Pro team