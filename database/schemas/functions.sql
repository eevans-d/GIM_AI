-- ===================================
-- GIM_AI Database Functions
-- Funciones auxiliares para cálculos y KPIs
-- ===================================

-- ===================================
-- FUNCTION: calculate_morosidad
-- Calcula el porcentaje de morosidad
-- ===================================
CREATE OR REPLACE FUNCTION calculate_morosidad()
RETURNS DECIMAL(5,2) AS $$
DECLARE
    total_active_members INTEGER;
    members_with_debt INTEGER;
    morosidad_percent DECIMAL(5,2);
BEGIN
    -- Count active members
    SELECT COUNT(*) INTO total_active_members
    FROM members
    WHERE is_active = true AND membership_status = 'active';
    
    -- Count members with overdue payments
    SELECT COUNT(DISTINCT member_id) INTO members_with_debt
    FROM payments
    WHERE status = 'pending' AND due_date < CURRENT_DATE;
    
    -- Calculate percentage
    IF total_active_members > 0 THEN
        morosidad_percent := (members_with_debt::DECIMAL / total_active_members) * 100;
    ELSE
        morosidad_percent := 0;
    END IF;
    
    RETURN ROUND(morosidad_percent, 2);
END;
$$ LANGUAGE plpgsql;

-- ===================================
-- FUNCTION: calculate_ocupacion_franja
-- Calcula ocupación de una franja horaria
-- ===================================
CREATE OR REPLACE FUNCTION calculate_ocupacion_franja(
    p_date DATE,
    p_start_time TIME,
    p_end_time TIME
)
RETURNS DECIMAL(5,2) AS $$
DECLARE
    total_capacity INTEGER;
    total_reservations INTEGER;
    ocupacion_percent DECIMAL(5,2);
BEGIN
    -- Sum capacity and reservations for classes in time range
    SELECT 
        COALESCE(SUM(max_capacity), 0),
        COALESCE(SUM(current_reservations), 0)
    INTO total_capacity, total_reservations
    FROM classes
    WHERE scheduled_date = p_date
        AND start_time >= p_start_time
        AND start_time < p_end_time
        AND status = 'scheduled';
    
    -- Calculate percentage
    IF total_capacity > 0 THEN
        ocupacion_percent := (total_reservations::DECIMAL / total_capacity) * 100;
    ELSE
        ocupacion_percent := 0;
    END IF;
    
    RETURN ROUND(ocupacion_percent, 2);
END;
$$ LANGUAGE plpgsql;

-- ===================================
-- FUNCTION: calculate_nps
-- Calcula Net Promoter Score
-- ===================================
CREATE OR REPLACE FUNCTION calculate_nps(
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL,
    p_instructor_id UUID DEFAULT NULL
)
RETURNS DECIMAL(5,2) AS $$
DECLARE
    total_responses INTEGER;
    promoters INTEGER;
    detractors INTEGER;
    nps_score DECIMAL(5,2);
BEGIN
    -- Set default dates if not provided
    p_start_date := COALESCE(p_start_date, CURRENT_DATE - INTERVAL '30 days');
    p_end_date := COALESCE(p_end_date, CURRENT_DATE);
    
    -- Count responses by category
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE rating >= 4),
        COUNT(*) FILTER (WHERE rating <= 2)
    INTO total_responses, promoters, detractors
    FROM feedback
    WHERE submitted_at::DATE BETWEEN p_start_date AND p_end_date
        AND (p_instructor_id IS NULL OR instructor_id = p_instructor_id);
    
    -- Calculate NPS
    IF total_responses > 0 THEN
        nps_score := ((promoters::DECIMAL - detractors::DECIMAL) / total_responses) * 100;
    ELSE
        nps_score := 0;
    END IF;
    
    RETURN ROUND(nps_score, 2);
END;
$$ LANGUAGE plpgsql;

