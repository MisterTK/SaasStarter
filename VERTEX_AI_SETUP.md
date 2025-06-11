# Vertex AI Setup Guide

This guide will help you set up Google Cloud Vertex AI for AI-powered review response generation.

## Prerequisites

- Google Cloud Project with billing enabled
- Google Cloud CLI (`gcloud`) installed locally

## Step 1: Enable Required APIs

```bash
# Set your project ID
export PROJECT_ID="your-project-id"
gcloud config set project $PROJECT_ID

# Enable required APIs
gcloud services enable aiplatform.googleapis.com
gcloud services enable cloudresourcemanager.googleapis.com
```

## Step 2: Create Service Account

```bash
# Create service account
gcloud iam service-accounts create reviews-vertex-ai \
  --display-name="Reviews App Vertex AI"

# Grant necessary permissions
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:reviews-vertex-ai@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/aiplatform.user"

# Create and download key
gcloud iam service-accounts keys create vertex-ai-key.json \
  --iam-account=reviews-vertex-ai@$PROJECT_ID.iam.gserviceaccount.com
```

## Step 3: Set Environment Variables

### For Local Development

Add to your `.env.local`:

```bash
GOOGLE_CLOUD_PROJECT=your-project-id
GOOGLE_CLOUD_LOCATION=us-central1
GOOGLE_APPLICATION_CREDENTIALS=./vertex-ai-key.json
```

### For Vercel Production

1. Go to your Vercel project settings
2. Navigate to Environment Variables
3. Add:
   - `GOOGLE_CLOUD_PROJECT`: Your GCP project ID
   - `GOOGLE_CLOUD_LOCATION`: us-central1 (or your preferred region)
   - `GOOGLE_APPLICATION_CREDENTIALS_JSON`: The contents of your service account key JSON

## Step 4: Configure Application Default Credentials (Local Dev)

```bash
# Option 1: Use service account key
export GOOGLE_APPLICATION_CREDENTIALS="./vertex-ai-key.json"

# Option 2: Use your own credentials
gcloud auth application-default login
```

## Step 5: Test the Integration

1. Start your development server:

   ```bash
   npm run dev
   ```

2. Navigate to http://localhost:5173/account/ai-demo

3. Test generating a review response

## Available Models and Pricing

Current models configured in `src/lib/config/gemini-models.json`:

- **Gemini 1.5 Flash**: Fast, cost-effective (~$0.075/1M tokens)
- **Gemini 1.5 Pro**: More capable (~$1.25/1M tokens)
- **Gemini 1.0 Pro**: Legacy model (~$0.50/1M tokens)

## Monitoring Usage

Monitor your Vertex AI usage in the Google Cloud Console:

1. Go to https://console.cloud.google.com/vertex-ai
2. Navigate to "Models" → "Model Garden"
3. Check usage and quotas

## Troubleshooting

### "Permission Denied" Errors

Ensure your service account has the `roles/aiplatform.user` role:

```bash
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:reviews-vertex-ai@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/aiplatform.user"
```

### "API Not Enabled" Errors

Enable the Vertex AI API:

```bash
gcloud services enable aiplatform.googleapis.com
```

### Region/Location Issues

Vertex AI is not available in all regions. Recommended regions:

- `us-central1` (Iowa)
- `us-east4` (Northern Virginia)
- `europe-west4` (Netherlands)
- `asia-southeast1` (Singapore)

## Security Best Practices

1. **Never commit service account keys** to version control
2. Use separate service accounts for different environments
3. Follow the principle of least privilege - only grant necessary permissions
4. Rotate service account keys regularly
5. Use Workload Identity Federation for production GKE deployments

## Cost Management

1. Set up budget alerts in Google Cloud Console
2. Use Gemini 1.5 Flash for most use cases (10x cheaper than Pro)
3. Implement rate limiting in your application
4. Cache generated responses when appropriate
