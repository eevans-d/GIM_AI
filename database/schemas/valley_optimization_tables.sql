-- ============================================================================
-- PROMPT 11: VALLEY OPTIMIZATION SYSTEM - DATABASE SCHEMA
-- ============================================================================
-- Tablas para detectar y optimizar clases con baja ocupación (<50% por 3+ semanas)
-- Estrategia multi-nivel: promociones, cambio formato, reubicación, pausa
-- ============================================================================

-- ============================================================================
-- 1. TABLA: valley_detections
-- Registro de detecciones de clases con baja ocupación
-- ============================================================================
CREATE TABLE IF NOT EXISTS valley_detections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identificación de la clase valle
    clase_id UUID NOT NULL REFERENCES clases(id) ON DELETE CASCADE,
    detection_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Métricas de ocupación
    weeks_analyzed INTEGER NOT NULL DEFAULT 3,
    avg_occupancy_rate DECIMAL(5,2) NOT NULL, -- Porcentaje promedio ocupación
    avg_attendance DECIMAL(5,2) NOT NULL, -- Asistencia promedio
    capacity INTEGER NOT NULL, -- Capacidad de la clase
    total_classes_held INTEGER NOT NULL, -- Clases realizadas en período
    
    -- Datos históricos
    week1_occupancy DECIMAL(5,2),
    week2_occupancy DECIMAL(5,2),
    week3_occupancy DECIMAL(5,2),
    
    -- Estado y acciones
    status VARCHAR(50) NOT NULL DEFAULT 'detected', 
    -- detected, promotion_sent, format_changed, rescheduled, paused, resolved
    
    current_strategy_level INTEGER NOT NULL DEFAULT 1, 
    -- 1: Promoción, 2: Cambio formato, 3: Reubicación, 4: Pausa
    
    -- Tracking
    strategy_applied_at TIMESTAMP,
    resolved_at TIMESTAMP,
    resolution_notes TEXT,
    
    -- Metadatos
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT chk_occupancy_range CHECK (avg_occupancy_rate BETWEEN 0 AND 100),
    CONSTRAINT chk_strategy_level CHECK (current_strategy_level BETWEEN 1 AND 4)
);

-- Índices para valley_detections
CREATE INDEX idx_valley_detections_clase ON valley_detections(clase_id);
CREATE INDEX idx_valley_detections_date ON valley_detections(detection_date DESC);
CREATE INDEX idx_valley_detections_status ON valley_detections(status);
CREATE INDEX idx_valley_detections_occupancy ON valley_detections(avg_occupancy_rate);
CREATE INDEX idx_valley_detections_active ON valley_detections(clase_id, status) 
    WHERE status NOT IN ('resolved', 'paused');

COMMENT ON TABLE valley_detections IS 'Detecciones de clases con baja ocupación para optimización';
COMMENT ON COLUMN valley_detections.current_strategy_level IS '1=Promoción, 2=Formato, 3=Reubicación, 4=Pausa';

-- ============================================================================
-- 2. TABLA: valley_promotions
-- Promociones enviadas para horarios valle
-- ============================================================================
CREATE TABLE IF NOT EXISTS valley_promotions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Referencias
    detection_id UUID NOT NULL REFERENCES valley_detections(id) ON DELETE CASCADE,
    clase_id UUID NOT NULL REFERENCES clases(id) ON DELETE CASCADE,
    
    -- Detalles de la promoción
    promotion_name VARCHAR(255) NOT NULL,
    discount_percentage INTEGER NOT NULL DEFAULT 20, -- Descuento ofrecido
    duration_months INTEGER NOT NULL DEFAULT 1, -- Duración de la promo
    
    -- Segmentación
    target_segment VARCHAR(100) NOT NULL, -- 'never_attended', 'morning_only', etc.
    eligible_members_count INTEGER NOT NULL DEFAULT 0,
    messages_sent INTEGER NOT NULL DEFAULT 0,
    
    -- Tracking de conversión
    members_interested INTEGER NOT NULL DEFAULT 0, -- Respondieron positivo
    members_converted INTEGER NOT NULL DEFAULT 0, -- Hicieron check-in
    conversion_rate DECIMAL(5,2), -- Calculado: converted/sent * 100
    
    -- Métricas de impacto
    occupancy_before DECIMAL(5,2) NOT NULL,
    occupancy_after DECIMAL(5,2),
    occupancy_improvement DECIMAL(5,2), -- Calculado
    
    -- Estado
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    -- draft, scheduled, active, completed, cancelled
    
    -- Fechas
    scheduled_send_date DATE,
    sent_at TIMESTAMP,
    active_from DATE,
    active_until DATE,
    completed_at TIMESTAMP,
    
    -- Metadatos
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by VARCHAR(255) DEFAULT 'system',
    
    -- Constraints
    CONSTRAINT chk_discount_range CHECK (discount_percentage BETWEEN 0 AND 100),
    CONSTRAINT chk_duration_positive CHECK (duration_months > 0)
);

