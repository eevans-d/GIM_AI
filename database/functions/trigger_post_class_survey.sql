-- ===================================
-- PROMPT 8: Trigger para Encuestas Post-Clase
-- Se dispara automáticamente 30 minutos después del check-in
-- ===================================

-- Función que programa encuesta post-clase
CREATE OR REPLACE FUNCTION schedule_post_class_survey()
RETURNS TRIGGER AS $$
DECLARE
    v_instructor_id UUID;
    v_class_id UUID;
    v_delay_minutes INTEGER;
BEGIN
    -- Solo procesar check-ins válidos
    IF NEW.source NOT IN ('qr_cliente', 'qr_kiosk', 'manual') THEN
        RETURN NEW;
    END IF;

    -- Obtener información de la clase e instructor
    IF NEW.class_id IS NOT NULL THEN
        SELECT cl.instructor_id, cl.id
        INTO v_instructor_id, v_class_id
        FROM classes cl
        WHERE cl.id = NEW.class_id
        AND cl.is_active = true;
        
        IF v_instructor_id IS NULL THEN
            -- No hay clase asignada, no enviar encuesta
            RETURN NEW;
        END IF;
    ELSE
        -- Check-in sin clase específica, no enviar encuesta
        RETURN NEW;
    END IF;

    -- Verificar que el miembro tenga consentimiento WhatsApp
    IF NOT EXISTS (
        SELECT 1 FROM members 
        WHERE id = NEW.member_id 
        AND whatsapp_opted_in = true
    ) THEN
        RETURN NEW;
    END IF;

    -- Obtener delay configurado (default 30 minutos)
    v_delay_minutes := COALESCE(
        (SELECT CAST(value AS INTEGER) FROM system_config WHERE key = 'survey_delay_minutes'),
        30
    );

    -- Verificar que no exista ya una encuesta para este check-in
    IF EXISTS (SELECT 1 FROM surveys WHERE checkin_id = NEW.id) THEN
        RETURN NEW;
    END IF;

    -- Crear registro de encuesta programada
    INSERT INTO surveys (
        checkin_id,
        member_id,
        instructor_id,
        class_id,
        survey_sent_at,
        created_at
    ) VALUES (
        NEW.id,
        NEW.member_id,
        v_instructor_id,
        v_class_id,
        NEW.fecha_hora + (v_delay_minutes || ' minutes')::INTERVAL,
        NOW()
    );

    -- Log para debugging
    INSERT INTO system_logs (level, component, message, metadata, correlation_id)
    VALUES (
        'INFO',
        'post-class-survey-trigger',
        'Survey scheduled',
        jsonb_build_object(
            'checkin_id', NEW.id,
            'member_id', NEW.member_id,
            'instructor_id', v_instructor_id,
            'class_id', v_class_id,
            'scheduled_for', NEW.fecha_hora + (v_delay_minutes || ' minutes')::INTERVAL
        ),
        'survey_' || NEW.id::TEXT
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger
DROP TRIGGER IF EXISTS trigger_schedule_post_class_survey ON checkins;

CREATE TRIGGER trigger_schedule_post_class_survey
    AFTER INSERT ON checkins
    FOR EACH ROW
    EXECUTE FUNCTION schedule_post_class_survey();

COMMENT ON FUNCTION schedule_post_class_survey IS 'Trigger que programa encuesta post-clase 30min después del check-in';
COMMENT ON TRIGGER trigger_schedule_post_class_survey ON checkins IS 'Programa encuestas automáticas después de cada check-in';

-- Función para obtener encuestas pendientes de envío
CREATE OR REPLACE FUNCTION get_pending_surveys(
    p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
    survey_id UUID,
    member_id UUID,
    member_name VARCHAR(200),
    phone VARCHAR(20),
    instructor_name VARCHAR(200),
    class_name VARCHAR(100),
    scheduled_for TIMESTAMP WITH TIME ZONE,
    minutes_until_send INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.member_id,
        CONCAT(m.first_name, ' ', m.last_name),
        m.phone,
        CONCAT(i.first_name, ' ', i.last_name),
        c.name,
        s.survey_sent_at,
        EXTRACT(EPOCH FROM (s.survey_sent_at - NOW()))::INTEGER / 60
    FROM surveys s
    JOIN members m ON s.member_id = m.id
    JOIN instructors i ON s.instructor_id = i.id
    LEFT JOIN classes c ON s.class_id = c.id
    WHERE s.rating IS NULL  -- No respondida aún
    AND s.survey_sent_at <= NOW() + INTERVAL '5 minutes'  -- Buffer de 5 min
    AND m.whatsapp_opted_in = true
    ORDER BY s.survey_sent_at ASC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_pending_surveys IS 'Obtiene encuestas programadas listas para envío';

-- Trigger para detectar feedback que requiere acción
CREATE OR REPLACE FUNCTION detect_actionable_feedback()
RETURNS TRIGGER AS $$
BEGIN
    -- Marcar como requiere acción si:
    -- 1. Rating <= 2 (detractor)
    -- 2. Sentiment negativo
    -- 3. Palabras clave en comentario (opcional)
    
    IF NEW.rating IS NOT NULL THEN
        IF NEW.rating <= 2 THEN
            NEW.requires_action := true;
        END IF;
        
        IF NEW.sentiment = 'negative' THEN
            NEW.requires_action := true;
        END IF;
        
        -- Palabras clave de alerta
        IF NEW.comment IS NOT NULL THEN
            IF NEW.comment ~* '(pésimo|horrible|sucio|roto|problema|quejas?|insatisfecho)' THEN
                NEW.requires_action := true;
            END IF;
        END IF;
    END IF;
    
    -- Log si requiere acción
    IF NEW.requires_action = true THEN
        INSERT INTO system_logs (level, component, message, metadata, correlation_id)
        VALUES (
            'WARN',
            'survey-actionable',
            'Survey requires action',
            jsonb_build_object(
                'survey_id', NEW.id,
                'instructor_id', NEW.instructor_id,
                'rating', NEW.rating,
                'sentiment', NEW.sentiment
            ),
            'survey_action_' || NEW.id::TEXT
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_detect_actionable_feedback
    BEFORE INSERT OR UPDATE OF rating, sentiment, comment ON surveys
    FOR EACH ROW
    WHEN (NEW.rating IS NOT NULL OR NEW.sentiment IS NOT NULL)
    EXECUTE FUNCTION detect_actionable_feedback();

COMMENT ON FUNCTION detect_actionable_feedback IS 'Detecta automáticamente feedback que requiere atención';

-- Configuración del sistema
INSERT INTO system_config (key, value, description)
VALUES 
    ('survey_delay_minutes', '30', 'Minutos de delay después del check-in para enviar encuesta'),
    ('survey_response_rate_target', '0.50', 'Target de tasa de respuesta (50%)'),
    ('survey_nps_alert_threshold', '50', 'Threshold de NPS para alertas (< 50 envía alerta)')
ON CONFLICT (key) DO NOTHING;
