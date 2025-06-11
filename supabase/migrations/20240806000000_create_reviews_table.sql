-- Create reviews table to store imported reviews
CREATE TABLE IF NOT EXISTS reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    platform TEXT NOT NULL, -- 'google', 'yelp', 'facebook', etc.
    platform_review_id TEXT NOT NULL, -- ID from the platform
    location_id TEXT NOT NULL, -- Platform's location ID
    location_name TEXT NOT NULL, -- Human-readable location name
    reviewer_name TEXT NOT NULL,
    reviewer_avatar_url TEXT,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    review_reply TEXT,
    reviewed_at TIMESTAMP WITH TIME ZONE NOT NULL,
    reply_updated_at TIMESTAMP WITH TIME ZONE,
    raw_data JSONB, -- Store complete platform response
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure we don't duplicate reviews from the same platform
    UNIQUE(organization_id, platform, platform_review_id)
);

-- Create indexes for common queries
CREATE INDEX idx_reviews_organization_id ON reviews(organization_id);
CREATE INDEX idx_reviews_platform ON reviews(platform);
CREATE INDEX idx_reviews_location_id ON reviews(location_id);
CREATE INDEX idx_reviews_reviewed_at ON reviews(reviewed_at DESC);
CREATE INDEX idx_reviews_rating ON reviews(rating);

-- RLS policies
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Users can view reviews for organizations they belong to
CREATE POLICY "Users can view reviews for their organizations" ON reviews
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM organization_members
            WHERE organization_members.organization_id = reviews.organization_id
            AND organization_members.user_id = auth.uid()
        )
    );

-- Users can insert reviews for organizations they belong to
CREATE POLICY "Users can insert reviews for their organizations" ON reviews
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM organization_members
            WHERE organization_members.organization_id = reviews.organization_id
            AND organization_members.user_id = auth.uid()
        )
    );

-- Users can update reviews for organizations they belong to
CREATE POLICY "Users can update reviews for their organizations" ON reviews
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM organization_members
            WHERE organization_members.organization_id = reviews.organization_id
            AND organization_members.user_id = auth.uid()
        )
    );

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_reviews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_reviews_updated_at
    BEFORE UPDATE ON reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_reviews_updated_at();