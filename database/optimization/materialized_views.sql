-- PROMPT 20: DATABASE OPTIMIZATION - MATERIALIZED VIEWS
-- Vistas materializadas para queries complejas frecuentes

-- ============================================
-- DAILY KPIs (Dashboard principal)
-- ============================================

CREATE MATERIALIZED VIEW IF NOT EXISTS v_daily_kpis AS
WITH daily_metrics AS (
    SELECT 
        DATE(c.fecha) AS metric_date,
        COUNT(DISTINCT c.id) AS total_checkins,
        COUNT(DISTINCT c.miembro_id) AS unique_members,
        COUNT(DISTINCT c.clase_id) AS classes_with_attendance,
        AVG(occupancy.rate) AS avg_occupancy_rate
    FROM checkins c
    LEFT JOIN LATERAL (
        SELECT 
            (COUNT(c2.id)::NUMERIC / NULLIF(cl.capacidad_maxima, 0) * 100) AS rate
        FROM checkins c2
        JOIN clases cl ON c2.clase_id = cl.id
        WHERE c2.clase_id = c.clase_id
        AND DATE(c2.fecha) = DATE(c.fecha)
        GROUP BY cl.capacidad_maxima
    ) occupancy ON TRUE
    WHERE c.fecha >= CURRENT_DATE - INTERVAL '90 days'
    GROUP BY DATE(c.fecha)
),
daily_revenue AS (
    SELECT 
        DATE(payment_date) AS metric_date,
        SUM(amount) AS total_revenue,
        COUNT(*) AS total_payments
    FROM payments
    WHERE payment_date >= CURRENT_DATE - INTERVAL '90 days'
    AND payment_status = 'completed'
    GROUP BY DATE(payment_date)
)
SELECT 
    COALESCE(dm.metric_date, dr.metric_date) AS date,
    COALESCE(dm.total_checkins, 0) AS checkins,
    COALESCE(dm.unique_members, 0) AS active_members,
    COALESCE(dm.classes_with_attendance, 0) AS classes_held,
    COALESCE(dm.avg_occupancy_rate, 0) AS avg_occupancy,
    COALESCE(dr.total_revenue, 0) AS revenue,
    COALESCE(dr.total_payments, 0) AS payments_received
FROM daily_metrics dm
FULL OUTER JOIN daily_revenue dr ON dm.metric_date = dr.metric_date
ORDER BY COALESCE(dm.metric_date, dr.metric_date) DESC;

CREATE UNIQUE INDEX ON v_daily_kpis(date);

-- ============================================
-- MEMBER ENGAGEMENT SCORES (Targeting y churn prediction)
-- ============================================

CREATE MATERIALIZED VIEW IF NOT EXISTS v_member_engagement_scores AS
SELECT 
    m.id AS member_id,
    m.nombre,
    m.telefono,
    m.activo,
    get_member_current_tier(m.id) AS current_tier,
    
    -- Métricas de asistencia
    COUNT(c.id) FILTER (WHERE c.fecha >= CURRENT_DATE - INTERVAL '30 days') AS checkins_30d,
    COUNT(c.id) FILTER (WHERE c.fecha >= CURRENT_DATE - INTERVAL '7 days') AS checkins_7d,
    
    -- Días desde último check-in
    EXTRACT(DAY FROM CURRENT_DATE - MAX(c.fecha))::INTEGER AS days_since_last_checkin,
    
    -- Engagement score (0-100)
    (
        LEAST(COUNT(c.id) FILTER (WHERE c.fecha >= CURRENT_DATE - INTERVAL '30 days') * 4, 40) +
        CASE 
            WHEN MAX(c.fecha) >= CURRENT_DATE - INTERVAL '7 days' THEN 30
            WHEN MAX(c.fecha) >= CURRENT_DATE - INTERVAL '14 days' THEN 20
            WHEN MAX(c.fecha) >= CURRENT_DATE - INTERVAL '30 days' THEN 10
            ELSE 0
        END +
        CASE get_member_current_tier(m.id)
            WHEN 'pro' THEN 30
            WHEN 'plus' THEN 20
            WHEN 'standard' THEN 10
            ELSE 0
        END
    )::INTEGER AS engagement_score,
    
    -- Risk flags
    CASE 
        WHEN MAX(c.fecha) < CURRENT_DATE - INTERVAL '14 days' THEN 'high_churn_risk'
        WHEN MAX(c.fecha) < CURRENT_DATE - INTERVAL '7 days' THEN 'medium_churn_risk'
        ELSE 'active'
    END AS churn_risk,
    
    NOW() AS last_updated
FROM members m
LEFT JOIN checkins c ON m.id = c.miembro_id
WHERE m.activo = TRUE
GROUP BY m.id, m.nombre, m.telefono, m.activo;

CREATE UNIQUE INDEX ON v_member_engagement_scores(member_id);
CREATE INDEX ON v_member_engagement_scores(engagement_score DESC);
CREATE INDEX ON v_member_engagement_scores(churn_risk);

