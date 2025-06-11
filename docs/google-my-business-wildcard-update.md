# Google My Business Wildcard Account Implementation

## Overview

Updated the Google My Business integration to support fetching locations using the wildcard account approach (`accounts/-/locations`). This allows the application to access both:

1. **Account-owned locations** - Locations from accounts the user owns or has been granted access to
2. **Directly shared locations** - Locations shared directly with the user without full account access

## Key Changes

### 1. New Methods in `GoogleMyBusinessService`

- **`getAllLocationsWithWildcard()`** - Fetches all locations using the wildcard account API endpoint
- **`getReviewsByLocationName(locationName)`** - Gets reviews using the full location name
- **`replyToReviewByName(reviewName, comment)`** - Replies to reviews using the full review name
- **`deleteReviewReplyByName(reviewName)`** - Deletes review replies using the review name
- **`getBusinessInfoByLocationName(locationName)`** - Gets business info using the location name
- **`getAllReviews()`** - Convenience method to get all reviews for all accessible locations

### 2. Updated `getAllAccessibleLocations()` Method

The method now:
1. First attempts to use the wildcard approach to get all locations
2. Falls back to the legacy account-based approach if the wildcard fails
3. Provides better error handling and logging

### 3. Updates to Reviews Page

The reviews page (`/account/reviews`) now uses the new wildcard approach to:
- Fetch all accessible locations more efficiently
- Group locations by account for display
- Handle both owned and shared locations seamlessly

## API Endpoints Used

- **Wildcard locations**: `https://mybusinessbusinessinformation.googleapis.com/v1/accounts/-/locations?readMask=name,title`
- **Reviews by location name**: `https://mybusinessbusinessinformation.googleapis.com/v1/{locationName}/reviews`
- **Reply to review**: `https://mybusinessbusinessinformation.googleapis.com/v1/{reviewName}/reply`

## Benefits

1. **Simplified access** - No need to iterate through multiple accounts
2. **Better coverage** - Captures locations that might be shared directly without account access
3. **Performance** - Single API call instead of multiple calls per account
4. **Backward compatibility** - Falls back to the old approach if needed

## Usage Example

```typescript
// Create service instance
const gmb = new GoogleMyBusinessService(accessToken, refreshToken);

// Get all locations (both owned and shared)
const locations = await gmb.getAllAccessibleLocations();

// Get reviews for a location using its name
const reviews = await gmb.getReviewsByLocationName("accounts/123/locations/456");

// Reply to a review using its full name
await gmb.replyToReviewByName("accounts/123/locations/456/reviews/789", "Thank you for your feedback!");
```