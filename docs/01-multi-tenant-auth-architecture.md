# Multi-Tenant SvelteKit Authentication Architecture (2025)

## Overview

This document outlines a production-ready multi-tenant authentication architecture for SvelteKit 5 applications using the latest 2025 technologies. The architecture supports multiple organizations with secure data isolation, role-based access control, and seamless integration with Google Cloud Platform services.

## Technology Stack

- **Frontend**: SvelteKit 5 with TypeScript
- **Authentication**: Supabase Auth v2 with Row Level Security (RLS)
- **Database**: PostgreSQL (via Supabase)
- **Edge Functions**: Vercel Edge Runtime
- **AI Services**: Google Vertex AI
- **API Gateway**: Vercel Edge Functions with middleware
- **State Management**: Svelte stores with real-time sync
- **Security**: JWT tokens, PKCE flow, CSP headers

## Architecture Components

### 1. Database Schema

```sql
-- Organizations table
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  settings JSONB DEFAULT '{}',
  subscription_tier TEXT DEFAULT 'free',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users table (extends Supabase auth.users)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255),
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Organization memberships
CREATE TABLE organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  permissions JSONB DEFAULT '{}',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

-- API keys for service-to-service auth
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  key_hash VARCHAR(255) NOT NULL,
  permissions JSONB DEFAULT '{}',
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- Audit logs
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  action VARCHAR(255) NOT NULL,
  resource_type VARCHAR(255),
  resource_id UUID,
  metadata JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Organizations visible to members" ON organizations
  FOR SELECT USING (
    id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Organization members can view their memberships" ON organization_members
  FOR SELECT USING (
    user_id = auth.uid() OR
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Indexes for performance
CREATE INDEX idx_org_members_user ON organization_members(user_id);
CREATE INDEX idx_org_members_org ON organization_members(organization_id);
CREATE INDEX idx_api_keys_org ON api_keys(organization_id);
CREATE INDEX idx_audit_logs_org ON audit_logs(organization_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);
```

### 2. Authentication Service

```typescript
// src/lib/services/auth/authService.ts
import { createClient } from "@supabase/supabase-js"
import type { SupabaseClient } from "@supabase/supabase-js"
import {
  PUBLIC_SUPABASE_URL,
  PUBLIC_SUPABASE_ANON_KEY,
} from "$env/static/public"
import type { Database } from "$lib/types/database"

export interface AuthUser {
  id: string
  email: string
  fullName?: string
  avatarUrl?: string
  organizations: Organization[]
  currentOrganization?: Organization
}

export interface Organization {
  id: string
  name: string
  slug: string
  role: "owner" | "admin" | "member" | "viewer"
  permissions: Record<string, boolean>
}

export class AuthService {
  private supabase: SupabaseClient<Database>
  private static instance: AuthService

  private constructor() {
    this.supabase = createClient<Database>(
      PUBLIC_SUPABASE_URL,
      PUBLIC_SUPABASE_ANON_KEY,
      {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
          flowType: "pkce",
        },
      },
    )
  }

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService()
    }
    return AuthService.instance
  }

  async signIn(email: string, password: string): Promise<AuthUser> {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) throw error
    if (!data.user) throw new Error("No user returned")

    return this.getUserWithOrganizations(data.user.id)
  }

  async signInWithOAuth(provider: "google" | "github" | "microsoft") {
    const { data, error } = await this.supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: provider === "google" ? "openid email profile" : undefined,
      },
    })

    if (error) throw error
    return data
  }

  async signUp(
    email: string,
    password: string,
    fullName: string,
    organizationName: string,
  ) {
    // Start a Supabase transaction
    const { data: authData, error: authError } =
      await this.supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
        },
      })

    if (authError) throw authError
    if (!authData.user) throw new Error("No user created")

    // Create user profile and organization
    const { error: setupError } = await this.supabase.rpc(
      "create_user_and_organization",
      {
        user_id: authData.user.id,
        user_email: email,
        user_full_name: fullName,
        org_name: organizationName,
        org_slug: this.generateSlug(organizationName),
      },
    )

    if (setupError) throw setupError

    return this.getUserWithOrganizations(authData.user.id)
  }

  async getCurrentUser(): Promise<AuthUser | null> {
    const {
      data: { user },
    } = await this.supabase.auth.getUser()
    if (!user) return null

    return this.getUserWithOrganizations(user.id)
  }

  async switchOrganization(organizationId: string): Promise<void> {
    const user = await this.getCurrentUser()
    if (!user) throw new Error("No authenticated user")

    const hasAccess = user.organizations.some(
      (org) => org.id === organizationId,
    )
    if (!hasAccess) throw new Error("Access denied to organization")

    // Store current organization in session
    await this.supabase.auth.updateUser({
      data: { current_organization_id: organizationId },
    })
  }

  private async getUserWithOrganizations(userId: string): Promise<AuthUser> {
    const { data, error } = await this.supabase
      .from("users")
      .select(
        `
        *,
        organization_members!inner(
          role,
          permissions,
          organizations(*)
        )
      `,
      )
      .eq("id", userId)
      .single()

    if (error) throw error
    if (!data) throw new Error("User not found")

    const organizations = data.organization_members.map((membership) => ({
      id: membership.organizations.id,
      name: membership.organizations.name,
      slug: membership.organizations.slug,
      role: membership.role,
      permissions: membership.permissions as Record<string, boolean>,
    }))

    return {
      id: data.id,
      email: data.email,
      fullName: data.full_name,
      avatarUrl: data.avatar_url,
      organizations,
      currentOrganization: organizations[0], // Default to first org
    }
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
  }
}
```

