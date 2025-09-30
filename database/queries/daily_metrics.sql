-- ===================================
-- GIM_AI Daily Metrics Queries
-- Métricas diarias para dashboard ejecutivo
-- ===================================

-- ===================================
-- QUERY 1: Today's Financial Metrics
-- ===================================
CREATE OR REPLACE VIEW dashboard_financial_today AS
SELECT 
    CURRENT_DATE as metric_date,
    
    -- Revenue today
    COALESCE(SUM(p.amount) FILTER (WHERE p.payment_date = CURRENT_DATE), 0) as revenue_today,
    
    -- Average daily revenue (last 30 days)
    (
        SELECT COALESCE(AVG(daily_rev), 0)
        FROM (
            SELECT DATE(payment_date) as day, SUM(amount) as daily_rev
            FROM payments
            WHERE payment_date >= CURRENT_DATE - INTERVAL '30 days'
                AND payment_date < CURRENT_DATE
                AND status = 'paid'
            GROUP BY DATE(payment_date)
        ) daily
    ) as avg_daily_revenue,
    
    -- Morosidad percentage
    calculate_morosidad() as morosidad_percent,
    
    -- Active debtors count
    (
        SELECT COUNT(DISTINCT member_id)
        FROM payments
        WHERE status = 'pending' AND due_date < CURRENT_DATE
    ) as total_debtors,
    
    -- Debtors who checked in today (collection opportunity)
    (
        SELECT COUNT(DISTINCT c.member_id)
        FROM checkins c
        WHERE CAST(c.checkin_time AS DATE) = CURRENT_DATE
            AND c.has_debt = true
    ) as debtors_checked_in_today,
    
    -- Total pending debt amount
    (
        SELECT COALESCE(SUM(amount), 0)
        FROM payments
        WHERE status = 'pending' AND due_date < CURRENT_DATE
    ) as total_debt_amount,
    
    -- DSO (Days Sales Outstanding)
    (
        SELECT ROUND(AVG(days_overdue), 1)
        FROM payments
        WHERE status = 'pending' AND due_date < CURRENT_DATE
    ) as dso_days

FROM payments p
WHERE p.payment_date >= CURRENT_DATE - INTERVAL '30 days';

-- ===================================
-- QUERY 2: Today's Operational Metrics
-- ===================================
CREATE OR REPLACE VIEW dashboard_operations_today AS
SELECT 
    CURRENT_DATE as metric_date,
    
    -- Check-ins today
    (
        SELECT COUNT(*)
        FROM checkins
        WHERE CAST(checkin_time AS DATE) = CURRENT_DATE
    ) as checkins_today,
    
    -- Check-ins by source
    (
        SELECT COUNT(*)
        FROM checkins
        WHERE CAST(checkin_time AS DATE) = CURRENT_DATE AND source = 'qr'
    ) as checkins_qr,
    
    -- Average occupancy today
    (
        SELECT ROUND(
            AVG(current_reservations::DECIMAL / NULLIF(max_capacity, 0)) * 100,
            2
        )
        FROM classes
        WHERE scheduled_date = CURRENT_DATE AND status = 'scheduled'
    ) as avg_occupancy_today,
    
    -- Active members
    (
        SELECT COUNT(*)
        FROM members
        WHERE is_active = true AND membership_status = 'active'
    ) as active_members;

COMMENT ON VIEW dashboard_financial_today IS 'Métricas financieras del día actual';
COMMENT ON VIEW dashboard_operations_today IS 'Métricas operativas del día actual';
