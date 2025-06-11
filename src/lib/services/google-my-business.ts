export interface GoogleToken {
  access_token: string
  refresh_token: string
  expires_at: string
}

interface BusinessLocation {
  name: string
  locationId: string
  title?: string
  address?: {
    addressLines?: string[]
  } | string
  primaryPhone?: string
  websiteUrl?: string
}

interface BusinessAccount {
  name: string
  accountId: string
  type: string
  role: string
  state: string
  profilePhotoUrl?: string
}

interface Review {
  reviewId?: string
  name?: string  // Google's resource name format (e.g., accounts/123/locations/456/reviews/789)
  reviewer: {
    displayName: string
    profilePhotoUrl?: string
  }
  starRating: string
  comment?: string
  createTime: string
  updateTime: string
  reviewReply?: {
    comment: string
    updateTime: string
  }
  locationName?: string
}

interface Invitation {
  name: string
  targetAccount?: {
    accountName: string
    email?: string
  }
  targetLocation?: {
    locationName: string
    address?: string
  }
  role: string
  state: string
}

const GOOGLE_MY_BUSINESS_API =
  "https://mybusinessbusinessinformation.googleapis.com/v1"
const GOOGLE_MY_BUSINESS_ACCOUNT_MANAGEMENT_API =
  "https://mybusinessaccountmanagement.googleapis.com/v1"

export class GoogleMyBusinessService {
  constructor(
    private accessToken: string,
    private refreshToken: string,
    private onTokenRefresh?: (tokens: {
      access_token: string
      expires_at: string
    }) => Promise<void>,
    private credentials?: {
      clientId: string
      clientSecret: string
    }
  ) {}

