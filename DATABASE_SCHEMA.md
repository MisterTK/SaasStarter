# Database Schema Documentation

This document describes the complete database schema for ReviewAI Pro.

## Overview

ReviewAI Pro uses PostgreSQL via Supabase with Row Level Security (RLS) enabled for all tables. The schema supports multi-tenancy through organizations, secure token storage, and comprehensive review management.

## Core Tables

### profiles
User profile information synchronized from Supabase Auth.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | References auth.users |
| updated_at | TIMESTAMP | Last update timestamp |
| full_name | TEXT | User's display name |
| avatar_url | TEXT | Profile picture URL |
| website | TEXT | Personal/company website |
| username | TEXT | Unique username |
| unsubscribed | BOOLEAN | Email unsubscribe flag |

**RLS Policies:**
- Users can view and update only their own profile

### organizations
Multi-tenant organization management.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Organization identifier |
| name | TEXT | Organization display name |
| slug | TEXT (UNIQUE) | URL-friendly identifier |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Last update timestamp |

**RLS Policies:**
- Users can view organizations they belong to
- Any authenticated user can create organizations
- Only admins/owners can update organizations

### organization_members
Junction table for user-organization relationships.

| Column | Type | Description |
|--------|------|-------------|
| organization_id | UUID (FK) | References organizations.id |
| user_id | UUID (FK) | References auth.users |
| role | TEXT | 'owner', 'admin', or 'member' |
| created_at | TIMESTAMP | When user joined |

**Constraints:**
- Primary key on (organization_id, user_id)
- Role must be one of: owner, admin, member

**RLS Policies:**
- Members can view all members in their organizations
- Only admins/owners can add/remove members

### reviews
Imported customer reviews from various platforms.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Review identifier |
| organization_id | UUID (FK) | References organizations.id |
| platform | TEXT | 'google', 'yelp', 'facebook', etc. |
| platform_review_id | TEXT | Original ID from platform |
| location_id | TEXT | Platform's location identifier |
| location_name | TEXT | Human-readable location name |
| reviewer_name | TEXT | Customer name |
| reviewer_avatar_url | TEXT | Customer profile picture |
| rating | INTEGER | 1-5 star rating |
| review_text | TEXT | Review content |
| review_reply | TEXT | Business response |
| reviewed_at | TIMESTAMP | When review was posted |
| reply_updated_at | TIMESTAMP | When reply was last updated |
| raw_data | JSONB | Complete platform response |
| created_at | TIMESTAMP | Import timestamp |
| updated_at | TIMESTAMP | Last update timestamp |

**Constraints:**
- Unique on (organization_id, platform, platform_review_id)
- Rating must be between 1 and 5

**Indexes:**
- organization_id
- platform
- location_id
- reviewed_at (DESC)
- rating

**RLS Policies:**
- Members can view/update reviews for their organizations

### google_tokens
Encrypted OAuth tokens for Google My Business integration.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Token identifier |
| organization_id | UUID (FK) | References organizations.id |
| user_id | UUID (FK) | References auth.users |
| access_token | TEXT | Encrypted access token |
| refresh_token | TEXT | Encrypted refresh token |
| expires_at | TIMESTAMP | Token expiration time |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Last update timestamp |

**Constraints:**
- Unique on (organization_id, user_id)

**Security:**
- Tokens are encrypted using AES-256-CBC before storage
- Encryption key must be set in ENCRYPTION_KEY environment variable

**RLS Policies:**
- Users can only view/manage their own tokens

### service_account_keys
Vertex AI service account credentials for each organization.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Key identifier |
| organization_id | UUID (FK) | References organizations.id |
| project_id | TEXT | Google Cloud project ID |
| key_data | JSONB | Encrypted service account JSON |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Last update timestamp |

**Security:**
- Service account JSON is encrypted before storage
- Only organization admins can access

**RLS Policies:**
- Only organization admins/owners can view/manage keys

### stripe_customers
Stripe customer mapping for billing.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | References auth.users |
| stripe_customer_id | TEXT (UNIQUE) | Stripe customer ID |

**RLS Policies:**
- No client-side access (server-only table)

### contact_requests
Contact form submissions.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Request identifier |
| updated_at | TIMESTAMP | Last update timestamp |
| first_name | TEXT | Submitter first name |
| last_name | TEXT | Submitter last name |
| email | TEXT | Contact email |
| phone | TEXT | Contact phone |
| company_name | TEXT | Company name |
| message_body | TEXT | Message content |

**RLS Policies:**
- No client-side access (server-only table)

## Database Functions

### handle_new_user()
Trigger function that creates a profile when a new user signs up.

```sql
CREATE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### update_updated_at_column()
Generic trigger function to update the updated_at timestamp.

```sql
CREATE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';
```

## Storage Buckets

### avatars
Public bucket for user profile pictures.

**Policies:**
- Public read access
- Any authenticated user can upload

## Security Considerations

1. **Row Level Security (RLS)**: All tables have RLS enabled with appropriate policies
2. **Token Encryption**: OAuth tokens and service account keys are encrypted at rest
3. **Organization Isolation**: Users can only access data within their organizations
4. **Role-Based Access**: Different permissions for owners, admins, and members
5. **Service Role**: Background jobs use service role key for cross-organization access

## Migration Strategy

Apply migrations in order:
1. `20240730010101_initial.sql` - Base tables
2. `20240731051052_add_unsubscribed_to_profiles.sql` - Profile updates
3. `20240806000000_create_reviews_table.sql` - Reviews system
4. `20250106000000_complete_schema.sql` - Organizations and integrations

## Performance Optimization

### Indexes
- All foreign keys are indexed
- Common query patterns have covering indexes
- Timestamp fields indexed for sorting

### Query Patterns
- Organization-scoped queries use organization_id index
- Review queries optimized for platform and date filtering
- Token refresh queries use expires_at index

## Backup and Recovery

1. **Automatic Backups**: Supabase provides daily backups
2. **Point-in-Time Recovery**: Available on Pro plan
3. **Manual Exports**: Use `pg_dump` for manual backups
4. **Encryption Keys**: Store encryption keys separately from database