-- ============================================
-- CLASS PERFORMANCE METRICS (Valley optimization y scheduling)
-- ============================================

CREATE MATERIALIZED VIEW IF NOT EXISTS v_class_performance_metrics AS
SELECT 
    cl.id AS class_id,
    cl.nombre AS class_name,
    cl.tipo_clase,
    cl.instructor,
    cl.horario_inicio,
    EXTRACT(DOW FROM cl.horario_inicio) AS day_of_week,
    EXTRACT(HOUR FROM cl.horario_inicio) AS hour_of_day,
    cl.capacidad_maxima,
    
    -- Attendance últimos 30 días
    COUNT(c.id) AS total_attendance_30d,
    COUNT(DISTINCT DATE(c.fecha)) AS days_held_30d,
    AVG(daily_count.cnt) AS avg_attendance_per_session,
    (AVG(daily_count.cnt)::NUMERIC / NULLIF(cl.capacidad_maxima, 0) * 100)::NUMERIC(5,2) AS avg_occupancy_rate,
    
    -- Tendencias
    CASE 
        WHEN AVG(daily_count.cnt)::NUMERIC / NULLIF(cl.capacidad_maxima, 0) >= 0.8 THEN 'high_demand'
        WHEN AVG(daily_count.cnt)::NUMERIC / NULLIF(cl.capacidad_maxima, 0) >= 0.5 THEN 'normal'
        WHEN AVG(daily_count.cnt)::NUMERIC / NULLIF(cl.capacidad_maxima, 0) >= 0.3 THEN 'low_demand'
        ELSE 'valley_class'
    END AS demand_category,
    
    NOW() AS last_updated
FROM clases cl
LEFT JOIN checkins c ON cl.id = c.clase_id 
    AND c.fecha >= CURRENT_DATE - INTERVAL '30 days'
LEFT JOIN LATERAL (
    SELECT COUNT(*) AS cnt
    FROM checkins c2
    WHERE c2.clase_id = cl.id
    AND c2.fecha >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY DATE(c2.fecha)
) daily_count ON TRUE
GROUP BY cl.id, cl.nombre, cl.tipo_clase, cl.instructor, cl.horario_inicio, cl.capacidad_maxima;

CREATE UNIQUE INDEX ON v_class_performance_metrics(class_id);
CREATE INDEX ON v_class_performance_metrics(demand_category);
CREATE INDEX ON v_class_performance_metrics(avg_occupancy_rate);

-- ============================================
-- INSTRUCTOR STATS (Performance tracking)
-- ============================================

CREATE MATERIALIZED VIEW IF NOT EXISTS v_instructor_stats AS
SELECT 
    cl.instructor,
    COUNT(DISTINCT cl.id) AS total_classes,
    COUNT(c.id) AS total_attendance_30d,
    AVG(daily_attendance.cnt) AS avg_attendance_per_class,
    (COUNT(c.id)::NUMERIC / NULLIF(SUM(cl.capacidad_maxima), 0) * 100)::NUMERIC(5,2) AS overall_occupancy_rate,
    COUNT(DISTINCT c.miembro_id) AS unique_members_30d,
    NOW() AS last_updated
FROM clases cl
LEFT JOIN checkins c ON cl.id = c.clase_id 
    AND c.fecha >= CURRENT_DATE - INTERVAL '30 days'
LEFT JOIN LATERAL (
    SELECT AVG(cnt) AS cnt
    FROM (
        SELECT COUNT(*) AS cnt
        FROM checkins c2
        WHERE c2.clase_id = cl.id
        AND c2.fecha >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY DATE(c2.fecha)
    ) sub
) daily_attendance ON TRUE
GROUP BY cl.instructor;

CREATE UNIQUE INDEX ON v_instructor_stats(instructor);

-- ============================================
-- REFRESH FUNCTIONS
-- ============================================

CREATE OR REPLACE FUNCTION refresh_all_materialized_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY v_daily_kpis;
    REFRESH MATERIALIZED VIEW CONCURRENTLY v_member_engagement_scores;
    REFRESH MATERIALIZED VIEW CONCURRENTLY v_class_performance_metrics;
    REFRESH MATERIALIZED VIEW CONCURRENTLY v_instructor_stats;
    
    RAISE NOTICE 'All materialized views refreshed at %', NOW();
END;
$$ LANGUAGE plpgsql;

COMMENT ON MATERIALIZED VIEW v_daily_kpis IS 'KPIs diarios: check-ins, revenue, occupancy (refresh cada 1h)';
COMMENT ON MATERIALIZED VIEW v_member_engagement_scores IS 'Engagement scores por miembro con churn risk (refresh cada 6h)';
COMMENT ON MATERIALIZED VIEW v_class_performance_metrics IS 'Métricas de performance por clase (refresh cada 12h)';
COMMENT ON MATERIALIZED VIEW v_instructor_stats IS 'Estadísticas de instructores (refresh cada 24h)';
COMMENT ON FUNCTION refresh_all_materialized_views IS 'Refresca todas las vistas materializadas de forma concurrente';
