<script lang="ts">
  import { enhance } from "$app/forms"
  import type { ActionData } from "./$types"

  let { form }: { form: ActionData } = $props()
</script>

<svelte:head>
  <title>Create Organization</title>
</svelte:head>

<div class="max-w-2xl mx-auto">
  <h1 class="text-3xl font-bold mb-2">
    Welcome! Let's set up your organization
  </h1>
  <p class="text-gray-600 mb-8">
    Create your organization to start managing reviews
  </p>

  <form method="POST" use:enhance class="space-y-6">
    <div class="form-control">
      <label for="name" class="label">
        <span class="label-text">Organization Name *</span>
      </label>
      <input
        type="text"
        name="name"
        id="name"
        required
        placeholder="Acme Corporation"
        class="input input-bordered w-full"
        class:input-error={form?.errors?.name}
      />
      {#if form?.errors?.name}
        <div class="label">
          <span class="label-text-alt text-error">{form.errors.name}</span>
        </div>
      {/if}
    </div>

    <div class="form-control">
      <label for="slug" class="label">
        <span class="label-text">Organization URL Slug *</span>
      </label>
      <div class="flex items-center gap-2">
        <span class="text-gray-500">app.reviews.com/</span>
        <input
          type="text"
          name="slug"
          id="slug"
          required
          placeholder="acme-corp"
          pattern="[a-z0-9-]+"
          class="input input-bordered flex-1"
          class:input-error={form?.errors?.slug}
        />
      </div>
      {#if form?.errors?.slug}
        <div class="label">
          <span class="label-text-alt text-error">{form.errors.slug}</span>
        </div>
      {:else}
        <div class="label">
          <span class="label-text-alt">Letters, numbers, and hyphens only</span>
        </div>
      {/if}
    </div>

    <div class="form-control">
      <label for="businessType" class="label">
        <span class="label-text">Business Type</span>
      </label>
      <select
        name="businessType"
        id="businessType"
        class="select select-bordered w-full"
      >
        <option value="">Select your business type</option>
        <option value="restaurant">Restaurant</option>
        <option value="hotel">Hotel</option>
        <option value="retail">Retail Store</option>
        <option value="service">Service Business</option>
        <option value="healthcare">Healthcare</option>
        <option value="other">Other</option>
      </select>
    </div>

    {#if form?.errors?._}
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
        <span>{form.errors._}</span>
      </div>
    {/if}

    <button type="submit" class="btn btn-primary w-full">
      Create Organization
    </button>
  </form>
</div>
