export interface GoogleToken {
  access_token: string
  refresh_token: string
  expires_at: string
}

interface BusinessLocation {
  name: string
  locationId: string
  address: string
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
  reviewId: string
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
  locationName: string
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
        client_id: process.env.PUBLIC_GOOGLE_CLIENT_ID || "",
        client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
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
