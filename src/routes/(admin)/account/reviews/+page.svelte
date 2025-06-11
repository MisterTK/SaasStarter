<script lang="ts">
  import { getContext } from "svelte"
  import type { Writable } from "svelte/store"
  import type { PageData } from "./$types"

  let { data }: { data: PageData } = $props()
  let adminSection: Writable<string> = getContext("adminSection")
  adminSection.set("reviews")

  let selectedLocation = $state("all")
  let filterRating = $state("all")
  let filterStatus = $state("all")
  let sortBy = $state("newest")

  function getStarCount(rating: string): number {
    const ratings: Record<string, number> = {
      ONE: 1,
      TWO: 2,
      THREE: 3,
      FOUR: 4,
      FIVE: 5,
    }
    return ratings[rating] || 0
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 1) return "Yesterday"
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`
    return date.toLocaleDateString()
  }

  let filteredReviews = $derived.by(() => {
    if (!data.reviews) return []

    let reviews = [...data.reviews]

    // Filter by location
    if (selectedLocation !== "all") {
      reviews = reviews.filter((r) => r.locationName === selectedLocation)
    }

    // Filter by rating
    if (filterRating !== "all") {
      reviews = reviews.filter((r) => r.starRating === filterRating)
    }

    // Filter by status
    if (filterStatus === "replied") {
      reviews = reviews.filter((r) => r.reviewReply !== null)
    } else if (filterStatus === "unreplied") {
      reviews = reviews.filter((r) => r.reviewReply === null)
    }

    // Sort
    if (sortBy === "newest") {
      reviews.sort(
        (a, b) =>
          new Date(b.createTime).getTime() - new Date(a.createTime).getTime(),
      )
    } else if (sortBy === "oldest") {
      reviews.sort(
        (a, b) =>
          new Date(a.createTime).getTime() - new Date(b.createTime).getTime(),
      )
    } else if (sortBy === "rating-high") {
      reviews.sort(
        (a, b) => getStarCount(b.starRating) - getStarCount(a.starRating),
      )
    } else if (sortBy === "rating-low") {
      reviews.sort(
        (a, b) => getStarCount(a.starRating) - getStarCount(b.starRating),
      )
    }

    return reviews
  })

  let stats = $derived.by(() => {
    if (!data.reviews) return { total: 0, replied: 0, avgRating: "0.0" }

    const total = data.reviews.length
    const replied = data.reviews.filter((r) => r.reviewReply !== null).length
    const totalStars = data.reviews.reduce(
      (sum, r) => sum + getStarCount(r.starRating),
      0,
    )
    const avgRating = total > 0 ? (totalStars / total).toFixed(1) : "0.0"

    return { total, replied, avgRating }
  })
</script>

<svelte:head>
  <title>Reviews</title>
</svelte:head>

<div class="flex flex-col gap-6">
  <div class="flex items-center justify-between">
    <h1 class="text-2xl font-bold">Reviews</h1>
    {#if data.connected}
      <a href="/account/integrations" class="btn btn-sm btn-ghost">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="1.5"
          stroke="currentColor"
          class="w-4 h-4"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.107-1.204l-.527-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z"
          />
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
        Manage Integrations
      </a>
    {/if}
  </div>

  {#if !data.connected}
    <div class="card bg-base-100 shadow-sm">
      <div class="card-body text-center py-12">
        <h2 class="text-xl font-semibold mb-2">
          Connect Your Google My Business Account
        </h2>
        <p class="text-gray-600 mb-6">
          To view and manage your reviews, you need to connect your Google My
          Business account first.
        </p>
        <div class="flex justify-center">
          <a href="/account/integrations" class="btn btn-primary">
            <svg class="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Connect Google My Business
          </a>
        </div>
      </div>
    </div>
  {:else if data.error}
    <div class="alert alert-error">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="stroke-current shrink-0 h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        ><path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
        /></svg
      >
      <span>{data.error}</span>
    </div>
  {:else}
    <!-- Stats Cards -->
    <div class="stats shadow bg-base-100">
      <div class="stat">
        <div class="stat-title">Total Reviews</div>
        <div class="stat-value">{stats.total}</div>
      </div>

      <div class="stat">
        <div class="stat-title">Response Rate</div>
        <div class="stat-value">
          {stats.total > 0
            ? Math.round((stats.replied / stats.total) * 100)
            : 0}%
        </div>
        <div class="stat-desc">{stats.replied} of {stats.total} replied</div>
      </div>

      <div class="stat">
        <div class="stat-title">Average Rating</div>
        <div class="stat-value">{stats.avgRating}</div>
        <div class="rating rating-sm">
          {#each Array(5) as _, i}
            <input
              type="radio"
              class="mask mask-star-2 bg-orange-400"
              disabled
              checked={i < Math.round(Number(stats.avgRating))}
            />
          {/each}
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="card bg-base-100 shadow-sm">
      <div class="card-body">
        <div class="flex flex-wrap gap-4">
          <select
            bind:value={selectedLocation}
            class="select select-bordered select-sm"
          >
            <option value="all">All Locations</option>
            {#each data.accounts as account}
              {#each account.locations as location}
                <option value={location.name}>{location.name}</option>
              {/each}
            {/each}
          </select>

          <select
            bind:value={filterRating}
            class="select select-bordered select-sm"
          >
            <option value="all">All Ratings</option>
            <option value="FIVE">5 Stars</option>
            <option value="FOUR">4 Stars</option>
            <option value="THREE">3 Stars</option>
            <option value="TWO">2 Stars</option>
            <option value="ONE">1 Star</option>
          </select>

          <select
            bind:value={filterStatus}
            class="select select-bordered select-sm"
          >
            <option value="all">All Reviews</option>
            <option value="unreplied">Needs Reply</option>
            <option value="replied">Replied</option>
          </select>

          <select bind:value={sortBy} class="select select-bordered select-sm">
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="rating-high">Highest Rating</option>
            <option value="rating-low">Lowest Rating</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Reviews List -->
    <div class="space-y-4">
      {#each filteredReviews as review}
        <div class="card bg-base-100 shadow-sm">
          <div class="card-body">
            <div class="flex items-start justify-between">
              <div class="flex gap-4">
                <div class="avatar placeholder">
                  <div
                    class="bg-neutral-focus text-neutral-content rounded-full w-12"
                  >
                    <span class="text-xl"
                      >{review.reviewer.displayName.charAt(0)}</span
                    >
                  </div>
                </div>
                <div class="flex-1">
                  <div class="flex items-center gap-2 mb-1">
                    <h3 class="font-semibold">{review.reviewer.displayName}</h3>
                    <div class="rating rating-sm">
                      {#each Array(5) as _, i}
                        <input
                          type="radio"
                          class="mask mask-star-2 bg-orange-400"
                          disabled
                          checked={i < getStarCount(review.starRating)}
                        />
                      {/each}
                    </div>
                    <span class="text-sm text-gray-500"
                      >{formatDate(review.createTime)}</span
                    >
                  </div>
                  <p class="text-sm text-gray-500 mb-2">
                    {review.locationName}
                  </p>
                  <p class="text-base mb-4">{review.comment}</p>

                  {#if review.reviewReply}
                    <div class="bg-base-200 rounded-lg p-4">
                      <div class="flex items-center gap-2 mb-2">
                        <span class="badge badge-sm">Business Response</span>
                        <span class="text-sm text-gray-500"
                          >{formatDate(review.reviewReply.updateTime)}</span
                        >
                      </div>
                      <p class="text-sm">{review.reviewReply.comment}</p>
                    </div>
                  {:else}
                    <div class="flex gap-2">
                      <a
                        href="/account/reviews/{review.reviewId}"
                        class="btn btn-primary btn-sm"
                      >
                        Write Reply
                      </a>
                      <a
                        href="/account/reviews/{review.reviewId}?ai=true"
                        class="btn btn-secondary btn-sm"
                      >
                        <svg
                          class="w-4 h-4 mr-1"
                          viewBox="0 0 24 24"
                          stroke="none"
                          fill="currentColor"
                        >
                          <path
                            d="M21.928 11.607c-.202-.488-.635-.605-.928-.633V8c0-1.103-.897-2-2-2h-6V4.61c.305-.274.5-.668.5-1.11a1.5 1.5 0 0 0-3 0c0 .442.195.836.5 1.11V6H5c-1.103 0-2 .897-2 2v2.997l-.082.006A1 1 0 0 0 1.99 12v2a1 1 0 0 0 1 1H3v5c0 1.103.897 2 2 2h14c1.103 0 2-.897 2-2v-5a1 1 0 0 0 1-1v-1.938a1.006 1.006 0 0 0-.072-.455zM5 20V8h14l.001 3.996L19 12v2l.001.005.001 5.995H5z"
                          />
                          <ellipse cx="8.5" cy="12" rx="1.5" ry="2" />
                          <ellipse cx="15.5" cy="12" rx="1.5" ry="2" />
                          <path d="M8 16h8v2H8z" />
                        </svg>
                        AI Generate
                      </a>
                    </div>
                  {/if}
                </div>
              </div>
            </div>
          </div>
        </div>
      {/each}

      {#if filteredReviews.length === 0}
        <div class="card bg-base-100 shadow-sm">
          <div class="card-body text-center py-8">
            <p class="text-gray-500">No reviews found matching your filters.</p>
          </div>
        </div>
      {/if}
    </div>
  {/if}
</div>
