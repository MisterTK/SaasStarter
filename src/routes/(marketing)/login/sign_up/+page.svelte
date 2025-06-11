<script lang="ts">
  import { Auth } from "@supabase/auth-ui-svelte"
  import { sharedAppearance, oauthProviders } from "../login_config"
  import { getRedirectUrlFromWindow } from "$lib/auth-redirect"

  let { data } = $props()
</script>

<svelte:head>
  <title>Sign up - ReviewAI Pro</title>
</svelte:head>

<h1 class="text-2xl font-bold mb-6">Sign Up for ReviewAI Pro</h1>
<p class="text-gray-600 mb-4">
  Start managing and responding to customer reviews with AI-powered assistance
</p>
<Auth
  supabaseClient={data.supabase}
  view="sign_up"
  redirectTo={getRedirectUrlFromWindow()}
  showLinks={false}
  providers={oauthProviders}
  socialLayout="horizontal"
  appearance={sharedAppearance}
  additionalData={undefined}
/>
<div class="text-l text-slate-800 mt-4 mb-2">
  Already have an account? <a class="underline" href="/login/sign_in">Sign in</a
  > to manage your reviews.
</div>
