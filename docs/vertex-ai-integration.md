# Google Vertex AI Integration Guide

This guide explains how to integrate Google Vertex AI with your SaaS application for automated review response generation.

## Overview

The integration uses:
- **Vercel AI SDK** with the `@ai-sdk/google-vertex` provider
- **Edge runtime** support for optimal performance on Vercel
- **Streaming responses** for better user experience
- **Multiple Gemini models** (configurable via JSON file)

## Architecture

```
User Request → SvelteKit API Route → Vertex AI Service → Gemini Model → Streaming Response
```

## Setup Instructions

### 1. Google Cloud Setup

1. Create a Google Cloud project or use an existing one
2. Enable the Vertex AI API:
   ```bash
   gcloud services enable aiplatform.googleapis.com
   ```
3. Set up authentication (choose one method):

   **Option A: Service Account (Recommended for production)**
   ```bash
   # Create service account
   gcloud iam service-accounts create vertex-ai-service \
     --display-name="Vertex AI Service Account"
   
   # Grant necessary permissions
   gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
     --member="serviceAccount:vertex-ai-service@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
     --role="roles/aiplatform.user"
   
   # Create and download key
   gcloud iam service-accounts keys create vertex-ai-key.json \
     --iam-account=vertex-ai-service@YOUR_PROJECT_ID.iam.gserviceaccount.com
   ```

   **Option B: Application Default Credentials (For development)**
   ```bash
   gcloud auth application-default login
   ```

### 2. Environment Configuration

Add these variables to your `.env` file:

```env
# Required
GOOGLE_CLOUD_PROJECT='your-project-id'

# Optional (defaults to us-central1)
GOOGLE_CLOUD_LOCATION='us-central1'

# For service account authentication
GOOGLE_APPLICATION_CREDENTIALS='/path/to/vertex-ai-key.json'
```

### 3. Vercel Deployment

For Vercel deployment, you have two options:

**Option A: Use environment variables in Vercel dashboard**
- Add `GOOGLE_CLOUD_PROJECT` and `GOOGLE_CLOUD_LOCATION`
- For service account, base64 encode the JSON and store as a secret

**Option B: Use Workload Identity Federation (Recommended)**
- Set up identity federation between Vercel and GCP
- No service account keys needed

## Code Structure

### Service Configuration (`/src/lib/services/ai/vertex-config.ts`)
- Vertex AI client initialization
- Loads model configuration from `/src/lib/config/gemini-models.json`
- Authentication options

### Model Configuration (`/src/lib/config/gemini-models.json`)
- Centralized model definitions
- Easy to update as new models are released
- Includes model metadata (name, description, token limits, cost)

### Response Generator (`/src/lib/services/ai/response-generator.ts`)
- Business logic for generating review responses
- Prompt engineering
- Support for both streaming and non-streaming responses

### API Endpoint (`/src/routes/(admin)/api/reviews/generate/+server.ts`)
- Handles HTTP requests
- Authentication and authorization
- Streaming response handling

### UI Component (`/src/lib/components/ReviewResponseGenerator.svelte`)
- Interactive demo interface
- Real-time streaming display
- Configuration options

## Usage Example

### Basic Request

```javascript
const response = await fetch('/account/api/reviews/generate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    review: {
      rating: 5,
      text: "Amazing service! The food was delicious.",
      authorName: "John Doe"
    },
    config: {
      businessName: "Joe's Restaurant",
      businessType: "Italian restaurant",
      tone: "friendly"
    },
    model: "gemini-2.0-flash-lite"
  })
});

const data = await response.json();
console.log(data.response);
```

### Streaming Request

```javascript
const response = await fetch('/account/api/reviews/generate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    // ... same as above
    stream: true
  })
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const chunk = decoder.decode(value);
  // Process streaming chunks
}
```

## Multi-Tenant Considerations

For multi-tenant setups, you can:

1. **Per-tenant Google Cloud Projects**: Store project IDs in the organization settings
2. **Shared Project with Quotas**: Use labels and quotas to track usage per tenant
3. **Service Account per Tenant**: Store encrypted credentials in the database

Example implementation:

```typescript
// Get tenant-specific configuration
const org = await getOrganization(userId);
const vertexConfig = {
  projectId: org.google_cloud_project || process.env.GOOGLE_CLOUD_PROJECT,
  location: org.google_cloud_location || process.env.GOOGLE_CLOUD_LOCATION
};

const generator = new ReviewResponseGenerator(vertexConfig);
```

## Cost Optimization

1. **Use Gemini 2.0 Flash Lite** by default (ultra-fast and most cost-effective)
2. **Implement caching** for similar reviews
3. **Set token limits** to control costs
4. **Monitor usage** through GCP billing
5. **Update model configuration** in `/src/lib/config/gemini-models.json` as new models are released

## Security Best Practices

1. **Never expose API keys** in client-side code
2. **Validate all inputs** before sending to AI
3. **Implement rate limiting** per user/organization
4. **Log all AI requests** for audit trails
5. **Use Row Level Security** for multi-tenant data

## Monitoring and Debugging

### Local Development
```bash
# Enable debug logging
export DEBUG=ai:*
npm run dev
```

### Production
- Monitor through Google Cloud Console
- Set up alerts for quota usage
- Use structured logging for debugging

## Troubleshooting

### Common Issues

1. **Authentication Errors**
   - Verify service account permissions
   - Check GOOGLE_APPLICATION_CREDENTIALS path
   - Ensure Vertex AI API is enabled

2. **Streaming Not Working**
   - Check if response headers are correct
   - Verify edge runtime compatibility
   - Test with non-streaming first

3. **Model Errors**
   - Verify model name is correct
   - Check region availability
   - Monitor quota limits

## Next Steps

1. Implement response caching with Redis/Upstash
2. Add analytics for response quality
3. Create templates for common review types
4. Integrate with Google My Business API for automatic posting