### 3. Authorization Middleware

```typescript
// src/lib/services/auth/authMiddleware.ts
import type { Handle } from "@sveltejs/kit"
import { sequence } from "@sveltejs/kit/hooks"
import { AuthService } from "$lib/services/auth/authService"
import { RateLimiter } from "$lib/services/auth/rateLimiter"

export const authMiddleware: Handle = async ({ event, resolve }) => {
  const authService = AuthService.getInstance()
  const rateLimiter = RateLimiter.getInstance()

  // Skip auth for public routes
  const publicRoutes = ["/auth/login", "/auth/signup", "/auth/callback", "/"]
  if (publicRoutes.includes(event.url.pathname)) {
    return resolve(event)
  }

  // Check rate limiting
  const clientIp = event.getClientAddress()
  if (!rateLimiter.checkLimit(clientIp)) {
    return new Response("Too Many Requests", { status: 429 })
  }

  // Get session from cookie or authorization header
  const sessionCookie = event.cookies.get("sb-auth-token")
  const authHeader = event.request.headers.get("authorization")

  if (!sessionCookie && !authHeader) {
    return new Response("Unauthorized", { status: 401 })
  }

  try {
    // Verify session
    const user = await authService.getCurrentUser()
    if (!user) {
      return new Response("Unauthorized", { status: 401 })
    }

    // Add user to locals
    event.locals.user = user

    // Check organization access for API routes
    if (event.url.pathname.startsWith("/api/")) {
      const orgId = event.request.headers.get("x-organization-id")
      if (!orgId) {
        return new Response("Organization ID required", { status: 400 })
      }

      const hasAccess = user.organizations.some((org) => org.id === orgId)
      if (!hasAccess) {
        return new Response("Forbidden", { status: 403 })
      }

      event.locals.organizationId = orgId
    }

    // Add security headers
    const response = await resolve(event)
    response.headers.set("X-Frame-Options", "DENY")
    response.headers.set("X-Content-Type-Options", "nosniff")
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.set(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://api.supabase.io wss://api.supabase.io",
    )

    return response
  } catch (error) {
    console.error("Auth middleware error:", error)
    return new Response("Internal Server Error", { status: 500 })
  }
}

// Permission check helper
export function hasPermission(
  user: AuthUser,
  organizationId: string,
  permission: string,
): boolean {
  const org = user.organizations.find((o) => o.id === organizationId)
  if (!org) return false

  // Owners have all permissions
  if (org.role === "owner") return true

  // Check specific permission
  return org.permissions[permission] === true
}
```

