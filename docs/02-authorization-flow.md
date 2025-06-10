# Authorization Flow: Front-end to Background Edge Functions

## The Complete Flow: User Login → Background Automation

Here's exactly how authorization flows from your user's one-time login to your automated edge functions:

### Phase 1: Initial User Authentication & Google Authorization

```typescript
// 1. User logs into your SvelteKit app via Supabase OAuth
// src/routes/login/+page.svelte
<script>
  import { supabase } from '$lib/auth/supabase'

  async function signInWithGoogle() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: 'openid profile email' // Basic user auth
      }
    })
  }
</script>

<button on:click={signInWithGoogle}>Login to MyApp</button>
```

### Phase 2: Google My Business Authorization (Separate Flow)

After user is logged into your app, they need to authorize Google My Business access:

```typescript
// src/routes/dashboard/connect-google/+page.svelte
<script>
  import { page } from '$app/stores'

  async function connectGoogleBusiness() {
    // This triggers a separate OAuth flow for Google My Business
    const response = await fetch('/api/auth/google-business/authorize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenantId: $page.data.user.tenant_id,
        userId: $page.data.user.id
      })
    })

    const { authUrl } = await response.json()

    // Redirect user to Google's consent screen
    window.location.href = authUrl
  }
</script>

<button on:click={connectGoogleBusiness}>
  Connect Google My Business
</button>
```

### Phase 3: Backend Handles Google Business OAuth

```typescript
// src/routes/api/auth/google-business/authorize/+server.ts
export const POST: RequestHandler = async ({ request, locals }) => {
  const { tenantId, userId } = await request.json()

  // Verify user is authenticated via Supabase
  if (\!locals.session?.user) {
    return json({ error: 'Unauthorized' }, { status: 401 })
  }

  const tenant = await getTenantConfig(tenantId)

  const oauth2Client = new google.auth.OAuth2(
    tenant.googleClientId,
    tenant.googleClientSecret,
    `${VERCEL_URL}/api/auth/google-business/callback`
  )

  // Generate authorization URL with offline access
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline', // CRITICAL: This gives us refresh tokens
    prompt: 'consent',      // CRITICAL: Forces refresh token on subsequent auths
    scope: ['https://www.googleapis.com/auth/business.manage'],
    state: JSON.stringify({ tenantId, userId }) // Pass context
  })

  return json({ authUrl })
}
```

### Phase 4: Capture and Store Long-lived Refresh Token

```typescript
// src/routes/api/auth/google-business/callback/+server.ts
export const GET: RequestHandler = async ({ url }) => {
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')

  if (\!code || \!state) {
    throw redirect(303, '/dashboard?error=auth_failed')
  }

  const { tenantId, userId } = JSON.parse(state)
  const tenant = await getTenantConfig(tenantId)

  const oauth2Client = new google.auth.OAuth2(
    tenant.googleClientId,
    tenant.googleClientSecret,
    `${VERCEL_URL}/api/auth/google-business/callback`
  )

  // Exchange code for tokens
  const { tokens } = await oauth2Client.getToken(code)

  // CRITICAL: Store the refresh token securely
  await storeGoogleTokens(tenantId, userId, {
    access_token: tokens.access_token\!,
    refresh_token: tokens.refresh_token\!, // This is the golden ticket
    expires_at: Math.floor(Date.now() / 1000) + tokens.expiry_date\!,
    scope: tokens.scope,
    token_type: tokens.token_type
  })

  throw redirect(303, '/dashboard?google_connected=true')
}
```

### Phase 5: Background Edge Functions Use Stored Tokens

Now your edge functions can work in the background using the stored refresh tokens:

```typescript
// src/routes/api/cron/sync-reviews/+server.ts
export const config = {
  runtime: 'edge'
}

export const GET: RequestHandler = async ({ request }) => {
  // Verify this is a legitimate cron job
  const authHeader = request.headers.get('authorization')
  if (authHeader \!== `Bearer ${CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  // Get all tenants that have Google connections
  const tenants = await getTenantsWithGoogleAuth()

  for (const tenant of tenants) {
    await syncReviewsForTenant(tenant)
  }

  return json({ success: true, processed: tenants.length })
}

