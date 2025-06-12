<script lang="ts">
  import type { PageData, ActionData } from "./$types"

  let { data, form }: { data: PageData; form: ActionData } = $props()

  let accountId = $state("")
  let locationId = $state("")
  let loading = $state(false)
</script>

<div class="container mx-auto p-8 max-w-4xl">
  <h1 class="text-3xl font-bold mb-6">Google My Business API Test</h1>

  <div class="alert alert-warning mb-6">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      class="stroke-current shrink-0 h-6 w-6"
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
    <div>
      <h3 class="font-bold">Test Page</h3>
      <div class="text-sm">
        This page is for testing Google My Business API connectivity. Only
        accessible in development or by admins.
      </div>
    </div>
  </div>

  <form method="POST" action="?/testApi" class="space-y-4">
    <div class="form-control">
      <label class="label" for="accountId">
        <span class="label-text">Account ID</span>
      </label>
      <input
        type="text"
        id="accountId"
        name="accountId"
        bind:value={accountId}
        placeholder="e.g., accounts/123456789"
        class="input input-bordered"
        required
      />
      <label class="label">
        <span class="label-text-alt"
          >Enter the Google My Business account ID (format: accounts/XXXXXXXXX)</span
        >
      </label>
    </div>

    <div class="form-control">
      <label class="label" for="locationId">
        <span class="label-text">Location ID</span>
      </label>
      <input
        type="text"
        id="locationId"
        name="locationId"
        bind:value={locationId}
        placeholder="e.g., locations/987654321"
        class="input input-bordered"
        required
      />
      <label class="label">
        <span class="label-text-alt"
          >Enter the location ID (format: locations/XXXXXXXXX)</span
        >
      </label>
    </div>

    <button
      type="submit"
      class="btn btn-primary"
      disabled={loading || !accountId || !locationId}
      onclick={() => (loading = true)}
    >
      {#if loading}
        <span class="loading loading-spinner"></span>
        Testing API...
      {:else}
        Test API Connection
      {/if}
    </button>
  </form>

  {#if form}
    <div class="mt-8">
      {#if form.success && form.results}
        <h2 class="text-2xl font-semibold mb-4">Test Results</h2>

        {#each form.results as result}
          <div class="card bg-base-100 shadow-xl mb-4">
            <div class="card-body">
              <h3 class="card-title flex items-center gap-2">
                {result.test}
                {#if result.success}
                  <div class="badge badge-success">Success</div>
                {:else}
                  <div class="badge badge-error">Failed</div>
                {/if}
              </h3>

              <div class="overflow-x-auto">
                <pre class="text-xs bg-base-200 p-4 rounded"><code
                    >{JSON.stringify(result, null, 2)}</code
                  ></pre>
              </div>
            </div>
          </div>
        {/each}

        <div class="card bg-base-100 shadow-xl">
          <div class="card-body">
            <h3 class="card-title">Test Parameters</h3>
            <div class="text-sm">
              <p><strong>Account ID:</strong> {form.accountId}</p>
              <p><strong>Location ID:</strong> {form.locationId}</p>
            </div>
          </div>
        </div>
      {:else if form.error}
        <div class="alert alert-error">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="stroke-current shrink-0 h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>
            <h3 class="font-bold">Error</h3>
            <div class="text-sm">{form.error}</div>
            {#if form.stack}
              <details class="mt-2">
                <summary class="cursor-pointer text-sm">Stack trace</summary>
                <pre class="text-xs mt-2 overflow-x-auto">{form.stack}</pre>
              </details>
            {/if}
          </div>
        </div>
      {/if}
    </div>
  {/if}

  <div class="mt-8 prose">
    <h2>Instructions</h2>
    <ol>
      <li>
        Make sure you have connected your Google account in the Integrations
        page
      </li>
      <li>
        Get your Account ID and Location ID from the Google My Business
        dashboard or API
      </li>
      <li>Enter both IDs in the form above and click "Test API Connection"</li>
      <li>
        The test will try different methods to connect to the Google My Business
        API
      </li>
    </ol>

    <h3>What this tests:</h3>
    <ul>
      <li>Direct URL construction (to check for encoding issues)</li>
      <li>Google APIs library connection</li>
      <li>Direct fetch with OAuth token</li>
      <li>Environment variable availability</li>
    </ul>
  </div>
</div>

<style>
  code {
    word-break: break-all;
  }
</style>
