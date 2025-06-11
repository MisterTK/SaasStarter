<script lang="ts">
  import { getContext } from "svelte"
  import type { Writable } from "svelte/store"
  import type { PageData } from './$types'

  let { data }: { data: PageData } = $props()
  let adminSection: Writable<string> = getContext("adminSection")
  adminSection.set("home")
</script>

<svelte:head>
  <title>Account</title>
</svelte:head>

<h1 class="text-2xl font-bold mb-1">Dashboard</h1>

{#if data.organization}
  <div class="mb-6">
    <div class="card bg-base-100 shadow-sm">
      <div class="card-body">
        <h2 class="card-title">Organization Details</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p class="text-sm text-gray-600">Organization Name</p>
            <p class="font-semibold">{data.organization.name}</p>
          </div>
          <div>
            <p class="text-sm text-gray-600">Your Role</p>
            <p class="font-semibold capitalize">{data.userRole}</p>
          </div>
          <div>
            <p class="text-sm text-gray-600">Organization URL</p>
            <p class="font-semibold">{data.organization.slug}</p>
          </div>
          <div>
            <p class="text-sm text-gray-600">Status</p>
            <div class="badge badge-success">Active</div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="alert alert-info max-w-2xl">
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
    </svg>
    <div>
      <h3 class="font-bold">Getting Started</h3>
      <div class="text-sm">
        <p>Welcome to your Reviews Dashboard! Here are your next steps:</p>
        <ol class="list-decimal list-inside mt-2">
          <li>Connect your Google My Business account</li>
          <li>Import your existing reviews</li>
          <li>Set up AI response templates</li>
        </ol>
      </div>
    </div>
  </div>
{/if}

<div class="my-6">
  <h1 class="text-xl font-bold mb-1">Users</h1>
  <div class="stats shadow-sm stats-vertical sm:stats-horizontal sm:w-[420px]">
    <div class="stat place-items-center">
      <div class="stat-title">Downloads</div>
      <div class="stat-value">31K</div>
      <div class="stat-desc">↗︎ 546 (2%)</div>
    </div>

    <div class="stat place-items-center">
      <div class="stat-title">Users</div>
      <div class="stat-value text-secondary">4,200</div>
      <div class="stat-desc">↗︎ 40 (2%)</div>
    </div>
  </div>
</div>
<div class="my-6">
  <h1 class="text-xl font-bold mb-1">Accounts</h1>
  <div class="stats shadow-sm stats-vertical sm:stats-horizontal sm:w-[420px]">
    <div class="stat place-items-center">
      <div class="stat-title">New Registers</div>
      <div class="stat-value">1,200</div>
      <div class="stat-desc">↘︎ 90 (14%)</div>
    </div>

    <div class="stat place-items-center">
      <div class="stat-title">Churned Accounts</div>
      <div class="stat-value">42</div>
      <div class="stat-desc">↘︎ 6 (12%)</div>
    </div>
  </div>
</div>
<div class="my-6">
  <h1 class="text-xl font-bold mb-1">Revenue</h1>
  <div class="stats shadow-sm stats-vertical sm:stats-horizontal sm:w-[420px]">
    <div class="stat place-items-center">
      <div class="stat-title text-success">Revenue</div>
      <div class="stat-value text-success">$4200</div>
      <div class="stat-desc">↗︎ $180 (4%)</div>
    </div>

    <div class="stat place-items-center">
      <div class="stat-title">New Subscribers</div>
      <div class="stat-value">16</div>
      <div class="stat-desc">↘︎ 1 (%7)</div>
    </div>
  </div>
</div>
