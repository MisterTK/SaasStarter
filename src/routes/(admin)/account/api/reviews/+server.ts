import { json } from "@sveltejs/kit"
import type { RequestHandler } from "./$types"
import { GoogleMyBusinessWrapper } from "$lib/services/google-my-business-wrapper"
import { env as publicEnv } from "$env/dynamic/public"
import { env as privateEnv } from "$env/dynamic/private"
import type { Json } from "$lib/../DatabaseDefinitions"

export const GET: RequestHandler = async ({
  locals: { safeGetSession, supabaseServiceRole },
  url,
  cookies,
}) => {
  const { user } = await safeGetSession()
  if (!user) {
    return json({ error: "Unauthorized" }, { status: 401 })
  }

  const orgId = cookies.get("current_org_id")
  if (!orgId) {
    return json({ error: "No organization selected" }, { status: 400 })
  }

  const accountId = url.searchParams.get("accountId")
  const locationId = url.searchParams.get("locationId")

  if (!accountId || !locationId) {
    return json(
      { error: "Missing accountId or locationId parameter" },
      { status: 400 },
    )
  }

  try {
    const gmb = new GoogleMyBusinessWrapper(supabaseServiceRole, {
      clientId: publicEnv.PUBLIC_GOOGLE_CLIENT_ID,
      clientSecret: privateEnv.GOOGLE_CLIENT_SECRET,
      encryptionKey: privateEnv.TOKEN_ENCRYPTION_KEY,
    })

    const reviews = await gmb.getReviews(orgId, accountId, locationId)

    // Store reviews in database for caching and history
    for (const review of reviews) {
      const { error } = await supabaseServiceRole.from("reviews").upsert({
        organization_id: orgId,
        platform: "google",
        platform_review_id: review.reviewId || review.name || "",
        location_id: locationId,
        location_name: review.locationName || locationId,
        reviewer_name: review.reviewer?.displayName || "Anonymous",
        reviewer_avatar_url: review.reviewer?.profilePhotoUrl,
        rating: parseInt(review.starRating || "0"),
        review_text: review.comment,
        review_reply: review.reviewReply?.comment,
        reviewed_at: review.createTime,
        reply_updated_at: review.reviewReply?.updateTime,
        raw_data: JSON.parse(JSON.stringify(review)) as Json,
      })

      if (error) {
        console.error("Error storing review:", error)
      }
    }

    return json({ reviews, success: true })
  } catch (error) {
    console.error("Error fetching reviews:", error)
    return json(
      {
        error:
          error instanceof Error ? error.message : "Failed to fetch reviews",
      },
      { status: 500 },
    )
  }
}

export const POST: RequestHandler = async ({
  locals: { safeGetSession, supabaseServiceRole },
  request,
  cookies,
}) => {
  const { user } = await safeGetSession()
  if (!user) {
    return json({ error: "Unauthorized" }, { status: 401 })
  }

  const orgId = cookies.get("current_org_id")
  if (!orgId) {
    return json({ error: "No organization selected" }, { status: 400 })
  }

  const { accountId, locationId, reviewId, action, replyText } =
    await request.json()

  if (!accountId || !locationId || !reviewId || !action) {
    return json({ error: "Missing required parameters" }, { status: 400 })
  }

  try {
    const gmb = new GoogleMyBusinessWrapper(supabaseServiceRole, {
      clientId: publicEnv.PUBLIC_GOOGLE_CLIENT_ID,
      clientSecret: privateEnv.GOOGLE_CLIENT_SECRET,
      encryptionKey: privateEnv.TOKEN_ENCRYPTION_KEY,
    })

    const service = await gmb.createService(orgId)
    if (!service) {
      return json({ error: "No Google connection found" }, { status: 400 })
    }

    let success = false

    switch (action) {
      case "reply":
        if (!replyText) {
          return json({ error: "Reply text is required" }, { status: 400 })
        }
        success = await service.replyToReview(
          accountId,
          locationId,
          reviewId,
          replyText,
        )
        break
      case "delete_reply":
        success = await service.deleteReviewReply(
          accountId,
          locationId,
          reviewId,
        )
        break
      default:
        return json({ error: "Invalid action" }, { status: 400 })
    }

    if (success) {
      // Update the review in our database
      if (action === "reply") {
        await supabaseServiceRole
          .from("reviews")
          .update({
            review_reply: replyText,
            reply_updated_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("organization_id", orgId)
          .eq("platform_review_id", reviewId)
      } else if (action === "delete_reply") {
        await supabaseServiceRole
          .from("reviews")
          .update({
            review_reply: null,
            reply_updated_at: null,
            updated_at: new Date().toISOString(),
          })
          .eq("organization_id", orgId)
          .eq("platform_review_id", reviewId)
      }
    }

    return json({ success })
  } catch (error) {
    console.error("Error managing review:", error)
    return json(
      {
        error:
          error instanceof Error ? error.message : "Failed to manage review",
      },
      { status: 500 },
    )
  }
}