### 4. Client-Side Auth Store

```typescript
// src/lib/stores/auth.ts
import { writable, derived } from "svelte/store"
import { browser } from "$app/environment"
import { goto } from "$app/navigation"
import { AuthService, type AuthUser } from "$lib/services/auth/authService"

interface AuthState {
  user: AuthUser | null
  loading: boolean
  error: string | null
}

function createAuthStore() {
  const authService = AuthService.getInstance()
  const { subscribe, set, update } = writable<AuthState>({
    user: null,
    loading: true,
    error: null,
  })

  return {
    subscribe,

    async initialize() {
      if (!browser) return

      try {
        update((state) => ({ ...state, loading: true }))
        const user = await authService.getCurrentUser()
        set({ user, loading: false, error: null })
      } catch (error) {
        set({ user: null, loading: false, error: error.message })
      }
    },

    async signIn(email: string, password: string) {
      try {
        update((state) => ({ ...state, loading: true, error: null }))
        const user = await authService.signIn(email, password)
        set({ user, loading: false, error: null })
        goto("/dashboard")
      } catch (error) {
        update((state) => ({ ...state, loading: false, error: error.message }))
        throw error
      }
    },

    async signOut() {
      try {
        await authService.signOut()
        set({ user: null, loading: false, error: null })
        goto("/auth/login")
      } catch (error) {
        update((state) => ({ ...state, error: error.message }))
      }
    },

    async switchOrganization(organizationId: string) {
      try {
        update((state) => ({ ...state, loading: true }))
        await authService.switchOrganization(organizationId)
        const user = await authService.getCurrentUser()
        set({ user, loading: false, error: null })
      } catch (error) {
        update((state) => ({ ...state, loading: false, error: error.message }))
      }
    },
  }
}

export const auth = createAuthStore()

// Derived stores for easy access
export const currentUser = derived(auth, ($auth) => $auth.user)
export const currentOrganization = derived(
  auth,
  ($auth) => $auth.user?.currentOrganization,
)
export const isAuthenticated = derived(auth, ($auth) => !!$auth.user)
export const isLoading = derived(auth, ($auth) => $auth.loading)
```

### 5. Protected Route Component

```svelte
<!-- src/lib/components/ProtectedRoute.svelte -->
<script lang="ts">
  import { onMount } from "svelte"
  import { goto } from "$app/navigation"
  import { auth, isAuthenticated, isLoading } from "$lib/stores/auth"

  export let requiredPermission: string | null = null
  export let requiredRole: string[] = []

  let hasAccess = false

  onMount(() => {
    auth.initialize()
  })

  $: if (!$isLoading && !$isAuthenticated) {
    goto("/auth/login")
  }

  $: if ($auth.user && !$isLoading) {
    const org = $auth.user.currentOrganization
    if (!org) {
      hasAccess = false
    } else if (requiredRole.length > 0 && !requiredRole.includes(org.role)) {
      hasAccess = false
    } else if (requiredPermission && !org.permissions[requiredPermission]) {
      hasAccess = false
    } else {
      hasAccess = true
    }
  }
</script>

{#if $isLoading}
  <div class="flex items-center justify-center min-h-screen">
    <div
      class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"
    ></div>
  </div>
{:else if hasAccess}
  <slot />
{:else}
  <div class="flex items-center justify-center min-h-screen">
    <div class="text-center">
      <h2 class="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
      <p class="text-gray-600">You don't have permission to view this page.</p>
    </div>
  </div>
{/if}
```

### 6. API Key Authentication

