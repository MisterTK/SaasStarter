import { redirect } from "@sveltejs/kit"
import type { PageServerLoad } from "./$types"

interface Review {
  reviewId?: string
  name?: string
  reviewer: {
    displayName: string
    profilePhotoUrl?: string | null
  }
  starRating: string
  comment?: string
  createTime: string
  updateTime: string
  reviewReply?: {
    comment: string
    updateTime: string
  } | null
  locationName?: string
}

interface Location {
  name: string
  locationId: string
  title?: string
  address?: {
    addressLines?: string[]
  } | string
  primaryPhone?: string
  websiteUrl?: string
}

interface Account {
  name: string
  accountId: string
  type?: string
  role?: string
  state?: string
  profilePhotoUrl?: string
  locations?: Location[]
}

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

  // Get Google token for this organization
  const { data: googleToken } = await supabaseServiceRole
    .from("google_tokens")
    .select("*")
    .eq("organization_id", orgId)
    .eq("user_id", user.id)
    .single()

  if (!googleToken) {
    // No Google account connected
    return {
      connected: false,
      reviews: [],
      accounts: [],
      imported: url.searchParams.get("imported"),
    }
  }

  // Check if token needs refresh
  const expiresAt = new Date(googleToken.expires_at || new Date())
  const now = new Date()

  let accessToken = googleToken.access_token

  if (expiresAt <= now) {
    // Token expired, refresh it
    try {
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          refresh_token: googleToken.refresh_token || "",
          client_id: process.env.PUBLIC_GOOGLE_CLIENT_ID || "",
          client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
          grant_type: "refresh_token",
        }),
      })

      const tokens = await tokenResponse.json()

      if (tokens.access_token) {
        accessToken = tokens.access_token
        const newExpiresAt = new Date(Date.now() + tokens.expires_in * 1000)

        // Update token in database
        await supabaseServiceRole
          .from("google_tokens")
          .update({
            access_token: tokens.access_token,
            expires_at: newExpiresAt.toISOString(),
          })
          .eq("organization_id", orgId)
          .eq("user_id", user.id)
      }
    } catch (error) {
      console.error("Error refreshing token:", error)
      return {
        connected: true,
        error: "Failed to refresh Google authentication",
        reviews: [],
        accounts: [],
      }
    }
  }

  // Import the Google My Business service
  const { GoogleMyBusinessService } = await import(
    "$lib/services/google-my-business"
  )

  // Create service instance with token refresh callback
  const gmb = new GoogleMyBusinessService(
    accessToken || "",
    googleToken.refresh_token || "",
    async (tokens) => {
      // Update tokens in database when refreshed
      await supabaseServiceRole
        .from("google_tokens")
        .update({
          access_token: tokens.access_token,
          expires_at: tokens.expires_at,
        })
        .eq("organization_id", orgId)
        .eq("user_id", user.id)
    },
  )

  try {
    // Fetch all accessible locations using the new wildcard approach
    // This will get both account-owned and directly shared locations
    const locations = await gmb.getAllAccessibleLocations()
    let allReviews: Review[] = []
    const accountsWithLocations: Account[] = []

    // Group locations by account for backward compatibility
    const locationsByAccount = new Map<string, Location[]>()
    
    for (const location of locations) {
      // Extract account ID from location name (e.g., "accounts/123/locations/456")
      const accountMatch = location.name.match(/accounts\/([^/]+)/)
      const accountId = accountMatch ? accountMatch[1] : 'shared'
      
      if (!locationsByAccount.has(accountId)) {
        locationsByAccount.set(accountId, [])
      }
      locationsByAccount.get(accountId)!.push(location)
    }

    // Create account objects for display
    for (const [accountId, locs] of locationsByAccount) {
      accountsWithLocations.push({
        name: accountId === 'shared' ? 'Shared Locations' : `Account ${accountId}`,
        accountId: `accounts/${accountId}`,
        locations: locs,
      })
    }

    // Fetch reviews for each location using the new method
    for (const location of locations) {
      try {
        const reviews = await gmb.getReviewsByLocationName(location.name)

        // Add location name to each review
        const reviewsWithLocation = reviews.map((review) => ({
          ...review,
          reviewId: review.reviewId || review.name || 'unknown',
          locationName: location.title || location.name || '',
        }))

        allReviews = [...allReviews, ...reviewsWithLocation]
      } catch (error) {
        console.error(`Failed to fetch reviews for location ${location.name}:`, error)
      }
    }

    return {
      connected: true,
      reviews: allReviews,
      accounts: accountsWithLocations,
    }
  } catch (error) {
    console.error("Error fetching Google My Business data:", error)

    // Fall back to mock data for demo purposes
    const mockAccounts = [
      {
        name: "Example Restaurant",
        accountId: "accounts/123456789",
        locations: [
          {
            name: "Example Restaurant - Downtown",
            locationId: "locations/987654321",
            address: "123 Main St, City, State 12345",
          },
        ],
      },
    ]

    const mockReviews = [
      {
        reviewId: "review1",
        reviewer: {
          displayName: "John Doe",
          profilePhotoUrl: null,
        },
        starRating: "FIVE",
        comment: "Great food and excellent service! Will definitely come back.",
        createTime: new Date(
          Date.now() - 2 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        updateTime: new Date(
          Date.now() - 2 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        reviewReply: null,
        locationName: "Example Restaurant - Downtown",
      },
      {
        reviewId: "review2",
        reviewer: {
          displayName: "Jane Smith",
          profilePhotoUrl: null,
        },
        starRating: "FOUR",
        comment:
          "Good food but the wait was a bit long. Overall pleasant experience.",
        createTime: new Date(
          Date.now() - 5 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        updateTime: new Date(
          Date.now() - 5 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        reviewReply: {
          comment:
            "Thank you for your feedback! We appreciate your patience and are working to improve our service times.",
          updateTime: new Date(
            Date.now() - 4 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        },
        locationName: "Example Restaurant - Downtown",
      },
      {
        reviewId: "review3",
        reviewer: {
          displayName: "Mike Johnson",
          profilePhotoUrl: null,
        },
        starRating: "THREE",
        comment: "Food was okay but nothing special. Service could be better.",
        createTime: new Date(
          Date.now() - 7 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        updateTime: new Date(
          Date.now() - 7 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        reviewReply: null,
        locationName: "Example Restaurant - Downtown",
      },
    ]

    return {
      connected: true,
      reviews: mockReviews,
      accounts: mockAccounts,
      error:
        "Using demo data. Connect a real Google My Business account to see actual reviews.",
      imported: url.searchParams.get("imported"),
    }
  }
}
