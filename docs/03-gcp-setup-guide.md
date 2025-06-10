# Complete GCP Setup Guide Per Customer

## Overview

This guide provides step-by-step instructions for setting up Google Cloud Platform (GCP) for each customer in a multi-tenant SaaS application. It covers project creation, API enablement, service account management, and integration with your SvelteKit application.

## Prerequisites

- GCP account with billing enabled
- `gcloud` CLI installed and authenticated
- Admin access to the customer's organization in your application
- Basic understanding of GCP IAM and service accounts

## 1. Initial GCP Project Setup

### 1.1 Create Customer Project

```bash
#!/bin/bash
# Script: setup-customer-gcp.sh

# Variables
CUSTOMER_NAME="acme-corp"
CUSTOMER_ID="acme-corp-12345"
PROJECT_ID="${CUSTOMER_ID}-prod"
BILLING_ACCOUNT_ID="your-billing-account-id"
ORGANIZATION_ID="your-org-id" # Optional

# Create project
gcloud projects create ${PROJECT_ID} \
  --name="${CUSTOMER_NAME} Production" \
  --organization=${ORGANIZATION_ID}

# Link billing account
gcloud beta billing projects link ${PROJECT_ID} \
  --billing-account=${BILLING_ACCOUNT_ID}

# Set as active project
gcloud config set project ${PROJECT_ID}
```

### 1.2 Enable Required APIs

```bash
# Enable essential APIs
gcloud services enable \
  aiplatform.googleapis.com \
  mybusinessbusinessinformation.googleapis.com \
  mybusinessreviews.googleapis.com \
  cloudbilling.googleapis.com \
  cloudresourcemanager.googleapis.com \
  iam.googleapis.com \
  logging.googleapis.com \
  monitoring.googleapis.com \
  secretmanager.googleapis.com

# Verify APIs are enabled
gcloud services list --enabled
```

## 2. Service Account Configuration

### 2.1 Create Service Accounts

```bash
# Create main application service account
gcloud iam service-accounts create review-app-sa \
  --display-name="Review App Service Account" \
  --description="Service account for review response generation"

# Create backup service account
gcloud iam service-accounts create review-app-backup-sa \
  --display-name="Review App Backup Service Account" \
  --description="Backup service account for key rotation"

# Get service account emails
MAIN_SA_EMAIL="review-app-sa@${PROJECT_ID}.iam.gserviceaccount.com"
BACKUP_SA_EMAIL="review-app-backup-sa@${PROJECT_ID}.iam.gserviceaccount.com"
```

### 2.2 Assign IAM Roles

```bash
# Vertex AI roles
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${MAIN_SA_EMAIL}" \
  --role="roles/aiplatform.user"

# Google My Business roles (if using service account for GMB)
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${MAIN_SA_EMAIL}" \
  --role="roles/mybusinessbusinessinformation.viewer"

# Logging and monitoring
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${MAIN_SA_EMAIL}" \
  --role="roles/logging.logWriter"

gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${MAIN_SA_EMAIL}" \
  --role="roles/monitoring.metricWriter"

# Apply same roles to backup service account
for role in "roles/aiplatform.user" "roles/logging.logWriter" "roles/monitoring.metricWriter"; do
  gcloud projects add-iam-policy-binding ${PROJECT_ID} \
    --member="serviceAccount:${BACKUP_SA_EMAIL}" \
    --role="${role}"
done
```

### 2.3 Generate Service Account Keys

```bash
# Create keys directory
mkdir -p keys/${CUSTOMER_ID}

# Generate main key
gcloud iam service-accounts keys create \
  keys/${CUSTOMER_ID}/main-sa-key.json \
  --iam-account=${MAIN_SA_EMAIL}

# Generate backup key
gcloud iam service-accounts keys create \
  keys/${CUSTOMER_ID}/backup-sa-key.json \
  --iam-account=${BACKUP_SA_EMAIL}

# Secure the keys
chmod 600 keys/${CUSTOMER_ID}/*.json
```

## 3. Vertex AI Configuration

### 3.1 Initialize Vertex AI

