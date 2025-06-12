import type { PageServerLoad, Actions } from "./$types"
import { error } from "@sveltejs/kit"
import { GoogleMyBusinessWrapper } from "$lib/services/google-my-business-wrapper"
import { env as publicEnv } from "$env/dynamic/public"
import { env as privateEnv } from "$env/dynamic/private"

export const load: PageServerLoad = async ({ locals }) => {
  const { session, user } = await locals.safeGetSession()
  if (!user) {
    throw error(401, "Unauthorized")
  }

  // Only allow admin users or in development
  const isDev = process.env.NODE_ENV === "development"
  const isAdmin = user.email === process.env.PRIVATE_ADMIN_EMAIL

  if (!isDev && !isAdmin) {
    throw error(403, "Forbidden")
  }

  return {
    session,
    user: user.email,
  }
}

export const actions: Actions = {
  testApi: async ({ locals, request, cookies }) => {
    const { user } = await locals.safeGetSession()
    if (!user) {
      throw error(401, "Unauthorized")
    }

    const formData = await request.formData()
    const accountId = formData.get("accountId") as string
    const locationId = formData.get("locationId") as string

    if (!accountId || !locationId) {
      return {
        success: false,
        error: "Account ID and Location ID are required",
      }
    }

    const orgId = cookies.get("current_org_id")
    if (!orgId) {
      return {
        success: false,
        error: "No organization selected",
      }
    }

    try {
      // Create the wrapper
      const gmb = new GoogleMyBusinessWrapper(locals.supabaseServiceRole, {
        clientId: publicEnv.PUBLIC_GOOGLE_CLIENT_ID,
        clientSecret: privateEnv.GOOGLE_CLIENT_SECRET,
        encryptionKey: privateEnv.TOKEN_ENCRYPTION_KEY,
      })

      // Check if we have a valid token
      const hasToken = await gmb.hasValidToken(orgId)
      if (!hasToken) {
        return {
          success: false,
          error:
            "No Google tokens found. Please connect your Google account first.",
        }
      }

      // Get the tokens for direct API testing
      const tokens = await gmb.getTokens(orgId)
      if (!tokens) {
        return {
          success: false,
          error: "Failed to retrieve tokens",
        }
      }

      // Test different approaches
      const results = []

      // Test 1: Direct URL construction
      try {
        const directUrl = `https://mybusinessaccountmanagement.googleapis.com/v1/accounts/${accountId}/invitations`
        results.push({
          test: "Direct URL Construction",
          url: directUrl,
          success: true,
        })
      } catch (err) {
        results.push({
          test: "Direct URL Construction",
          error: err instanceof Error ? err.message : String(err),
          success: false,
        })
      }

      // Test 2: Using our wrapper service
      try {
        const service = await gmb.createService(orgId)
        if (!service) {
          throw new Error("Failed to create service")
        }

        // Test getting invitations for the account
        const invitations = await service.getInvitations()

        results.push({
          test: "Wrapper Service (getInvitations)",
          invitations: invitations,
          count: invitations.length,
          success: true,
        })
      } catch (err) {
        results.push({
          test: "Wrapper Service (getInvitations)",
          error: err instanceof Error ? err.message : String(err),
          stack: err instanceof Error ? err.stack : undefined,
          success: false,
        })
      }

      // Test 3: Direct fetch with OAuth token
      try {
        const directFetchUrl = `https://mybusinessaccountmanagement.googleapis.com/v1/accounts/${accountId}/invitations`
        const fetchResponse = await fetch(directFetchUrl, {
          headers: {
            Authorization: `Bearer ${tokens.access_token}`,
            "Content-Type": "application/json",
          },
        })

        const fetchData = await fetchResponse.json()

        results.push({
          test: "Direct Fetch",
          url: directFetchUrl,
          status: fetchResponse.status,
          statusText: fetchResponse.statusText,
          data: fetchData,
          success: fetchResponse.ok,
        })
      } catch (err) {
        results.push({
          test: "Direct Fetch",
          error: err instanceof Error ? err.message : String(err),
          stack: err instanceof Error ? err.stack : undefined,
          success: false,
        })
      }

      // Test 4: Check environment variables
      results.push({
        test: "Environment Check",
        nodeVersion: process.version,
        platform: process.platform,
        hasGoogleClientId: !!process.env.PUBLIC_GOOGLE_CLIENT_ID,
        hasGoogleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
        vercelEnv: process.env.VERCEL_ENV,
        nodeEnv: process.env.NODE_ENV,
        success: true,
      })

      return {
        success: true,
        results,
        accountId,
        locationId,
      }
    } catch (error) {
      console.error("Test API error:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      }
    }
  },
}
