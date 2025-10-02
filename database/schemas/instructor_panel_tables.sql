-- =============================================
-- PROMPT 10: INSTRUCTOR PANEL "MI CLASE AHORA"
-- Tablas para panel móvil de instructores con check-in de un toque
-- =============================================

-- =============================================
-- TABLA: instructor_sessions
-- Propósito: Sesiones activas de instructores para seguimiento en tiempo real
-- =============================================
CREATE TABLE IF NOT EXISTS instructor_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    instructor_id UUID NOT NULL REFERENCES instructors(id) ON DELETE CASCADE,
    clase_id UUID NOT NULL REFERENCES clases(id) ON DELETE CASCADE,
    
    -- Estado de la sesión
    session_status VARCHAR(20) NOT NULL DEFAULT 'pending',
    -- Estados: pending, active, completed, cancelled
    
    -- Timestamps del ciclo de vida
    scheduled_start TIMESTAMPTZ NOT NULL,
    scheduled_end TIMESTAMPTZ NOT NULL,
    actual_start TIMESTAMPTZ,
    actual_end TIMESTAMPTZ,
    
    -- Asistencia
    expected_students INTEGER NOT NULL DEFAULT 0,
    checked_in_students INTEGER NOT NULL DEFAULT 0,
    attendance_rate DECIMAL(5,2) GENERATED ALWAYS AS 
        (CASE WHEN expected_students > 0 
         THEN (checked_in_students::DECIMAL / expected_students * 100) 
         ELSE 0 END) STORED,
    
    -- Preparación de clase
    checklist_completed BOOLEAN DEFAULT FALSE,
    checklist_completed_at TIMESTAMPTZ,
    preparation_notes TEXT,
    
    -- Alertas y notificaciones
    low_attendance_alert_sent BOOLEAN DEFAULT FALSE,
    late_start_alert_sent BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    device_info JSONB, -- Browser, OS, screen size para analytics
    last_activity TIMESTAMPTZ DEFAULT NOW(),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para instructor_sessions
CREATE INDEX idx_instructor_sessions_instructor ON instructor_sessions(instructor_id);
CREATE INDEX idx_instructor_sessions_clase ON instructor_sessions(clase_id);
CREATE INDEX idx_instructor_sessions_status ON instructor_sessions(session_status);
CREATE INDEX idx_instructor_sessions_scheduled ON instructor_sessions(scheduled_start, scheduled_end);
CREATE INDEX idx_instructor_sessions_active ON instructor_sessions(session_status) 
    WHERE session_status IN ('pending', 'active');

-- =============================================
-- TABLA: attendance_alerts
-- Propósito: Registro de alertas de asistencia para análisis y seguimiento
-- =============================================
CREATE TABLE IF NOT EXISTS attendance_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES instructor_sessions(id) ON DELETE CASCADE,
    instructor_id UUID NOT NULL REFERENCES instructors(id) ON DELETE CASCADE,
    clase_id UUID NOT NULL REFERENCES clases(id) ON DELETE CASCADE,
    
    -- Tipo de alerta
    alert_type VARCHAR(30) NOT NULL,
    -- Tipos: low_attendance, very_low_attendance, late_start, 
    --        missing_students, equipment_issue, emergency
    
    alert_severity VARCHAR(10) NOT NULL DEFAULT 'medium',
    -- Severidades: low, medium, high, critical
    
    -- Contenido de la alerta
    alert_message TEXT NOT NULL,
    alert_details JSONB, -- Datos adicionales contextuales
    
    -- Estado de la alerta
    alert_status VARCHAR(20) NOT NULL DEFAULT 'active',
    -- Estados: active, acknowledged, resolved, dismissed
    
    acknowledged_by UUID REFERENCES instructors(id),
    acknowledged_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    resolution_notes TEXT,
    
    -- Notificaciones
    notification_sent BOOLEAN DEFAULT FALSE,
    notification_sent_at TIMESTAMPTZ,
    notification_channel VARCHAR(20), -- whatsapp, email, push
    
    -- Métricas de respuesta
    response_time_seconds INTEGER, -- Tiempo hasta acknowledgment
    resolution_time_seconds INTEGER, -- Tiempo hasta resolución
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para attendance_alerts
CREATE INDEX idx_attendance_alerts_session ON attendance_alerts(session_id);
CREATE INDEX idx_attendance_alerts_instructor ON attendance_alerts(instructor_id);
CREATE INDEX idx_attendance_alerts_type ON attendance_alerts(alert_type);
CREATE INDEX idx_attendance_alerts_status ON attendance_alerts(alert_status);
CREATE INDEX idx_attendance_alerts_severity ON attendance_alerts(alert_severity);
CREATE INDEX idx_attendance_alerts_active ON attendance_alerts(alert_status) 
    WHERE alert_status = 'active';

