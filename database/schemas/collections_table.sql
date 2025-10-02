-- ===================================
-- PROMPT 7: Contextual Collection System
-- Tabla para tracking de cobranza post-entrenamiento
-- ===================================

-- Tabla principal de cobranza contextual
CREATE TABLE IF NOT EXISTS collections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    checkin_id UUID NOT NULL REFERENCES checkins(id) ON DELETE CASCADE,
    
    -- Información de deuda
    debt_amount DECIMAL(10,2) NOT NULL,
    original_debt DECIMAL(10,2) NOT NULL,
    
    -- Información del mensaje
    message_sent_at TIMESTAMP WITH TIME ZONE,
    message_template VARCHAR(100) DEFAULT 'debt_post_workout',
    payment_link VARCHAR(500),
    
    -- Tracking de conversión
    payment_received_at TIMESTAMP WITH TIME ZONE,
    payment_amount DECIMAL(10,2),
    conversion_time_minutes INTEGER,
    
    -- Metadata
    class_name VARCHAR(100),
    class_type VARCHAR(50),
    scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) DEFAULT 'scheduled', -- scheduled, sent, paid, ignored, failed
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT fk_member FOREIGN KEY (member_id) REFERENCES members(id),
    CONSTRAINT fk_checkin FOREIGN KEY (checkin_id) REFERENCES checkins(id),
    CONSTRAINT check_status CHECK (status IN ('scheduled', 'sent', 'paid', 'ignored', 'failed', 'cancelled'))
);

-- Índices para optimización de queries
CREATE INDEX idx_collections_member_id ON collections(member_id);
CREATE INDEX idx_collections_checkin_id ON collections(checkin_id);
CREATE INDEX idx_collections_status ON collections(status);
CREATE INDEX idx_collections_scheduled_for ON collections(scheduled_for) WHERE status = 'scheduled';
CREATE INDEX idx_collections_member_status ON collections(member_id, status);
CREATE INDEX idx_collections_created_at ON collections(created_at DESC);

-- Índice para análisis de conversión
CREATE INDEX idx_collections_conversion ON collections(status, conversion_time_minutes) 
WHERE status = 'paid' AND conversion_time_minutes IS NOT NULL;

-- Comentarios para documentación
COMMENT ON TABLE collections IS 'Tracking de cobranza contextual post-entrenamiento (PROMPT 7)';
COMMENT ON COLUMN collections.debt_amount IS 'Monto de deuda actual al momento del mensaje';
COMMENT ON COLUMN collections.conversion_time_minutes IS 'Minutos desde mensaje enviado hasta pago recibido';
COMMENT ON COLUMN collections.scheduled_for IS 'Timestamp programado para envío (checkin + 90 min)';

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_collections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_collections_updated_at
    BEFORE UPDATE ON collections
    FOR EACH ROW
    EXECUTE FUNCTION update_collections_updated_at();

-- Función para obtener estadísticas de conversión
CREATE OR REPLACE FUNCTION get_collection_conversion_stats(
    p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
    total_sent INTEGER,
    total_paid INTEGER,
    conversion_rate DECIMAL(5,2),
    avg_conversion_time_minutes INTEGER,
    total_collected DECIMAL(10,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER AS total_sent,
        COUNT(CASE WHEN status = 'paid' THEN 1 END)::INTEGER AS total_paid,
        ROUND(
            (COUNT(CASE WHEN status = 'paid' THEN 1 END)::DECIMAL / 
            NULLIF(COUNT(*), 0) * 100), 
            2
        ) AS conversion_rate,
        ROUND(AVG(conversion_time_minutes))::INTEGER AS avg_conversion_time_minutes,
        SUM(CASE WHEN status = 'paid' THEN payment_amount ELSE 0 END) AS total_collected
    FROM collections
    WHERE message_sent_at >= NOW() - INTERVAL '1 day' * p_days
    AND status IN ('sent', 'paid', 'ignored');
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_collection_conversion_stats IS 'Obtiene estadísticas de conversión de cobranza contextual';