```bash
# Set default location
VERTEX_LOCATION="us-central1"

# Initialize Vertex AI
gcloud ai models list --region=${VERTEX_LOCATION}

# Create custom Vertex AI endpoint (optional)
gcloud ai endpoints create \
  --region=${VERTEX_LOCATION} \
  --display-name="${CUSTOMER_NAME} Review Response Endpoint"
```

### 3.2 Set Quotas and Limits

```bash
# Create quota override request
cat > quota-request.yaml << EOF
quotaPreference:
  quotaId: aiplatform.googleapis.com/generate_content_requests_per_minute_per_project_per_region
  value: 100
  dimensions:
    region: ${VERTEX_LOCATION}
EOF

# Apply quota (requires approval)
gcloud alpha services quotas create \
  --service=aiplatform.googleapis.com \
  --quota-preference-file=quota-request.yaml
```

## 4. Database Configuration

### 4.1 Store Customer Configuration

```sql
-- Insert customer organization
INSERT INTO organizations (
  id,
  name,
  slug,
  settings,
  subscription_tier
) VALUES (
  gen_random_uuid(),
  'ACME Corporation',
  'acme-corp',
  jsonb_build_object(
    'gcp_project_id', 'acme-corp-12345-prod',
    'gcp_location', 'us-central1',
    'gcp_service_account', 'review-app-sa@acme-corp-12345-prod.iam.gserviceaccount.com',
    'vertex_ai_enabled', true,
    'gmb_enabled', true,
    'quota_limits', jsonb_build_object(
      'requests_per_minute', 100,
      'requests_per_day', 10000
    )
  ),
  'enterprise'
);
```

### 4.2 Store Encrypted Credentials

```typescript
// src/lib/services/credentialManager.ts
import { createCipheriv, createDecipheriv, randomBytes } from "crypto"
import type { SupabaseClient } from "@supabase/supabase-js"

export class CredentialManager {
  private static algorithm = "aes-256-gcm"
  private static keyLength = 32

  static async storeServiceAccountKey(
    supabase: SupabaseClient,
    organizationId: string,
    keyData: object,
    keyType: "main" | "backup" = "main",
  ) {
    // Generate encryption key and IV
    const encryptionKey = randomBytes(this.keyLength)
    const iv = randomBytes(16)

    // Encrypt the key data
    const cipher = createCipheriv(this.algorithm, encryptionKey, iv)
    const encrypted = Buffer.concat([
      cipher.update(JSON.stringify(keyData), "utf8"),
      cipher.final(),
    ])
    const authTag = cipher.getAuthTag()

    // Store in database
    const { error } = await supabase.from("service_account_keys").insert({
      organization_id: organizationId,
      key_type: keyType,
      encrypted_key: encrypted.toString("base64"),
      encryption_iv: iv.toString("base64"),
      auth_tag: authTag.toString("base64"),
      created_at: new Date().toISOString(),
      expires_at: new Date(
        Date.now() + 365 * 24 * 60 * 60 * 1000,
      ).toISOString(), // 1 year
    })

    if (error) throw error

    // Store encryption key in secret manager
    await this.storeEncryptionKey(organizationId, keyType, encryptionKey)
  }

  static async getServiceAccountKey(
    supabase: SupabaseClient,
    organizationId: string,
    keyType: "main" | "backup" = "main",
  ): Promise<object> {
    // Fetch encrypted key
    const { data, error } = await supabase
      .from("service_account_keys")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("key_type", keyType)
      .eq("is_active", true)
      .single()

    if (error || !data) throw new Error("Service account key not found")

    // Get encryption key from secret manager
    const encryptionKey = await this.getEncryptionKey(organizationId, keyType)

    // Decrypt
    const decipher = createDecipheriv(
      this.algorithm,
      encryptionKey,
      Buffer.from(data.encryption_iv, "base64"),
    )
    decipher.setAuthTag(Buffer.from(data.auth_tag, "base64"))

    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(data.encrypted_key, "base64")),
      decipher.final(),
    ])

    return JSON.parse(decrypted.toString("utf8"))
  }

  private static async storeEncryptionKey(
    organizationId: string,
    keyType: string,
    key: Buffer,
  ) {
    // In production, use a proper secret management service
    // This is a simplified example using environment variables
    process.env[`KEY_${organizationId}_${keyType}`] = key.toString("base64")
  }

  private static async getEncryptionKey(
    organizationId: string,
    keyType: string,
  ): Promise<Buffer> {
    const key = process.env[`KEY_${organizationId}_${keyType}`]
    if (!key) throw new Error("Encryption key not found")
    return Buffer.from(key, "base64")
  }
}
```

