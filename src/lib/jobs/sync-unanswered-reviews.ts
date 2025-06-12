import { createClient } from "@supabase/supabase-js"
import { GoogleMyBusinessWrapper } from "../services/google-my-business-wrapper"
import type { Database } from "../../DatabaseDefinitions"

/**
 * Sync unanswered reviews for all organizations
 * This can be called from:
 * - Vercel cron jobs
 * - Supabase Edge Functions
 * - GitHub Actions
 * - Any other scheduler
 */
export async function syncUnansweredReviews() {
  // Create service role client
  const supabaseServiceRole = createClient<Database>(
    process.env.PUBLIC_SUPABASE_URL!,
    process.env.PRIVATE_SUPABASE_SERVICE_ROLE!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  )

  // Get all organizations with Google tokens
  const { data: organizations, error: orgError } = await supabaseServiceRole
    .from("google_tokens")
    .select("organization_id")
    .not("refresh_token", "is", null)

  if (orgError) {
    console.error("Error fetching organizations:", orgError)
    return { error: orgError }
  }

  const results = []

  // Process each organization
  for (const org of organizations || []) {
    try {
      const gmb = new GoogleMyBusinessWrapper(supabaseServiceRole, {
        clientId: process.env.PUBLIC_GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        encryptionKey: process.env.TOKEN_ENCRYPTION_KEY!,
      })

      // Get all accessible locations
      const locations = await gmb.getAllAccessibleLocations(
        org.organization_id!,
      )

      let totalNewReviews = 0
      let totalUnanswered = 0

      // For each location, fetch reviews
      for (const location of locations) {
        const accountId = location.name.split("/")[1]
        const locationId = location.name.split("/")[3] || location.locationId

        try {
          const reviews = await gmb.getReviews(
            org.organization_id!,
            accountId,
            locationId,
          )

          for (const review of reviews) {
            const reviewId =
              review.reviewId || review.name?.split("/").pop() || ""

            // Check if review already exists
            const { data: existingReview } = await supabaseServiceRole
              .from("reviews")
              .select("id, review_reply")
              .eq("organization_id", org.organization_id!)
              .eq("platform", "google")
              .eq("platform_review_id", reviewId)
              .single()

            if (!existingReview) {
              // Insert new review
              const { error } = await supabaseServiceRole
                .from("reviews")
                .insert({
                  organization_id: org.organization_id!,
                  platform: "google",
                  platform_review_id: reviewId,
                  location_id: locationId,
                  location_name: location.title || location.name,
                  reviewer_name: review.reviewer?.displayName || "Anonymous",
                  reviewer_avatar_url: review.reviewer?.profilePhotoUrl,
                  rating: parseInt(review.starRating || "0"),
                  review_text: review.comment,
                  review_reply: review.reviewReply?.comment || null,
                  reviewed_at: review.createTime,
                  reply_updated_at: review.reviewReply?.updateTime || null,
                  raw_data: JSON.parse(JSON.stringify(review)),
                })

              if (!error) {
                totalNewReviews++
                if (!review.reviewReply) {
                  totalUnanswered++
                }
              }
            } else {
              // Update existing review if reply status changed
              if (existingReview.review_reply !== review.reviewReply?.comment) {
                await supabaseServiceRole
                  .from("reviews")
                  .update({
                    review_reply: review.reviewReply?.comment || null,
                    reply_updated_at: review.reviewReply?.updateTime || null,
                    updated_at: new Date().toISOString(),
                  })
                  .eq("id", existingReview.id)
              }

              if (!review.reviewReply) {
                totalUnanswered++
              }
            }
          }
        } catch (error) {
          console.error(`Error syncing location ${location.name}:`, error)
        }
      }

      results.push({
        organization_id: org.organization_id,
        success: true,
        newReviews: totalNewReviews,
        unansweredReviews: totalUnanswered,
      })
    } catch (error) {
      console.error(`Error syncing org ${org.organization_id}:`, error)
      results.push({
        organization_id: org.organization_id,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  return {
    success: true,
    synced: results.length,
    results,
  }
}

/**
 * Get count of unanswered reviews per organization
 */
export async function getUnansweredReviewCounts() {
  const supabaseServiceRole = createClient<Database>(
    process.env.PUBLIC_SUPABASE_URL!,
    process.env.PRIVATE_SUPABASE_SERVICE_ROLE!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  )

  const { data, error } = await supabaseServiceRole
    .from("reviews")
    .select("organization_id")
    .is("review_reply", null)

  if (error) {
    return { error }
  }

  // Count by organization
  const counts: Record<string, number> = {}
  for (const review of data || []) {
    counts[review.organization_id] = (counts[review.organization_id] || 0) + 1
  }

  return { counts }
}
