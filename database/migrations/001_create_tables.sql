-- ===================================
-- GIM_AI Database Migration 001
-- Create all tables and initial structure
-- ===================================

-- Run initial schema
\i database/schemas/initial_schema.sql

-- Run indexes
\i database/schemas/indexes.sql

-- Run functions
\i database/schemas/functions.sql

-- ===================================
-- Enable Row Level Security (RLS)
-- ===================================

-- Enable RLS on all tables
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE instructors ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE instructor_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE replacements_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- ===================================
-- Basic RLS Policies
-- ===================================

-- Members: Can view their own data
CREATE POLICY members_view_own ON members
    FOR SELECT
    USING (auth.uid()::text = id::text);

-- Members: Can update their own non-critical data
CREATE POLICY members_update_own ON members
    FOR UPDATE
    USING (auth.uid()::text = id::text)
    WITH CHECK (auth.uid()::text = id::text);

-- Instructors: Can view their own data
CREATE POLICY instructors_view_own ON instructors
    FOR SELECT
    USING (auth.uid()::text = id::text);

-- Classes: Public read for scheduled classes
CREATE POLICY classes_public_read ON classes
    FOR SELECT
    USING (status IN ('scheduled', 'completed'));

-- Reservations: Members can view their own
CREATE POLICY reservations_view_own ON reservations
    FOR SELECT
    USING (auth.uid()::text = member_id::text);

-- Checkins: Members can view their own
CREATE POLICY checkins_view_own ON checkins
    FOR SELECT
    USING (auth.uid()::text = member_id::text);

-- Payments: Members can view their own
CREATE POLICY payments_view_own ON payments
    FOR SELECT
    USING (auth.uid()::text = member_id::text);

-- Feedback: Members can view and insert their own
CREATE POLICY feedback_view_own ON feedback
    FOR SELECT
    USING (auth.uid()::text = member_id::text);

CREATE POLICY feedback_insert_own ON feedback
    FOR INSERT
    WITH CHECK (auth.uid()::text = member_id::text);

-- ===================================
-- Service Role Policies (bypass RLS)
-- ===================================

-- Admin/service role can do everything
DO $$
DECLARE
    table_name text;
BEGIN
    FOR table_name IN 
        SELECT tablename FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename IN (
            'members', 'instructors', 'classes', 'reservations', 
            'checkins', 'payments', 'feedback', 'incidents',
            'instructor_skills', 'replacements_log', 'whatsapp_messages'
        )
    LOOP
        EXECUTE format('
            CREATE POLICY %I_service_role_all ON %I
            FOR ALL
            USING (auth.role() = ''service_role'');
        ', table_name || '_service', table_name);
    END LOOP;
END $$;

-- ===================================
-- Create materialized view for dashboard
-- ===================================

CREATE MATERIALIZED VIEW IF NOT EXISTS dashboard_daily_metrics AS
SELECT 
    CURRENT_DATE as metric_date,
    -- Financial metrics
    calculate_morosidad() as morosidad_percent,
    (SELECT COUNT(*) FROM payments WHERE status = 'pending' AND due_date < CURRENT_DATE) as total_debtors,
    (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE payment_date = CURRENT_DATE) as today_revenue,
    
    -- Operational metrics
    (SELECT COUNT(*) FROM checkins WHERE CAST(checkin_time AS DATE) = CURRENT_DATE) as today_checkins,
    (SELECT COUNT(*) FROM checkins WHERE CAST(checkin_time AS DATE) = CURRENT_DATE AND source = 'qr') as qr_checkins,
    (SELECT COUNT(*) FROM checkins WHERE CAST(checkin_time AS DATE) = CURRENT_DATE AND has_debt = true) as debtor_checkins,
    
    -- Class metrics
    (SELECT COUNT(*) FROM classes WHERE scheduled_date = CURRENT_DATE AND status = 'scheduled') as scheduled_classes_today,
    (SELECT AVG(current_reservations::DECIMAL / NULLIF(max_capacity, 0)) * 100 FROM classes WHERE scheduled_date = CURRENT_DATE) as avg_occupancy_today,
    
    -- Satisfaction metrics
    (SELECT AVG(rating) FROM feedback WHERE CAST(submitted_at AS DATE) = CURRENT_DATE) as avg_rating_today,
    (SELECT COUNT(*) FROM incidents WHERE status = 'open') as open_incidents,
    
    -- Timestamp
    NOW() as calculated_at;

-- Create index on materialized view
CREATE UNIQUE INDEX idx_dashboard_daily_metrics_date ON dashboard_daily_metrics(metric_date);

-- Function to refresh dashboard metrics
CREATE OR REPLACE FUNCTION refresh_dashboard_metrics()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY dashboard_daily_metrics;
END;
$$ LANGUAGE plpgsql;

-- ===================================
-- Migration complete message
-- ===================================

DO $$
BEGIN
    RAISE NOTICE '============================================';
    RAISE NOTICE 'GIM_AI Database Migration 001: COMPLETE';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Created:';
    RAISE NOTICE '  - 11 tables with triggers';
    RAISE NOTICE '  - 60+ indexes';
    RAISE NOTICE '  - 11 functions';
    RAISE NOTICE '  - RLS policies';
    RAISE NOTICE '  - Dashboard materialized view';
    RAISE NOTICE '============================================';
END $$;
