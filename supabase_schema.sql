-- ==========================================
-- SUPER BEES AI DATABASE SCHEMA
-- Nigerian Creative Industry Focus
-- ==========================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. USER INTERACTIONS TABLE
-- ==========================================
CREATE TABLE superbees_interactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    query TEXT NOT NULL,
    response TEXT NOT NULL,
    context JSONB DEFAULT '{}',
    processing_time_ms INTEGER DEFAULT 0,
    feedback_score INTEGER CHECK (feedback_score >= 1 AND feedback_score <= 5),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_superbees_interactions_user ON superbees_interactions(user_id);
CREATE INDEX idx_superbees_interactions_created ON superbees_interactions(created_at DESC);

-- ==========================================
-- 2. DESIGN CONSULTATIONS TABLE
-- ==========================================
CREATE TABLE superbees_consultations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    brief TEXT NOT NULL,
    suggestions TEXT NOT NULL,
    consultation_type VARCHAR(50) NOT NULL CHECK (consultation_type IN ('design_suggestions', 'moodboard_analysis', 'brand_strategy', 'creative_direction')),
    industry VARCHAR(100),
    budget_range VARCHAR(50),
    timeline VARCHAR(50),
    status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'in_progress', 'completed', 'archived')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_superbees_consultations_user ON superbees_consultations(user_id);
CREATE INDEX idx_superbees_consultations_type ON superbees_consultations(consultation_type);
CREATE INDEX idx_superbees_consultations_created ON superbees_consultations(created_at DESC);

-- ==========================================
-- 3. USER PROFILES TABLE
-- ==========================================
CREATE TABLE superbees_users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255),
    name VARCHAR(255),
    company VARCHAR(255),
    industry VARCHAR(100),
    location VARCHAR(100) DEFAULT 'Nigeria',
    subscription_tier VARCHAR(20) DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'enterprise')),
    total_interactions INTEGER DEFAULT 0,
    total_consultations INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_superbees_users_user_id ON superbees_users(user_id);
CREATE INDEX idx_superbees_users_subscription ON superbees_users(subscription_tier);
CREATE INDEX idx_superbees_users_industry ON superbees_users(industry);

