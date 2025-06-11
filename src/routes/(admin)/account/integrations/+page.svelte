<script lang="ts">
  import { getContext } from "svelte"
  import type { Writable } from "svelte/store"
  import type { PageData } from "./$types"

  let { data }: { data: PageData } = $props()
  let adminSection: Writable<string> = getContext("adminSection")
  adminSection.set("integrations")
</script>

<svelte:head>
  <title>Integrations</title>
</svelte:head>

<h1 class="text-2xl font-bold mb-6">Integrations</h1>

<div class="grid gap-6">
  <!-- Google My Business Integration -->
  <div class="card bg-base-100 shadow-sm">
    <div class="card-body">
      <div class="flex items-start justify-between">
        <div class="flex gap-4">
          <div class="avatar">
            <div
              class="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center"
            >
              <svg
                class="w-8 h-8 text-blue-600"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
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
            </div>
          </div>
          <div>
            <h3 class="text-lg font-semibold">Google My Business</h3>
            <p class="text-sm text-gray-600">
              Connect your Google My Business account to manage reviews
            </p>
          </div>
        </div>

        {#if data.googleConnected}
          <div class="flex items-center gap-2">
            <div class="badge badge-success gap-1">
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
                  d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Connected
            </div>
            <form method="POST" action="?/disconnectGoogle">
              <button type="submit" class="btn btn-sm btn-ghost"
                >Disconnect</button
              >
            </form>
          </div>
        {:else}
          <form method="POST" action="?/connectGoogle">
            <button type="submit" class="btn btn-primary btn-sm">Connect</button
            >
          </form>
        {/if}
      </div>

      {#if data.googleConnected && data.businessAccounts}
        <div class="mt-4 pt-4 border-t">
          <h4 class="font-medium mb-2">Connected Business Accounts</h4>
          <div class="space-y-2">
            {#each data.businessAccounts as account}
              <div
                class="flex items-center justify-between p-2 bg-base-200 rounded"
              >
                <span class="text-sm">{account.name}</span>
                <span class="text-xs text-gray-500"
                  >{account.location_count} locations</span
                >
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  </div>

  <!-- Future Integrations -->
  <div class="card bg-base-100 shadow-sm opacity-50">
    <div class="card-body">
      <div class="flex items-start justify-between">
        <div class="flex gap-4">
          <div class="avatar">
            <div
              class="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center"
            >
              <svg
                class="w-8 h-8 text-orange-600"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path
                  d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"
                />
              </svg>
            </div>
          </div>
          <div>
            <h3 class="text-lg font-semibold">Yelp Business</h3>
            <p class="text-sm text-gray-600">
              Coming soon - Connect your Yelp business account
            </p>
          </div>
        </div>
        <button class="btn btn-sm btn-disabled">Coming Soon</button>
      </div>
    </div>
  </div>

  <div class="card bg-base-100 shadow-sm opacity-50">
    <div class="card-body">
      <div class="flex items-start justify-between">
        <div class="flex gap-4">
          <div class="avatar">
            <div
              class="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center"
            >
              <svg
                class="w-8 h-8 text-blue-600"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path
                  d="M12 2.04c-5.5 0-10 4.49-10 10.02 0 5 3.66 9.15 8.44 9.9v-7H7.9v-2.9h2.54V9.85c0-2.52 1.49-3.92 3.78-3.92 1.09 0 2.23.19 2.23.19v2.47h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.45 2.9h-2.33v7a10 10 0 008.44-9.9c0-5.53-4.5-10.02-10-10.02z"
                />
              </svg>
            </div>
          </div>
          <div>
            <h3 class="text-lg font-semibold">Facebook Pages</h3>
            <p class="text-sm text-gray-600">
              Coming soon - Manage Facebook page reviews
            </p>
          </div>
        </div>
        <button class="btn btn-sm btn-disabled">Coming Soon</button>
      </div>
    </div>
  </div>
</div>
