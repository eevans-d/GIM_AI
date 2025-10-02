-- ===================================
-- PROMPT 9: Smart Candidate Matching Function
-- Función para encontrar los mejores candidatos de reemplazo
-- ===================================

CREATE OR REPLACE FUNCTION match_replacement_candidates(
    p_replacement_id UUID,
    p_max_candidates INTEGER DEFAULT 5
)
RETURNS TABLE (
    instructor_id UUID,
    instructor_name VARCHAR,
    priority_score NUMERIC,
    match_reasons JSONB,
    can_teach BOOLEAN,
    is_available BOOLEAN,
    specialties VARCHAR[],
    recent_replacements INTEGER,
    acceptance_rate NUMERIC,
    avg_rating NUMERIC
) AS $$
DECLARE
    v_class_type VARCHAR;
    v_scheduled_date DATE;
    v_scheduled_time TIME;
    v_hours_until NUMERIC;
BEGIN
    -- Obtener información del reemplazo
    SELECT 
        r.class_type,
        r.scheduled_date,
        r.scheduled_time,
        r.hours_until_class
    INTO 
        v_class_type,
        v_scheduled_date,
        v_scheduled_time,
        v_hours_until
    FROM replacements r
    WHERE r.id = p_replacement_id;
    
    RETURN QUERY
    WITH instructor_metrics AS (
        SELECT 
            i.id as instructor_id,
            i.nombre as instructor_name,
            
            -- Verificar si puede dar ese tipo de clase
            CASE 
                WHEN v_class_type = ANY(ia.can_teach_classes) THEN TRUE
                ELSE FALSE
            END as can_teach,
            
            -- Verificar disponibilidad en el horario
            check_instructor_availability(i.id, v_scheduled_date, v_scheduled_time) as is_available,
            
            -- Especialidades del instructor
            ia.can_teach_classes as specialties,
            
            -- Métricas de reemplazos recientes
            (
                SELECT COUNT(*)::INTEGER
                FROM replacements r2
                WHERE r2.replacement_instructor_id = i.id
                    AND r2.scheduled_date >= NOW() - INTERVAL '30 days'
                    AND r2.status IN ('accepted', 'confirmed', 'completed')
            ) as recent_replacements,
            
            -- Tasa de aceptación
            COALESCE((
                SELECT 
                    CASE 
                        WHEN COUNT(ro.id) > 0 THEN
                            ROUND(COUNT(*) FILTER (WHERE ro.status = 'accepted')::NUMERIC / COUNT(ro.id) * 100, 2)
                        ELSE 50.0 -- Default si no tiene historial
                    END
                FROM replacement_offers ro
                WHERE ro.instructor_id = i.id
                    AND ro.sent_at >= NOW() - INTERVAL '90 days'
            ), 50.0) as acceptance_rate,
            
            -- Rating promedio en encuestas
            COALESCE((
                SELECT ROUND(AVG(s.rating), 2)
                FROM surveys s
                WHERE s.instructor_id = i.id
                    AND s.responded_at >= NOW() - INTERVAL '90 days'
            ), 3.0) as avg_rating,
            
            -- Preferencias del instructor
            ia.prefers_replacements,
            ia.max_replacements_per_week,
            ia.min_notice_hours
            
        FROM instructors i
        LEFT JOIN instructor_availability ia ON ia.instructor_id = i.id 
            AND ia.day_of_week = EXTRACT(DOW FROM v_scheduled_date)
            AND v_scheduled_time BETWEEN ia.start_time AND ia.end_time
            AND ia.active = TRUE
        WHERE i.activo = TRUE
            AND i.id NOT IN (
                -- Excluir instructor original
                SELECT original_instructor_id FROM replacements WHERE id = p_replacement_id
            )
    ),
    scored_candidates AS (
        SELECT 
            im.*,
            
            -- Calcular score de prioridad (0-100)
            (
                -- 30 puntos: Puede dar la clase
                CASE WHEN im.can_teach THEN 30 ELSE 0 END +
                
                -- 25 puntos: Está disponible en el horario
                CASE WHEN im.is_available THEN 25 ELSE 0 END +
                
                -- 15 puntos: Tasa de aceptación alta
                (im.acceptance_rate * 0.15) +
                
                -- 15 puntos: Rating alto
                (im.avg_rating * 3) +
                
                -- 10 puntos: Pocos reemplazos recientes (rotación justa)
                CASE 
                    WHEN im.recent_replacements = 0 THEN 10
                    WHEN im.recent_replacements = 1 THEN 7
                    WHEN im.recent_replacements = 2 THEN 4
                    ELSE 0
                END +
                
                -- 5 puntos: Prefiere reemplazos
                CASE WHEN im.prefers_replacements THEN 5 ELSE 0 END +
                
                -- Penalización: Aviso muy corto vs preferencia
                CASE 
                    WHEN v_hours_until < im.min_notice_hours THEN -10
                    ELSE 0
                END
            ) as priority_score,
            
            -- Razones del matching (para debugging y transparencia)
            jsonb_build_object(
                'can_teach', im.can_teach,
                'is_available', im.is_available,
                'acceptance_rate', im.acceptance_rate,
                'avg_rating', im.avg_rating,
                'recent_replacements', im.recent_replacements,
                'prefers_replacements', im.prefers_replacements,
                'min_notice_hours', im.min_notice_hours,
                'hours_until_class', v_hours_until
            ) as match_reasons
            
        FROM instructor_metrics im
    )
    SELECT 
        sc.instructor_id,
        sc.instructor_name,
        sc.priority_score,
        sc.match_reasons,
        sc.can_teach,
        sc.is_available,
        sc.specialties,
        sc.recent_replacements,
        sc.acceptance_rate,
        sc.avg_rating
    FROM scored_candidates sc
    WHERE sc.priority_score >= 40 -- Umbral mínimo para considerar
        AND sc.can_teach = TRUE -- Debe poder dar la clase
        AND sc.is_available = TRUE -- Debe estar disponible
    ORDER BY sc.priority_score DESC, sc.acceptance_rate DESC
    LIMIT p_max_candidates;
    
