import { redirect, fail } from "@sveltejs/kit"
import type { PageServerLoad, Actions } from "./$types"
import crypto from "crypto"
import { GoogleMyBusinessWrapper } from "$lib/services/google-my-business-wrapper"
import { env as publicEnv } from "$env/dynamic/public"
import { env as privateEnv } from "$env/dynamic/private"
import type { Json } from "$lib/../DatabaseDefinitions"

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
  let accessibleLocations = null
  let invitations = null
  let debugInfo: {
    regularService: {
      accounts: { success: boolean; data: any; error: string | null };
      locations: { success: boolean; data: any; error: string | null };
      invitations: { success: boolean; data: any; error: string | null };
    };
    altService: {
      accounts: { success: boolean; data: any; error: string | null };
      locations: { success: boolean; data: any; error: string | null };
      invitations: { success: boolean; data: any; error: string | null };
    };
  } | null = null
  
  // Debug mode to test both services
  if (url.searchParams.get("debug") === "true" && tokenValid) {
    const { GoogleMyBusinessServiceAlt } = await import("$lib/services/GoogleMyBusinessServiceAlt")
    
    debugInfo = {
      regularService: {
        accounts: { success: false, data: null, error: null },
        locations: { success: false, data: null, error: null },
        invitations: { success: false, data: null, error: null }
      },
      altService: {
        accounts: { success: false, data: null, error: null },
        locations: { success: false, data: null, error: null },
        invitations: { success: false, data: null, error: null }
      }
    }
    
    // Test regular service
    try {
      const accounts = await gmb.listAccounts(orgId)
      debugInfo.regularService.accounts = { success: true, data: accounts, error: null }
    } catch (err) {
      debugInfo.regularService.accounts = { 
        success: false, 
        data: null, 
        error: err instanceof Error ? err.message : String(err) 
      }
    }
    
    try {
      const locations = await gmb.getAllAccessibleLocations(orgId)
      debugInfo.regularService.locations = { success: true, data: locations, error: null }
    } catch (err) {
      debugInfo.regularService.locations = { 
        success: false, 
        data: null, 
        error: err instanceof Error ? err.message : String(err) 
      }
    }
    
    try {
      const invites = await gmb.getInvitations(orgId)
      debugInfo.regularService.invitations = { success: true, data: invites, error: null }
    } catch (err) {
      debugInfo.regularService.invitations = { 
        success: false, 
        data: null, 
        error: err instanceof Error ? err.message : String(err) 
      }
    }
    
    // Test alternative service with node-fetch
    try {
      // Get the token to use with alt service
      const { data: tokenData } = await supabaseServiceRole
        .from("google_tokens")
        .select("access_token, refresh_token")
        .eq("organization_id", orgId)
        .single()
      
      if (tokenData) {
        // Import decrypt function from the wrapper since it's not exported from google-my-business
        const accessToken = gmb['decrypt'](tokenData.access_token)
        const refreshToken = gmb['decrypt'](tokenData.refresh_token)
        
        const altService = new GoogleMyBusinessServiceAlt(
          accessToken,
          refreshToken,
          async (tokens) => {
            // Token refresh callback
            const encryptedAccessToken = gmb['encrypt'](tokens.access_token)
            await supabaseServiceRole
              .from("google_tokens")
              .update({
                access_token: encryptedAccessToken,
                expires_at: tokens.expires_at
              })
              .eq("organization_id", orgId)
          },
          {
            clientId: publicEnv.PUBLIC_GOOGLE_CLIENT_ID,
            clientSecret: privateEnv.GOOGLE_CLIENT_SECRET
          }
        )
        
        // Test alt service methods
        try {
          const accounts = await altService.getAccounts()
          debugInfo.altService.accounts = { success: true, data: accounts, error: null }
        } catch (err) {
          debugInfo.altService.accounts = { 
            success: false, 
            data: null, 
            error: err instanceof Error ? err.message : String(err) 
          }
        }
        
        try {
          const locations = await altService.getAllAccessibleLocations()
          debugInfo.altService.locations = { success: true, data: locations, error: null }
        } catch (err) {
          debugInfo.altService.locations = { 
            success: false, 
            data: null, 
            error: err instanceof Error ? err.message : String(err) 
          }
        }
        
        try {
          const invites = await altService.getInvitations()
          debugInfo.altService.invitations = { success: true, data: invites, error: null }
        } catch (err) {
          debugInfo.altService.invitations = { 
            success: false, 
            data: null, 
            error: err instanceof Error ? err.message : String(err) 
          }
        }
      }
    } catch (err) {
      console.error("Error testing alt service:", err)
    }
  }
  
  if (tokenValid && !debugInfo) {
    try {
      // Fetch actual business accounts from Google My Business API
      businessAccounts = await gmb.listAccounts(orgId)
      // Also fetch all locations the user has access to (including shared locations)
      accessibleLocations = await gmb.getAllAccessibleLocations(orgId)
      // Fetch any pending invitations
      invitations = await gmb.getInvitations(orgId)
    } catch (err) {
      console.error("Error fetching business data:", err)
      // Token might be invalid, don't throw error but show as disconnected
    }
  }

  return {
    googleConnected: tokenValid,
    businessAccounts,
    accessibleLocations,
    invitations,
    success: url.searchParams.get("success") === "true",
    successType: url.searchParams.get("success"), // This will be "true" or "invitation-accepted"
    debugInfo
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

  acceptInvitation: async ({
    locals: { safeGetSession, supabaseServiceRole },
    cookies,
    request,
  }) => {
    const { user } = await safeGetSession()
    if (!user) {
      return fail(401, { error: "Unauthorized" })
    }

    const orgId = cookies.get("current_org_id")
    if (!orgId) {
      return fail(400, { error: "No organization selected" })
    }

    const formData = await request.formData()
    const invitationName = formData.get("invitationName") as string

    if (!invitationName) {
      return fail(400, { error: "No invitation specified" })
    }

    try {
      const gmb = new GoogleMyBusinessWrapper(supabaseServiceRole, {
        clientId: publicEnv.PUBLIC_GOOGLE_CLIENT_ID,
        clientSecret: privateEnv.GOOGLE_CLIENT_SECRET,
        encryptionKey: privateEnv.TOKEN_ENCRYPTION_KEY
      })
      const success = await gmb.acceptInvitation(orgId, invitationName)
      
      if (success) {
        redirect(303, "/account/integrations?success=invitation-accepted")
      } else {
        return fail(500, { error: "Failed to accept invitation" })
      }
    } catch (error) {
      console.error("Error accepting invitation:", error)
      return fail(500, { error: "Failed to accept invitation" })
    }
  },

  importReviews: async ({
    locals: { safeGetSession, supabaseServiceRole },
    cookies,
    request,
  }) => {
    const { user } = await safeGetSession()
    if (!user) {
      return fail(401, { error: "Unauthorized" })
    }

    const orgId = cookies.get("current_org_id")
    if (!orgId) {
      return fail(400, { error: "No organization selected" })
    }

    const formData = await request.formData()
    const accountId = formData.get("accountId") as string
    const locationId = formData.get("locationId") as string
    const locationName = formData.get("locationName") as string

    if (!accountId || !locationId) {
      return fail(400, { error: "Missing account or location information" })
    }

    try {
      const gmb = new GoogleMyBusinessWrapper(supabaseServiceRole, {
        clientId: publicEnv.PUBLIC_GOOGLE_CLIENT_ID,
        clientSecret: privateEnv.GOOGLE_CLIENT_SECRET,
        encryptionKey: privateEnv.TOKEN_ENCRYPTION_KEY
      })

      // Construct the full location name for the API call
      const fullLocationName = `accounts/${accountId}/locations/${locationId}`
      const reviews = await gmb.getReviewsByLocationName(orgId, fullLocationName)

      // Helper to convert star rating string to number
      const starRatingToNumber = (rating: string): number => {
        const ratingMap: Record<string, number> = {
          'ONE': 1,
          'TWO': 2,
          'THREE': 3,
          'FOUR': 4,
          'FIVE': 5
        }
        return ratingMap[rating] || 0
      }

      // Store reviews in database
      let importedCount = 0
      for (const review of reviews) {
        const reviewId = review.reviewId || review.name?.split('/').pop() || ''
        
        const { error } = await supabaseServiceRole
          .from('reviews')
          .upsert({
            organization_id: orgId,
            platform: 'google',
            platform_review_id: reviewId,
            location_id: locationId,
            location_name: locationName || locationId,
            reviewer_name: review.reviewer?.displayName || 'Anonymous',
            reviewer_avatar_url: review.reviewer?.profilePhotoUrl,
            rating: starRatingToNumber(review.starRating),
            review_text: review.comment,
            review_reply: review.reviewReply?.comment,
            reviewed_at: review.createTime,
            reply_updated_at: review.reviewReply?.updateTime,
            raw_data: JSON.parse(JSON.stringify(review)) as Json
          })

        if (!error) {
          importedCount++
        } else {
          console.error('Error storing review:', error)
        }
      }

      // Use 303 See Other to prevent form resubmission
      redirect(303, `/account/reviews?imported=${importedCount}`)
    } catch (error) {
      // Re-throw redirects (they're not errors)
      if (error && typeof error === 'object' && 'status' in error && 'location' in error) {
        throw error
      }
      console.error("Error importing reviews:", error)
      return fail(500, { error: "Failed to import reviews" })
    }
  },
}