## 5. Google My Business Setup

### 5.1 OAuth2 Configuration

```typescript
// src/lib/config/gmb.config.ts
export const gmbOAuthConfig = {
  authorizationBaseUrl: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenUrl: "https://oauth2.googleapis.com/token",
  scope: [
    "https://www.googleapis.com/auth/business.manage",
    "openid",
    "email",
    "profile",
  ].join(" "),
  accessType: "offline",
  prompt: "consent",
}

// OAuth flow for customer admin
export async function initiateGMBAuth(organizationId: string) {
  const state = generateSecureState(organizationId)
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: `${process.env.PUBLIC_URL}/auth/google/callback`,
    response_type: "code",
    scope: gmbOAuthConfig.scope,
    access_type: gmbOAuthConfig.accessType,
    prompt: gmbOAuthConfig.prompt,
    state,
  })

  return `${gmbOAuthConfig.authorizationBaseUrl}?${params}`
}
```

### 5.2 Store GMB Tokens

```sql
-- Table for GMB OAuth tokens
CREATE TABLE gmb_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  access_token_encrypted TEXT NOT NULL,
  refresh_token_encrypted TEXT NOT NULL,
  token_type VARCHAR(50) DEFAULT 'Bearer',
  expires_at TIMESTAMPTZ NOT NULL,
  scope TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

-- Enable RLS
ALTER TABLE gmb_tokens ENABLE ROW LEVEL SECURITY;

-- Policy for token access
CREATE POLICY "Users can manage their org tokens" ON gmb_tokens
  FOR ALL USING (
    user_id = auth.uid() AND
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );
```

## 6. Monitoring and Alerts

### 6.1 Set Up Monitoring

```bash
# Create notification channel
gcloud alpha monitoring channels create \
  --display-name="${CUSTOMER_NAME} Alerts" \
  --type=email \
  --channel-labels=email_address=alerts@${CUSTOMER_ID}.com

# Create alert policy for API errors
gcloud alpha monitoring policies create \
  --notification-channels=projects/${PROJECT_ID}/notificationChannels/[CHANNEL_ID] \
  --display-name="Vertex AI Error Rate" \
  --condition-name="High error rate" \
  --condition-display-name="Error rate > 5%" \
  --condition-filter='resource.type="aiplatform.googleapis.com/Endpoint" AND metric.type="aiplatform.googleapis.com/prediction/error_count"' \
  --condition-comparison=COMPARISON_GT \
  --condition-threshold-value=0.05
```

### 6.2 Create Monitoring Dashboard

```typescript
// src/lib/services/monitoring/customerDashboard.ts
export async function createCustomerDashboard(
  projectId: string,
  customerName: string,
) {
  const dashboardConfig = {
    displayName: `${customerName} Review App Dashboard`,
    mosaicLayout: {
      columns: 12,
      tiles: [
        {
          width: 6,
          height: 4,
          widget: {
            title: "API Request Rate",
            xyChart: {
              dataSets: [
                {
                  timeSeriesQuery: {
                    timeSeriesFilter: {
                      filter: `resource.type="aiplatform.googleapis.com/Endpoint" AND resource.labels.project_id="${projectId}"`,
                      aggregation: {
                        alignmentPeriod: "60s",
                        perSeriesAligner: "ALIGN_RATE",
                      },
                    },
                  },
                },
              ],
            },
          },
        },
        {
          width: 6,
          height: 4,
          xPos: 6,
          widget: {
            title: "Error Rate",
            xyChart: {
              dataSets: [
                {
                  timeSeriesQuery: {
                    timeSeriesFilter: {
                      filter: `resource.type="aiplatform.googleapis.com/Endpoint" AND metric.type="aiplatform.googleapis.com/prediction/error_count"`,
                      aggregation: {
                        alignmentPeriod: "60s",
                        perSeriesAligner: "ALIGN_RATE",
                      },
                    },
                  },
                },
              ],
            },
          },
        },
      ],
    },
  }

  // Create dashboard via API
  const response = await fetch(
    `https://monitoring.googleapis.com/v1/projects/${projectId}/dashboards`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${await getAccessToken()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(dashboardConfig),
    },
  )

  return response.json()
}
```

## 7. Cost Management

### 7.1 Set Budget Alerts

```bash
# Create budget
gcloud billing budgets create \
  --billing-account=${BILLING_ACCOUNT_ID} \
  --display-name="${CUSTOMER_NAME} Monthly Budget" \
  --budget-amount=1000 \
  --threshold-rule=percent=50 \
  --threshold-rule=percent=90 \
  --threshold-rule=percent=100 \
  --filter-projects=projects/${PROJECT_ID}
