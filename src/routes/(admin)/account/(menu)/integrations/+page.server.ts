import { redirect, fail } from "@sveltejs/kit"
import type { PageServerLoad, Actions } from "./$types"
import crypto from "crypto"
import { GoogleMyBusinessWrapper } from "$lib/services/google-my-business-wrapper"
import { env as publicEnv } from "$env/dynamic/public"
import { env as privateEnv } from "$env/dynamic/private"
import { getAuthRedirectUrl } from "$lib/auth-redirect"

// OAuth URLs are now handled by GoogleMyBusinessWrapper

export const load: PageServerLoad = async ({
  locals: { safeGetSession, supabaseServiceRole },
  cookies,
  url,
}) => {
  const { user } = await safeGetSession()
  if (!user) {
    redirect(303, "/login/sign_in")
  }

  const orgId = cookies.get("current_org_id")
  if (!orgId) {
    redirect(303, "/account")
  }

  // Check if we have a Google token for this organization
  const { data: googleToken } = await supabaseServiceRole
    .from("google_tokens")
    .select("*")
    .eq("organization_id", orgId)
    .eq("user_id", user.id)
    .single()

  // Handle OAuth callback
  const code = url.searchParams.get("code")
  const state = url.searchParams.get("state")
  const error = url.searchParams.get("error")

  if (error) {
    return {
      googleConnected: !!googleToken,
      businessAccounts: null,
      error: error === "access_denied" ? "Authorization was cancelled" : `OAuth error: ${error}`
    }
  }

  if (code && state) {
    // Verify state matches
    const expectedState = cookies.get("google_oauth_state")
    if (!expectedState || state !== expectedState) {
      return {
        googleConnected: !!googleToken,
        businessAccounts: null,
        error: "Invalid OAuth state - please try again"
      }
    }

    try {
      // Handle OAuth callback with the wrapper
      const gmb = new GoogleMyBusinessWrapper(supabaseServiceRole, {
        clientId: publicEnv.PUBLIC_GOOGLE_CLIENT_ID,
        clientSecret: privateEnv.GOOGLE_CLIENT_SECRET,
        encryptionKey: privateEnv.TOKEN_ENCRYPTION_KEY
      })
      const redirectUrl = url.origin + '/account/integrations'
      await gmb.handleOAuthCallback(code, orgId, user.id, redirectUrl)

      // Clear state cookie
      cookies.delete("google_oauth_state", { path: "/" })

      // Redirect to clear URL parameters and show success
      redirect(303, "/account/integrations?success=true")
    } catch (err) {
      // Re-throw redirects (they're not errors)
      if (err && typeof err === 'object' && 'status' in err && 'location' in err) {
        throw err
      }
      
      console.error("Error exchanging OAuth code:", err)
      // Clear state cookie on error
      cookies.delete("google_oauth_state", { path: "/" })
      
      return {
        googleConnected: !!googleToken,
        businessAccounts: null,
        error: err instanceof Error ? err.message : "Failed to connect Google account"
      }
    }
  }

  const gmb = new GoogleMyBusinessWrapper(supabaseServiceRole, {
    clientId: publicEnv.PUBLIC_GOOGLE_CLIENT_ID,
    clientSecret: privateEnv.GOOGLE_CLIENT_SECRET,
    encryptionKey: privateEnv.TOKEN_ENCRYPTION_KEY
  })
  const tokenValid = await gmb.hasValidToken(orgId)
  let businessAccounts = null
  
  if (tokenValid) {
    try {
      // Fetch actual business accounts from Google My Business API
      businessAccounts = await gmb.listAccounts(orgId)
    } catch (err) {
      console.error("Error fetching business accounts:", err)
      // Token might be invalid, don't throw error but show as disconnected
    }
  }

  return {
    googleConnected: tokenValid,
    businessAccounts,
    success: url.searchParams.get("success") === "true"
  }
}

export const actions: Actions = {
  connectGoogle: async ({ cookies, request }) => {
    // Generate random state for CSRF protection
    const state = crypto.randomUUID()
    cookies.set("google_oauth_state", state, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 10, // 10 minutes
    })

    // Build OAuth URL with the wrapper
    const gmb = new GoogleMyBusinessWrapper(null, {
      clientId: publicEnv.PUBLIC_GOOGLE_CLIENT_ID
    })
    // Use dynamic redirect URL to support preview deployments
    const url = new URL(request.url)
    const redirectUri = `${url.origin}/account/integrations`
    const authUrl = gmb.getAuthUrl(state, redirectUri)

    redirect(303, authUrl)
  },

  disconnectGoogle: async ({
    locals: { safeGetSession, supabaseServiceRole },
    cookies,
  }) => {
    const { user } = await safeGetSession()
    if (!user) {
      return fail(401, { error: "Unauthorized" })
    }

    const orgId = cookies.get("current_org_id")
    if (!orgId) {
      return fail(400, { error: "No organization selected" })
    }

    // Disconnect using the wrapper (handles revocation)
    try {
      const gmb = new GoogleMyBusinessWrapper(supabaseServiceRole, {
        encryptionKey: privateEnv.TOKEN_ENCRYPTION_KEY
      })
      await gmb.revokeToken(orgId)
      return { success: true }
    } catch (error) {
      console.error("Error disconnecting Google:", error)
      return fail(500, { error: "Failed to disconnect Google account" })
    }
  },
}
