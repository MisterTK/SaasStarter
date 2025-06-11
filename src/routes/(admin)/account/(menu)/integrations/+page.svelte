<script lang="ts">
  import { getContext } from "svelte"
  import type { Writable } from "svelte/store"
  import type { PageData } from "./$types"
  import { enhance } from "$app/forms"
  import { goto } from "$app/navigation"

  let { data }: { data: PageData } = $props()
  let adminSection: Writable<string> = getContext("adminSection")
  adminSection.set("integrations")
  
  let importingLocation = $state<string | null>(null)
</script>

<svelte:head>
  <title>Integrations</title>
</svelte:head>

<h1 class="text-2xl font-bold mb-6">Integrations</h1>

{#if data.success}
  <div class="alert alert-success mb-6">
    <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
    <span>
      {#if data.successType === 'invitation-accepted'}
        Successfully accepted the invitation!
      {:else}
        Successfully connected Google My Business account!
      {/if}
    </span>
  </div>
{/if}

{#if data.error}
  <div class="alert alert-error mb-6">
    <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
    <span>{data.error}</span>
  </div>
{/if}

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

      {#if data.googleConnected}
        {#if data.invitations && data.invitations.length > 0}
          <div class="mt-4 pt-4 border-t">
            <h4 class="font-medium mb-2">Pending Invitations</h4>
            <p class="text-sm text-gray-600 mb-3">
              These are locations you've been invited to manage.
            </p>
            <div class="space-y-2">
              {#each data.invitations as invitation}
                <div
                  class="flex items-center justify-between p-3 bg-warning/10 border border-warning rounded-lg"
                >
                  <div>
                    {#if invitation.targetLocation}
                      <div class="font-medium text-sm">{invitation.targetLocation.locationName}</div>
                      {#if invitation.targetLocation.address}
                        <div class="text-xs text-gray-500">{invitation.targetLocation.address}</div>
                      {/if}
                    {:else if invitation.targetAccount}
                      <div class="font-medium text-sm">{invitation.targetAccount.accountName}</div>
                      {#if invitation.targetAccount.email}
                        <div class="text-xs text-gray-500">{invitation.targetAccount.email}</div>
                      {/if}
                    {/if}
                    <div class="text-xs text-gray-500 mt-1">
                      Role: {invitation.role} • Status: {invitation.state}
                    </div>
                  </div>
                  <form method="POST" action="?/acceptInvitation">
                    <input type="hidden" name="invitationName" value={invitation.name} />
                    <button type="submit" class="btn btn-sm btn-primary">
                      Accept
                    </button>
                  </form>
                </div>
              {/each}
            </div>
          </div>
        {/if}
        
        {#if data.businessAccounts && data.businessAccounts.length > 0}
          <div class="mt-4 pt-4 border-t">
            <h4 class="font-medium mb-2">Business Accounts</h4>
            <div class="space-y-2">
              {#each data.businessAccounts as account}
                <div
                  class="flex items-center justify-between p-3 bg-base-200 rounded-lg"
                >
                  <div>
                    <div class="font-medium text-sm">{account.name}</div>
                    <div class="text-xs text-gray-500">
                      {account.type} • {account.role}
                    </div>
                  </div>
                  <div class="badge badge-neutral badge-sm">{account.state}</div>
                </div>
              {/each}
            </div>
          </div>
        {/if}
        
        {#if data.accessibleLocations && data.accessibleLocations.length > 0}
          <div class="mt-4 pt-4 border-t">
            <h4 class="font-medium mb-2">Accessible Locations</h4>
            <p class="text-sm text-gray-600 mb-3">
              These are all locations you have access to, including those shared with you.
            </p>
            <div class="space-y-2">
              {#each data.accessibleLocations as location}
                <div
                  class="flex items-center justify-between p-3 bg-base-200 rounded-lg"
                >
                  <div>
                    <div class="font-medium text-sm">{location.title || location.name}</div>
                    {#if location.address}
                      <div class="text-xs text-gray-500">
                        {#if typeof location.address === 'object' && location.address.addressLines}
                          {location.address.addressLines.join(', ')}
                        {:else}
                          {location.address}
                        {/if}
                      </div>
                    {/if}
                    {#if location.primaryPhone}
                      <div class="text-xs text-gray-500">{location.primaryPhone}</div>
                    {/if}
                  </div>
                  <form 
                    method="POST" 
                    action="?/importReviews"
                    use:enhance={() => {
                      importingLocation = location.name
                      return async ({ result, update }) => {
                        if (result.type === 'redirect') {
                          // Handle redirect manually to prevent form resubmission
                          await update({ reset: false })
                          importingLocation = null
                          // Use goto for client-side navigation
                          goto(result.location)
                        } else {
                          await update()
                          importingLocation = null
                        }
                      }
                    }}
                  >
                    <input type="hidden" name="accountId" value={location.name.split('/')[1]} />
                    <input type="hidden" name="locationId" value={location.name.split('/')[3] || location.locationId} />
                    <input type="hidden" name="locationName" value={location.title || location.name} />
                    <button 
                      type="submit" 
                      class="btn btn-xs btn-primary"
                      disabled={importingLocation === location.name}
                    >
                      {#if importingLocation === location.name}
                        <span class="loading loading-spinner loading-xs"></span>
                        Importing...
                      {:else}
                        Import Reviews
                      {/if}
                    </button>
                  </form>
                </div>
              {/each}
            </div>
          </div>
        {:else if data.businessAccounts && data.businessAccounts.length === 0 && (!data.accessibleLocations || data.accessibleLocations.length === 0)}
          <div class="mt-4 pt-4 border-t">
            <div class="alert alert-info">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              <div>
                <h3 class="font-bold">No business locations found</h3>
                <div class="text-xs">
                  <p>This could mean:</p>
                  <ul class="list-disc ml-5 mt-1">
                    <li>Your Google account doesn't have any Google My Business locations</li>
                    <li>You need to be invited to manage a location by the business owner</li>
                    <li>You have pending invitations (check above)</li>
                  </ul>
                  <p class="mt-2">Ask the business owner to invite your Google account email to manage their location.</p>
                </div>
              </div>
            </div>
          </div>
        {/if}
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
