import { redirect, fail } from "@sveltejs/kit"
import type { PageServerLoad, Actions } from "./$types"

// Convert numeric rating to star rating string
function ratingToStarString(rating: number): string {
  const ratings = ["ONE", "TWO", "THREE", "FOUR", "FIVE"]
  return ratings[Math.min(Math.max(rating - 1, 0), 4)]
}

export const load: PageServerLoad = async ({
  params,
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

  // Fetch review from database
  const { data: review, error } = await supabaseServiceRole
    .from("reviews")
    .select("*")
    .eq("organization_id", orgId)
    .eq("platform_review_id", params.reviewId)
    .single()

  if (error || !review) {
    console.error("Error fetching review:", error)
    redirect(303, "/account/reviews")
  }

  // Convert database review to the format expected by the UI
  const formattedReview = {
    reviewId: review.platform_review_id,
    reviewer: {
      displayName: review.reviewer_name,
      profilePhotoUrl: review.reviewer_avatar_url,
    },
    starRating: ratingToStarString(review.rating),
    comment: review.review_text,
    createTime: review.reviewed_at,
    updateTime: review.reviewed_at,
    reviewReply: review.review_reply
      ? {
          comment: review.review_reply,
          updateTime: review.reply_updated_at || review.reviewed_at,
        }
      : null,
    locationName: review.location_name,
    // Store raw data for API calls
    rawData: review.raw_data,
  }

  const useAI = url.searchParams.get("ai") === "true"

  return {
    review: formattedReview,
    useAI,
  }
}

export const actions: Actions = {
  reply: async ({
    request,
    params,
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

    const formData = await request.formData()
    const replyText = formData.get("reply") as string

    if (!replyText || replyText.trim().length < 10) {
      return fail(400, { error: "Reply must be at least 10 characters long" })
    }

    try {
      // Fetch the review from database to get the full review name for API call
      const { data: review } = await supabaseServiceRole
        .from("reviews")
        .select("*")
        .eq("organization_id", orgId)
        .eq("platform_review_id", params.reviewId)
        .single()

      if (!review) {
        return fail(404, { error: "Review not found" })
      }

      // Get the review name from raw data
      const rawData = review.raw_data as { name?: string; reviewId?: string }
      const reviewName = rawData?.name || rawData?.reviewId
      if (!reviewName) {
        return fail(400, {
          error: "Cannot reply to this review - missing review identifier",
        })
      }

      // Send reply to Google My Business
      const { GoogleMyBusinessWrapper } = await import(
        "$lib/services/google-my-business-wrapper"
      )
      const { env: publicEnv } = await import("$env/dynamic/public")
      const { env: privateEnv } = await import("$env/dynamic/private")

      const gmb = new GoogleMyBusinessWrapper(supabaseServiceRole, {
        clientId: publicEnv.PUBLIC_GOOGLE_CLIENT_ID,
        clientSecret: privateEnv.GOOGLE_CLIENT_SECRET,
        encryptionKey: privateEnv.TOKEN_ENCRYPTION_KEY,
      })

      await gmb.replyToReviewByName(orgId, reviewName, replyText)

      // Update the review in our database
      await supabaseServiceRole
        .from("reviews")
        .update({
          review_reply: replyText,
          reply_updated_at: new Date().toISOString(),
        })
        .eq("organization_id", orgId)
        .eq("platform_review_id", params.reviewId)

      // Redirect back to reviews list
      redirect(303, "/account/reviews?success=reply_sent")
    } catch (error) {
      console.error("Error sending reply:", error)
      return fail(500, { error: "Failed to send reply. Please try again." })
    }
  },
}