```

### 7.2 Export Billing Data

```sql
-- Track customer usage
CREATE TABLE customer_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  date DATE NOT NULL,
  vertex_ai_requests INTEGER DEFAULT 0,
  vertex_ai_tokens INTEGER DEFAULT 0,
  gmb_api_calls INTEGER DEFAULT 0,
  estimated_cost DECIMAL(10, 2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, date)
);

-- Daily aggregation function
CREATE OR REPLACE FUNCTION aggregate_daily_usage()
RETURNS void AS $$
BEGIN
  INSERT INTO customer_usage (organization_id, date, vertex_ai_requests, vertex_ai_tokens)
  SELECT
    organization_id,
    DATE(created_at) as date,
    COUNT(*) as vertex_ai_requests,
    SUM((metadata->>'token_count')::int) as vertex_ai_tokens
  FROM audit_logs
  WHERE action = 'generate_response'
    AND created_at >= CURRENT_DATE - INTERVAL '1 day'
    AND created_at < CURRENT_DATE
  GROUP BY organization_id, DATE(created_at)
  ON CONFLICT (organization_id, date)
  DO UPDATE SET
    vertex_ai_requests = EXCLUDED.vertex_ai_requests,
    vertex_ai_tokens = EXCLUDED.vertex_ai_tokens;
END;
$$ LANGUAGE plpgsql;
```

## 8. Automation Scripts

### 8.1 Complete Setup Script

```bash
#!/bin/bash
# complete-customer-setup.sh

set -euo pipefail

# Configuration
CUSTOMER_NAME="$1"
CUSTOMER_EMAIL="$2"
BILLING_ACCOUNT="$3"