-- ===================================
-- FUNCTION: get_member_debt_status
-- Obtiene estado de deuda de un socio
-- ===================================
CREATE OR REPLACE FUNCTION get_member_debt_status(p_member_id UUID)
RETURNS TABLE(
    has_debt BOOLEAN,
    debt_amount DECIMAL(10,2),
    days_overdue INTEGER,
    last_payment_date DATE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        CASE WHEN SUM(p.amount) > 0 THEN true ELSE false END as has_debt,
        COALESCE(SUM(p.amount), 0) as debt_amount,
        COALESCE(MAX(p.days_overdue), 0) as days_overdue,
        m.last_payment_date
    FROM members m
    LEFT JOIN payments p ON m.id = p.member_id 
        AND p.status = 'pending' 
        AND p.due_date < CURRENT_DATE
    WHERE m.id = p_member_id
    GROUP BY m.id, m.last_payment_date;
END;
$$ LANGUAGE plpgsql;

-- ===================================
-- FUNCTION: get_class_occupancy_rate
-- Obtiene tasa de ocupación de una clase
-- ===================================
CREATE OR REPLACE FUNCTION get_class_occupancy_rate(p_class_id UUID)
RETURNS DECIMAL(5,2) AS $$
DECLARE
    capacity INTEGER;
    reservations INTEGER;
    rate DECIMAL(5,2);
BEGIN
    SELECT max_capacity, current_reservations
    INTO capacity, reservations
    FROM classes
    WHERE id = p_class_id;
    
    IF capacity > 0 THEN
        rate := (reservations::DECIMAL / capacity) * 100;
    ELSE
        rate := 0;
    END IF;
    
    RETURN ROUND(rate, 2);
END;
$$ LANGUAGE plpgsql;

-- ===================================
-- FUNCTION: get_instructor_performance
-- Obtiene métricas de rendimiento de profesor
-- ===================================
CREATE OR REPLACE FUNCTION get_instructor_performance(
    p_instructor_id UUID,
    p_days INTEGER DEFAULT 30
)
RETURNS TABLE(
    total_classes INTEGER,
    avg_satisfaction DECIMAL(3,2),
    avg_attendance_rate DECIMAL(5,2),
    total_replacements INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(DISTINCT c.id)::INTEGER as total_classes,
        ROUND(AVG(f.rating), 2) as avg_satisfaction,
        ROUND(AVG(c.actual_attendance::DECIMAL / NULLIF(c.max_capacity, 0)) * 100, 2) as avg_attendance_rate,
        (SELECT COUNT(*) FROM replacements_log 
         WHERE replacement_instructor_id = p_instructor_id 
         AND requested_at >= CURRENT_DATE - p_days) as total_replacements
    FROM classes c
    LEFT JOIN feedback f ON c.id = f.class_id
    WHERE c.instructor_id = p_instructor_id
        AND c.scheduled_date >= CURRENT_DATE - p_days
        AND c.status = 'completed';
END;
$$ LANGUAGE plpgsql;

-- ===================================
-- FUNCTION: detect_valley_hours
-- Detecta franjas horarias valle (< 50% ocupación)
-- ===================================
CREATE OR REPLACE FUNCTION detect_valley_hours(
    p_weeks INTEGER DEFAULT 3,
    p_threshold DECIMAL DEFAULT 50.0
)
RETURNS TABLE(
    day_of_week INTEGER,
    time_slot TIME,
    avg_occupancy DECIMAL(5,2),
    class_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        EXTRACT(DOW FROM scheduled_date)::INTEGER as day_of_week,
        start_time as time_slot,
        ROUND(AVG((current_reservations::DECIMAL / NULLIF(max_capacity, 0)) * 100), 2) as avg_occupancy,
        COUNT(*)::INTEGER as class_count
    FROM classes
    WHERE scheduled_date >= CURRENT_DATE - (p_weeks * 7)
        AND scheduled_date < CURRENT_DATE
        AND status IN ('scheduled', 'completed')
    GROUP BY EXTRACT(DOW FROM scheduled_date), start_time
    HAVING AVG((current_reservations::DECIMAL / NULLIF(max_capacity, 0)) * 100) < p_threshold
    ORDER BY avg_occupancy ASC, day_of_week, time_slot;
END;
$$ LANGUAGE plpgsql;

-- ===================================
-- FUNCTION: get_waitlist_for_class
-- Obtiene lista de espera ordenada de una clase
-- ===================================
CREATE OR REPLACE FUNCTION get_waitlist_for_class(p_class_id UUID)
RETURNS TABLE(
    member_id UUID,
    member_name VARCHAR,
    phone VARCHAR,
    position INTEGER,
    reserved_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.member_id,
        (m.first_name || ' ' || m.last_name) as member_name,
        m.phone,
        r.position_in_waitlist as position,
        r.reserved_at
    FROM reservations r
    JOIN members m ON r.member_id = m.id
    WHERE r.class_id = p_class_id
        AND r.reservation_type = 'waitlist'
        AND r.status = 'confirmed'
    ORDER BY r.position_in_waitlist ASC;
END;
$$ LANGUAGE plpgsql;

-- ===================================
-- FUNCTION: calculate_collection_effectiveness
-- Calcula efectividad de cobranza por método
-- ===================================
CREATE OR REPLACE FUNCTION calculate_collection_effectiveness(
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL
)
RETURNS TABLE(
    collection_method VARCHAR,
    total_attempts INTEGER,
    successful_collections INTEGER,
    effectiveness_rate DECIMAL(5,2),
    avg_days_to_collect DECIMAL(5,2)
) AS $$
BEGIN
    p_start_date := COALESCE(p_start_date, CURRENT_DATE - INTERVAL '30 days');
    p_end_date := COALESCE(p_end_date, CURRENT_DATE);
    
    RETURN QUERY
    SELECT 
        p.collection_method,
        COUNT(*)::INTEGER as total_attempts,
        COUNT(*) FILTER (WHERE p.status = 'paid')::INTEGER as successful_collections,
        ROUND((COUNT(*) FILTER (WHERE p.status = 'paid')::DECIMAL / COUNT(*)) * 100, 2) as effectiveness_rate,
        ROUND(AVG(CASE 
            WHEN p.status = 'paid' THEN p.payment_date - p.due_date 
            ELSE NULL 
        END), 2) as avg_days_to_collect
    FROM payments p
    WHERE p.last_collection_attempt_at::DATE BETWEEN p_start_date AND p_end_date
        AND p.collection_method IS NOT NULL
    GROUP BY p.collection_method
    ORDER BY effectiveness_rate DESC;
END;
$$ LANGUAGE plpgsql;

-- ===================================
-- FUNCTION: get_member_activity_score
-- Calcula score de actividad de un socio
-- ===================================
CREATE OR REPLACE FUNCTION get_member_activity_score(
    p_member_id UUID,
    p_days INTEGER DEFAULT 30
)
RETURNS DECIMAL(5,2) AS $$
DECLARE
    checkin_count INTEGER;
    reservation_count INTEGER;
    feedback_count INTEGER;
    score DECIMAL(5,2);
BEGIN
    -- Count activity in last N days
    SELECT 
        COUNT(DISTINCT c.id),
        COUNT(DISTINCT r.id),
        COUNT(DISTINCT f.id)
    INTO checkin_count, reservation_count, feedback_count
    FROM members m
    LEFT JOIN checkins c ON m.id = c.member_id 
        AND c.checkin_time >= CURRENT_DATE - p_days
    LEFT JOIN reservations r ON m.id = r.member_id 
        AND r.reserved_at >= CURRENT_DATE - p_days
    LEFT JOIN feedback f ON m.id = f.member_id 
        AND f.submitted_at >= CURRENT_DATE - p_days
    WHERE m.id = p_member_id;
    
    -- Calculate weighted score (0-100)
    score := LEAST(
        (checkin_count * 3) +      -- 3 points per check-in
        (reservation_count * 2) +  -- 2 points per reservation
        (feedback_count * 5),      -- 5 points per feedback
        100
    );
    
    RETURN score;
END;
$$ LANGUAGE plpgsql;

-- ===================================
-- FUNCTION: suggest_replacement_instructors
-- Sugiere instructores para reemplazo
-- ===================================
CREATE OR REPLACE FUNCTION suggest_replacement_instructors(
    p_class_id UUID,
    p_limit INTEGER DEFAULT 5
)
RETURNS TABLE(
    instructor_id UUID,
    instructor_name VARCHAR,
    phone VARCHAR,
    has_required_skills BOOLEAN,
    avg_satisfaction DECIMAL(3,2),
    classes_this_week INTEGER,
    priority_score INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH class_info AS (
        SELECT class_type, required_certifications, scheduled_date, start_time
        FROM classes WHERE id = p_class_id
    )
    SELECT 
        i.id as instructor_id,
        (i.first_name || ' ' || i.last_name) as instructor_name,
        i.phone,
        CASE 
            WHEN ci.required_certifications <@ i.specialties THEN true 
            ELSE false 
        END as has_required_skills,
        i.average_satisfaction,
        (SELECT COUNT(*) FROM classes c2 
         WHERE c2.instructor_id = i.id 
         AND c2.scheduled_date >= DATE_TRUNC('week', ci.scheduled_date)
         AND c2.scheduled_date < DATE_TRUNC('week', ci.scheduled_date) + INTERVAL '7 days'
        )::INTEGER as classes_this_week,
        -- Priority score: skills (40) + satisfaction (30) + availability (30)
        (
            CASE WHEN ci.required_certifications <@ i.specialties THEN 40 ELSE 0 END +
            (i.average_satisfaction * 6)::INTEGER +
            (30 - LEAST((SELECT COUNT(*) FROM classes c3 
                        WHERE c3.instructor_id = i.id 
                        AND c3.scheduled_date = ci.scheduled_date), 30))
        )::INTEGER as priority_score
    FROM instructors i, class_info ci
    WHERE i.is_active = true
        AND i.can_replace = true
        AND i.id NOT IN (
            -- Exclude instructor already assigned to class at same time
            SELECT instructor_id FROM classes 
            WHERE scheduled_date = ci.scheduled_date 
            AND start_time = ci.start_time
            AND status = 'scheduled'
        )
    ORDER BY priority_score DESC, classes_this_week ASC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ===================================
-- Add comments to functions
-- ===================================
COMMENT ON FUNCTION calculate_morosidad() IS 'Calcula porcentaje de morosidad actual';
COMMENT ON FUNCTION calculate_ocupacion_franja(DATE, TIME, TIME) IS 'Calcula ocupación en franja horaria';
COMMENT ON FUNCTION calculate_nps(DATE, DATE, UUID) IS 'Calcula Net Promoter Score';
COMMENT ON FUNCTION get_member_debt_status(UUID) IS 'Obtiene estado de deuda de un socio';
COMMENT ON FUNCTION get_class_occupancy_rate(UUID) IS 'Obtiene tasa de ocupación de clase';
COMMENT ON FUNCTION get_instructor_performance(UUID, INTEGER) IS 'Métricas de rendimiento de profesor';
COMMENT ON FUNCTION detect_valley_hours(INTEGER, DECIMAL) IS 'Detecta franjas horarias valle';
COMMENT ON FUNCTION get_waitlist_for_class(UUID) IS 'Obtiene lista de espera de clase';
COMMENT ON FUNCTION calculate_collection_effectiveness(DATE, DATE) IS 'Efectividad de cobranza por método';
COMMENT ON FUNCTION get_member_activity_score(UUID, INTEGER) IS 'Score de actividad de socio';
COMMENT ON FUNCTION suggest_replacement_instructors(UUID, INTEGER) IS 'Sugiere instructores para reemplazo';