-- =============================================
-- TABLA: class_checklists
-- Propósito: Items de preparación de clase personalizables por tipo de clase
-- =============================================
CREATE TABLE IF NOT EXISTS class_checklists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Asociación
    clase_tipo VARCHAR(50), -- Para aplicar a todas las clases de un tipo
    clase_id UUID REFERENCES clases(id), -- O para una clase específica
    
    -- Item del checklist
    item_order INTEGER NOT NULL,
    item_title VARCHAR(200) NOT NULL,
    item_description TEXT,
    is_required BOOLEAN DEFAULT TRUE,
    estimated_time_minutes INTEGER, -- Tiempo estimado para completar
    
    -- Categorización
    item_category VARCHAR(50), -- equipment, safety, environment, preparation
    
    -- Estado activo
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT check_clase_association CHECK (
        (clase_tipo IS NOT NULL AND clase_id IS NULL) OR
        (clase_tipo IS NULL AND clase_id IS NOT NULL)
    )
);

-- Índices para class_checklists
CREATE INDEX idx_class_checklists_tipo ON class_checklists(clase_tipo) WHERE clase_tipo IS NOT NULL;
CREATE INDEX idx_class_checklists_clase ON class_checklists(clase_id) WHERE clase_id IS NOT NULL;
CREATE INDEX idx_class_checklists_active ON class_checklists(is_active) WHERE is_active = TRUE;

-- =============================================
-- TABLA: checklist_completions
-- Propósito: Registro de completación de checklists por sesión
-- =============================================
CREATE TABLE IF NOT EXISTS checklist_completions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES instructor_sessions(id) ON DELETE CASCADE,
    checklist_item_id UUID NOT NULL REFERENCES class_checklists(id) ON DELETE CASCADE,
    
    -- Completación
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    completed_by UUID REFERENCES instructors(id),
    
    -- Observaciones
    notes TEXT,
    issues_found TEXT, -- Problemas detectados al revisar el item
    
    -- Skip tracking
    was_skipped BOOLEAN DEFAULT FALSE,
    skip_reason TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(session_id, checklist_item_id)
);

-- Índices para checklist_completions
CREATE INDEX idx_checklist_completions_session ON checklist_completions(session_id);
CREATE INDEX idx_checklist_completions_item ON checklist_completions(checklist_item_id);
CREATE INDEX idx_checklist_completions_pending ON checklist_completions(is_completed) 
    WHERE is_completed = FALSE;

-- =============================================
-- TABLA: quick_attendance
-- Propósito: Check-in rápido de un toque para instructores (complementa checkins existente)
-- =============================================
CREATE TABLE IF NOT EXISTS quick_attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES instructor_sessions(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    clase_id UUID NOT NULL REFERENCES clases(id) ON DELETE CASCADE,
    
    -- Método de check-in
    checkin_method VARCHAR(20) NOT NULL,
    -- Métodos: instructor_tap, qr_scan, manual_entry, auto_confirmed
    
    -- Timestamps
    checked_in_at TIMESTAMPTZ DEFAULT NOW(),
    checked_in_by UUID REFERENCES instructors(id),
    
    -- Estado
    attendance_status VARCHAR(20) NOT NULL DEFAULT 'present',
    -- Estados: present, late, absent, excused
    
    -- Notas del instructor
    instructor_notes TEXT,
    
    -- Sincronización con tabla checkins principal
    synced_to_checkins BOOLEAN DEFAULT FALSE,
    checkin_id UUID REFERENCES checkins(id),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(session_id, member_id)
);

