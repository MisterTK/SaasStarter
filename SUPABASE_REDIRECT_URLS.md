# Supabase Redirect URLs Configuration

To support authentication on Vercel preview deployments, you need to add the following redirect URLs to your Supabase project:

## Required Redirect URLs

1. **Production URL** (already configured):

   - `https://reviews-dusky.vercel.app/**`

2. **Vercel Preview Deployments** (add this):

   - `https://*-mistertks-projects.vercel.app/**`

3. **Local Development** (if not already added):
   - `http://localhost:5173/**`

## How to Configure

1. Go to your Supabase Dashboard
2. Navigate to Authentication → URL Configuration
3. Add the wildcard URL for Vercel preview deployments: `https://*-mistertks-projects.vercel.app/**`
4. Save the changes

## Why This is Needed

When users authenticate on a preview deployment (e.g., `reviews-git-develop-mistertks-projects.vercel.app`), Supabase needs to allow redirects back to that specific URL. The wildcard pattern allows any preview deployment to work without manually adding each one.

## Dynamic Redirect Implementation

The codebase now includes:

- `src/lib/auth-redirect.ts` - Helper functions for dynamic redirect URLs
- Updated login pages to use `window.location.origin` for redirects
- Google OAuth integration that preserves the current domain

This ensures users stay on the same domain throughout the authentication flow, whether on production or a preview deployment.

## Google OAuth Configuration

For Google My Business OAuth to work on preview deployments, you also need to:

1. Go to your Google Cloud Console
2. Navigate to APIs & Services → Credentials
3. Edit your OAuth 2.0 Client ID
4. Add the following Authorized redirect URIs:
   - `https://reviews-dusky.vercel.app/account/integrations`
   - `https://reviews-git-develop-mistertks-projects.vercel.app/account/integrations`
   - Any other preview deployment URLs you want to support

Note: Google OAuth doesn't support wildcards, so you'll need to add each preview deployment URL manually if you want OAuth to work there.