-- Índices para valley_promotions
CREATE INDEX idx_valley_promotions_detection ON valley_promotions(detection_id);
CREATE INDEX idx_valley_promotions_clase ON valley_promotions(clase_id);
CREATE INDEX idx_valley_promotions_status ON valley_promotions(status);
CREATE INDEX idx_valley_promotions_dates ON valley_promotions(active_from, active_until);
CREATE INDEX idx_valley_promotions_conversion ON valley_promotions(conversion_rate DESC);

COMMENT ON TABLE valley_promotions IS 'Promociones para optimizar ocupación en horarios valle';

-- ============================================================================
-- 3. TABLA: valley_promotion_recipients
-- Miembros que recibieron promoción valle
-- ============================================================================
CREATE TABLE IF NOT EXISTS valley_promotion_recipients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Referencias
    promotion_id UUID NOT NULL REFERENCES valley_promotions(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    
    -- Estado de la promoción para este miembro
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    -- pending, sent, opened, interested, converted, declined, expired
    
    -- Tracking de comunicación
    whatsapp_sent_at TIMESTAMP,
    whatsapp_delivered_at TIMESTAMP,
    whatsapp_read_at TIMESTAMP,
    whatsapp_message_id VARCHAR(255),
    
    -- Respuesta del miembro
    response_received BOOLEAN NOT NULL DEFAULT FALSE,
    response_text TEXT,
    response_at TIMESTAMP,
    
    -- Conversión
    first_attendance_date DATE,
    total_attendances INTEGER NOT NULL DEFAULT 0,
    is_converted BOOLEAN NOT NULL DEFAULT FALSE,
    converted_at TIMESTAMP,
    
    -- Metadatos
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT uq_promotion_member UNIQUE(promotion_id, member_id)
);

-- Índices para valley_promotion_recipients
CREATE INDEX idx_valley_recipients_promotion ON valley_promotion_recipients(promotion_id);
CREATE INDEX idx_valley_recipients_member ON valley_promotion_recipients(member_id);
CREATE INDEX idx_valley_recipients_status ON valley_promotion_recipients(status);
CREATE INDEX idx_valley_recipients_converted ON valley_promotion_recipients(is_converted);
CREATE INDEX idx_valley_recipients_pending ON valley_promotion_recipients(promotion_id, status)
    WHERE status = 'pending';

COMMENT ON TABLE valley_promotion_recipients IS 'Tracking individual de miembros en promociones valle';

-- ============================================================================
-- 4. TABLA: valley_strategy_escalations
-- Historial de escalamiento de estrategias (Nivel 1→2→3→4)
-- ============================================================================
CREATE TABLE IF NOT EXISTS valley_strategy_escalations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Referencias
    detection_id UUID NOT NULL REFERENCES valley_detections(id) ON DELETE CASCADE,
    clase_id UUID NOT NULL REFERENCES clases(id) ON DELETE CASCADE,
    
    -- Estrategia
    previous_level INTEGER NOT NULL,
    new_level INTEGER NOT NULL,
    strategy_name VARCHAR(255) NOT NULL,
    
    -- Razón del escalamiento
    escalation_reason TEXT NOT NULL,
    occupancy_at_escalation DECIMAL(5,2) NOT NULL,
    weeks_since_detection INTEGER NOT NULL,
    
    -- Acciones tomadas
    actions_taken JSONB, -- Array de acciones específicas
    expected_improvement DECIMAL(5,2), -- Mejora esperada en ocupación
    
    -- Resultado
    actual_improvement DECIMAL(5,2),
    success BOOLEAN,
    evaluation_date DATE,
    evaluation_notes TEXT,
    
    -- Metadatos
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by VARCHAR(255) DEFAULT 'system',
    
    -- Constraints
    CONSTRAINT chk_level_escalation CHECK (new_level > previous_level),
    CONSTRAINT chk_levels_range CHECK (previous_level BETWEEN 1 AND 4 AND new_level BETWEEN 1 AND 4)
);

