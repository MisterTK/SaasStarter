# Review Response Generator

An AI-powered multi-tenant application for generating professional responses to Google reviews. Featuring streaming responses, multiple variations, intelligent caching, and organization-based authentication.

## 🚀 Features

- **Multi-Tenant Architecture**: Secure organization-based authentication and data isolation
- **Smart Response Generation**: Uses AI to create contextual, personalized responses
- **Streaming Responses**: Real-time response generation with streaming support (default mode)
- **Multiple Variations**: API support for generating up to 3 response variations (future UI feature)
- **Sentiment Analysis**: Automatic review sentiment and priority detection
- **Response Caching**: Intelligent LRU caching for faster responses
- **Rate Limiting**: Built-in rate limiting for API protection
- **Meta-Prompt Configuration**: Customize company voice, tone, and guidelines per organization
- **Collaborative Business Guidance**: Real-time sync via Supabase for menu items and guidelines within organizations
- **Business Knowledge**: Include specific information about your business
- **Review History**: Track and learn from past responses per organization
- **User Management**: Invite and manage team members within your organization
- **Edge Runtime**: Optimized for Vercel Edge Functions for low latency
- **TypeScript**: Full type safety throughout the application

## 🏗️ Architecture

- **Frontend**: SvelteKit, TypeScript, Tailwind CSS
- **AI Integration**: Vercel AI SDK with Google Vertex AI
- **Database**: Supabase (PostgreSQL with real-time sync)
- **Authentication**: Supabase Auth with organization-based access control
- **Streaming**: Server-Sent Events (SSE) for real-time updates
- **Caching**: LRU cache with TTL support
- **Rate Limiting**: Token bucket algorithm
- **Deployment**: Vercel Edge Functions
- **State Management**: Svelte stores with organization context
