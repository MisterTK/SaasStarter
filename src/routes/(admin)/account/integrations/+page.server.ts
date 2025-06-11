import { redirect, fail } from "@sveltejs/kit"
import type { PageServerLoad, Actions } from "./$types"

const GOOGLE_OAUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
const GOOGLE_MY_BUSINESS_SCOPE =
  "https://www.googleapis.com/auth/business.manage"

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

  if (code && state) {
    // Verify state matches
    const expectedState = cookies.get("google_oauth_state")
    if (state !== expectedState) {
      return fail(400, { error: "Invalid OAuth state" })
    }

    try {
      // Exchange code for tokens
      const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          code,
          client_id: process.env.PUBLIC_GOOGLE_CLIENT_ID || "",
          client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
          redirect_uri: `${url.origin}/account/integrations`,
          grant_type: "authorization_code",
        }),
      })

      const tokens = await tokenResponse.json()

      if (tokens.access_token && tokens.refresh_token) {
        // Store tokens in database
        const expiresAt = new Date(Date.now() + tokens.expires_in * 1000)

        await supabaseServiceRole.from("google_tokens").upsert({
          organization_id: orgId,
          user_id: user.id,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_at: expiresAt.toISOString(),
        })

        // Clear state cookie
        cookies.delete("google_oauth_state", { path: "/" })

        // Redirect to clear URL parameters
        redirect(303, "/account/integrations")
      }
    } catch (error) {
      console.error("Error exchanging OAuth code:", error)
      return fail(500, { error: "Failed to connect Google account" })
    }
  }

  let businessAccounts = null
  if (googleToken && googleToken.access_token) {
    // TODO: Fetch business accounts from Google My Business API
    // For now, return mock data
    businessAccounts = [{ name: "Example Business", location_count: 3 }]
  }

  return {
    googleConnected: !!googleToken,
    businessAccounts,
  }
}

export const actions: Actions = {
  connectGoogle: async ({ cookies, url }) => {
    // Generate random state for CSRF protection
    const state = crypto.randomUUID()
    cookies.set("google_oauth_state", state, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 10, // 10 minutes
    })

    // Build OAuth URL
    const params = new URLSearchParams({
      client_id: process.env.PUBLIC_GOOGLE_CLIENT_ID || "",
      redirect_uri: `${url.origin}/account/integrations`,
      response_type: "code",
      scope: `openid email profile ${GOOGLE_MY_BUSINESS_SCOPE}`,
      access_type: "offline",
      prompt: "consent",
      state,
    })

    redirect(303, `${GOOGLE_OAUTH_URL}?${params}`)
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

    // Delete the Google token
    const { error } = await supabaseServiceRole
      .from("google_tokens")
      .delete()
      .eq("organization_id", orgId)
      .eq("user_id", user.id)

    if (error) {
      return fail(500, { error: "Failed to disconnect Google account" })
    }

    return { success: true }
  },
}