-- Índices para quick_attendance
CREATE INDEX idx_quick_attendance_session ON quick_attendance(session_id);
CREATE INDEX idx_quick_attendance_member ON quick_attendance(member_id);
CREATE INDEX idx_quick_attendance_clase ON quick_attendance(clase_id);
CREATE INDEX idx_quick_attendance_unsynced ON quick_attendance(synced_to_checkins) 
    WHERE synced_to_checkins = FALSE;

-- =============================================
-- VISTAS MATERIALIZADAS
-- =============================================

-- Vista: Sesiones activas con métricas en tiempo real
CREATE MATERIALIZED VIEW IF NOT EXISTS v_active_instructor_sessions AS
SELECT 
    s.id AS session_id,
    s.instructor_id,
    i.nombre AS instructor_name,
    s.clase_id,
    c.nombre AS class_name,
    c.tipo AS class_type,
    s.session_status,
    s.scheduled_start,
    s.scheduled_end,
    s.actual_start,
    s.expected_students,
    s.checked_in_students,
    s.attendance_rate,
    s.checklist_completed,
    
    -- Alertas activas
    COUNT(DISTINCT aa.id) FILTER (WHERE aa.alert_status = 'active') AS active_alerts_count,
    
    -- Progreso del checklist
    COUNT(DISTINCT cc.id) AS total_checklist_items,
    COUNT(DISTINCT cc.id) FILTER (WHERE cc.is_completed = TRUE) AS completed_checklist_items,
    CASE 
        WHEN COUNT(DISTINCT cc.id) > 0 
        THEN (COUNT(DISTINCT cc.id) FILTER (WHERE cc.is_completed = TRUE)::DECIMAL / COUNT(DISTINCT cc.id) * 100)
        ELSE 100 
    END AS checklist_completion_percentage,
    
    -- Tiempo restante
    EXTRACT(EPOCH FROM (s.scheduled_start - NOW())) / 60 AS minutes_until_start,
    EXTRACT(EPOCH FROM (s.scheduled_end - NOW())) / 60 AS minutes_until_end,
    
    -- Flags
    CASE WHEN s.attendance_rate < 50 THEN TRUE ELSE FALSE END AS is_low_attendance,
    CASE WHEN NOW() > s.scheduled_start + INTERVAL '5 minutes' AND s.actual_start IS NULL 
         THEN TRUE ELSE FALSE END AS is_late_start,
    
    s.last_activity,
    s.created_at
FROM instructor_sessions s
JOIN instructors i ON s.instructor_id = i.id
JOIN clases c ON s.clase_id = c.id
LEFT JOIN attendance_alerts aa ON s.id = aa.session_id
LEFT JOIN checklist_completions cc ON s.id = cc.session_id
WHERE s.session_status IN ('pending', 'active')
    AND s.scheduled_start >= NOW() - INTERVAL '2 hours'
    AND s.scheduled_end <= NOW() + INTERVAL '24 hours'
GROUP BY 
    s.id, s.instructor_id, i.nombre, s.clase_id, c.nombre, c.tipo,
    s.session_status, s.scheduled_start, s.scheduled_end, s.actual_start,
    s.expected_students, s.checked_in_students, s.attendance_rate,
    s.checklist_completed, s.last_activity, s.created_at;

-- Índice para la vista materializada
CREATE UNIQUE INDEX idx_v_active_sessions_session_id ON v_active_instructor_sessions(session_id);
CREATE INDEX idx_v_active_sessions_instructor ON v_active_instructor_sessions(instructor_id);
CREATE INDEX idx_v_active_sessions_status ON v_active_instructor_sessions(session_status);