async function syncReviewsForTenant(tenant: Tenant) {
  // Get the stored refresh token (NO USER INTERACTION NEEDED)
  const tokens = await getStoredGoogleTokens(tenant.id, tenant.adminUserId)

  if (\!tokens?.refresh_token) {
    console.log(`No Google auth for tenant ${tenant.id}`)
    return
  }

  // Create authenticated Google client using stored refresh token
  const oauth2Client = new google.auth.OAuth2(
    tenant.googleClientId,
    tenant.googleClientSecret
  )

  oauth2Client.setCredentials({
    refresh_token: tokens.refresh_token,
    access_token: tokens.access_token,
    expiry_date: tokens.expires_at * 1000
  })

  // The client will automatically refresh access tokens as needed
  const mybusiness = google.mybusinessaccountmanagement({
    version: 'v1',
    auth: oauth2Client
  })

  // Make API calls - access tokens refresh automatically
  const accounts = await mybusiness.accounts.list()

  for (const account of accounts.data.accounts || []) {
    const reviews = await getRecentReviews(account.name\!)
    await processReviews(tenant, reviews)
  }
}
```

### Phase 6: Automatic Token Refresh in Background

```typescript
// src/lib/auth/token-manager.ts
export class BackgroundTokenManager {
  static async getValidGoogleClient(tenantId: string, userId: string) {
    const tokens = await getStoredGoogleTokens(tenantId, userId)

    if (\!tokens?.refresh_token) {
      throw new Error('No refresh token - user needs to reconnect Google')
    }

    const tenant = await getTenantConfig(tenantId)
    const oauth2Client = new google.auth.OAuth2(
      tenant.googleClientId,
      tenant.googleClientSecret
    )

    oauth2Client.setCredentials({
      refresh_token: tokens.refresh_token,
      access_token: tokens.access_token,
      expiry_date: tokens.expires_at ? tokens.expires_at * 1000 : undefined
    })

    // Auto-save refreshed tokens
    oauth2Client.on('tokens', async (newTokens) => {
      const updatedTokens = {
        ...tokens,
        access_token: newTokens.access_token\!,
        expires_at: newTokens.expiry_date
          ? Math.floor(newTokens.expiry_date / 1000)
          : tokens.expires_at
      }

      if (newTokens.refresh_token) {
        updatedTokens.refresh_token = newTokens.refresh_token
      }

      await storeGoogleTokens(tenantId, userId, updatedTokens)
    })

    return oauth2Client
  }
}
```

## Key Authorization Principles

### 1. **Two Separate OAuth Flows**

- **Supabase OAuth**: User logs into your app
- **Google My Business OAuth**: User authorizes your app to access their business data

### 2. **Refresh Token is the Key**

```typescript
// The refresh token allows background access indefinitely
const refreshToken = "1//04_refresh_token_here" // Stored securely
// This token doesn't expire (when app is in Production status)
// Edge functions use this to get fresh access tokens automatically
```

### 3. **No User Present? No Problem\!**

```typescript
// Edge function running at 3 AM
const oauth2Client = new google.auth.OAuth2(clientId, clientSecret)
oauth2Client.setCredentials({ refresh_token: storedRefreshToken })

// This call happens with NO user interaction
const reviews = await mybusiness.accounts.locations.reviews.list({
  parent: locationName,
  filter: 'createTime >= "2024-01-01T00:00:00Z"',
})
```

### 4. **Security Model**

```typescript
// Database: Encrypted token storage
CREATE TABLE google_tokens (
  tenant_id UUID NOT NULL,
  user_id UUID NOT NULL,
  refresh_token_encrypted TEXT NOT NULL, -- AES encrypted
  access_token_encrypted TEXT,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  PRIMARY KEY (tenant_id, user_id)
);

