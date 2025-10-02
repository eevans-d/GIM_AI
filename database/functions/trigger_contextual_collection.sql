-- ===================================
-- PROMPT 7: Trigger para Cobranza Contextual
-- Se dispara automáticamente después de cada check-in
-- ===================================

-- Función que verifica deuda y programa cobranza contextual
CREATE OR REPLACE FUNCTION schedule_contextual_collection()
RETURNS TRIGGER AS $$
DECLARE
    v_member_debt DECIMAL(10,2);
    v_last_payment_date DATE;
    v_delay_minutes INTEGER;
    v_class_name VARCHAR(100);
    v_class_type VARCHAR(50);
BEGIN
    -- Solo procesar si el check-in fue exitoso y de tipo cliente/kiosk
    IF NEW.source NOT IN ('qr_cliente', 'qr_kiosk', 'manual') THEN
        RETURN NEW;
    END IF;

    -- Obtener deuda actual del miembro
    SELECT p.deuda_actual, p.fecha_ultimo_pago
    INTO v_member_debt, v_last_payment_date
    FROM payments p
    WHERE p.member_id = NEW.member_id
    ORDER BY p.created_at DESC
    LIMIT 1;

    -- Si no tiene deuda o deuda es menor a $100, no enviar mensaje
    IF v_member_debt IS NULL OR v_member_debt < 100 THEN
        RETURN NEW;
    END IF;

    -- Si pagó en los últimos 7 días, no molestar
    IF v_last_payment_date IS NOT NULL AND v_last_payment_date >= CURRENT_DATE - INTERVAL '7 days' THEN
        RETURN NEW;
    END IF;

    -- Obtener información de la clase
    IF NEW.class_id IS NOT NULL THEN
        SELECT c.name, c.class_type
        INTO v_class_name, v_class_type
        FROM classes c
        WHERE c.id = NEW.class_id;
    END IF;

    -- Calcular delay según configuración (default 90 minutos)
    v_delay_minutes := COALESCE(
        (SELECT CAST(value AS INTEGER) FROM system_config WHERE key = 'collection_delay_minutes'),
        90
    );

    -- Crear registro de cobranza programada
    INSERT INTO collections (
        member_id,
        checkin_id,
        debt_amount,
        original_debt,
        class_name,
        class_type,
        scheduled_for,
        status
    ) VALUES (
        NEW.member_id,
        NEW.id,
        v_member_debt,
        v_member_debt,
        v_class_name,
        v_class_type,
        NEW.fecha_hora + (v_delay_minutes || ' minutes')::INTERVAL,
        'scheduled'
    );

    -- Log para debugging
    INSERT INTO system_logs (level, component, message, metadata, correlation_id)
    VALUES (
        'INFO',
        'contextual-collection-trigger',
        'Collection scheduled',
        jsonb_build_object(
            'member_id', NEW.member_id,
            'checkin_id', NEW.id,
            'debt_amount', v_member_debt,
            'scheduled_for', NEW.fecha_hora + (v_delay_minutes || ' minutes')::INTERVAL
        ),
        'trigger_' || NEW.id::TEXT
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger que se ejecuta AFTER INSERT en checkins
DROP TRIGGER IF EXISTS trigger_schedule_contextual_collection ON checkins;

CREATE TRIGGER trigger_schedule_contextual_collection
    AFTER INSERT ON checkins
    FOR EACH ROW
    EXECUTE FUNCTION schedule_contextual_collection();

COMMENT ON FUNCTION schedule_contextual_collection IS 'Trigger function que programa cobranza contextual 90min después del check-in si hay deuda';
COMMENT ON TRIGGER trigger_schedule_contextual_collection ON checkins IS 'Ejecuta cobranza contextual automáticamente después de cada check-in';

-- Función auxiliar para detectar deuda de un miembro específico
CREATE OR REPLACE FUNCTION detect_member_debt(
    p_member_id UUID
)
RETURNS TABLE (
    member_id UUID,
    member_name VARCHAR(200),
    phone VARCHAR(20),
    debt_amount DECIMAL(10,2),
    last_payment_date DATE,
    days_overdue INTEGER,
    membership_status VARCHAR(20)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.id,
        CONCAT(m.first_name, ' ', m.last_name),
        m.phone,
        p.deuda_actual,
        p.fecha_ultimo_pago,
        EXTRACT(DAY FROM (CURRENT_DATE - p.fecha_ultimo_pago))::INTEGER,
        m.membership_status
    FROM members m
    LEFT JOIN payments p ON m.id = p.member_id
    WHERE m.id = p_member_id
    AND p.deuda_actual > 0
    ORDER BY p.created_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION detect_member_debt IS 'Detecta y retorna información de deuda de un miembro específico';

-- Función para obtener colecciones pendientes de envío
CREATE OR REPLACE FUNCTION get_pending_collections(
    p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
    collection_id UUID,
    member_id UUID,
    member_name VARCHAR(200),
    phone VARCHAR(20),
    debt_amount DECIMAL(10,2),
    class_name VARCHAR(100),
    scheduled_for TIMESTAMP WITH TIME ZONE,
    minutes_until_send INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.member_id,
        CONCAT(m.first_name, ' ', m.last_name),
        m.phone,
        c.debt_amount,
        c.class_name,
        c.scheduled_for,
        EXTRACT(EPOCH FROM (c.scheduled_for - NOW()))::INTEGER / 60
    FROM collections c
    JOIN members m ON c.member_id = m.id
    WHERE c.status = 'scheduled'
    AND c.scheduled_for <= NOW() + INTERVAL '5 minutes' -- Buffer de 5 minutos
    AND m.whatsapp_opted_in = true
    ORDER BY c.scheduled_for ASC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_pending_collections IS 'Obtiene colecciones programadas listas para envío';

-- Tabla de configuración del sistema (si no existe)
CREATE TABLE IF NOT EXISTS system_config (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insertar configuración por defecto
INSERT INTO system_config (key, value, description)
VALUES 
    ('collection_delay_minutes', '90', 'Minutos de delay después del check-in para enviar mensaje de cobranza'),
    ('collection_min_debt_amount', '100', 'Monto mínimo de deuda para enviar mensaje de cobranza'),
    ('collection_conversion_target', '0.68', 'Target de conversión (68%) para cobranza contextual')
ON CONFLICT (key) DO NOTHING;