END;
$$ LANGUAGE plpgsql;

-- ===================================
-- Función helper para parsear fecha/hora de texto natural
-- ===================================

CREATE OR REPLACE FUNCTION parse_absence_datetime(p_message TEXT)
RETURNS TABLE (
    parsed_date DATE,
    parsed_time TIME,
    confidence NUMERIC
) AS $$
DECLARE
    v_date_match TEXT;
    v_time_match TEXT;
    v_confidence NUMERIC := 0.5;
BEGIN
    -- Patrones de fecha comunes en español
    -- "mañana", "el lunes", "12/03", "2025-03-12"
    
    -- Detectar "mañana"
    IF p_message ~* '\bmañana\b' THEN
        parsed_date := CURRENT_DATE + INTERVAL '1 day';
        v_confidence := 0.9;
    -- Detectar "hoy"
    ELSIF p_message ~* '\bhoy\b' THEN
        parsed_date := CURRENT_DATE;
        v_confidence := 0.9;
    -- Detectar "pasado mañana"
    ELSIF p_message ~* 'pasado\s+mañana' THEN
        parsed_date := CURRENT_DATE + INTERVAL '2 days';
        v_confidence := 0.85;
    -- Detectar formato DD/MM o DD-MM
    ELSIF p_message ~ '\d{1,2}[/-]\d{1,2}' THEN
        v_date_match := (regexp_match(p_message, '(\d{1,2})[/-](\d{1,2})'))[1] || '-' || 
                        (regexp_match(p_message, '(\d{1,2})[/-](\d{1,2})'))[2];
        parsed_date := TO_DATE(
            EXTRACT(YEAR FROM CURRENT_DATE)::TEXT || '-' || v_date_match,
            'YYYY-DD-MM'
        );
        v_confidence := 0.75;
    -- Detectar nombres de días de la semana
    ELSIF p_message ~* '\b(lunes|monday)\b' THEN
        parsed_date := CURRENT_DATE + ((1 - EXTRACT(DOW FROM CURRENT_DATE) + 7)::INTEGER % 7);
        v_confidence := 0.8;
    ELSIF p_message ~* '\b(martes|tuesday)\b' THEN
        parsed_date := CURRENT_DATE + ((2 - EXTRACT(DOW FROM CURRENT_DATE) + 7)::INTEGER % 7);
        v_confidence := 0.8;
    ELSIF p_message ~* '\b(miércoles|miercoles|wednesday)\b' THEN
        parsed_date := CURRENT_DATE + ((3 - EXTRACT(DOW FROM CURRENT_DATE) + 7)::INTEGER % 7);
        v_confidence := 0.8;
    ELSIF p_message ~* '\b(jueves|thursday)\b' THEN
        parsed_date := CURRENT_DATE + ((4 - EXTRACT(DOW FROM CURRENT_DATE) + 7)::INTEGER % 7);
        v_confidence := 0.8;
    ELSIF p_message ~* '\b(viernes|friday)\b' THEN
        parsed_date := CURRENT_DATE + ((5 - EXTRACT(DOW FROM CURRENT_DATE) + 7)::INTEGER % 7);
        v_confidence := 0.8;
    ELSIF p_message ~* '\b(sábado|sabado|saturday)\b' THEN
        parsed_date := CURRENT_DATE + ((6 - EXTRACT(DOW FROM CURRENT_DATE) + 7)::INTEGER % 7);
        v_confidence := 0.8;
    ELSIF p_message ~* '\b(domingo|sunday)\b' THEN
        parsed_date := CURRENT_DATE + ((7 - EXTRACT(DOW FROM CURRENT_DATE))::INTEGER % 7);
        v_confidence := 0.8;
    END IF;
    
    -- Parsear hora
    -- Patrones: "18:00", "18hs", "6pm", "las 18"
    IF p_message ~ '\d{1,2}:\d{2}' THEN
        v_time_match := (regexp_match(p_message, '(\d{1,2}:\d{2})'))[1];
        parsed_time := v_time_match::TIME;
        v_confidence := v_confidence + 0.1;
    ELSIF p_message ~ '\d{1,2}\s*(hs|hrs)' THEN
        v_time_match := (regexp_match(p_message, '(\d{1,2})\s*(hs|hrs)'))[1];
        parsed_time := (v_time_match || ':00')::TIME;
        v_confidence := v_confidence + 0.05;
    ELSIF p_message ~* '\d{1,2}\s*(am|pm)' THEN
        v_time_match := (regexp_match(p_message, '(\d{1,2})\s*(am|pm)', 'i'))[1];
        IF p_message ~* 'pm' AND v_time_match::INTEGER < 12 THEN
            parsed_time := ((v_time_match::INTEGER + 12)::TEXT || ':00')::TIME;
        ELSE
            parsed_time := (v_time_match || ':00')::TIME;
        END IF;
        v_confidence := v_confidence + 0.05;
    END IF;
    
    confidence := v_confidence;
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- ===================================
-- Función para registrar ausencia desde WhatsApp
-- ===================================

