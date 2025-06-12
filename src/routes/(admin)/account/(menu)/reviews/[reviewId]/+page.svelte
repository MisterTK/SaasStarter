<script lang="ts">
  import { getContext } from "svelte"
  import type { Writable } from "svelte/store"
  import type { PageData } from "./$types"
  import ReviewResponseGenerator from "$lib/components/ReviewResponseGenerator.svelte"

  let { data }: { data: PageData } = $props()
  let adminSection: Writable<string> = getContext("adminSection")
  adminSection.set("reviews")

  let replyText = $state("")
  let isSubmitting = $state(false)

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
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 1000 * 24))

    if (diffDays === 1) return "Yesterday"
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`
    return date.toLocaleDateString()
  }

  function handleGeneratedResponse(response: string) {
    replyText = response
  }
</script>

<svelte:head>
  <title>Reply to Review</title>
</svelte:head>

<div class="max-w-4xl mx-auto">
  <div class="mb-6">
    <a href="/account/reviews" class="btn btn-ghost btn-sm gap-2">
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
          d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
        />
      </svg>
      Back to Reviews
    </a>
  </div>

  <h1 class="text-2xl font-bold mb-6">Reply to Review</h1>

  <!-- Review Card -->
  <div class="card bg-base-100 shadow-sm mb-6">
    <div class="card-body">
      <div class="flex gap-4">
        <div class="avatar placeholder">
          <div class="bg-neutral-focus text-neutral-content rounded-full w-12">
            <span class="text-xl"
              >{data.review.reviewer.displayName.charAt(0)}</span
            >
          </div>
        </div>
        <div class="flex-1">
          <div class="flex items-center gap-2 mb-1">
            <h3 class="font-semibold">{data.review.reviewer.displayName}</h3>
            <div class="rating rating-sm">
              {#each [...Array(5).keys()] as i (i)}
                <input
                  type="radio"
                  class="mask mask-star-2 bg-orange-400"
                  disabled
                  checked={i < getStarCount(data.review.starRating)}
                />
              {/each}
            </div>
            <span class="text-sm text-gray-500"
              >{formatDate(data.review.createTime)}</span
            >
          </div>
          <p class="text-sm text-gray-500 mb-2">{data.review.locationName}</p>
          <p class="text-base">{data.review.comment}</p>
        </div>
      </div>
    </div>
  </div>

  <!-- Reply Section -->
  {#if data.useAI}
    <div class="card bg-base-100 shadow-sm">
      <div class="card-body">
        <h2 class="text-lg font-semibold mb-4">AI-Generated Response</h2>
        <ReviewResponseGenerator
          review={{
            rating: getStarCount(data.review.starRating),
            comment: data.review.comment || "",
            customerName: data.review.reviewer.displayName,
            businessType: "restaurant",
          }}
          onResponseGenerated={handleGeneratedResponse}
        />

        {#if replyText}
          <div class="divider">OR</div>
          <h3 class="text-lg font-semibold mb-2">Use Generated Response</h3>
          <form method="POST" action="?/reply">
            <textarea
              name="reply"
              bind:value={replyText}
              class="textarea textarea-bordered w-full h-32 mb-4"
              placeholder="Edit the generated response or write your own..."
              required
              minlength="10"
            ></textarea>
            <div class="flex justify-end gap-2">
              <a href="/account/reviews" class="btn btn-ghost">Cancel</a>
              <button
                type="submit"
                class="btn btn-primary"
                disabled={isSubmitting || replyText.trim().length < 10}
              >
                {isSubmitting ? "Sending..." : "Send Reply"}
              </button>
            </div>
          </form>
        {/if}
      </div>
    </div>
  {:else}
    <div class="card bg-base-100 shadow-sm">
      <div class="card-body">
        <h2 class="text-lg font-semibold mb-4">Write Your Reply</h2>
        <form method="POST" action="?/reply">
          <textarea
            name="reply"
            bind:value={replyText}
            class="textarea textarea-bordered w-full h-32 mb-4"
            placeholder="Thank you for your feedback..."
            required
            minlength="10"
          ></textarea>

          <div class="flex items-center justify-between">
            <a href="?ai=true" class="btn btn-secondary btn-sm gap-2">
              <svg
                class="w-4 h-4"
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
              Use AI Assistant
            </a>

            <div class="flex gap-2">
              <a href="/account/reviews" class="btn btn-ghost">Cancel</a>
              <button
                type="submit"
                class="btn btn-primary"
                disabled={isSubmitting || replyText.trim().length < 10}
              >
                {isSubmitting ? "Sending..." : "Send Reply"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  {/if}

  <!-- Best Practices Tips -->
  <div class="card bg-base-200 mt-6">
    <div class="card-body">
      <h3 class="font-semibold mb-2">Tips for Great Review Responses</h3>
      <ul class="text-sm space-y-1">
        <li>• Thank the customer for their feedback</li>
        <li>• Address specific concerns mentioned in the review</li>
        <li>• Keep responses professional and courteous</li>
        <li>• Offer to resolve issues offline when appropriate</li>
        <li>• Personalize each response - avoid generic templates</li>
      </ul>
    </div>
  </div>
</div>
