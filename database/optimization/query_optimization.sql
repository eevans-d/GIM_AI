-- PROMPT 20: DATABASE OPTIMIZATION - QUERY OPTIMIZATION
-- Queries optimizadas reemplazando N+1 queries y mejorando performance

-- ============================================
-- OPTIMIZED: Member Dashboard (1 query vs N+1)
-- ============================================

CREATE OR REPLACE FUNCTION get_member_dashboard(p_member_id UUID)
RETURNS JSON AS $$
DECLARE
    v_result JSON;
BEGIN
    WITH member_data AS (
        SELECT 
            m.id,
            m.nombre,
            m.telefono,
            m.email,
            m.activo,
            get_member_current_tier(m.id) AS current_tier
        FROM members m
        WHERE m.id = p_member_id
    ),
    recent_checkins AS (
        SELECT 
            c.id,
            c.fecha,
            cl.nombre AS class_name,
            cl.tipo_clase,
            cl.instructor
        FROM checkins c
        JOIN clases cl ON c.clase_id = cl.id
        WHERE c.miembro_id = p_member_id
        AND c.fecha >= CURRENT_DATE - INTERVAL '30 days'
        ORDER BY c.fecha DESC
        LIMIT 10
    ),
    upcoming_reservations AS (
        SELECT 
            r.id,
            cl.nombre AS class_name,
            cl.horario_inicio,
            cl.instructor
        FROM reservas r
        JOIN clases cl ON r.clase_id = cl.id
        WHERE r.miembro_id = p_member_id
        AND r.status = 'confirmed'
        AND cl.horario_inicio >= NOW()
        ORDER BY cl.horario_inicio
        LIMIT 5
    ),
    stats AS (
        SELECT 
            COUNT(*) FILTER (WHERE c.fecha >= CURRENT_DATE - INTERVAL '30 days') AS checkins_30d,
            COUNT(*) FILTER (WHERE c.fecha >= CURRENT_DATE - INTERVAL '7 days') AS checkins_7d,
            MAX(c.fecha) AS last_checkin
        FROM checkins c
        WHERE c.miembro_id = p_member_id
    )
    SELECT JSON_BUILD_OBJECT(
        'member', (SELECT ROW_TO_JSON(member_data.*) FROM member_data),
        'recent_checkins', (SELECT JSON_AGG(ROW_TO_JSON(recent_checkins.*)) FROM recent_checkins),
        'upcoming_reservations', (SELECT JSON_AGG(ROW_TO_JSON(upcoming_reservations.*)) FROM upcoming_reservations),
        'stats', (SELECT ROW_TO_JSON(stats.*) FROM stats)
    ) INTO v_result;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_member_dashboard IS 'Dashboard completo en 1 query con CTEs (antes N+1)';

-- ============================================
-- OPTIMIZED: Class Availability (con window functions)
-- ============================================

