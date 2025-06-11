<script>
  import ReviewResponseGenerator from "$lib/components/ReviewResponseGenerator.svelte"
</script>

<svelte:head>
  <title>AI Review Response Demo</title>
</svelte:head>

<div class="container mx-auto px-4 py-8">
  <h1 class="text-3xl font-bold mb-8">AI Review Response Generator Demo</h1>

  <div class="prose max-w-none mb-8">
    <p>
      This demo shows how to use Google Vertex AI (Gemini) to automatically
      generate responses to customer reviews. The integration uses the Vercel AI
      SDK with edge runtime support for optimal performance.
    </p>

    <h2>Features</h2>
    <ul>
      <li>Real-time streaming responses</li>
      <li>
        Dynamic model configuration via <code
          >/src/lib/config/gemini-models.json</code
        >
      </li>
      <li>Customizable tone and instructions</li>
      <li>Edge runtime compatible</li>
    </ul>

    <h2>Setup Instructions</h2>
    <ol>
      <li>Create a Google Cloud project and enable the Vertex AI API</li>
      <li>
        Set up authentication (either service account or Application Default
        Credentials)
      </li>
      <li>
        Configure environment variables:
        <ul>
          <li><code>GOOGLE_CLOUD_PROJECT</code> - Your GCP project ID</li>
          <li>
            <code>GOOGLE_CLOUD_LOCATION</code> - Region (default: us-central1)
          </li>
          <li>
            <code>GOOGLE_APPLICATION_CREDENTIALS</code> - Path to service account
            key (optional)
          </li>
        </ul>
      </li>
    </ol>
  </div>

  <div class="divider"></div>

  <ReviewResponseGenerator />
</div>