CREATE OR REPLACE FUNCTION register_instructor_absence(
    p_instructor_id UUID,
    p_message TEXT,
    p_reason VARCHAR DEFAULT 'other'
)
RETURNS TABLE (
    replacement_id UUID,
    parsed_date DATE,
    parsed_time TIME,
    confidence NUMERIC,
    class_id UUID,
    class_name VARCHAR,
    bonus_amount NUMERIC,
    bonus_tier VARCHAR,
    success BOOLEAN,
    error_message TEXT
) AS $$
DECLARE
    v_parsed RECORD;
    v_class RECORD;
    v_replacement_id UUID;
BEGIN
    -- Parsear fecha/hora del mensaje
    SELECT * INTO v_parsed FROM parse_absence_datetime(p_message) LIMIT 1;
    
    IF v_parsed.parsed_date IS NULL OR v_parsed.parsed_time IS NULL THEN
        success := FALSE;
        error_message := 'No se pudo identificar fecha/hora en el mensaje';
        RETURN NEXT;
        RETURN;
    END IF;
    
    -- Buscar clase del instructor en esa fecha/hora
    SELECT 
        c.id,
        c.nombre,
        ct.nombre as class_type
    INTO v_class
    FROM classes c
    LEFT JOIN class_types ct ON ct.id = c.tipo_clase_id
    WHERE c.instructor_id = p_instructor_id
        AND c.fecha = v_parsed.parsed_date
        AND c.hora = v_parsed.parsed_time
    LIMIT 1;
    
    IF v_class.id IS NULL THEN
        success := FALSE;
        error_message := 'No se encontró clase agendada en esa fecha/hora';
        parsed_date := v_parsed.parsed_date;
        parsed_time := v_parsed.parsed_time;
        confidence := v_parsed.confidence;
        RETURN NEXT;
        RETURN;
    END IF;
    
    -- Crear registro de reemplazo
    INSERT INTO replacements (
        class_id,
        scheduled_date,
        scheduled_time,
        class_type,
        original_instructor_id,
        absence_reason,
        absence_notes,
        created_by
    ) VALUES (
        v_class.id,
        v_parsed.parsed_date,
        v_parsed.parsed_time,
        v_class.class_type,
        p_instructor_id,
        p_reason,
        p_message,
        p_instructor_id
    )
    RETURNING id INTO v_replacement_id;
    
    -- Retornar resultado
    SELECT 
        r.id,
        r.scheduled_date,
        r.scheduled_time,
        v_parsed.confidence,
        r.class_id,
        v_class.nombre,
        r.bonus_amount,
        r.bonus_tier,
        TRUE,
        NULL
    INTO 
        replacement_id,
        parsed_date,
        parsed_time,
        confidence,
        class_id,
        class_name,
        bonus_amount,
        bonus_tier,
        success,
        error_message
    FROM replacements r
    WHERE r.id = v_replacement_id;
    
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- ===================================
-- Comentarios
-- ===================================

COMMENT ON FUNCTION match_replacement_candidates IS 
'Algoritmo de matching inteligente basado en: especialidad (30pts), disponibilidad (25pts), tasa aceptación (15pts), rating (15pts), rotación justa (10pts), preferencias (5pts)';

COMMENT ON FUNCTION parse_absence_datetime IS
'Parsea fecha/hora de mensajes en lenguaje natural español: "mañana a las 18", "el lunes 18:00", "12/03 6pm"';

COMMENT ON FUNCTION register_instructor_absence IS
'Registra ausencia de instructor desde mensaje WhatsApp, parsea fecha/hora, busca clase y crea registro de reemplazo';