  private async makeRequest(url: string, options: RequestInit = {}) {
    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    })

    if (response.status === 401) {
      // Token expired, try to refresh
      await this.refreshAccessToken()

      // Retry the request with new token
      return fetch(url, {
        ...options,
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
          ...options.headers,
        },
      })
    }

    return response
  }

  private async refreshAccessToken() {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        refresh_token: this.refreshToken,
        client_id: this.credentials?.clientId || "",
        client_secret: this.credentials?.clientSecret || "",
        grant_type: "refresh_token",
      }),
    })

    if (!tokenResponse.ok) {
      throw new Error("Failed to refresh access token")
    }

    const tokens = await tokenResponse.json()
    this.accessToken = tokens.access_token

    if (this.onTokenRefresh) {
      const expiresAt = new Date(Date.now() + tokens.expires_in * 1000)
      await this.onTokenRefresh({
        access_token: tokens.access_token,
        expires_at: expiresAt.toISOString(),
      })
    }
  }

  async getAccounts(): Promise<BusinessAccount[]> {
    const response = await this.makeRequest(
      `${GOOGLE_MY_BUSINESS_ACCOUNT_MANAGEMENT_API}/accounts`,
    )

    if (!response.ok) {
      console.error("Failed to fetch accounts:", await response.text())
      return []
    }

    const data = await response.json()
    return data.accounts || []
  }

  async getLocations(accountId: string): Promise<BusinessLocation[]> {
    // Remove 'accounts/' prefix if present
    const cleanAccountId = accountId.replace("accounts/", "")

    const response = await this.makeRequest(
      `${GOOGLE_MY_BUSINESS_API}/accounts/${cleanAccountId}/locations`,
    )

    if (!response.ok) {
      console.error("Failed to fetch locations:", await response.text())
      return []
    }

    const data = await response.json()
    return data.locations || []
  }

  async getInvitations(): Promise<Invitation[]> {
    // Note: The invitations endpoint doesn't require an account ID
    // It returns all invitations for the authenticated user
    const response = await this.makeRequest(
      `${GOOGLE_MY_BUSINESS_ACCOUNT_MANAGEMENT_API}/invitations`,
    )

    if (!response.ok) {
      console.error("Failed to fetch invitations:", await response.text())
      return []
    }

    const data = await response.json()
    return data.invitations || []
  }

  async acceptInvitation(invitationName: string): Promise<boolean> {
    const response = await this.makeRequest(
      `${GOOGLE_MY_BUSINESS_ACCOUNT_MANAGEMENT_API}/${invitationName}:accept`,
      {
        method: "POST",
        body: JSON.stringify({}),
      },
    )

    if (!response.ok) {
      console.error("Failed to accept invitation:", await response.text())
      return false
    }

    return true
  }

  // Get all locations the user has access to (including those without account access)
  async getAllAccessibleLocations(): Promise<BusinessLocation[]> {
    const allLocations: BusinessLocation[] = []
    const locationIds = new Set<string>() // Track unique locations
    
    // First, get all locations from accounts we own or have access to
    const accounts = await this.getAccounts()
    for (const account of accounts) {
      try {
        const locations = await this.getLocations(account.accountId)
        for (const location of locations) {
          const locationId = location.name.split('/').pop() || location.locationId
          if (!locationIds.has(locationId)) {
            locationIds.add(locationId)
            allLocations.push(location)
          }
        }
      } catch (error) {
        console.error(`Failed to fetch locations for account ${account.accountId}:`, error)
      }
    }

    // Check for any pending invitations that might give us access to additional locations
    const invitations = await this.getInvitations()
    console.log("Found invitations:", invitations)

    // The invitations will show us locations we've been invited to but haven't accepted yet
    // Once accepted, the locations will show up through the accounts above
    
    // Note: According to the API documentation, once you accept an invitation to a location,
    // you'll have access to it through the associated account. The Google My Business API
    // doesn't have a direct way to list "all locations I have admin access to" without
    // going through accounts.

    return allLocations
  }

  async getReviews(accountId: string, locationId: string): Promise<Review[]> {
    // Remove prefixes if present
    const cleanAccountId = accountId.replace("accounts/", "")
    const cleanLocationId = locationId.replace("locations/", "")

    const response = await this.makeRequest(
      `${GOOGLE_MY_BUSINESS_API}/accounts/${cleanAccountId}/locations/${cleanLocationId}/reviews`,
    )

    if (!response.ok) {
      console.error("Failed to fetch reviews:", await response.text())
      return []
    }

    const data = await response.json()
    return data.reviews || []
  }

  async replyToReview(
    accountId: string,
    locationId: string,
    reviewId: string,
    comment: string,
  ): Promise<boolean> {
    // Remove prefixes if present
    const cleanAccountId = accountId.replace("accounts/", "")
    const cleanLocationId = locationId.replace("locations/", "")
    const cleanReviewId = reviewId.replace("reviews/", "")

    const response = await this.makeRequest(
      `${GOOGLE_MY_BUSINESS_API}/accounts/${cleanAccountId}/locations/${cleanLocationId}/reviews/${cleanReviewId}/reply`,
      {
        method: "PUT",
        body: JSON.stringify({ comment }),
      },
    )

    if (!response.ok) {
      console.error("Failed to reply to review:", await response.text())
      return false
    }

    return true
  }

  async deleteReviewReply(
    accountId: string,
    locationId: string,
    reviewId: string,
  ): Promise<boolean> {
    // Remove prefixes if present
    const cleanAccountId = accountId.replace("accounts/", "")
    const cleanLocationId = locationId.replace("locations/", "")
    const cleanReviewId = reviewId.replace("reviews/", "")

    const response = await this.makeRequest(
      `${GOOGLE_MY_BUSINESS_API}/accounts/${cleanAccountId}/locations/${cleanLocationId}/reviews/${cleanReviewId}/reply`,
      {
        method: "DELETE",
      },
    )

    if (!response.ok) {
      console.error("Failed to delete review reply:", await response.text())
      return false
    }

    return true
  }

  async getBusinessInfo(accountId: string, locationId: string) {
    // Remove prefixes if present
    const cleanAccountId = accountId.replace("accounts/", "")
    const cleanLocationId = locationId.replace("locations/", "")

    const response = await this.makeRequest(
      `${GOOGLE_MY_BUSINESS_API}/accounts/${cleanAccountId}/locations/${cleanLocationId}?readMask=name,title,phoneNumbers,websiteUri,regularHours,specialHours`,
    )

    if (!response.ok) {
      console.error("Failed to fetch business info:", await response.text())
      return null
    }

    return await response.json()
  }
}
