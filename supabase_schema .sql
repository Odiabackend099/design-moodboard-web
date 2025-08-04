-- ==========================================
-- ODIA Voice AI - Complete Database Schema
-- Supabase Production Setup
-- ==========================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==========================================
-- 1. CLIENTS TABLE (Business Management)
-- ==========================================
CREATE TABLE clients (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    business_name VARCHAR(255) NOT NULL,
    subdomain VARCHAR(100) UNIQUE NOT NULL,
    whatsapp_number VARCHAR(20) NOT NULL,
    business_type VARCHAR(50) DEFAULT 'general',
    email VARCHAR(255),
    api_key VARCHAR(100) UNIQUE NOT NULL,
    plan VARCHAR(20) DEFAULT 'trial' CHECK (plan IN ('trial', 'starter', 'pro', 'enterprise')),
    messages_remaining INTEGER DEFAULT 25,
    trial_expires TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'cancelled')),
    webhook_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX idx_clients_subdomain ON clients(subdomain);
CREATE INDEX idx_clients_api_key ON clients(api_key);
CREATE INDEX idx_clients_status ON clients(status);

-- ==========================================
-- 2. VOICE SESSIONS (Core Functionality)
-- ==========================================
CREATE TABLE voice_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    platform VARCHAR(20) NOT NULL CHECK (platform IN ('whatsapp', 'telegram', 'web')),
    user_identifier VARCHAR(100) NOT NULL,
    user_name VARCHAR(255),
    chat_id VARCHAR(100),
    message_sid VARCHAR(100),
    file_id VARCHAR(100),
    transcribed_text TEXT NOT NULL,
    claude_response TEXT NOT NULL,
    processing_time_ms INTEGER DEFAULT 0,
    audio_url TEXT,
    audio_size_bytes INTEGER DEFAULT 0,
    total_cost_usd DECIMAL(10,6) DEFAULT 0,
    whisper_cost_usd DECIMAL(10,6) DEFAULT 0,
    claude_cost_usd DECIMAL(10,6) DEFAULT 0,
    language_detected VARCHAR(10),
    confidence_score DECIMAL(3,2),
    client_id UUID REFERENCES clients(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_voice_sessions_platform ON voice_sessions(platform);
CREATE INDEX idx_voice_sessions_user ON voice_sessions(user_identifier);
CREATE INDEX idx_voice_sessions_created ON voice_sessions(created_at DESC);
CREATE INDEX idx_voice_sessions_client ON voice_sessions(client_id);

-- ==========================================
-- 3. CACHED RESPONSES (Cost Optimization)
-- ==========================================
CREATE TABLE cached_responses (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    query_hash VARCHAR(64) UNIQUE NOT NULL,
    original_query TEXT NOT NULL,
    response_text TEXT NOT NULL,
    language VARCHAR(10) DEFAULT 'en',
    hit_count INTEGER DEFAULT 1,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast cache lookups
CREATE INDEX idx_cached_responses_hash ON cached_responses(query_hash);
CREATE INDEX idx_cached_responses_expires ON cached_responses(expires_at);

-- ==========================================
-- 4. USAGE ANALYTICS (Business Intelligence)
-- ==========================================
CREATE TABLE usage_analytics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    client_id UUID REFERENCES clients(id),
    date DATE NOT NULL,
    total_messages INTEGER DEFAULT 0,
    unique_users INTEGER DEFAULT 0,
    total_cost_usd DECIMAL(10,2) DEFAULT 0,
    avg_processing_time_ms INTEGER DEFAULT 0,
    success_rate DECIMAL(5,2) DEFAULT 100.00,
    platform_breakdown JSONB DEFAULT '{}',
    language_breakdown JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Unique constraint and index
ALTER TABLE usage_analytics ADD CONSTRAINT unique_client_date UNIQUE (client_id, date);
CREATE INDEX idx_usage_analytics_date ON usage_analytics(date DESC);

-- ==========================================
-- 5. RATE LIMITS (Anti-Abuse)
-- ==========================================
CREATE TABLE rate_limits (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_identifier VARCHAR(100) NOT NULL,
    platform VARCHAR(20) NOT NULL,
    request_count INTEGER DEFAULT 1,
    window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    window_duration_minutes INTEGER DEFAULT 60,
    max_requests INTEGER DEFAULT 50,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Composite index for rate limiting
CREATE UNIQUE INDEX idx_rate_limits_user_platform ON rate_limits(user_identifier, platform);
CREATE INDEX idx_rate_limits_window ON rate_limits(window_start);

-- ==========================================
-- 6. SYSTEM LOGS (Monitoring & Debugging)
-- ==========================================
CREATE TABLE system_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    level VARCHAR(10) NOT NULL CHECK (level IN ('info', 'warn', 'error', 'debug')),
    service VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    user_identifier VARCHAR(100),
    session_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for log queries
CREATE INDEX idx_system_logs_level ON system_logs(level);
CREATE INDEX idx_system_logs_service ON system_logs(service);
CREATE INDEX idx_system_logs_created ON system_logs(created_at DESC);

-- ==========================================
-- 7. AGENT CONFIGURATIONS (Multi-Agent System)
-- ==========================================
CREATE TABLE agent_configs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    agent_name VARCHAR(50) NOT NULL UNIQUE,
    agent_type VARCHAR(20) NOT NULL CHECK (agent_type IN ('lexi', 'miss', 'atlas', 'legal')),
    system_prompt TEXT NOT NULL,
    voice_id VARCHAR(50),
    personality_traits JSONB DEFAULT '{}',
    supported_languages TEXT[] DEFAULT ARRAY['en', 'pidgin'],
    max_tokens INTEGER DEFAULT 300,
    temperature DECIMAL(3,2) DEFAULT 0.7,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default agent configurations
INSERT INTO agent_configs (agent_name, agent_type, system_prompt, voice_id, personality_traits, supported_languages) VALUES 
('Agent Lexi', 'lexi', 'You are Agent Lexi, a friendly WhatsApp assistant for Nigerian businesses. You help with onboarding, trials, and upgrades. Speak naturally in Nigerian English or Pidgin when appropriate.', '5gBmGqdd8c8PD5xP7lPE', '{"tone": "friendly", "style": "conversational", "local_knowledge": true}', ARRAY['en', 'pidgin', 'yoruba']),
('Agent MISS', 'miss', 'You are Agent MISS, an academic assistant for Mudiame University. You provide structured, professional support for students and faculty. Be helpful, accurate, and academically focused.', '5gBmGqdd8c8PD5xP7lPE', '{"tone": "professional", "style": "academic", "multilingual": true}', ARRAY['en', 'yoruba', 'igbo', 'hausa']),
('Agent Atlas', 'atlas', 'You are Agent Atlas, a luxury travel and booking specialist. You handle high-end clients with sophistication and attention to detail. Provide premium service experiences.', '5gBmGqdd8c8PD5xP7lPE', '{"tone": "sophisticated", "style": "premium", "detail_oriented": true}', ARRAY['en']),
('Agent Legal', 'legal', 'You are Agent Miss Legal, a legal document assistant. You provide precise, legally accurate information for contracts, compliance, and legal templates. Always be professional and accurate.', '5gBmGqdd8c8PD5xP7lPE', '{"tone": "professional", "style": "precise", "legal_focus": true}', ARRAY['en']);

-- ==========================================
-- 8. FUNCTIONS (Business Logic)
-- ==========================================

-- Function to check rate limits
CREATE OR REPLACE FUNCTION check_rate_limit(
    p_user_identifier VARCHAR(100),
    p_platform VARCHAR(20),
    p_max_requests INTEGER DEFAULT 50,
    p_window_minutes INTEGER DEFAULT 60
) RETURNS BOOLEAN AS $$
DECLARE
    current_count INTEGER;
    window_start TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Get current window start
    window_start := NOW() - (p_window_minutes || ' minutes')::INTERVAL;
    
    -- Check existing rate limit record
    SELECT request_count INTO current_count
    FROM rate_limits 
    WHERE user_identifier = p_user_identifier 
    AND platform = p_platform
    AND window_start > window_start;
    
    -- If no record exists or window expired, create new one
    IF current_count IS NULL THEN
        INSERT INTO rate_limits (user_identifier, platform, request_count, max_requests, window_duration_minutes)
        VALUES (p_user_identifier, p_platform, 1, p_max_requests, p_window_minutes)
        ON CONFLICT (user_identifier, platform) 
        DO UPDATE SET 
            request_count = 1,
            window_start = NOW(),
            updated_at = NOW();
        RETURN TRUE;
    END IF;
    
    -- Check if limit exceeded
    IF current_count >= p_max_requests THEN
        RETURN FALSE;
    END IF;
    
    -- Increment counter
    UPDATE rate_limits 
    SET request_count = request_count + 1,
        updated_at = NOW()
    WHERE user_identifier = p_user_identifier 
    AND platform = p_platform;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to log voice sessions with analytics update
CREATE OR REPLACE FUNCTION log_voice_session()
RETURNS TRIGGER AS $$
BEGIN
    -- Update daily analytics
    INSERT INTO usage_analytics (client_id, date, total_messages, total_cost_usd)
    VALUES (NEW.client_id, CURRENT_DATE, 1, NEW.total_cost_usd)
    ON CONFLICT (client_id, date)
    DO UPDATE SET 
        total_messages = usage_analytics.total_messages + 1,
        total_cost_usd = usage_analytics.total_cost_usd + NEW.total_cost_usd;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for voice sessions
CREATE TRIGGER trigger_log_voice_session
    AFTER INSERT ON voice_sessions
    FOR EACH ROW
    EXECUTE FUNCTION log_voice_session();

-- Function to clean expired cache
CREATE OR REPLACE FUNCTION clean_expired_cache()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM cached_responses WHERE expires_at < NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- 9. ROW LEVEL SECURITY (RLS)
-- ==========================================

-- Enable RLS on sensitive tables
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_analytics ENABLE ROW LEVEL SECURITY;

-- Policies for service role (full access)
CREATE POLICY "Service role full access" ON clients
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access" ON voice_sessions
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access" ON usage_analytics
    FOR ALL USING (auth.role() = 'service_role');

-- ==========================================
-- 10. INITIAL DATA & SAMPLE RECORDS
-- ==========================================

-- Insert sample client for testing
INSERT INTO clients (
    business_name, subdomain, whatsapp_number, business_type, 
    email, api_key, plan, status
) VALUES (
    'ODIA Demo Business', 'demo', '+2348012345678', 'technology',
    'demo@odia.dev', 'odia_demo_key_12345', 'pro', 'active'
);

-- Insert sample voice session
INSERT INTO voice_sessions (
    platform, user_identifier, transcribed_text, claude_response,
    processing_time_ms, total_cost_usd, language_detected
) VALUES (
    'web', 'demo-user', 'Hello, how can you help my business?',
    'Hello! I''m Agent Lexi, your AI assistant. I can help you automate customer service, handle WhatsApp inquiries, and grow your business with voice AI. What specific area would you like to explore?',
    2340, 0.005, 'en'
);

-- ==========================================
-- 11. MAINTENANCE PROCEDURES
-- ==========================================

-- Daily cleanup procedure
CREATE OR REPLACE FUNCTION daily_maintenance()
RETURNS TEXT AS $$
DECLARE
    cache_cleaned INTEGER;
    old_logs_cleaned INTEGER;
BEGIN
    -- Clean expired cache
    SELECT clean_expired_cache() INTO cache_cleaned;
    
    -- Clean old system logs (keep 30 days)
    DELETE FROM system_logs WHERE created_at < NOW() - INTERVAL '30 days';
    GET DIAGNOSTICS old_logs_cleaned = ROW_COUNT;
    
    -- Clean old rate limit records
    DELETE FROM rate_limits WHERE window_start < NOW() - INTERVAL '24 hours';
    
    RETURN FORMAT('Maintenance complete: %s cache entries cleaned, %s old logs removed', 
                  cache_cleaned, old_logs_cleaned);
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- 12. MONITORING VIEWS
-- ==========================================

-- System health view
CREATE VIEW system_health AS
SELECT 
    'voice_sessions' as table_name,
    COUNT(*) as total_records,
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') as records_today,
    AVG(processing_time_ms) as avg_processing_time,
    AVG(total_cost_usd) as avg_cost
FROM voice_sessions
UNION ALL
SELECT 
    'clients' as table_name,
    COUNT(*) as total_records,
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') as records_today,
    NULL as avg_processing_time,
    NULL as avg_cost
FROM clients
WHERE status = 'active';

-- Performance dashboard view
CREATE VIEW performance_dashboard AS
SELECT 
    DATE(created_at) as date,
    platform,
    COUNT(*) as total_sessions,
    AVG(processing_time_ms) as avg_response_time,
    COUNT(*) FILTER (WHERE processing_time_ms < 3000) * 100.0 / COUNT(*) as success_rate_percentage,
    SUM(total_cost_usd) as total_cost,
    COUNT(DISTINCT user_identifier) as unique_users
FROM voice_sessions
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at), platform
ORDER BY date DESC, platform;

-- ==========================================
-- SETUP COMPLETE
-- ==========================================

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- Final status check
SELECT 
    'ODIA Voice AI Database Setup Complete' as status,
    COUNT(*) as tables_created
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'clients', 'voice_sessions', 'cached_responses', 
    'usage_analytics', 'rate_limits', 'system_logs', 'agent_configs'
);