-- Índices para valley_strategy_escalations
CREATE INDEX idx_valley_escalations_detection ON valley_strategy_escalations(detection_id);
CREATE INDEX idx_valley_escalations_clase ON valley_strategy_escalations(clase_id);
CREATE INDEX idx_valley_escalations_level ON valley_strategy_escalations(new_level);
CREATE INDEX idx_valley_escalations_date ON valley_strategy_escalations(created_at DESC);

COMMENT ON TABLE valley_strategy_escalations IS 'Historial de escalamiento de estrategias valle';

-- ============================================================================
-- 5. TABLA: class_occupancy_history
-- Historial diario de ocupación por clase (para análisis de tendencias)
-- ============================================================================
CREATE TABLE IF NOT EXISTS class_occupancy_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identificación
    clase_id UUID NOT NULL REFERENCES clases(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    
    -- Métricas
    scheduled_capacity INTEGER NOT NULL,
    actual_attendance INTEGER NOT NULL DEFAULT 0,
    occupancy_rate DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    
    -- Contexto
    day_of_week INTEGER NOT NULL, -- 0=Domingo, 6=Sábado
    week_number INTEGER NOT NULL, -- Semana del año
    is_holiday BOOLEAN NOT NULL DEFAULT FALSE,
    weather_condition VARCHAR(50), -- 'sunny', 'rainy', etc. (opcional)
    
    -- Estado
    class_held BOOLEAN NOT NULL DEFAULT TRUE,
    cancellation_reason TEXT,
    
    -- Metadatos
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT uq_class_date UNIQUE(clase_id, date),
    CONSTRAINT chk_attendance_capacity CHECK (actual_attendance <= scheduled_capacity)
);

-- Índices para class_occupancy_history
CREATE INDEX idx_occupancy_history_clase ON class_occupancy_history(clase_id);
CREATE INDEX idx_occupancy_history_date ON class_occupancy_history(date DESC);
CREATE INDEX idx_occupancy_history_rate ON class_occupancy_history(occupancy_rate);
CREATE INDEX idx_occupancy_history_week ON class_occupancy_history(week_number, clase_id);
CREATE INDEX idx_occupancy_history_dow ON class_occupancy_history(day_of_week, clase_id);

COMMENT ON TABLE class_occupancy_history IS 'Historial diario de ocupación para análisis de tendencias';

-- ============================================================================
-- 6. VISTA MATERIALIZADA: v_valley_classes_current
-- Clases actualmente en horario valle (actualizada diariamente)
-- ============================================================================
CREATE MATERIALIZED VIEW IF NOT EXISTS v_valley_classes_current AS
SELECT 
    c.id AS clase_id,
    c.nombre AS clase_nombre,
    c.tipo AS clase_tipo,
    c.horario,
    c.capacidad_maxima,
    
    -- Métricas de ocupación (últimas 3 semanas)
    COUNT(DISTINCT ch.date) AS classes_held_last_3w,
    AVG(ch.occupancy_rate) AS avg_occupancy_3w,
    MIN(ch.occupancy_rate) AS min_occupancy_3w,
    MAX(ch.occupancy_rate) AS max_occupancy_3w,
    STDDEV(ch.occupancy_rate) AS stddev_occupancy_3w,
    
    -- Tendencia
    (
        SELECT AVG(occupancy_rate) 
        FROM class_occupancy_history 
        WHERE clase_id = c.id 
        AND date >= CURRENT_DATE - INTERVAL '7 days'
    ) AS avg_occupancy_last_week,
    
    (
        SELECT AVG(occupancy_rate) 
        FROM class_occupancy_history 
        WHERE clase_id = c.id 
        AND date >= CURRENT_DATE - INTERVAL '14 days'
        AND date < CURRENT_DATE - INTERVAL '7 days'
    ) AS avg_occupancy_prev_week,
    
    -- Clasificación
    CASE 
        WHEN AVG(ch.occupancy_rate) < 50 THEN 'critical_valley'
        WHEN AVG(ch.occupancy_rate) < 70 THEN 'valley'
        WHEN AVG(ch.occupancy_rate) < 85 THEN 'normal'
        ELSE 'high_demand'
    END AS occupancy_category,
    
    -- Estado de detección actual
    vd.id AS current_detection_id,
    vd.status AS detection_status,
    vd.current_strategy_level,
    
    -- Última actualización
    NOW() AS refreshed_at
    