CREATE OR REPLACE FUNCTION get_classes_availability(p_start_date DATE, p_end_date DATE)
RETURNS TABLE(
    class_id UUID,
    class_name VARCHAR,
    tipo_clase VARCHAR,
    instructor VARCHAR,
    horario_inicio TIMESTAMP,
    capacidad_maxima INTEGER,
    current_attendance BIGINT,
    available_spots INTEGER,
    occupancy_rate NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    WITH class_attendance AS (
        SELECT 
            cl.id,
            cl.nombre,
            cl.tipo_clase,
            cl.instructor,
            cl.horario_inicio,
            cl.capacidad_maxima,
            COUNT(c.id) AS attendance_count
        FROM clases cl
        LEFT JOIN checkins c ON cl.id = c.clase_id 
            AND DATE(c.fecha) = DATE(cl.horario_inicio)
        WHERE cl.horario_inicio >= p_start_date
        AND cl.horario_inicio <= p_end_date
        GROUP BY cl.id, cl.nombre, cl.tipo_clase, cl.instructor, cl.horario_inicio, cl.capacidad_maxima
    )
    SELECT 
        ca.id,
        ca.nombre,
        ca.tipo_clase,
        ca.instructor,
        ca.horario_inicio,
        ca.capacidad_maxima,
        ca.attendance_count,
        (ca.capacidad_maxima - ca.attendance_count)::INTEGER AS available_spots,
        (ca.attendance_count::NUMERIC / NULLIF(ca.capacidad_maxima, 0) * 100)::NUMERIC(5,2) AS occupancy_rate
    FROM class_attendance ca
    ORDER BY ca.horario_inicio;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_classes_availability IS 'Availability de todas las clases en 1 query (antes N queries)';

-- ============================================
-- OPTIMIZED: Revenue Report (window functions + CTEs)
-- ============================================

CREATE OR REPLACE FUNCTION get_revenue_report(p_start_date DATE, p_end_date DATE)
RETURNS TABLE(
    payment_date DATE,
    daily_revenue NUMERIC,
    cumulative_revenue NUMERIC,
    payment_count BIGINT,
    avg_payment NUMERIC,
    tier_breakdown JSON
) AS $$
BEGIN
    RETURN QUERY
    WITH daily_payments AS (
        SELECT 
            DATE(p.payment_date) AS pdate,
            SUM(p.amount) AS revenue,
            COUNT(*) AS pcount,
            AVG(p.amount) AS avg_amt,
            JSON_OBJECT_AGG(
                COALESCE(ts.tier_name, 'standard'), 
                COUNT(*)
            ) AS tier_data
        FROM payments p
        LEFT JOIN member_tier_subscriptions ts ON p.member_id = ts.member_id
            AND ts.status = 'active'
        WHERE p.payment_date >= p_start_date
        AND p.payment_date <= p_end_date
        AND p.payment_status = 'completed'
        GROUP BY DATE(p.payment_date)
    )
    SELECT 
        dp.pdate,
        dp.revenue,
        SUM(dp.revenue) OVER (ORDER BY dp.pdate ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS cumulative,
        dp.pcount,
        dp.avg_amt,
        dp.tier_data
    FROM daily_payments dp
    ORDER BY dp.pdate;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_revenue_report IS 'Reporte de revenue con acumulado y breakdown por tier (window functions)';

-- ============================================
-- OPTIMIZED: Member Attendance Patterns (analytical query)
-- ============================================

CREATE OR REPLACE FUNCTION analyze_member_attendance_patterns(p_member_id UUID)
RETURNS JSON AS $$
DECLARE
    v_result JSON;
BEGIN
    WITH attendance_by_day AS (
        SELECT 
            EXTRACT(DOW FROM c.fecha) AS day_of_week,
            TO_CHAR(c.fecha, 'Day') AS day_name,
            COUNT(*) AS checkin_count
        FROM checkins c
        WHERE c.miembro_id = p_member_id
        AND c.fecha >= CURRENT_DATE - INTERVAL '90 days'
        GROUP BY EXTRACT(DOW FROM c.fecha), TO_CHAR(c.fecha, 'Day')
    ),
    attendance_by_hour AS (
        SELECT 
            EXTRACT(HOUR FROM c.fecha) AS hour,
            COUNT(*) AS checkin_count
        FROM checkins c
        WHERE c.miembro_id = p_member_id
        AND c.fecha >= CURRENT_DATE - INTERVAL '90 days'
        GROUP BY EXTRACT(HOUR FROM c.fecha)
    ),
    favorite_classes AS (
        SELECT 
            cl.tipo_clase,
            cl.instructor,
            COUNT(*) AS attendance_count
        FROM checkins c
        JOIN clases cl ON c.clase_id = cl.id
        WHERE c.miembro_id = p_member_id
        AND c.fecha >= CURRENT_DATE - INTERVAL '90 days'
        GROUP BY cl.tipo_clase, cl.instructor
        ORDER BY COUNT(*) DESC
        LIMIT 5
    )
    SELECT JSON_BUILD_OBJECT(
        'by_day_of_week', (SELECT JSON_AGG(ROW_TO_JSON(attendance_by_day.*) ORDER BY day_of_week) FROM attendance_by_day),
        'by_hour', (SELECT JSON_AGG(ROW_TO_JSON(attendance_by_hour.*) ORDER BY hour) FROM attendance_by_hour),
        'favorite_classes', (SELECT JSON_AGG(ROW_TO_JSON(favorite_classes.*)) FROM favorite_classes)
    ) INTO v_result;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION analyze_member_attendance_patterns IS 'Análisis de patrones de asistencia con CTEs (antes múltiples queries)';

-- ============================================
-- OPTIMIZED: Class Recommendations (complex scoring)
-- ============================================

CREATE OR REPLACE FUNCTION get_class_recommendations(
    p_member_id UUID,
    p_limit INTEGER DEFAULT 5
)
RETURNS TABLE(
    class_id UUID,
    class_name VARCHAR,
    tipo_clase VARCHAR,
    horario_inicio TIMESTAMP,
    recommendation_score INTEGER,
    reason TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH member_preferences AS (
        SELECT 
            c.miembro_id,
            cl.tipo_clase,
            EXTRACT(DOW FROM c.fecha) AS preferred_day,
            EXTRACT(HOUR FROM c.fecha) AS preferred_hour,
            COUNT(*) AS frequency
        FROM checkins c
        JOIN clases cl ON c.clase_id = cl.id
        WHERE c.miembro_id = p_member_id
        AND c.fecha >= CURRENT_DATE - INTERVAL '60 days'
        GROUP BY c.miembro_id, cl.tipo_clase, EXTRACT(DOW FROM c.fecha), EXTRACT(HOUR FROM c.fecha)
    ),
    scored_classes AS (
        SELECT 
            cl.id,
            cl.nombre,
            cl.tipo_clase,
            cl.horario_inicio,
            (
                -- Tipo de clase preferido (40 puntos)
                CASE WHEN mp.tipo_clase = cl.tipo_clase THEN 40 ELSE 0 END +
                -- Día preferido (30 puntos)
                CASE WHEN mp.preferred_day = EXTRACT(DOW FROM cl.horario_inicio) THEN 30 ELSE 0 END +
                -- Hora preferida (20 puntos)
                CASE WHEN mp.preferred_hour = EXTRACT(HOUR FROM cl.horario_inicio) THEN 20 ELSE 0 END +
                -- Disponibilidad (10 puntos)
                CASE WHEN (cl.capacidad_maxima - COALESCE(attendance.cnt, 0)) > 0 THEN 10 ELSE 0 END
            ) AS score,
            CASE 
                WHEN mp.tipo_clase = cl.tipo_clase THEN 'Tu clase favorita'
                WHEN mp.preferred_day = EXTRACT(DOW FROM cl.horario_inicio) THEN 'Tu día preferido'
                WHEN mp.preferred_hour = EXTRACT(HOUR FROM cl.horario_inicio) THEN 'Tu hora preferida'
                ELSE 'Nueva experiencia'
            END AS reason_text
        FROM clases cl
        CROSS JOIN LATERAL (
            SELECT * FROM member_preferences 
            ORDER BY frequency DESC 
            LIMIT 1
        ) mp
        LEFT JOIN LATERAL (
            SELECT COUNT(*) AS cnt
            FROM checkins c2
            WHERE c2.clase_id = cl.id
            AND DATE(c2.fecha) = DATE(cl.horario_inicio)
        ) attendance ON TRUE
        WHERE cl.horario_inicio >= NOW()
        AND cl.horario_inicio <= NOW() + INTERVAL '7 days'
    )
    SELECT 
        sc.id,
        sc.nombre,
        sc.tipo_clase,
        sc.horario_inicio,
        sc.score,
        sc.reason_text
    FROM scored_classes sc
    ORDER BY sc.score DESC, sc.horario_inicio
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_class_recommendations IS 'Recomendaciones personalizadas con scoring (ML-ready)';

-- ============================================
-- PERFORMANCE STATISTICS
-- ============================================

CREATE OR REPLACE FUNCTION analyze_query_performance()
RETURNS TABLE(
    query_type TEXT,
    avg_exec_time_ms NUMERIC,
    total_calls BIGINT,
    rows_returned BIGINT
) AS $$
BEGIN
    -- Requiere pg_stat_statements extension
    -- CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
    
    RETURN QUERY
    SELECT 
        'Optimized Queries' AS qtype,
        0::NUMERIC AS avg_time,
        0::BIGINT AS calls,
        0::BIGINT AS rows;
    
    RAISE NOTICE 'Enable pg_stat_statements for query performance tracking';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION analyze_query_performance IS 'Análisis de performance de queries (requiere pg_stat_statements)';