```typescript
// src/lib/services/auth/apiKeyAuth.ts
import { createHash } from "crypto"
import type { RequestEvent } from "@sveltejs/kit"

export class ApiKeyAuth {
  static async validateApiKey(event: RequestEvent): Promise<string | null> {
    const apiKey = event.request.headers.get("x-api-key")
    if (!apiKey) return null

    // Hash the API key
    const keyHash = createHash("sha256").update(apiKey).digest("hex")

    // Look up in database
    const { data, error } = await event.locals.supabase
      .from("api_keys")
      .select("organization_id, permissions, expires_at")
      .eq("key_hash", keyHash)
      .single()

    if (error || !data) return null

    // Check expiration
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return null
    }

    // Update last used
    await event.locals.supabase
      .from("api_keys")
      .update({ last_used_at: new Date().toISOString() })
      .eq("key_hash", keyHash)

    return data.organization_id
  }

  static generateApiKey(): string {
    const prefix = "sk_live_"
    const randomBytes = crypto.getRandomValues(new Uint8Array(24))
    const key = btoa(String.fromCharCode(...randomBytes))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "")
    return prefix + key
  }
}
```

### 7. Security Best Practices

1. **Session Management**

   - Use secure, httpOnly cookies
   - Implement session timeout (30 days default)
   - Refresh tokens automatically
   - Clear sessions on logout

2. **CSRF Protection**

   - Use SameSite cookies
   - Implement CSRF tokens for state-changing operations
   - Validate origin headers

3. **Input Validation**

   - Use Zod schemas for all inputs
   - Sanitize user input
   - Implement request size limits

4. **Rate Limiting**

   - IP-based rate limiting
   - User-based rate limiting
   - Exponential backoff for repeated failures

5. **Audit Logging**
   - Log all authentication events
   - Log permission changes
   - Log API key usage
   - Retain logs for compliance

## Integration with Google Cloud

The authentication system seamlessly integrates with Google Cloud services:

1. **Service Account Management**

   - Each organization can have its own GCP service account
   - Credentials stored encrypted in database
   - Automatic credential rotation

2. **Vertex AI Access**

   - Organization-specific quotas
   - Usage tracking per organization
   - Cost allocation

3. **Google Business Profile**
   - OAuth tokens stored per user
   - Automatic token refresh
   - Scoped access to business data

## Deployment Considerations

1. **Environment Variables**

   ```env
   PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_KEY=your-service-key
   DATABASE_URL=postgresql://...
   JWT_SECRET=your-jwt-secret
   ```

2. **Edge Function Configuration**

   - Enable Vercel Edge Runtime
   - Configure regions close to Supabase
   - Set appropriate timeout limits

3. **Monitoring**
   - Set up error tracking (Sentry)
   - Monitor authentication metrics
   - Track API usage per organization
   - Set up alerts for suspicious activity

This architecture provides a robust, scalable foundation for multi-tenant SaaS applications with enterprise-grade security and flexibility.import { createClient } from '@supabase/supabase-js'

interface GoogleTokens {
access_token: string;
refresh_token?: string;
expires_at?: number;
scope?: string;
}

export async function storeGoogleTokens(
tenantId: string,
userId: string,
tokens: GoogleTokens
) {
const supabase = createClient(
process.env.SUPABASE_URL\!,
process.env.SUPABASE_SERVICE_ROLE_KEY\! // Service role for server operations
)

// Encrypt sensitive tokens before storage
const encryptedTokens = await encryptTokens(tokens)

const { error } = await supabase
.from('google_tokens')
.upsert({
tenant_id: tenantId,
user_id: userId,
tokens_encrypted: encryptedTokens,
updated_at: new Date().toISOString()
})

if (error) throw error
}

export async function getStoredGoogleTokens(
tenantId: string,
userId: string
): Promise<GoogleTokens | null> {
const supabase = createClient(
process.env.SUPABASE_URL\!,
process.env.SUPABASE_SERVICE_ROLE_KEY\!
)

const { data, error } = await supabase
.from('google_tokens')
.select('tokens_encrypted')
.eq('tenant_id', tenantId)
.eq('user_id', userId)
.single()

if (error || \!data) return null

return await decryptTokens(data.tokens_encrypted)
}