FROM clases c
LEFT JOIN class_occupancy_history ch ON c.id = ch.clase_id
    AND ch.date >= CURRENT_DATE - INTERVAL '21 days'
    AND ch.class_held = TRUE
LEFT JOIN valley_detections vd ON c.id = vd.clase_id
    AND vd.status NOT IN ('resolved', 'paused')
WHERE c.activo = TRUE
GROUP BY c.id, c.nombre, c.tipo, c.horario, c.capacidad_maxima, 
         vd.id, vd.status, vd.current_strategy_level
HAVING COUNT(DISTINCT ch.date) >= 9; -- Al menos 9 clases en 3 semanas

-- Índices para la vista materializada
CREATE UNIQUE INDEX idx_valley_current_clase ON v_valley_classes_current(clase_id);
CREATE INDEX idx_valley_current_category ON v_valley_classes_current(occupancy_category);
CREATE INDEX idx_valley_current_occupancy ON v_valley_classes_current(avg_occupancy_3w);

COMMENT ON MATERIALIZED VIEW v_valley_classes_current IS 
'Vista actualizada diariamente de clases en horario valle';

-- ============================================================================
-- TRIGGERS: Actualización automática de timestamps
-- ============================================================================

-- Trigger para valley_detections
CREATE OR REPLACE FUNCTION update_valley_detections_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_valley_detections_update
    BEFORE UPDATE ON valley_detections
    FOR EACH ROW
    EXECUTE FUNCTION update_valley_detections_timestamp();

-- Trigger para valley_promotions
CREATE OR REPLACE FUNCTION update_valley_promotions_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    
    -- Auto-calcular conversion_rate
    IF NEW.messages_sent > 0 THEN
        NEW.conversion_rate = (NEW.members_converted::DECIMAL / NEW.messages_sent) * 100;
    END IF;
    
    -- Auto-calcular occupancy_improvement
    IF NEW.occupancy_after IS NOT NULL THEN
        NEW.occupancy_improvement = NEW.occupancy_after - NEW.occupancy_before;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_valley_promotions_update
    BEFORE UPDATE ON valley_promotions
    FOR EACH ROW
    EXECUTE FUNCTION update_valley_promotions_timestamp();

-- Trigger para valley_promotion_recipients
CREATE OR REPLACE FUNCTION update_valley_recipients_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    
    -- Auto-marcar como converted si hay asistencia
    IF NEW.first_attendance_date IS NOT NULL AND OLD.is_converted = FALSE THEN
        NEW.is_converted = TRUE;
        NEW.converted_at = NOW();
        NEW.status = 'converted';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_valley_recipients_update
    BEFORE UPDATE ON valley_promotion_recipients
    FOR EACH ROW
    EXECUTE FUNCTION update_valley_recipients_timestamp();

-- ============================================================================
-- FUNCIÓN: Refresh vista materializada (llamar desde cron diario)
-- ============================================================================
CREATE OR REPLACE FUNCTION refresh_valley_classes_view()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY v_valley_classes_current;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION refresh_valley_classes_view IS 
'Actualiza vista materializada de clases valle - ejecutar diariamente a las 6:00 AM';

-- ============================================================================
-- PERMISOS
-- ============================================================================
-- Ajustar según roles de tu sistema
-- GRANT SELECT, INSERT, UPDATE ON valley_detections TO app_user;
-- GRANT SELECT, INSERT, UPDATE ON valley_promotions TO app_user;
-- GRANT SELECT, INSERT, UPDATE ON valley_promotion_recipients TO app_user;
-- GRANT SELECT, INSERT ON valley_strategy_escalations TO app_user;
-- GRANT SELECT, INSERT ON class_occupancy_history TO app_user;
-- GRANT SELECT ON v_valley_classes_current TO app_user;

-- ============================================================================
-- FIN DEL SCHEMA
-- ============================================================================
