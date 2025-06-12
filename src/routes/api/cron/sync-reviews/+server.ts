import { json } from "@sveltejs/kit"
import type { RequestHandler } from "./$types"
import { syncUnansweredReviews } from "$lib/jobs/sync-unanswered-reviews"
import { env } from "$env/dynamic/private"

// This endpoint can be called by Vercel Cron or any external scheduler
export const GET: RequestHandler = async ({ request }) => {
  // Verify the request is from Vercel Cron (in production)
  if (process.env.NODE_ENV === "production") {
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
      return json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  try {
    console.log("Starting scheduled review sync...")
    const result = await syncUnansweredReviews()

    console.log("Review sync completed:", result)

    return json(result)
  } catch (error) {
    console.error("Error in scheduled review sync:", error)
    return json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}

// Also support POST for manual triggers
export const POST = GET