if [ $# -ne 3 ]; then
  echo "Usage: $0 <customer_name> <customer_email> <billing_account>"
  exit 1
fi

# Generate unique identifiers
CUSTOMER_ID=$(echo "$CUSTOMER_NAME" | tr '[:upper:]' '[:lower:]' | tr ' ' '-')
PROJECT_ID="${CUSTOMER_ID}-$(date +%Y%m%d)-prod"

echo "Setting up GCP for customer: $CUSTOMER_NAME"
echo "Project ID: $PROJECT_ID"

# Create project
echo "Creating project..."
gcloud projects create $PROJECT_ID --name="$CUSTOMER_NAME Production"

# Link billing
echo "Linking billing account..."
gcloud beta billing projects link $PROJECT_ID --billing-account=$BILLING_ACCOUNT

# Set active project
gcloud config set project $PROJECT_ID

# Enable APIs
echo "Enabling APIs..."
gcloud services enable \
  aiplatform.googleapis.com \
  cloudbilling.googleapis.com \
  cloudresourcemanager.googleapis.com \
  iam.googleapis.com \
  logging.googleapis.com \
  monitoring.googleapis.com

# Create service account
echo "Creating service account..."
SA_EMAIL="review-app-sa@${PROJECT_ID}.iam.gserviceaccount.com"
gcloud iam service-accounts create review-app-sa \
  --display-name="Review App Service Account"

# Assign roles
echo "Assigning IAM roles..."
for role in \
  "roles/aiplatform.user" \
  "roles/logging.logWriter" \
  "roles/monitoring.metricWriter"; do
  gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SA_EMAIL" \
    --role="$role"
done

# Generate key
echo "Generating service account key..."
mkdir -p keys/$CUSTOMER_ID
gcloud iam service-accounts keys create \
  keys/$CUSTOMER_ID/sa-key.json \
  --iam-account=$SA_EMAIL

# Create monitoring
echo "Setting up monitoring..."
gcloud alpha monitoring channels create \
  --display-name="$CUSTOMER_NAME Alerts" \
  --type=email \
  --channel-labels=email_address=$CUSTOMER_EMAIL

# Output summary
echo "✅ Setup complete!"
echo ""
echo "Summary:"
echo "- Project ID: $PROJECT_ID"
echo "- Service Account: $SA_EMAIL"
echo "- Key Location: keys/$CUSTOMER_ID/sa-key.json"
echo ""
echo "Next steps:"
echo "1. Upload the service account key to your application"
echo "2. Configure the customer organization in your database"
echo "3. Test the Vertex AI integration"
```

### 8.2 Cleanup Script

```bash
#!/bin/bash
# cleanup-customer.sh

PROJECT_ID="$1"

if [ -z "$PROJECT_ID" ]; then
  echo "Usage: $0 <project_id>"
  exit 1
fi

echo "⚠️  WARNING: This will delete all resources for project: $PROJECT_ID"
read -p "Are you sure? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
  echo "Cancelled"
  exit 0
fi

# Delete project (this removes all resources)
gcloud projects delete $PROJECT_ID --quiet

echo "✅ Project $PROJECT_ID has been deleted"
```

## 9. Troubleshooting

### Common Issues and Solutions

1. **API Not Enabled Error**

   ```bash
   # Check which APIs are enabled
   gcloud services list --enabled

   # Enable missing API
   gcloud services enable [API_NAME]
   ```

2. **Service Account Permission Denied**

   ```bash
   # Check current roles
   gcloud projects get-iam-policy $PROJECT_ID \
     --flatten="bindings[].members" \
     --filter="bindings.members:serviceAccount:$SA_EMAIL"

   # Add missing role
   gcloud projects add-iam-policy-binding $PROJECT_ID \
     --member="serviceAccount:$SA_EMAIL" \
     --role="roles/[MISSING_ROLE]"
   ```

3. **Quota Exceeded**

   ```bash
   # Check current quotas
   gcloud compute project-info describe --project=$PROJECT_ID

   # Request quota increase
   gcloud alpha services quota-updates create \
     --service=aiplatform.googleapis.com \
     --consumer=$PROJECT_ID \
     --metric=[METRIC_NAME] \
     --value=[NEW_VALUE]
   ```

## Best Practices

1. **Use separate projects per customer for isolation**
2. **Implement key rotation every 90 days**
3. **Monitor usage and costs regularly**
4. **Use VPC Service Controls for additional security**
5. **Enable audit logging for all API calls**
6. **Implement backup service accounts**
7. **Use Secret Manager for production credentials**
8. **Set up budget alerts before going live**
9. **Document customer-specific configurations**
10. **Test disaster recovery procedures**

This comprehensive guide ensures each customer has a properly configured, secure, and monitored GCP environment for your multi-tenant application.// JSON key (encrypted)
}

// Store in your database per tenant
await supabase.from('tenants').update({
google_project_id: customerConfig.projectId,
google_client_id: customerConfig.clientId,
google_client_secret_encrypted: encrypt(customerConfig.clientSecret),
service_account_email: customerConfig.serviceAccountEmail,
service_account_key_encrypted: encrypt(customerConfig.serviceAccountKey)
}).eq('id', tenantId);

````

## Final Checklist Per Customer

- [ ] ✅ GCP Project created with unique ID
- [ ] ✅ All My Business APIs enabled
- [ ] ✅ OAuth consent screen configured
- [ ] ✅ Publishing status set to "In production"
- [ ] ✅ OAuth 2.0 credentials created
- [ ] ✅ Redirect URIs configured correctly
- [ ] ✅ Service account created (if needed)
- [ ] ✅ Billing account linked
- [ ] ✅ Quotas reviewed and increased if needed
- [ ] ✅ Security restrictions configured
- [ ] ✅ Credentials stored securely in your app
- [ ] ✅ Customer can successfully complete OAuth flow

## Common Gotchas to Avoid

1. **Publishing Status:** Must be "In production" or tokens expire in 7 days
2. **Redirect URIs:** Must exactly match what your app sends
3. **Scopes:** Must include `business.manage` for My Business API
4. **Domain Verification:** Some APIs require domain ownership verification
5. **Project Quotas:** Default limits may be too low for active businesses
6. **API Deprecation:** Google sometimes moves APIs - monitor for changes

## Cost Considerations

- **GCP Project:** Free (no charges for having projects)
- **API Calls:** My Business APIs are free up to quotas
- **Quota Increases:** Usually free but may require justification
- **Other Services:** Only charged if you use additional GCP services

## Advanced Configuration

### Domain Verification (If Required)

Some Google APIs require domain ownership verification:

```bash
# Add domain to Google Search Console
# 1. Go to https://search.google.com/search-console
# 2. Add property: your-app.vercel.app
# 3. Verify ownership via DNS or HTML file
# 4. Add verified domain to OAuth consent screen
````

### Workload Identity Federation (Advanced)

For enhanced security when running on Google Cloud:

```bash
# Create workload identity pool
gcloud iam workload-identity-pools create customer-pool \
  --location="global" \
  --display-name="Customer Workload Pool"

# Create workload identity provider
gcloud iam workload-identity-pools providers create-oidc customer-provider \
  --location="global" \
  --workload-identity-pool="customer-pool" \
  --issuer-uri="https://token.actions.githubusercontent.com" \
  --attribute-mapping="google.subject=assertion.sub"
```

### API Usage Monitoring

```typescript
// src/lib/monitoring/gcp-usage.ts
export class GCPUsageMonitor {
  static async trackAPIUsage(
    tenantId: string,
    apiName: string,
    requestCount: number,
  ) {
    // Log to your monitoring system
    await fetch("/api/internal/usage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tenant_id: tenantId,
        api_name: apiName,
        request_count: requestCount,
        timestamp: new Date().toISOString(),
      }),
    })
  }

  static async checkQuotaUsage(projectId: string) {
    // Monitor quota usage via GCP APIs
    const response = await fetch(
      `https://serviceusage.googleapis.com/v1/projects/${projectId}/services/mybusinessaccountmanagement.googleapis.com/consumerQuotaMetrics`,
    )
    return response.json()
  }
}
```

### Multi-Region Setup

For global customers, consider multi-region deployment:

```typescript
// Customer region configuration
interface CustomerRegion {
  primary: "us-east1" | "europe-west1" | "asia-southeast1"
  fallback: string[]
}