-- ==========================================
-- 4. CREATIVE ASSETS TABLE
-- ==========================================
CREATE TABLE superbees_assets (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    asset_type VARCHAR(50) NOT NULL CHECK (asset_type IN ('moodboard', 'design', 'brand_guide', 'template')),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    file_url TEXT,
    thumbnail_url TEXT,
    tags TEXT[],
    industry VARCHAR(100),
    color_palette JSONB,
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_superbees_assets_user ON superbees_assets(user_id);
CREATE INDEX idx_superbees_assets_type ON superbees_assets(asset_type);
CREATE INDEX idx_superbees_assets_public ON superbees_assets(is_public);
CREATE INDEX idx_superbees_assets_tags ON superbees_assets USING GIN(tags);

-- ==========================================
-- 5. NIGERIAN CREATIVE TRENDS TABLE
-- ==========================================
CREATE TABLE nigerian_creative_trends (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    trend_name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL CHECK (category IN ('color', 'typography', 'style', 'industry', 'cultural')),
    description TEXT NOT NULL,
    relevance_score INTEGER CHECK (relevance_score >= 1 AND relevance_score <= 10),
    seasonal BOOLEAN DEFAULT FALSE,
    target_industries TEXT[],
    example_brands TEXT[],
    color_codes TEXT[],
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_trends_category ON nigerian_creative_trends(category);
CREATE INDEX idx_trends_active ON nigerian_creative_trends(is_active);
CREATE INDEX idx_trends_relevance ON nigerian_creative_trends(relevance_score DESC);

-- ==========================================
-- 6. SYSTEM ANALYTICS TABLE
-- ==========================================
CREATE TABLE superbees_analytics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    date DATE NOT NULL,
    total_interactions INTEGER DEFAULT 0,
    unique_users INTEGER DEFAULT 0,
    avg_processing_time_ms INTEGER DEFAULT 0,
    top_queries TEXT[],
    top_industries TEXT[],
    success_rate DECIMAL(5,2) DEFAULT 100.00,
    feedback_avg DECIMAL(3,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Unique constraint for daily analytics
ALTER TABLE superbees_analytics ADD CONSTRAINT unique_analytics_date UNIQUE (date);

-- ==========================================
-- 7. NIGERIAN MARKET INSIGHTS TABLE
-- ==========================================
CREATE TABLE nigerian_market_insights (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    insight_type VARCHAR(50) NOT NULL CHECK (insight_type IN ('market_size', 'consumer_behavior', 'competition', 'pricing', 'cultural_factor')),
    industry VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    data_sources TEXT[],
    confidence_level INTEGER CHECK (confidence_level >= 1 AND confidence_level <= 5),
    geographical_focus VARCHAR(100) DEFAULT 'Nigeria',
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_market_insights_type ON nigerian_market_insights(insight_type);
CREATE INDEX idx_market_insights_industry ON nigerian_market_insights(industry);
CREATE INDEX idx_market_insights_verified ON nigerian_market_insights(is_verified);

-- ==========================================
-- 8. FUNCTIONS AND TRIGGERS
-- ==========================================

-- Function to update user stats
CREATE OR REPLACE FUNCTION update_user_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Update user profile stats
    INSERT INTO superbees_users (user_id, total_interactions, last_active)
    VALUES (NEW.user_id, 1, NEW.created_at)
    ON CONFLICT (user_id)
    DO UPDATE SET 
        total_interactions = superbees_users.total_interactions + 1,
        last_active = NEW.created_at,
        updated_at = NEW.created_at;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for interactions
CREATE TRIGGER trigger_update_user_stats
    AFTER INSERT ON superbees_interactions
    FOR EACH ROW
    EXECUTE FUNCTION update_user_stats();

-- Function to update consultation stats
CREATE OR REPLACE FUNCTION update_consultation_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Update user consultation count
    UPDATE superbees_users
    SET total_consultations = total_consultations + 1,
        updated_at = NEW.created_at
    WHERE user_id = NEW.user_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for consultations
CREATE TRIGGER trigger_update_consultation_stats
    AFTER INSERT ON superbees_consultations
    FOR EACH ROW
    EXECUTE FUNCTION update_consultation_stats();

-- ==========================================
-- 9. SAMPLE DATA FOR NIGERIAN CONTEXT
-- ==========================================

-- Insert Nigerian creative trends
INSERT INTO nigerian_creative_trends (trend_name, category, description, relevance_score, target_industries, example_brands, color_codes) VALUES
('Afrocentric Minimalism', 'style', 'Clean, minimal designs with African cultural elements and earth tones', 9, ARRAY['fashion', 'lifestyle', 'tech'], ARRAY['Paystack', 'Flutterwave', 'Andela'], ARRAY['#8B4513', '#D2691E', '#F4A460']),
('Nigerian Green Heritage', 'color', 'Various shades of green representing Nigeria''s flag and natural heritage', 8, ARRAY['government', 'agriculture', 'finance'], ARRAY['CBN', 'Access Bank', 'Zenith Bank'], ARRAY['#008751', '#228B22', '#32CD32']),
('Modern Lagos Vibes', 'style', 'Urban, fast-paced design aesthetic reflecting Lagos business culture', 7, ARRAY['fintech', 'real estate', 'entertainment'], ARRAY['Kuda', 'PiggyVest', 'MainOne'], ARRAY['#FF6B35', '#004E89', '#FFFFFF']),
('Traditional Pattern Fusion', 'style', 'Modern integration of traditional Nigerian patterns and motifs', 8, ARRAY['fashion', 'hospitality', 'cultural'], ARRAY['Orange Culture', 'Alara Lagos'], ARRAY['#B8860B', '#8B0000', '#FFD700']);

-- Insert market insights
INSERT INTO nigerian_market_insights (insight_type, industry, title, content, confidence_level, is_verified) VALUES
('market_size', 'fintech', 'Nigerian Fintech Market Growth', 'The Nigerian fintech market is valued at over $1 billion with 200+ active fintech companies serving 40+ million users.', 5, true),
('consumer_behavior', 'fashion', 'Nigerian Fashion Preferences', 'Nigerian consumers increasingly prefer brands that blend modern aesthetics with cultural elements, particularly among millennials and Gen Z.', 4, true),
('cultural_factor', 'general', 'Color Psychology in Nigeria', 'Green represents prosperity and hope, while red signifies strength. Yellow/gold connects to royalty and success in traditional contexts.', 5, true),
('pricing', 'creative_services', 'Nigerian Design Service Pricing', 'Logo design ranges from ₦15,000-₦150,000, brand identity packages ₦50,000-₦500,000, depending on agency and scope.', 4, true);

-- ==========================================
-- 10. ROW LEVEL SECURITY
-- ==========================================

-- Enable RLS on user-specific tables
ALTER TABLE superbees_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE superbees_consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE superbees_assets ENABLE ROW LEVEL SECURITY;

-- Policies for service role (backend access)
CREATE POLICY "Service role full access interactions" ON superbees_interactions
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access consultations" ON superbees_consultations
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access assets" ON superbees_assets
    FOR ALL USING (auth.role() = 'service_role');

-- ==========================================
-- SETUP COMPLETE
-- ==========================================

-- Grant permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- Verify setup
SELECT 
    'Super Bees AI Database Setup Complete' as status,
    COUNT(*) as tables_created
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'superbees_%' OR table_name LIKE 'nigerian_%';