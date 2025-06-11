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

// Convert numeric rating to star rating string
function ratingToStarString(rating: number): string {
  const ratings = ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE'];
  return ratings[Math.min(Math.max(rating - 1, 0), 4)];
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

  // Check if we have a Google token to determine if connected
  const { data: googleToken } = await supabaseServiceRole
    .from("google_tokens")
    .select("*")
    .eq("organization_id", orgId)
    .eq("user_id", user.id)
    .single()

  const isConnected = !!googleToken

  // Fetch reviews from the database
  const { data: dbReviews, error } = await supabaseServiceRole
    .from("reviews")
    .select("*")
    .eq("organization_id", orgId)
    .order("reviewed_at", { ascending: false })

  if (error) {
    console.error("Error fetching reviews from database:", error)
  }

  // Convert database reviews to the format expected by the UI
  const reviews: Review[] = (dbReviews || []).map(review => ({
    reviewId: review.platform_review_id,
    name: review.platform_review_id,
    reviewer: {
      displayName: review.reviewer_name,
      profilePhotoUrl: review.reviewer_avatar_url,
    },
    starRating: ratingToStarString(review.rating),
    comment: review.review_text || undefined,
    createTime: review.reviewed_at,
    updateTime: review.reviewed_at,
    reviewReply: review.review_reply ? {
      comment: review.review_reply,
      updateTime: review.reply_updated_at || review.reviewed_at,
    } : null,
    locationName: review.location_name,
  }))

  // Get unique locations from reviews for filtering
  const locationMap = new Map<string, { name: string; locationId: string }>();
  dbReviews?.forEach(r => {
    if (!locationMap.has(r.location_id)) {
      locationMap.set(r.location_id, {
        name: r.location_name,
        locationId: r.location_id,
      });
    }
  });
  const uniqueLocations = Array.from(locationMap.values())

  // Create mock accounts structure for compatibility with existing UI
  const accounts: Account[] = uniqueLocations.length > 0 ? [{
    name: "Imported Locations",
    accountId: "imported",
    locations: uniqueLocations.map(loc => ({
      name: loc.name,
      locationId: loc.locationId,
    })),
  }] : []

  return {
    connected: isConnected,
    reviews,
    accounts,
    imported: url.searchParams.get("imported"),
    success: url.searchParams.get("success"),
  }
}