// Configure Vercel edge functions by region
export const config = {
  runtime: "edge",
  regions: ["iad1", "lhr1", "sin1"], // Multi-region deployment
}
```

## Troubleshooting Common Issues

### 1. OAuth Errors

**Error: `redirect_uri_mismatch`**

```
Solution: Ensure redirect URI in GCP exactly matches your callback URL
- GCP: https://your-app.vercel.app/api/auth/google-business/callback
- Code: https://your-app.vercel.app/api/auth/google-business/callback
```

**Error: `access_denied`**

```
Solution: Check OAuth consent screen configuration
- Verify app is in "Production" status
- Ensure required scopes are configured
- Check if user email is added to test users (if in testing)
```

### 2. API Access Issues

**Error: `Project not found`**

```bash
# Verify project exists and is active
gcloud projects describe customer-projectid-unique
```

**Error: `API not enabled`**

```bash
# Check which APIs are enabled
gcloud services list --enabled --project=customer-projectid-unique
```

### 3. Token Expiration Issues

**Refresh tokens expiring in 7 days:**

```
Solution: Change publishing status to "In production"
1. Go to OAuth consent screen
2. Click "Publish app"
3. Submit for production (no verification needed for internal use)
```

## Maintenance and Updates

### Regular Maintenance Tasks

```bash
#\!/bin/bash
# monthly-maintenance.sh

# Check API quota usage
gcloud logging read "resource.type=api AND timestamp>=\"$(date -d '30 days ago' '+%Y-%m-%d')\"" \
  --project=customer-projectid-unique \
  --format="table(timestamp,resource.labels.service,severity)"