-- Vista: Dashboard de instructor con estadísticas
CREATE MATERIALIZED VIEW IF NOT EXISTS v_instructor_dashboard AS
SELECT 
    i.id AS instructor_id,
    i.nombre AS instructor_name,
    
    -- Sesiones
    COUNT(DISTINCT s.id) AS total_sessions,
    COUNT(DISTINCT s.id) FILTER (WHERE s.session_status = 'completed') AS completed_sessions,
    COUNT(DISTINCT s.id) FILTER (WHERE s.session_status = 'active') AS active_sessions,
    
    -- Asistencia promedio
    AVG(s.attendance_rate) FILTER (WHERE s.session_status = 'completed') AS avg_attendance_rate,
    
    -- Puntualidad
    COUNT(DISTINCT s.id) FILTER (
        WHERE s.actual_start IS NOT NULL 
        AND s.actual_start <= s.scheduled_start + INTERVAL '5 minutes'
    ) AS on_time_starts,
    
    -- Alertas
    COUNT(DISTINCT aa.id) AS total_alerts,
    COUNT(DISTINCT aa.id) FILTER (WHERE aa.alert_status = 'active') AS active_alerts,
    AVG(aa.response_time_seconds) AS avg_alert_response_time,
    
    -- Checklist compliance
    AVG(CASE 
        WHEN s.checklist_completed = TRUE THEN 100.0 
        ELSE 0.0 
    END) AS checklist_completion_rate,
    
    -- Última actividad
    MAX(s.last_activity) AS last_activity,
    
    -- Período de análisis (últimos 30 días)
    NOW() - INTERVAL '30 days' AS period_start,
    NOW() AS period_end
FROM instructors i
LEFT JOIN instructor_sessions s ON i.id = s.instructor_id 
    AND s.created_at >= NOW() - INTERVAL '30 days'
LEFT JOIN attendance_alerts aa ON s.id = aa.session_id
GROUP BY i.id, i.nombre;

-- Índice para la vista materializada
CREATE UNIQUE INDEX idx_v_instructor_dashboard_instructor ON v_instructor_dashboard(instructor_id);

-- =============================================
-- FUNCIONES STORED
-- =============================================

