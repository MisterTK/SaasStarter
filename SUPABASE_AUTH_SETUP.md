# Supabase Authentication Setup Guide

## Configure Authentication Providers

1. **Go to your Supabase Dashboard**

   - Navigate to: https://supabase.com/dashboard/project/dchddqxaelzokyjsebpx/auth/providers

2. **Enable Email Provider**

   - Toggle "Enable Email provider" ON
   - Configure email settings as needed

3. **Enable Google OAuth**
   - Toggle "Google" provider ON
   - You'll need to set up Google OAuth credentials:

### Setting up Google OAuth

1. **Go to Google Cloud Console**

   - https://console.cloud.google.com/
   - Select your project or create a new one

2. **Create OAuth 2.0 Credentials**

   - Go to APIs & Services → Credentials
   - Click "Create Credentials" → "OAuth client ID"
   - Application type: "Web application"
   - Name: "Reviews App Auth"

3. **Configure Authorized URLs**

   - Authorized JavaScript origins:
     - `https://dchddqxaelzokyjsebpx.supabase.co`
     - `https://reviews-dusky.vercel.app`
     - `http://localhost:5173` (for local development)
   - Authorized redirect URIs:
     - `https://dchddqxaelzokyjsebpx.supabase.co/auth/v1/callback`
     - `http://localhost:5173/auth/callback` (for local development)

4. **Copy Credentials to Supabase**
   - Copy the Client ID and Client Secret
   - Paste them into the Google provider settings in Supabase

## Configure Auth Settings

1. **URL Configuration** (in Supabase Auth settings)

   - Site URL: `https://reviews-dusky.vercel.app`
   - Redirect URLs (add all of these):
     - `https://reviews-dusky.vercel.app/**`
     - `http://localhost:5173/**`

2. **Email Templates** (optional)
   - Customize the confirmation, invitation, and recovery emails

## Test the Flow

1. Visit https://reviews-dusky.vercel.app/login/sign_up
2. Try signing up with Google
3. After authentication, you should be redirected to create your organization
4. Complete the organization setup
5. You'll then see your dashboard

## Troubleshooting

- If Google OAuth doesn't work, check the redirect URIs match exactly
- Ensure the Supabase URL and anon key are correctly set in Vercel
- Check browser console for any error messages
