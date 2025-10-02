-- ===================================
-- PROMPT 9: Instructor Replacement System
-- Tabla para gestión de ausencias y reemplazos
-- ===================================

-- Tabla de reemplazos de instructores
CREATE TABLE IF NOT EXISTS replacements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Clase afectada
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    scheduled_date DATE NOT NULL,
    scheduled_time TIME NOT NULL,
    class_type VARCHAR(50) NOT NULL, -- spinning, funcional, yoga, pilates, etc.
    
    -- Instructores involucrados
    original_instructor_id UUID NOT NULL REFERENCES instructors(id),
    replacement_instructor_id UUID REFERENCES instructors(id),
    
    -- Estado del reemplazo
    status VARCHAR(30) NOT NULL CHECK (status IN (
        'pending',           -- Buscando reemplazo
        'offered',          -- Ofrecido a candidato(s)
        'accepted',         -- Aceptado por reemplazo
        'confirmed',        -- Confirmado y notificado a estudiantes
        'completed',        -- Clase completada con reemplazo
        'cancelled',        -- Clase cancelada (no se encontró reemplazo)
        'original_resumed'  -- Instructor original retomó la clase
    )) DEFAULT 'pending',
    
    -- Razón de ausencia
    absence_reason VARCHAR(50) CHECK (absence_reason IN (
        'illness', 'emergency', 'vacation', 'personal', 'other'
    )),
    absence_notes TEXT,
    
    -- Timing y bonificación
    reported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    hours_until_class NUMERIC(5,2), -- Calculado al reportar
    bonus_amount NUMERIC(10,2), -- Bonificación ofrecida
    bonus_tier VARCHAR(20) CHECK (bonus_tier IN ('urgent', 'standard', 'advance')),
    
    -- Matching y selección
    candidates_contacted INTEGER DEFAULT 0, -- Cuántos instructores contactados
    candidate_ids UUID[], -- Array de IDs de candidatos contactados
    accepted_at TIMESTAMPTZ,
    first_offer_sent_at TIMESTAMPTZ,
    time_to_fill_minutes INTEGER, -- Tiempo desde reporte hasta aceptación
    
    -- Notificaciones
    students_notified BOOLEAN DEFAULT FALSE,
    students_notified_at TIMESTAMPTZ,
    original_instructor_notified BOOLEAN DEFAULT FALSE,
    
    -- Audit trail
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID, -- ID del instructor que reportó o admin
    
    -- Metadata
    metadata JSONB, -- Info adicional (GPS, matching scores, etc.)
    
    UNIQUE(class_id, scheduled_date)
);

-- Índices para búsquedas eficientes
CREATE INDEX idx_replacements_status ON replacements(status);
CREATE INDEX idx_replacements_scheduled ON replacements(scheduled_date, scheduled_time);
CREATE INDEX idx_replacements_original_instructor ON replacements(original_instructor_id);
CREATE INDEX idx_replacements_replacement_instructor ON replacements(replacement_instructor_id);
CREATE INDEX idx_replacements_pending ON replacements(status) WHERE status IN ('pending', 'offered');
CREATE INDEX idx_replacements_urgent ON replacements(hours_until_class) WHERE hours_until_class < 24;
CREATE INDEX idx_replacements_bonus_tier ON replacements(bonus_tier);

-- ===================================
-- Tabla de disponibilidad de instructores
-- ===================================

CREATE TABLE IF NOT EXISTS instructor_availability (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    instructor_id UUID NOT NULL REFERENCES instructors(id) ON DELETE CASCADE,
    
    -- Disponibilidad recurrente semanal
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Domingo, 6=Sábado
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    
    -- Tipo de disponibilidad
    availability_type VARCHAR(20) NOT NULL CHECK (availability_type IN (
        'regular',      -- Horario regular de clases
        'available',    -- Disponible para reemplazos
        'unavailable'   -- No disponible
    )),
    
    -- Especialidades para reemplazos
    can_teach_classes VARCHAR(50)[], -- Array de tipos de clases que puede dar
    
    -- Preferencias
    prefers_replacements BOOLEAN DEFAULT TRUE,
    max_replacements_per_week INTEGER DEFAULT 3,
    min_notice_hours INTEGER DEFAULT 2, -- Mínimo aviso que necesita
    
    -- Metadata
    notes TEXT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(instructor_id, day_of_week, start_time, end_time)
);

CREATE INDEX idx_availability_instructor ON instructor_availability(instructor_id);
CREATE INDEX idx_availability_day ON instructor_availability(day_of_week);
CREATE INDEX idx_availability_active ON instructor_availability(active) WHERE active = TRUE;

-- ===================================
-- Tabla de ofertas de reemplazo (tracking individual)
-- ===================================

