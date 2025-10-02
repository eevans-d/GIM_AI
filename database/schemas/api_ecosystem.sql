-- =====================================================
-- PROMPT 24: API ECOSYSTEM & WEBHOOKS - DATABASE SCHEMA
-- =====================================================

-- OAuth2 Clients Table
CREATE TABLE IF NOT EXISTS oauth_clients (
    client_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_secret VARCHAR(255) NOT NULL,
    client_name VARCHAR(255) NOT NULL,
    client_type VARCHAR(50) NOT NULL DEFAULT 'confidential', -- confidential, public
    redirect_uris TEXT[], -- Array of allowed redirect URIs
    grant_types VARCHAR(100)[] NOT NULL DEFAULT ARRAY['authorization_code', 'refresh_token'],
    scopes VARCHAR(500)[] NOT NULL DEFAULT ARRAY['read:members', 'read:classes'],
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES members(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_oauth_clients_active ON oauth_clients(is_active);
CREATE INDEX idx_oauth_clients_created_by ON oauth_clients(created_by);

-- OAuth2 Tokens Table
CREATE TABLE IF NOT EXISTS oauth_tokens (
    token_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES oauth_clients(client_id) ON DELETE CASCADE,
    member_id UUID REFERENCES members(id) ON DELETE CASCADE,
    access_token VARCHAR(500) NOT NULL UNIQUE,
    refresh_token VARCHAR(500) UNIQUE,
    token_type VARCHAR(50) NOT NULL DEFAULT 'Bearer',
    scopes VARCHAR(500)[] NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    refresh_expires_at TIMESTAMP WITH TIME ZONE,
    is_revoked BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_oauth_tokens_access ON oauth_tokens(access_token);
CREATE INDEX idx_oauth_tokens_refresh ON oauth_tokens(refresh_token);
CREATE INDEX idx_oauth_tokens_client ON oauth_tokens(client_id);
CREATE INDEX idx_oauth_tokens_member ON oauth_tokens(member_id);
CREATE INDEX idx_oauth_tokens_expires ON oauth_tokens(expires_at);

-- API Keys Table
CREATE TABLE IF NOT EXISTS api_keys (
    key_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    api_key VARCHAR(255) NOT NULL UNIQUE,
    key_name VARCHAR(255) NOT NULL,
    key_prefix VARCHAR(20) NOT NULL, -- First 8 chars for display
    client_id UUID NOT NULL REFERENCES oauth_clients(client_id) ON DELETE CASCADE,
    scopes VARCHAR(500)[] NOT NULL,
    rate_limit_per_hour INTEGER NOT NULL DEFAULT 1000,
    rate_limit_per_day INTEGER NOT NULL DEFAULT 10000,
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_used_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_api_keys_key ON api_keys(api_key);
CREATE INDEX idx_api_keys_client ON api_keys(client_id);
CREATE INDEX idx_api_keys_active ON api_keys(is_active);
CREATE INDEX idx_api_keys_expires ON api_keys(expires_at);

-- API Key Usage Stats Table
CREATE TABLE IF NOT EXISTS api_key_usage (
    usage_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key_id UUID NOT NULL REFERENCES api_keys(key_id) ON DELETE CASCADE,
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    status_code INTEGER NOT NULL,
    response_time INTEGER, -- milliseconds
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_api_key_usage_key ON api_key_usage(key_id);
CREATE INDEX idx_api_key_usage_timestamp ON api_key_usage(timestamp);

-- Webhooks Table
CREATE TABLE IF NOT EXISTS webhooks (
    webhook_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES oauth_clients(client_id) ON DELETE CASCADE,
    webhook_url VARCHAR(500) NOT NULL,
    webhook_secret VARCHAR(255) NOT NULL, -- For HMAC signature
    events VARCHAR(100)[] NOT NULL, -- member.created, checkin.completed, etc.
    is_active BOOLEAN NOT NULL DEFAULT true,
    retry_count INTEGER NOT NULL DEFAULT 3,
    timeout_seconds INTEGER NOT NULL DEFAULT 10,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_webhooks_client ON webhooks(client_id);
CREATE INDEX idx_webhooks_active ON webhooks(is_active);

-- Webhook Deliveries Table
CREATE TABLE IF NOT EXISTS webhook_deliveries (
    delivery_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    webhook_id UUID NOT NULL REFERENCES webhooks(webhook_id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    http_status INTEGER,
    response_body TEXT,
    response_time INTEGER, -- milliseconds
    attempt_number INTEGER NOT NULL DEFAULT 1,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, success, failed, retrying
    error_message TEXT,
    signature VARCHAR(255), -- HMAC-SHA256 signature
    delivered_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    next_retry_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_webhook_deliveries_webhook ON webhook_deliveries(webhook_id);
CREATE INDEX idx_webhook_deliveries_status ON webhook_deliveries(status);
CREATE INDEX idx_webhook_deliveries_event ON webhook_deliveries(event_type);
CREATE INDEX idx_webhook_deliveries_next_retry ON webhook_deliveries(next_retry_at);
CREATE INDEX idx_webhook_deliveries_created ON webhook_deliveries(created_at);

-- API Rate Limits Table (for sliding window)
CREATE TABLE IF NOT EXISTS api_rate_limits (
    limit_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key_identifier VARCHAR(255) NOT NULL, -- API key or client_id
    window_start TIMESTAMP WITH TIME ZONE NOT NULL,
    request_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_api_rate_limits_key ON api_rate_limits(key_identifier);
CREATE INDEX idx_api_rate_limits_window ON api_rate_limits(window_start);

-- =====================================================
-- STORED FUNCTIONS
-- =====================================================

-- Function: Generate API Key with prefix
CREATE OR REPLACE FUNCTION generate_api_key()
RETURNS VARCHAR(255) AS $$
DECLARE
    random_string VARCHAR(255);
    prefix VARCHAR(20);
BEGIN
    -- Generate random string (base62: alphanumeric)
    random_string := encode(gen_random_bytes(32), 'base64');
    random_string := regexp_replace(random_string, '[^A-Za-z0-9]', '', 'g');
    random_string := substring(random_string, 1, 48);
    
    -- Create prefix for display (gim_)
    prefix := 'gim_' || substring(random_string, 1, 8);
    
    RETURN 'gim_' || random_string;
END;
$$ LANGUAGE plpgsql;

-- Function: Increment API rate limit counter
CREATE OR REPLACE FUNCTION increment_rate_limit(
    p_key_identifier VARCHAR(255),
    p_window_duration INTERVAL DEFAULT '1 hour'
)
RETURNS TABLE(
    current_count INTEGER,
    window_start TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
    v_window_start TIMESTAMP WITH TIME ZONE;
    v_count INTEGER;
BEGIN
    -- Calculate window start (rounded to hour/minute)
    v_window_start := date_trunc('hour', NOW());
    
    -- Insert or update counter
    INSERT INTO api_rate_limits (key_identifier, window_start, request_count)
    VALUES (p_key_identifier, v_window_start, 1)
    ON CONFLICT (key_identifier, window_start) 
    DO UPDATE SET request_count = api_rate_limits.request_count + 1;
    
    -- Get current count
    SELECT request_count INTO v_count
    FROM api_rate_limits
    WHERE key_identifier = p_key_identifier
    AND window_start = v_window_start;
    
    RETURN QUERY SELECT v_count, v_window_start;
END;
$$ LANGUAGE plpgsql;

-- Function: Get webhook delivery stats
CREATE OR REPLACE FUNCTION get_webhook_stats(p_webhook_id UUID)
RETURNS TABLE(
    total_deliveries INTEGER,
    successful_deliveries INTEGER,
    failed_deliveries INTEGER,
    pending_deliveries INTEGER,
    avg_response_time NUMERIC,
    success_rate NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::INTEGER as total_deliveries,
        COUNT(*) FILTER (WHERE status = 'success')::INTEGER as successful_deliveries,
        COUNT(*) FILTER (WHERE status = 'failed')::INTEGER as failed_deliveries,
        COUNT(*) FILTER (WHERE status = 'pending')::INTEGER as pending_deliveries,
        ROUND(AVG(response_time), 2) as avg_response_time,
        CASE 
            WHEN COUNT(*) > 0 THEN 
                ROUND((COUNT(*) FILTER (WHERE status = 'success')::NUMERIC / COUNT(*)::NUMERIC) * 100, 2)
            ELSE 0
        END as success_rate
    FROM webhook_deliveries
    WHERE webhook_id = p_webhook_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger: Update oauth_clients updated_at
CREATE OR REPLACE FUNCTION update_oauth_clients_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_oauth_clients_updated_at
BEFORE UPDATE ON oauth_clients
FOR EACH ROW
EXECUTE FUNCTION update_oauth_clients_timestamp();

-- Trigger: Update api_keys updated_at
CREATE OR REPLACE FUNCTION update_api_keys_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_api_keys_updated_at
BEFORE UPDATE ON api_keys
FOR EACH ROW
EXECUTE FUNCTION update_api_keys_timestamp();

-- Trigger: Update webhooks updated_at
CREATE OR REPLACE FUNCTION update_webhooks_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_webhooks_updated_at
BEFORE UPDATE ON webhooks
FOR EACH ROW
EXECUTE FUNCTION update_webhooks_timestamp();

-- =====================================================
-- INITIAL DATA (Example OAuth Client)
-- =====================================================

-- Example: System API Client
INSERT INTO oauth_clients (
    client_id,
    client_secret,
    client_name,
    client_type,
    grant_types,
    scopes,
    is_active
) VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'system_secret_change_in_production',
    'GIM System API',
    'confidential',
    ARRAY['client_credentials', 'authorization_code', 'refresh_token'],
    ARRAY['admin:*'],
    true
) ON CONFLICT (client_id) DO NOTHING;

-- Comments for documentation
COMMENT ON TABLE oauth_clients IS 'OAuth2 client applications registered in the system';
COMMENT ON TABLE oauth_tokens IS 'OAuth2 access and refresh tokens for authentication';
COMMENT ON TABLE api_keys IS 'API keys for simplified authentication without OAuth flow';
COMMENT ON TABLE webhooks IS 'Webhook subscriptions for real-time event notifications';
COMMENT ON TABLE webhook_deliveries IS 'Webhook delivery attempts and results';
COMMENT ON TABLE api_rate_limits IS 'Rate limiting counters for API requests';