````

## Environment Configuration

### Vercel Environment Variables

```bash
# Supabase Configuration
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Google OAuth Configuration (Per Tenant or Global)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Encryption for token storage
TOKEN_ENCRYPTION_KEY=your-32-byte-encryption-key

# App Configuration
VERCEL_URL=your-app.vercel.app
NODE_ENV=production

# Cron job security
CRON_SECRET=your-secure-cron-secret
````

### SvelteKit Configuration

```typescript
// svelte.config.js
import adapter from "@sveltejs/adapter-vercel"

/** @type {import('@sveltejs/kit').Config} */
const config = {
  kit: {
    adapter: adapter({
      runtime: "nodejs18.x",
      regions: ["iad1"], // Choose region closest to your users
      split: false, // Bundle routes for better cold start performance
    }),
  },
}

export default config
```

## Security Best Practices

### Rate Limiting

```typescript
// src/hooks.server.ts
import { rateLimit } from "$lib/utils/rate-limit"

export const handle = async ({ event, resolve }) => {
  // Apply rate limiting to API routes
  if (event.url.pathname.startsWith("/api/")) {
    const limited = await rateLimit(event.getClientAddress(), {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
    })

    if (limited) {
      return new Response("Too Many Requests", { status: 429 })
    }
  }

  return resolve(event)
}
```

### Input Validation

```typescript
// src/lib/validation/schemas.ts
import { z } from "zod"

export const tenantSchema = z.object({
  domain: z.string().min(3).max(100),
  name: z.string().min(1).max(255),
  googleClientId: z.string().optional(),
})

export const googleCallbackSchema = z.object({
  code: z.string().min(1),
  state: z.string().uuid(),
})
```

## Implementation Checklist

### Phase 1: Foundation

- [ ] Set up SvelteKit 5 project with Vercel adapter
- [ ] Configure Supabase with multi-tenant database schema
- [ ] Implement basic user authentication with OAuth
- [ ] Set up tenant isolation with RLS policies

### Phase 2: Google Integration

- [ ] Implement Google My Business OAuth flow
- [ ] Create secure token storage system
- [ ] Build API endpoints for Google Business data
- [ ] Add proper error handling and logging

### Phase 3: Multi-tenancy

- [ ] Implement tenant-aware routing
- [ ] Add tenant configuration management
- [ ] Set up per-tenant Google OAuth credentials
- [ ] Implement tenant-specific data isolation

### Phase 4: Production Readiness

- [ ] Add comprehensive error handling
- [ ] Implement monitoring and alerting
- [ ] Set up automated testing
- [ ] Configure production environment variables
- [ ] Add rate limiting and security headers

## Benefits of This Architecture

1. **Scalability**: Edge functions distribute globally for low latency
2. **Security**: Multi-layered authentication with RLS and encrypted token storage
3. **Flexibility**: Supports both user authentication and service-to-service API access
4. **Performance**: SvelteKit 5 with Vercel optimization for fast loading
5. **Maintainability**: Clean separation of concerns and modern TypeScript

## Monitoring and Observability

```typescript
// src/lib/utils/monitoring.ts
import { dev } from '$app/environment'

export function logAuthEvent(event: string, data: any) {
  if (\!dev) {
    // Send to your preferred monitoring service
    console.log(`AUTH_EVENT: ${event}`, data)
  }
}

export function trackAPIUsage(endpoint: string, tenantId: string) {
  // Track API usage per tenant for billing/monitoring
  if (\!dev) {
    console.log(`API_USAGE: ${endpoint} - ${tenantId}`)
  }
}
```

This architecture provides a robust, scalable, and secure foundation for a multi-tenant SvelteKit application with comprehensive Google OAuth integration for both user authentication and server-side API access.
EOF < /dev/null
