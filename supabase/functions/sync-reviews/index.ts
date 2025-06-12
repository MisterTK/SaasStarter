import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { GoogleMyBusinessWrapper } from "../../../src/lib/services/google-my-business-wrapper.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey",
}

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    // Create Supabase client with service role
    const supabaseServiceRole = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
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
      throw orgError
    }

    const results = []

    // Process each organization
    for (const org of organizations || []) {
      try {
        const gmb = new GoogleMyBusinessWrapper(supabaseServiceRole, {
          clientId: Deno.env.get("PUBLIC_GOOGLE_CLIENT_ID") ?? "",
          clientSecret: Deno.env.get("GOOGLE_CLIENT_SECRET") ?? "",
          encryptionKey: Deno.env.get("TOKEN_ENCRYPTION_KEY") ?? "",
        })

        // Get all accessible locations
        const locations = await gmb.getAllAccessibleLocations(
          org.organization_id,
        )

        let totalNewReviews = 0

        // For each location, fetch reviews
        for (const location of locations) {
          const accountId = location.name.split("/")[1]
          const locationId = location.name.split("/")[3] || location.locationId

          const reviews = await gmb.getReviews(
            org.organization_id,
            accountId,
            locationId,
          )

          // Filter for unanswered reviews
          const unansweredReviews = reviews.filter(
            (review) => !review.reviewReply,
          )

          // Store new reviews in database
          for (const review of unansweredReviews) {
            const reviewId =
              review.reviewId || review.name?.split("/").pop() || ""

            // Check if review already exists
            const { data: existingReview } = await supabaseServiceRole
              .from("reviews")
              .select("id")
              .eq("organization_id", org.organization_id)
              .eq("platform", "google")
              .eq("platform_review_id", reviewId)
              .single()

            if (!existingReview) {
              // Insert new review
              const { error } = await supabaseServiceRole
                .from("reviews")
                .insert({
                  organization_id: org.organization_id,
                  platform: "google",
                  platform_review_id: reviewId,
                  location_id: locationId,
                  location_name: location.title || location.name,
                  reviewer_name: review.reviewer?.displayName || "Anonymous",
                  reviewer_avatar_url: review.reviewer?.profilePhotoUrl,
                  rating: parseInt(review.starRating || "0"),
                  review_text: review.comment,
                  review_reply: null,
                  reviewed_at: review.createTime,
                  raw_data: review,
                })

              if (!error) {
                totalNewReviews++
              }
            }
          }
        }

        results.push({
          organization_id: org.organization_id,
          success: true,
          newReviews: totalNewReviews,
        })
      } catch (error) {
        console.error(`Error syncing org ${org.organization_id}:`, error)
        results.push({
          organization_id: org.organization_id,
          success: false,
          error: error.message,
        })
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        synced: results.length,
        results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    )
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    })
  }
})