CREATE TABLE IF NOT EXISTS replacement_offers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    replacement_id UUID NOT NULL REFERENCES replacements(id) ON DELETE CASCADE,
    instructor_id UUID NOT NULL REFERENCES instructors(id) ON DELETE CASCADE,
    
    -- Estado de la oferta
    status VARCHAR(20) NOT NULL CHECK (status IN (
        'sent',      -- Oferta enviada
        'viewed',    -- Instructor vio mensaje
        'accepted',  -- Aceptó el reemplazo
        'declined',  -- Rechazó el reemplazo
        'expired'    -- Expiró sin respuesta
    )) DEFAULT 'sent',
    
    -- Timing
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    responded_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ, -- Tiempo límite para responder
    
    -- Prioridad (matching score)
    priority_score NUMERIC(4,2), -- 0-100, basado en algoritmo de matching
    offer_sequence INTEGER, -- 1 = primera oferta, 2 = segunda, etc.
    
    -- Razón de rechazo
    decline_reason VARCHAR(50),
    decline_notes TEXT,
    
    UNIQUE(replacement_id, instructor_id)
);

CREATE INDEX idx_offers_replacement ON replacement_offers(replacement_id);
CREATE INDEX idx_offers_instructor ON replacement_offers(instructor_id);
CREATE INDEX idx_offers_status ON replacement_offers(status);
CREATE INDEX idx_offers_pending ON replacement_offers(status, expires_at) 
    WHERE status = 'sent' AND expires_at > NOW();

-- ===================================
-- Stored Functions
-- ===================================

-- Función para calcular bonificación basada en urgencia
CREATE OR REPLACE FUNCTION calculate_replacement_bonus(p_hours_until_class NUMERIC)
RETURNS TABLE (
    bonus_amount NUMERIC,
    bonus_tier VARCHAR
) AS $$
BEGIN
    IF p_hours_until_class < 24 THEN
        RETURN QUERY SELECT 1500.00::NUMERIC, 'urgent'::VARCHAR;
    ELSIF p_hours_until_class < 48 THEN
        RETURN QUERY SELECT 1000.00::NUMERIC, 'standard'::VARCHAR;
    ELSE
        RETURN QUERY SELECT 500.00::NUMERIC, 'advance'::VARCHAR;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener estadísticas de reemplazos por instructor
