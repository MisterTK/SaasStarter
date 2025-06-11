import { redirect, fail } from "@sveltejs/kit"
import type { PageServerLoad, Actions } from "./$types"

export const load: PageServerLoad = async ({
  params,
  locals: { safeGetSession },
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

  // Mock review data - in production, fetch from Google My Business API
  const mockReview = {
    reviewId: params.reviewId,
    reviewer: {
      displayName: "John Doe",
      profilePhotoUrl: null,
    },
    starRating: "THREE",
    comment: "Food was okay but nothing special. Service could be better.",
    createTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updateTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    reviewReply: null,
    locationName: "Example Restaurant - Downtown",
  }

  const useAI = url.searchParams.get("ai") === "true"

  return {
    review: mockReview,
    useAI,
  }
}

export const actions: Actions = {
  reply: async ({ request, params, locals: { safeGetSession }, cookies }) => {
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

    // In production, you would:
    // 1. Get the Google access token
    // 2. Send the reply to Google My Business API
    // 3. Store the reply in your database for tracking

    // For now, just simulate success
    console.log("Would send reply:", {
      reviewId: params.reviewId,
      reply: replyText,
      orgId,
      userId: user.id,
    })

    // Redirect back to reviews list
    redirect(303, "/account/reviews")
  },
}
