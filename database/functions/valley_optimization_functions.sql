-- ============================================================================
-- PROMPT 11: VALLEY OPTIMIZATION - DATABASE FUNCTIONS
-- ============================================================================
-- Funciones SQL para detectar, analizar y gestionar clases con baja ocupación
-- ============================================================================

-- ============================================================================
-- FUNCIÓN 1: detect_valley_classes
-- Detecta clases con <50% ocupación en últimas 3 semanas
-- ============================================================================
CREATE OR REPLACE FUNCTION detect_valley_classes(
    p_weeks INTEGER DEFAULT 3,
    p_threshold DECIMAL DEFAULT 50.0,
    p_min_classes INTEGER DEFAULT 9
)
RETURNS TABLE (
    clase_id UUID,
    clase_nombre VARCHAR,
    avg_occupancy DECIMAL,
    week1_occ DECIMAL,
    week2_occ DECIMAL,
    week3_occ DECIMAL,
    total_classes INTEGER,
    is_new_detection BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    WITH weekly_occupancy AS (
        SELECT 
            ch.clase_id,
            FLOOR((CURRENT_DATE - ch.date) / 7)::INTEGER AS week_offset,
            AVG(ch.occupancy_rate) AS avg_occupancy,
            COUNT(*) AS classes_count
        FROM class_occupancy_history ch
        WHERE ch.date >= CURRENT_DATE - (p_weeks * 7)
        AND ch.class_held = TRUE
        GROUP BY ch.clase_id, week_offset
    ),
    class_analysis AS (
        SELECT 
            c.id,
            c.nombre,
            AVG(wo.avg_occupancy) AS overall_avg,
            MAX(CASE WHEN wo.week_offset = 0 THEN wo.avg_occupancy END) AS week1,
            MAX(CASE WHEN wo.week_offset = 1 THEN wo.avg_occupancy END) AS week2,
            MAX(CASE WHEN wo.week_offset = 2 THEN wo.avg_occupancy END) AS week3,
            SUM(wo.classes_count)::INTEGER AS total_classes,
            -- Verificar si ya existe detección activa
            EXISTS(
                SELECT 1 FROM valley_detections vd 
                WHERE vd.clase_id = c.id 
                AND vd.status NOT IN ('resolved', 'paused')
            ) AS has_active_detection
        FROM clases c
        JOIN weekly_occupancy wo ON c.id = wo.clase_id
        WHERE c.activo = TRUE
        GROUP BY c.id, c.nombre
        HAVING AVG(wo.avg_occupancy) < p_threshold
        AND SUM(wo.classes_count) >= p_min_classes
    )
    SELECT 
        ca.id,
        ca.nombre,
        ca.overall_avg,
        ca.week1,
        ca.week2,
        ca.week3,
        ca.total_classes,
        NOT ca.has_active_detection AS is_new_detection
    FROM class_analysis ca
    ORDER BY ca.overall_avg ASC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION detect_valley_classes IS 
'Detecta clases con ocupación < threshold en últimas N semanas';

-- ============================================================================
-- FUNCIÓN 2: create_valley_detection
-- Crea un registro de detección valle
-- ============================================================================
CREATE OR REPLACE FUNCTION create_valley_detection(
    p_clase_id UUID,
    p_avg_occupancy DECIMAL,
    p_week1 DECIMAL,
    p_week2 DECIMAL,
    p_week3 DECIMAL,
    p_total_classes INTEGER
)
RETURNS UUID AS $$
DECLARE
    v_detection_id UUID;
    v_capacity INTEGER;
    v_avg_attendance DECIMAL;
BEGIN
    -- Obtener capacidad de la clase
    SELECT capacidad_maxima INTO v_capacity
    FROM clases
    WHERE id = p_clase_id;
    
    -- Calcular asistencia promedio
    v_avg_attendance := (p_avg_occupancy / 100.0) * v_capacity;
    
    -- Crear detección
    INSERT INTO valley_detections (
        clase_id,
        detection_date,
        weeks_analyzed,
        avg_occupancy_rate,
        avg_attendance,
        capacity,
        total_classes_held,
        week1_occupancy,
        week2_occupancy,
        week3_occupancy,
        status,
        current_strategy_level
    ) VALUES (
        p_clase_id,
        CURRENT_DATE,
        3,
        p_avg_occupancy,
        v_avg_attendance,
        v_capacity,
        p_total_classes,
        p_week1,
        p_week2,
        p_week3,
        'detected',
        1
    )
    RETURNING id INTO v_detection_id;
    
    RETURN v_detection_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_valley_detection IS 
'Crea registro de detección de clase valle';

-- ============================================================================
-- FUNCIÓN 3: get_promotion_target_members
-- Identifica miembros elegibles para promoción valle
-- ============================================================================
CREATE OR REPLACE FUNCTION get_promotion_target_members(
    p_clase_id UUID,
    p_segment VARCHAR DEFAULT 'never_attended'
)
RETURNS TABLE (
    member_id UUID,
    member_nombre VARCHAR,
    member_telefono VARCHAR,
    member_email VARCHAR,
    last_checkin_date DATE,
    total_checkins INTEGER,
    preferred_time VARCHAR,
    eligibility_score INTEGER
) AS $$
DECLARE
    v_clase_horario TIME;
    v_clase_dia VARCHAR;
BEGIN
    -- Obtener horario de la clase objetivo
    SELECT horario::TIME INTO v_clase_horario
    FROM clases
    WHERE id = p_clase_id;
    
    RETURN QUERY
    WITH member_checkin_stats AS (
        SELECT 
            m.id,
            m.nombre,
            m.telefono,
            m.email,
            MAX(ch.fecha) AS last_checkin,
            COUNT(DISTINCT ch.id) AS total_checkins,
            -- Calcular horario preferido
            CASE 
                WHEN COUNT(*) FILTER (WHERE EXTRACT(HOUR FROM cl.horario::TIME) BETWEEN 6 AND 11) > 
                     COUNT(*) FILTER (WHERE EXTRACT(HOUR FROM cl.horario::TIME) BETWEEN 12 AND 23)
                THEN 'morning'
                WHEN COUNT(*) FILTER (WHERE EXTRACT(HOUR FROM cl.horario::TIME) BETWEEN 18 AND 21) > 
                     COUNT(*) / 2
                THEN 'evening'
                ELSE 'afternoon'
            END AS preferred_time,
            -- Nunca ha asistido a esta clase específica
            NOT EXISTS(
                SELECT 1 FROM checkins ch2
                WHERE ch2.member_id = m.id
                AND ch2.clase_id = p_clase_id
            ) AS never_attended_target,
            -- Activo (check-in en últimos 30 días)
            MAX(ch.fecha) >= CURRENT_DATE - INTERVAL '30 days' AS is_active
        FROM members m
        LEFT JOIN checkins ch ON m.id = ch.member_id
        LEFT JOIN clases cl ON ch.clase_id = cl.id
        WHERE m.activo = TRUE
        AND m.consentimiento_whatsapp = TRUE
        GROUP BY m.id, m.nombre, m.telefono, m.email
    )
    SELECT 
        mcs.id,
        mcs.nombre,
        mcs.telefono,
        mcs.email,
        mcs.last_checkin,
        mcs.total_checkins,
        mcs.preferred_time,
        -- Score de elegibilidad (0-100)
        (
            CASE WHEN mcs.never_attended_target THEN 40 ELSE 0 END +
            CASE WHEN mcs.is_active THEN 30 ELSE 10 END +
            CASE WHEN mcs.total_checkins >= 12 THEN 20 -- Miembro comprometido
                 WHEN mcs.total_checkins >= 4 THEN 10
                 ELSE 5 END +
            CASE WHEN mcs.preferred_time != 
                      CASE 
                          WHEN EXTRACT(HOUR FROM v_clase_horario) BETWEEN 6 AND 11 THEN 'morning'
                          WHEN EXTRACT(HOUR FROM v_clase_horario) BETWEEN 18 AND 21 THEN 'evening'
                          ELSE 'afternoon'
                      END 
            THEN 10 ELSE 0 END -- Bonus si es horario nuevo para ellos
        ) AS eligibility_score
    FROM member_checkin_stats mcs
    WHERE (p_segment = 'never_attended' AND mcs.never_attended_target = TRUE)
       OR (p_segment = 'active_members' AND mcs.is_active = TRUE)
       OR p_segment = 'all'
    ORDER BY eligibility_score DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_promotion_target_members IS 
'Identifica miembros elegibles para promoción valle con scoring';

-- ============================================================================
-- FUNCIÓN 4: create_valley_promotion
-- Crea una campaña de promoción valle
-- ============================================================================
CREATE OR REPLACE FUNCTION create_valley_promotion(
    p_detection_id UUID,
    p_clase_id UUID,
    p_promotion_name VARCHAR,
    p_discount_percentage INTEGER DEFAULT 20,
    p_duration_months INTEGER DEFAULT 1,
    p_target_segment VARCHAR DEFAULT 'never_attended'
)
RETURNS UUID AS $$
DECLARE
    v_promotion_id UUID;
    v_eligible_count INTEGER;
    v_current_occupancy DECIMAL;
BEGIN
    -- Contar miembros elegibles
    SELECT COUNT(*) INTO v_eligible_count
    FROM get_promotion_target_members(p_clase_id, p_target_segment);
    
    -- Obtener ocupación actual
    SELECT avg_occupancy_rate INTO v_current_occupancy
    FROM valley_detections
    WHERE id = p_detection_id;
    
    -- Crear promoción
    INSERT INTO valley_promotions (
        detection_id,
        clase_id,
        promotion_name,
        discount_percentage,
        duration_months,
        target_segment,
        eligible_members_count,
        occupancy_before,
        status,
        scheduled_send_date,
        active_from,
        active_until
    ) VALUES (
        p_detection_id,
        p_clase_id,
        p_promotion_name,
        p_discount_percentage,
        p_duration_months,
        p_target_segment,
        v_eligible_count,
        v_current_occupancy,
        'draft',
        CURRENT_DATE + INTERVAL '1 day',
        CURRENT_DATE + INTERVAL '1 day',
        CURRENT_DATE + INTERVAL '1 month' * p_duration_months
    )
    RETURNING id INTO v_promotion_id;
    
    -- Crear registros de destinatarios
    INSERT INTO valley_promotion_recipients (
        promotion_id,
        member_id,
        status
    )
    SELECT 
        v_promotion_id,
        member_id,
        'pending'
    FROM get_promotion_target_members(p_clase_id, p_target_segment)
    WHERE eligibility_score >= 50; -- Solo los más elegibles
    
    -- Actualizar conteo de mensajes a enviar
    UPDATE valley_promotions
    SET messages_sent = (
        SELECT COUNT(*) 
        FROM valley_promotion_recipients 
        WHERE promotion_id = v_promotion_id
    )
    WHERE id = v_promotion_id;
    
    RETURN v_promotion_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_valley_promotion IS 
'Crea campaña de promoción valle con destinatarios';

-- ============================================================================
-- FUNCIÓN 5: record_class_occupancy_daily
-- Registra ocupación diaria de una clase (llamar desde cron)
-- ============================================================================
CREATE OR REPLACE FUNCTION record_class_occupancy_daily(
    p_date DATE DEFAULT CURRENT_DATE
)
RETURNS INTEGER AS $$
DECLARE
    v_records_created INTEGER := 0;
    v_clase RECORD;
BEGIN
    FOR v_clase IN 
        SELECT 
            c.id AS clase_id,
            c.capacidad_maxima,
            COUNT(ch.id) AS attendance,
            (COUNT(ch.id)::DECIMAL / NULLIF(c.capacidad_maxima, 0) * 100) AS occupancy_rate,
            EXISTS(SELECT 1 FROM checkins WHERE clase_id = c.id AND fecha::DATE = p_date) AS was_held
        FROM clases c
        LEFT JOIN checkins ch ON c.id = ch.clase_id 
            AND ch.fecha::DATE = p_date
        WHERE c.activo = TRUE
        GROUP BY c.id, c.capacidad_maxima
    LOOP
        INSERT INTO class_occupancy_history (
            clase_id,
            date,
            scheduled_capacity,
            actual_attendance,
            occupancy_rate,
            day_of_week,
            week_number,
            class_held
        ) VALUES (
            v_clase.clase_id,
            p_date,
            v_clase.capacidad_maxima,
            COALESCE(v_clase.attendance, 0),
            COALESCE(v_clase.occupancy_rate, 0),
            EXTRACT(DOW FROM p_date)::INTEGER,
            EXTRACT(WEEK FROM p_date)::INTEGER,
            v_clase.was_held
        )
        ON CONFLICT (clase_id, date) DO UPDATE
        SET actual_attendance = EXCLUDED.actual_attendance,
            occupancy_rate = EXCLUDED.occupancy_rate,
            class_held = EXCLUDED.class_held;
        
        v_records_created := v_records_created + 1;
    END LOOP;
    
    RETURN v_records_created;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION record_class_occupancy_daily IS 
'Registra ocupación diaria de todas las clases - ejecutar cada noche';

-- ============================================================================
-- FUNCIÓN 6: escalate_valley_strategy
-- Escala estrategia al siguiente nivel si no hay mejora
-- ============================================================================
CREATE OR REPLACE FUNCTION escalate_valley_strategy(
    p_detection_id UUID,
    p_reason TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    v_current_level INTEGER;
    v_clase_id UUID;
    v_current_occupancy DECIMAL;
BEGIN
    -- Obtener nivel actual y clase
    SELECT current_strategy_level, clase_id
    INTO v_current_level, v_clase_id
    FROM valley_detections
    WHERE id = p_detection_id;
    
    -- No escalar si ya está en nivel 4 (pausa)
    IF v_current_level >= 4 THEN
        RETURN FALSE;
    END IF;
    
    -- Obtener ocupación actual
    SELECT AVG(occupancy_rate) INTO v_current_occupancy
    FROM class_occupancy_history
    WHERE clase_id = v_clase_id
    AND date >= CURRENT_DATE - INTERVAL '7 days';
    
    -- Registrar escalamiento
    INSERT INTO valley_strategy_escalations (
        detection_id,
        clase_id,
        previous_level,
        new_level,
        strategy_name,
        escalation_reason,
        occupancy_at_escalation,
        weeks_since_detection
    ) VALUES (
        p_detection_id,
        v_clase_id,
        v_current_level,
        v_current_level + 1,
        CASE v_current_level + 1
            WHEN 2 THEN 'Cambio de Formato'
            WHEN 3 THEN 'Reubicación Horaria'
            WHEN 4 THEN 'Pausa Temporal'
        END,
        p_reason,
        v_current_occupancy,
        EXTRACT(DAYS FROM (CURRENT_DATE - (SELECT detection_date FROM valley_detections WHERE id = p_detection_id))) / 7
    );
    
    -- Actualizar nivel en detección
    UPDATE valley_detections
    SET current_strategy_level = v_current_level + 1,
        strategy_applied_at = NOW()
    WHERE id = p_detection_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION escalate_valley_strategy IS 
'Escala estrategia valle al siguiente nivel';

-- ============================================================================
-- FUNCIÓN 7: calculate_valley_roi
-- Calcula ROI de promoción valle
-- ============================================================================
CREATE OR REPLACE FUNCTION calculate_valley_roi(
    p_promotion_id UUID
)
RETURNS TABLE (
    investment DECIMAL,
    new_revenue DECIMAL,
    roi_percentage DECIMAL,
    payback_months DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        -- Inversión (costo administrativo + descuentos aplicados)
        (vp.discount_percentage::DECIMAL / 100 * 
         vp.members_converted * 
         2500 * -- Precio promedio mensualidad
         vp.duration_months) AS investment,
        
        -- Nuevo ingreso (conversiones × precio × duración estimada)
        (vp.members_converted * 2500 * 3) AS new_revenue, -- Asumimos 3 meses retención
        
        -- ROI %
        (((vp.members_converted * 2500 * 3) - 
          (vp.discount_percentage::DECIMAL / 100 * vp.members_converted * 2500 * vp.duration_months)) /
         NULLIF((vp.discount_percentage::DECIMAL / 100 * vp.members_converted * 2500 * vp.duration_months), 0) * 100) AS roi_percentage,
        
        -- Payback en meses
        ((vp.discount_percentage::DECIMAL / 100 * vp.members_converted * 2500 * vp.duration_months) /
         NULLIF((vp.members_converted * 2500), 0)) AS payback_months
    FROM valley_promotions vp
    WHERE vp.id = p_promotion_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_valley_roi IS 
'Calcula ROI de campaña de promoción valle';

-- ============================================================================
-- FIN DE FUNCIONES
-- ============================================================================