CREATE OR REPLACE FUNCTION get_instructor_replacement_stats(p_instructor_id UUID, p_days INTEGER DEFAULT 90)
RETURNS TABLE (
    total_replacements BIGINT,
    accepted_offers BIGINT,
    declined_offers BIGINT,
    acceptance_rate NUMERIC,
    total_bonus_earned NUMERIC,
    avg_response_time_minutes NUMERIC,
    last_replacement_date DATE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(DISTINCT r.id) as total_replacements,
        COUNT(DISTINCT ro.id) FILTER (WHERE ro.status = 'accepted') as accepted_offers,
        COUNT(DISTINCT ro.id) FILTER (WHERE ro.status = 'declined') as declined_offers,
        CASE 
            WHEN COUNT(ro.id) > 0 THEN
                ROUND(COUNT(*) FILTER (WHERE ro.status = 'accepted')::NUMERIC / COUNT(ro.id) * 100, 2)
            ELSE 0
        END as acceptance_rate,
        COALESCE(SUM(r.bonus_amount) FILTER (WHERE r.replacement_instructor_id = p_instructor_id), 0) as total_bonus_earned,
        ROUND(AVG(EXTRACT(EPOCH FROM (ro.responded_at - ro.sent_at)) / 60), 2) as avg_response_time_minutes,
        MAX(r.scheduled_date) as last_replacement_date
    FROM replacement_offers ro
    LEFT JOIN replacements r ON r.id = ro.replacement_id
    WHERE ro.instructor_id = p_instructor_id
        AND ro.sent_at >= NOW() - INTERVAL '1 day' * p_days;
END;
$$ LANGUAGE plpgsql;

-- Función para verificar disponibilidad de instructor en fecha/hora específica
CREATE OR REPLACE FUNCTION check_instructor_availability(
    p_instructor_id UUID,
    p_date DATE,
    p_time TIME
)
RETURNS BOOLEAN AS $$
DECLARE
    v_day_of_week INTEGER;
    v_is_available BOOLEAN;
BEGIN
    -- Obtener día de la semana (0=Domingo)
    v_day_of_week := EXTRACT(DOW FROM p_date);
    
    -- Verificar si tiene disponibilidad en ese horario
    SELECT EXISTS (
        SELECT 1 FROM instructor_availability
        WHERE instructor_id = p_instructor_id
            AND day_of_week = v_day_of_week
            AND p_time BETWEEN start_time AND end_time
            AND availability_type IN ('available', 'regular')
            AND active = TRUE
    ) INTO v_is_available;
    
    -- Verificar que no tenga otra clase agendada en ese momento
    IF v_is_available THEN
        SELECT NOT EXISTS (
            SELECT 1 FROM classes c
            WHERE c.instructor_id = p_instructor_id
                AND c.fecha = p_date
                AND c.hora = p_time
        ) INTO v_is_available;
    END IF;
    
    RETURN v_is_available;
END;
$$ LANGUAGE plpgsql;

-- ===================================
-- Triggers
-- ===================================

-- Trigger para calcular bonificación automáticamente
CREATE OR REPLACE FUNCTION calculate_replacement_bonus_trigger()
RETURNS TRIGGER AS $$
DECLARE
    v_hours_until NUMERIC;
    v_bonus_info RECORD;
BEGIN
    -- Calcular horas hasta la clase
    v_hours_until := EXTRACT(EPOCH FROM (
        (NEW.scheduled_date + NEW.scheduled_time) - NOW()
    )) / 3600;
    
    NEW.hours_until_class := v_hours_until;
    
    -- Obtener bonificación
    SELECT * INTO v_bonus_info FROM calculate_replacement_bonus(v_hours_until);
    
    NEW.bonus_amount := v_bonus_info.bonus_amount;
    NEW.bonus_tier := v_bonus_info.bonus_tier;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_bonus
    BEFORE INSERT ON replacements
    FOR EACH ROW
    EXECUTE FUNCTION calculate_replacement_bonus_trigger();

-- Trigger para actualizar timestamp
CREATE OR REPLACE FUNCTION update_replacement_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_replacement_timestamp
    BEFORE UPDATE ON replacements
    FOR EACH ROW
    EXECUTE FUNCTION update_replacement_timestamp();

-- ===================================
-- Views para reporting
-- ===================================

-- Vista de reemplazos activos/urgentes
CREATE OR REPLACE VIEW v_active_replacements AS
SELECT 
    r.id,
    r.scheduled_date,
    r.scheduled_time,
    r.class_type,
    r.hours_until_class,
    r.bonus_tier,
    r.bonus_amount,
    r.status,
    r.candidates_contacted,
    oi.nombre as original_instructor_name,
    ri.nombre as replacement_instructor_name,
    c.nombre as class_name,
    c.capacidad_maxima,
    COUNT(res.id) as enrolled_students
FROM replacements r
JOIN instructors oi ON oi.id = r.original_instructor_id
LEFT JOIN instructors ri ON ri.id = r.replacement_instructor_id
JOIN classes c ON c.id = r.class_id
LEFT JOIN reservas res ON res.clase_id = r.class_id AND res.fecha_reserva = r.scheduled_date
WHERE r.status IN ('pending', 'offered', 'accepted')
GROUP BY r.id, oi.nombre, ri.nombre, c.nombre, c.capacidad_maxima;

-- Vista de métricas de reemplazo
CREATE OR REPLACE VIEW v_replacement_metrics AS
SELECT 
    DATE_TRUNC('month', scheduled_date) as month,
    COUNT(*) as total_replacements,
    COUNT(*) FILTER (WHERE status IN ('accepted', 'confirmed', 'completed')) as successful_replacements,
    COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_classes,
    ROUND(AVG(hours_until_class), 2) as avg_notice_hours,
    ROUND(AVG(time_to_fill_minutes), 2) as avg_time_to_fill_minutes,
    SUM(bonus_amount) as total_bonus_paid,
    ROUND(AVG(candidates_contacted), 2) as avg_candidates_per_replacement
FROM replacements
WHERE scheduled_date >= NOW() - INTERVAL '12 months'
GROUP BY DATE_TRUNC('month', scheduled_date)
ORDER BY month DESC;

-- ===================================
-- System Configuration
-- ===================================

INSERT INTO system_config (key, value, description) VALUES
('replacement_offer_expiry_minutes', '30', 'Minutes until replacement offer expires'),
('replacement_max_candidates', '5', 'Maximum candidates to contact per replacement'),
('replacement_batch_delay_minutes', '10', 'Minutes between batch offers if first declines'),
('replacement_min_notice_hours', '2', 'Minimum hours notice required for replacements')
ON CONFLICT (key) DO UPDATE SET 
    value = EXCLUDED.value,
    updated_at = NOW();

-- ===================================
-- Comentarios y documentación
-- ===================================

COMMENT ON TABLE replacements IS 'Gestión de ausencias y reemplazos de instructores con sistema de bonificación';
COMMENT ON TABLE instructor_availability IS 'Disponibilidad recurrente semanal de instructores para reemplazos';
COMMENT ON TABLE replacement_offers IS 'Tracking individual de ofertas enviadas a cada candidato';

COMMENT ON COLUMN replacements.bonus_tier IS 'urgent: <24h ($1500), standard: 24-48h ($1000), advance: >48h ($500)';
COMMENT ON COLUMN replacements.time_to_fill_minutes IS 'Métrica clave: tiempo desde reporte hasta aceptación';
COMMENT ON COLUMN instructor_availability.can_teach_classes IS 'Array de especialidades: spinning, funcional, yoga, pilates, etc.';