-- Row Level Security ensures tenant isolation
CREATE POLICY "tenant_tokens" ON google_tokens
FOR ALL USING (
  tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
);
```

## Complete User Journey

1. **User visits your app** → Signs in with Supabase (Google OAuth)
2. **User goes to integrations page** → Clicks "Connect Google My Business"
3. **User authorizes on Google** → Grants permission to access their business data
4. **Your app stores refresh token** → Encrypted in database, tied to user/tenant
5. **User leaves and never comes back** → App continues working
6. **Edge functions run automatically** → Use stored refresh tokens to access API
7. **Tokens refresh seamlessly** → Google client library handles this automatically

## The Magic: Refresh Token Persistence

```typescript
// This is what makes background automation possible:

// User authorizes ONCE (with offline access)
const authUrl = oauth2Client.generateAuthUrl({
  access_type: "offline", // Gives refresh token
  prompt: "consent", // Ensures refresh token on repeat auths
})

// Your app gets a refresh token that doesn't expire
const { tokens } = await oauth2Client.getToken(code)
// tokens.refresh_token = "1//04..." <- This is your golden ticket

// Months later, edge function uses it
oauth2Client.setCredentials({ refresh_token: storedRefreshToken })
const result = await mybusiness.accounts.list() // Just works\!
```

## Automated Review Response Example

```typescript
// Example automated review processing
async function processReview(tenant: Tenant, review: Review) {
  // Check if review already processed
  const existing = await supabase
    .from("reviews")
    .select("id")
    .eq("google_review_id", review.reviewId)
    .single()

  if (existing.data) return // Already processed

  // Store review in database
  await supabase.from("reviews").insert({
    tenant_id: tenant.id,
    google_review_id: review.reviewId,
    location_id: review.locationId,
    rating: review.starRating,
    comment: review.comment,
    author_name: review.reviewer.displayName,
    created_at: review.createTime,
  })

  // Generate AI response if enabled for tenant
  if (tenant.settings.autoRespond && review.starRating <= 3) {
    const aiResponse = await generateReviewResponse(review, tenant.settings)

    // Post response to Google
    await googleService.respondToReview(review.name, aiResponse)

    // Log the response
    await supabase.from("review_responses").insert({
      review_id: review.reviewId,
      response_text: aiResponse,
      auto_generated: true,
      tenant_id: tenant.id,
    })
  }
}
```

## Token Lifecycle Management

### Refresh Token Longevity

The key to background automation is ensuring your refresh tokens don't expire:

1. **Testing Apps**: Refresh tokens expire in 7 days ❌
2. **Production Apps**: Refresh tokens don't expire ✅

### Steps to Get Long-lived Tokens:

```typescript
// 1. Set Google Cloud project to "Production" status
// 2. Request offline access during OAuth
const authUrl = oauth2Client.generateAuthUrl({
  access_type: "offline", // CRITICAL
  prompt: "consent", // CRITICAL
  scope: ["https://www.googleapis.com/auth/business.manage"],
})

// 3. Store refresh token securely
await storeGoogleTokens(tenantId, userId, {
  refresh_token: tokens.refresh_token, // Never expires in production
  access_token: tokens.access_token, // Expires in 1 hour
  expires_at: Math.floor(Date.now() / 1000) + 3600,
})

// 4. Edge functions use stored refresh token indefinitely
```

## Error Handling and Recovery

```typescript
// Robust token management with error handling
export class TokenManager {
  static async makeAuthenticatedRequest(tenantId: string, apiCall: Function) {
    const maxRetries = 3
    let attempt = 0

    while (attempt < maxRetries) {
      try {
        const client = await this.getValidGoogleClient(tenantId)
        return await apiCall(client)
      } catch (error) {
        if (error.code === 401 && attempt < maxRetries - 1) {
          // Token expired, refresh and retry
          await this.forceTokenRefresh(tenantId)
          attempt++
          continue
        }

        if (error.code === 403) {
          // User revoked access
          await this.notifyUserReconnectionNeeded(tenantId)
          throw new Error("Google access revoked - user needs to reconnect")
        }

        throw error
      }
    }
  }
}
```

This authorization flow gives you **true background automation** - users authorize once, and your system can access their Google My Business data indefinitely through automated edge functions.
EOF < /dev/null