-- Función: Iniciar sesión de instructor
CREATE OR REPLACE FUNCTION start_instructor_session(
    p_instructor_id UUID,
    p_clase_id UUID,
    p_device_info JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_session_id UUID;
    v_scheduled_start TIMESTAMPTZ;
    v_scheduled_end TIMESTAMPTZ;
    v_expected_students INTEGER;
BEGIN
    -- Obtener datos de la clase
    SELECT fecha_hora, fecha_hora + (duracion_minutos || ' minutes')::INTERVAL
    INTO v_scheduled_start, v_scheduled_end
    FROM clases
    WHERE id = p_clase_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Clase no encontrada: %', p_clase_id;
    END IF;
    
    -- Contar estudiantes esperados (reservas + check-ins previos)
    SELECT COUNT(DISTINCT member_id)
    INTO v_expected_students
    FROM (
        SELECT member_id FROM reservas WHERE clase_id = p_clase_id AND estado = 'confirmed'
        UNION
        SELECT member_id FROM checkins WHERE clase_id = p_clase_id
    ) expected;
    
    -- Crear o actualizar sesión
    INSERT INTO instructor_sessions (
        instructor_id,
        clase_id,
        session_status,
        scheduled_start,
        scheduled_end,
        expected_students,
        device_info
    ) VALUES (
        p_instructor_id,
        p_clase_id,
        'active',
        v_scheduled_start,
        v_scheduled_end,
        v_expected_students,
        p_device_info
    )
    ON CONFLICT (instructor_id, clase_id) 
    WHERE session_status IN ('pending', 'active')
    DO UPDATE SET
        session_status = 'active',
        actual_start = COALESCE(instructor_sessions.actual_start, NOW()),
        device_info = EXCLUDED.device_info,
        last_activity = NOW()
    RETURNING id INTO v_session_id;
    
    -- Crear checklist items para esta sesión
    INSERT INTO checklist_completions (session_id, checklist_item_id)
    SELECT v_session_id, cl.id
    FROM class_checklists cl
    JOIN clases c ON c.id = p_clase_id
    WHERE cl.is_active = TRUE
        AND (cl.clase_tipo = c.tipo OR cl.clase_id = c.id)
    ON CONFLICT (session_id, checklist_item_id) DO NOTHING;
    
    RETURN v_session_id;
END;
$$ LANGUAGE plpgsql;

-- Función: Check-in rápido de estudiante
CREATE OR REPLACE FUNCTION quick_checkin_student(
    p_session_id UUID,
    p_member_id UUID,
    p_instructor_id UUID,
    p_notes TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_attendance_id UUID;
    v_clase_id UUID;
    v_checkin_id UUID;
BEGIN
    -- Obtener clase_id de la sesión
    SELECT clase_id INTO v_clase_id
    FROM instructor_sessions
    WHERE id = p_session_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Sesión no encontrada: %', p_session_id;
    END IF;
    
    -- Crear quick attendance
    INSERT INTO quick_attendance (
        session_id,
        member_id,
        clase_id,
        checkin_method,
        checked_in_by,
        attendance_status,
        instructor_notes
    ) VALUES (
        p_session_id,
        p_member_id,
        v_clase_id,
        'instructor_tap',
        p_instructor_id,
        'present',
        p_notes
    )
    ON CONFLICT (session_id, member_id) DO UPDATE SET
        checked_in_at = NOW(),
        instructor_notes = COALESCE(EXCLUDED.instructor_notes, quick_attendance.instructor_notes)
    RETURNING id INTO v_attendance_id;
    
    -- Sincronizar con tabla checkins principal
    INSERT INTO checkins (
        member_id,
        clase_id,
        fecha_hora,
        metodo_checkin
    ) VALUES (
        p_member_id,
        v_clase_id,
        NOW(),
        'instructor_manual'
    )
    ON CONFLICT (member_id, clase_id, DATE(fecha_hora)) DO NOTHING
    RETURNING id INTO v_checkin_id;
    
    -- Actualizar sincronización
    UPDATE quick_attendance
    SET synced_to_checkins = TRUE,
        checkin_id = v_checkin_id
    WHERE id = v_attendance_id;
    
    -- Actualizar contador en sesión
    UPDATE instructor_sessions
    SET checked_in_students = (
            SELECT COUNT(*) FROM quick_attendance 
            WHERE session_id = p_session_id AND attendance_status = 'present'
        ),
        last_activity = NOW()
    WHERE id = p_session_id;
    
    RETURN v_attendance_id;
END;
$$ LANGUAGE plpgsql;

-- Función: Completar item del checklist
CREATE OR REPLACE FUNCTION complete_checklist_item(
    p_session_id UUID,
    p_checklist_item_id UUID,
    p_instructor_id UUID,
    p_notes TEXT DEFAULT NULL,
    p_issues_found TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    v_all_completed BOOLEAN;
BEGIN
    -- Marcar item como completado
    UPDATE checklist_completions
    SET is_completed = TRUE,
        completed_at = NOW(),
        completed_by = p_instructor_id,
        notes = p_notes,
        issues_found = p_issues_found,
        updated_at = NOW()
    WHERE session_id = p_session_id
        AND checklist_item_id = p_checklist_item_id;
    
    -- Verificar si todos los items están completos
    SELECT BOOL_AND(is_completed)
    INTO v_all_completed
    FROM checklist_completions
    WHERE session_id = p_session_id;
    
    -- Actualizar sesión si checklist está completo
    IF v_all_completed THEN
        UPDATE instructor_sessions
        SET checklist_completed = TRUE,
            checklist_completed_at = NOW(),
            last_activity = NOW()
        WHERE id = p_session_id;
    END IF;
    
    RETURN v_all_completed;
END;
$$ LANGUAGE plpgsql;

-- Función: Crear alerta de asistencia
CREATE OR REPLACE FUNCTION create_attendance_alert(
    p_session_id UUID,
    p_alert_type VARCHAR,
    p_alert_message TEXT,
    p_alert_details JSONB DEFAULT NULL,
    p_severity VARCHAR DEFAULT 'medium'
) RETURNS UUID AS $$
DECLARE
    v_alert_id UUID;
    v_instructor_id UUID;
    v_clase_id UUID;
BEGIN
    -- Obtener datos de la sesión
    SELECT instructor_id, clase_id
    INTO v_instructor_id, v_clase_id
    FROM instructor_sessions
    WHERE id = p_session_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Sesión no encontrada: %', p_session_id;
    END IF;
    
    -- Crear alerta
    INSERT INTO attendance_alerts (
        session_id,
        instructor_id,
        clase_id,
        alert_type,
        alert_message,
        alert_details,
        alert_severity,
        alert_status
    ) VALUES (
        p_session_id,
        v_instructor_id,
        v_clase_id,
        p_alert_type,
        p_alert_message,
        p_alert_details,
        p_severity,
        'active'
    )
    RETURNING id INTO v_alert_id;
    
    RETURN v_alert_id;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- TRIGGERS
-- =============================================

-- Trigger: Actualizar timestamp updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_instructor_sessions_updated_at
    BEFORE UPDATE ON instructor_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_attendance_alerts_updated_at
    BEFORE UPDATE ON attendance_alerts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_class_checklists_updated_at
    BEFORE UPDATE ON class_checklists
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_checklist_completions_updated_at
    BEFORE UPDATE ON checklist_completions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger: Detectar asistencia baja y crear alertas automáticas
CREATE OR REPLACE FUNCTION check_low_attendance()
RETURNS TRIGGER AS $$
BEGIN
    -- Si la asistencia cae por debajo del 50% y no se ha enviado alerta
    IF NEW.attendance_rate < 50 AND NEW.low_attendance_alert_sent = FALSE THEN
        PERFORM create_attendance_alert(
            NEW.id,
            'low_attendance',
            format('Asistencia baja: %s de %s estudiantes (%s%%)', 
                   NEW.checked_in_students, NEW.expected_students, ROUND(NEW.attendance_rate, 1)),
            jsonb_build_object(
                'expected', NEW.expected_students,
                'actual', NEW.checked_in_students,
                'rate', NEW.attendance_rate
            ),
            CASE 
                WHEN NEW.attendance_rate < 30 THEN 'high'
                ELSE 'medium'
            END
        );
        
        NEW.low_attendance_alert_sent = TRUE;
    END IF;
    
    -- Detectar inicio tardío (>5 minutos después de hora programada)
    IF NOW() > NEW.scheduled_start + INTERVAL '5 minutes' 
       AND NEW.actual_start IS NULL 
       AND NEW.late_start_alert_sent = FALSE THEN
        PERFORM create_attendance_alert(
            NEW.id,
            'late_start',
            'Clase no iniciada 5 minutos después de hora programada',
            jsonb_build_object(
                'scheduled_start', NEW.scheduled_start,
                'current_time', NOW(),
                'minutes_late', EXTRACT(EPOCH FROM (NOW() - NEW.scheduled_start)) / 60
            ),
            'high'
        );
        
        NEW.late_start_alert_sent = TRUE;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_low_attendance
    BEFORE UPDATE ON instructor_sessions
    FOR EACH ROW
    WHEN (OLD.checked_in_students IS DISTINCT FROM NEW.checked_in_students 
          OR OLD.actual_start IS DISTINCT FROM NEW.actual_start)
    EXECUTE FUNCTION check_low_attendance();

-- Trigger: Refrescar vistas materializadas en cambios relevantes
CREATE OR REPLACE FUNCTION refresh_instructor_views()
RETURNS TRIGGER AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY v_active_instructor_sessions;
    REFRESH MATERIALIZED VIEW CONCURRENTLY v_instructor_dashboard;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar refresh cada 30 segundos (implementar con pg_cron o similar)
-- O refrescar manualmente en requests de API

-- =============================================
-- DATOS SEMILLA PARA CHECKLISTS
-- =============================================

-- Checklist para clases de Spinning
INSERT INTO class_checklists (clase_tipo, item_order, item_title, item_description, item_category, estimated_time_minutes) VALUES
('Spinning', 1, 'Verificar bicicletas funcionando', 'Revisar que todas las bicicletas estén operativas y con resistencia adecuada', 'equipment', 5),
('Spinning', 2, 'Ajustar sistema de audio', 'Verificar que el audio funcione correctamente y ajustar volumen', 'environment', 2),
('Spinning', 3, 'Preparar playlist', 'Tener lista de reproducción cargada y probada', 'preparation', 3),
('Spinning', 4, 'Verificar ventilación/temperatura', 'Confirmar que aire acondicionado o ventiladores estén funcionando', 'environment', 2),
('Spinning', 5, 'Revisar kit de primeros auxilios', 'Verificar disponibilidad y ubicación de kit médico', 'safety', 1);

-- Checklist para clases de Funcional
INSERT INTO class_checklists (clase_tipo, item_order, item_title, item_description, item_category, estimated_time_minutes) VALUES
('Funcional', 1, 'Preparar equipo (TRX, mancuernas, etc)', 'Colocar todo el equipo necesario en área de clase', 'equipment', 7),
('Funcional', 2, 'Marcar espacios de trabajo', 'Delimitar zonas para cada estudiante', 'environment', 3),
('Funcional', 3, 'Verificar colchonetas limpias', 'Revisar que haya suficientes colchonetas en buen estado', 'equipment', 2),
('Funcional', 4, 'Revisar kit de primeros auxilios', 'Verificar disponibilidad y ubicación de kit médico', 'safety', 1),
('Funcional', 5, 'Preparar cronómetro/timer', 'Configurar dispositivo para intervalos de ejercicio', 'preparation', 2);

-- Checklist para clases de Yoga
INSERT INTO class_checklists (clase_tipo, item_order, item_title, item_description, item_category, estimated_time_minutes) VALUES
('Yoga', 1, 'Verificar colchonetas disponibles', 'Confirmar colchonetas suficientes y limpias', 'equipment', 3),
('Yoga', 2, 'Preparar ambiente (luz/música)', 'Ajustar iluminación suave y música relajante', 'environment', 4),
('Yoga', 3, 'Verificar bloques y cintos', 'Revisar disponibilidad de props para asistencia', 'equipment', 2),
('Yoga', 4, 'Ajustar temperatura ambiente', 'Confirmar temperatura cómoda (22-24°C)', 'environment', 1),
('Yoga', 5, 'Preparar secuencia de clase', 'Revisar mentalmente flow y transiciones', 'preparation', 5);

-- Checklist general para todas las clases
INSERT INTO class_checklists (clase_tipo, item_order, item_title, item_description, item_category, estimated_time_minutes) VALUES
('General', 1, 'Verificar lista de asistencia', 'Revisar estudiantes esperados en la clase', 'preparation', 2),
('General', 2, 'Confirmar acceso a panel de instructor', 'Verificar que dispositivo móvil acceda al sistema', 'preparation', 1),
('General', 3, 'Revisar área limpia y ordenada', 'Confirmar que espacio esté en condiciones', 'environment', 3);

-- =============================================
-- ÍNDICES ADICIONALES PARA PERFORMANCE
-- =============================================

-- Índices para búsquedas frecuentes
CREATE INDEX idx_quick_attendance_recent ON quick_attendance(checked_in_at DESC) 
    WHERE checked_in_at >= NOW() - INTERVAL '7 days';

CREATE INDEX idx_attendance_alerts_recent ON attendance_alerts(created_at DESC)
    WHERE created_at >= NOW() - INTERVAL '7 days';

-- Índice para sincronización de quick_attendance
CREATE INDEX idx_quick_attendance_sync_pending ON quick_attendance(created_at) 
    WHERE synced_to_checkins = FALSE;

-- =============================================
-- COMENTARIOS PARA DOCUMENTACIÓN
-- =============================================

COMMENT ON TABLE instructor_sessions IS 'Sesiones activas de instructores con métricas en tiempo real para panel móvil';
COMMENT ON TABLE attendance_alerts IS 'Sistema de alertas proactivas para asistencia baja y problemas en clase';
COMMENT ON TABLE class_checklists IS 'Items de preparación de clase personalizables por tipo de actividad';
COMMENT ON TABLE checklist_completions IS 'Registro de completación de checklist por sesión de instructor';
COMMENT ON TABLE quick_attendance IS 'Check-in rápido de un toque para instructores (sincroniza con checkins)';

COMMENT ON FUNCTION start_instructor_session IS 'Iniciar sesión de instructor y crear checklist automáticamente';
COMMENT ON FUNCTION quick_checkin_student IS 'Check-in de un toque que sincroniza con tabla checkins principal';
COMMENT ON FUNCTION complete_checklist_item IS 'Marcar item de checklist completo y verificar si todo está listo';
COMMENT ON FUNCTION create_attendance_alert IS 'Crear alerta de asistencia o problema en clase';

COMMENT ON MATERIALIZED VIEW v_active_instructor_sessions IS 'Vista en tiempo real de sesiones activas con métricas';
COMMENT ON MATERIALIZED VIEW v_instructor_dashboard IS 'Dashboard de instructor con estadísticas de 30 días';