# Check for API deprecations
gcloud services list --available --filter="name:mybusiness*" \
  --project=customer-projectid-unique

# Review billing
gcloud billing budgets list --billing-account=XXXXXX-YYYYYY-ZZZZZZ
```

### Credential Rotation

```typescript
// Automated credential rotation (quarterly)
export async function rotateCustomerCredentials(tenantId: string) {
  // 1. Generate new OAuth credentials in GCP
  // 2. Update application configuration
  // 3. Test new credentials
  // 4. Update database with new credentials
  // 5. Revoke old credentials

  const newCredentials = await generateNewOAuthCredentials(tenantId)
  await testCredentials(newCredentials)
  await updateTenantCredentials(tenantId, newCredentials)
  await revokeOldCredentials(tenantId)
}
```

## Compliance and Security

### GDPR Compliance

```typescript
// Data retention and deletion policies
export class GDPRCompliance {
  static async deleteCustomerData(tenantId: string) {
    // 1. Delete Google tokens
    await supabase.from("google_tokens").delete().eq("tenant_id", tenantId)

    // 2. Delete API usage logs
    await supabase.from("api_usage_logs").delete().eq("tenant_id", tenantId)

    // 3. Revoke Google API access
    await revokeGoogleAPIAccess(tenantId)

    // 4. Delete GCP project (optional)
    await deleteGCPProject(tenantId)
  }
}
```

### SOC 2 Compliance

- **Access Control:** Implement principle of least privilege
- **Audit Logging:** Log all GCP configuration changes
- **Encryption:** Encrypt all stored credentials
- **Monitoring:** Set up alerts for suspicious activity

## Scaling Considerations

### High-Volume Customers

For customers with high API usage:

```typescript
// Request quota increases programmatically
export async function requestQuotaIncrease(
  projectId: string,
  quotaMetric: string,
  newLimit: number,
) {
  const request = {
    parent: `projects/${projectId}/services/mybusinessaccountmanagement.googleapis.com`,
    quotaLimit: {
      metric: quotaMetric,
      limit: newLimit,
      justification: "High volume business with multiple locations",
    },
  }

  // Submit quota increase request
  // This typically requires manual approval from Google
}
```

### Enterprise Customers

Consider dedicated infrastructure:

- **Dedicated GCP Organization:** For enterprise customers
- **Private VPC:** Enhanced network security
- **Dedicated Support:** Google Cloud support contract

This setup gives each customer complete isolation while maintaining the security and scalability needed for a multi-tenant SaaS application.

## Integration with Your Application

### Customer Onboarding Flow

```typescript
// Complete customer onboarding process
export async function onboardNewCustomer(customerData: CustomerData) {
  try {
    // 1. Create GCP project
    const projectId = await createGCPProject(customerData.name)

    // 2. Enable APIs
    await enableRequiredAPIs(projectId)

    // 3. Create OAuth credentials (manual step required)
    const setupInstructions = generateSetupInstructions(
      projectId,
      customerData.domain,
    )

    // 4. Send setup instructions to customer
    await sendSetupInstructions(customerData.email, setupInstructions)

    // 5. Create tenant record
    const tenant = await createTenantRecord({
      ...customerData,
      googleProjectId: projectId,
      status: "setup_pending",
    })

    return { success: true, tenantId: tenant.id, projectId }
  } catch (error) {
    console.error("Customer onboarding failed:", error)
    throw error
  }
}
```

### OAuth Callback Verification

```typescript
// Verify OAuth setup is working
export async function verifyOAuthSetup(tenantId: string) {
  const tenant = await getTenantConfig(tenantId)

  if (\!tenant.googleClientId || \!tenant.googleClientSecret) {
    throw new Error('OAuth credentials not configured')
  }

  // Test OAuth flow
  const oauth2Client = new google.auth.OAuth2(
    tenant.googleClientId,
    tenant.googleClientSecret,
    `${process.env.VERCEL_URL}/api/auth/google-business/callback`
  )

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/business.manage']
  })

  return { authUrl, status: 'ready' }
}
```

This comprehensive setup ensures each customer has their own isolated Google Cloud environment with proper security, monitoring, and scalability for your multi-tenant SaaS application.
EOF < /dev/null
