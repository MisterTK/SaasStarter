import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { GoogleMyBusinessWrapper } from '$lib/services/google-my-business-wrapper'
import { env as publicEnv } from '$env/dynamic/public'
import { env as privateEnv } from '$env/dynamic/private'
import type { Json } from '$lib/../DatabaseDefinitions'

export const POST: RequestHandler = async ({ locals: { safeGetSession, supabaseServiceRole }, request, cookies }) => {
  const { user } = await safeGetSession()
  if (!user) {
    return json({ error: 'Unauthorized' }, { status: 401 })
  }

  const orgId = cookies.get('current_org_id')
  if (!orgId) {
    return json({ error: 'No organization selected' }, { status: 400 })
  }

  const { locations } = await request.json()

  if (!locations || !Array.isArray(locations)) {
    return json({ error: 'Locations array is required' }, { status: 400 })
  }

  try {
    const gmb = new GoogleMyBusinessWrapper(supabaseServiceRole, {
      clientId: publicEnv.PUBLIC_GOOGLE_CLIENT_ID,
      clientSecret: privateEnv.GOOGLE_CLIENT_SECRET,
      encryptionKey: privateEnv.TOKEN_ENCRYPTION_KEY
    })

    const results = []
    let totalReviews = 0

    for (const location of locations) {
      try {
        const { accountId, locationId } = location
        if (!accountId || !locationId) {
          results.push({ locationId, error: 'Missing accountId or locationId' })
          continue
        }

        const reviews = await gmb.getReviews(orgId, accountId, locationId)

        // Store reviews in database
        for (const review of reviews) {
          const reviewId = review.reviewId || review.name?.split('/').pop() || ''
          
          const { error } = await supabaseServiceRole
            .from('reviews')
            .upsert({
              organization_id: orgId,
              platform: 'google',
              platform_review_id: reviewId,
              location_id: locationId,
              location_name: location.locationName || review.locationName || locationId,
              reviewer_name: review.reviewer?.displayName || 'Anonymous',
              reviewer_avatar_url: review.reviewer?.profilePhotoUrl,
              rating: parseInt(review.starRating || '0'),
              review_text: review.comment,
              review_reply: review.reviewReply?.comment,
              reviewed_at: review.createTime,
              reply_updated_at: review.reviewReply?.updateTime,
              raw_data: JSON.parse(JSON.stringify(review)) as Json
            })

          if (error) {
            console.error('Error storing review:', error)
          }
        }

        totalReviews += reviews.length
        results.push({ locationId, success: true, reviewCount: reviews.length })
      } catch (error) {
        console.error(`Error syncing location ${location.locationId}:`, error)
        results.push({ 
          locationId: location.locationId, 
          error: error instanceof Error ? error.message : 'Failed to sync' 
        })
      }
    }

    return json({ 
      success: true, 
      results, 
      totalReviews,
      message: `Synced ${totalReviews} reviews from ${locations.length} locations`
    })
  } catch (error) {
    console.error('Error syncing reviews:', error)
    return json({ error: error instanceof Error ? error.message : 'Failed to sync reviews' }, { status: 500 })
  }
}