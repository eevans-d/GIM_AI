-- System Logs Table for Centralized Logging - PROMPT 16
-- Tabla para almacenar logs del sistema de forma estructurada

CREATE TABLE IF NOT EXISTS system_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level VARCHAR(20) NOT NULL CHECK (level IN ('debug', 'info', 'warn', 'error', 'critical')),
  message TEXT NOT NULL,
  context VARCHAR(100),
  correlation_id UUID,
  user_id UUID REFERENCES members(id) ON DELETE SET NULL,
  action VARCHAR(100),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Índices para búsqueda eficiente
  CONSTRAINT valid_level CHECK (level IN ('debug', 'info', 'warn', 'error', 'critical'))
);

-- Índices optimizados para queries comunes
CREATE INDEX idx_system_logs_level ON system_logs(level);
CREATE INDEX idx_system_logs_created_at ON system_logs(created_at DESC);
CREATE INDEX idx_system_logs_correlation_id ON system_logs(correlation_id) WHERE correlation_id IS NOT NULL;
CREATE INDEX idx_system_logs_user_id ON system_logs(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_system_logs_context ON system_logs(context);
CREATE INDEX idx_system_logs_level_created ON system_logs(level, created_at DESC);

-- Índice GIN para búsqueda en metadata JSONB
CREATE INDEX idx_system_logs_metadata ON system_logs USING GIN (metadata);

-- Función para limpiar logs antiguos (retention policy)
CREATE OR REPLACE FUNCTION cleanup_old_logs()
RETURNS void AS $$
BEGIN
  -- Eliminar logs debug/info más antiguos de 30 días
  DELETE FROM system_logs 
  WHERE level IN ('debug', 'info') 
    AND created_at < NOW() - INTERVAL '30 days';
  
  -- Eliminar logs warn/error más antiguos de 90 días
  DELETE FROM system_logs 
  WHERE level IN ('warn', 'error') 
    AND created_at < NOW() - INTERVAL '90 days';
  
  -- Eliminar logs critical más antiguos de 1 año
  DELETE FROM system_logs 
  WHERE level = 'critical' 
    AND created_at < NOW() - INTERVAL '365 days';
    
  RAISE NOTICE 'Old logs cleaned up successfully';
END;
$$ LANGUAGE plpgsql;

-- Trigger para limitar tamaño de metadata (max 5KB)
CREATE OR REPLACE FUNCTION validate_log_metadata()
RETURNS TRIGGER AS $$
BEGIN
  IF pg_column_size(NEW.metadata) > 5120 THEN
    RAISE EXCEPTION 'Metadata size exceeds 5KB limit';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_log_metadata
  BEFORE INSERT OR UPDATE ON system_logs
  FOR EACH ROW
  EXECUTE FUNCTION validate_log_metadata();

-- Vista para resumen de logs por hora
CREATE OR REPLACE VIEW system_logs_hourly_summary AS
SELECT 
  date_trunc('hour', created_at) as hour,
  level,
  context,
  COUNT(*) as count,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(DISTINCT correlation_id) as unique_operations
FROM system_logs
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY date_trunc('hour', created_at), level, context
ORDER BY hour DESC, count DESC;

-- Vista para errores frecuentes
CREATE OR REPLACE VIEW frequent_errors AS
SELECT 
  message,
  level,
  context,
  COUNT(*) as occurrences,
  MAX(created_at) as last_occurrence,
  MIN(created_at) as first_occurrence,
  COUNT(DISTINCT user_id) as affected_users
FROM system_logs
WHERE level IN ('error', 'critical')
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY message, level, context
HAVING COUNT(*) > 1
ORDER BY occurrences DESC
LIMIT 50;

-- Función para obtener estadísticas de logs
CREATE OR REPLACE FUNCTION get_log_statistics(
  p_hours INTEGER DEFAULT 24
)
RETURNS TABLE (
  level VARCHAR(20),
  total_count BIGINT,
  unique_users BIGINT,
  unique_operations BIGINT,
  avg_per_hour NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sl.level,
    COUNT(*) as total_count,
    COUNT(DISTINCT sl.user_id) as unique_users,
    COUNT(DISTINCT sl.correlation_id) as unique_operations,
    ROUND(COUNT(*)::NUMERIC / p_hours, 2) as avg_per_hour
  FROM system_logs sl
  WHERE sl.created_at > NOW() - (p_hours || ' hours')::INTERVAL
  GROUP BY sl.level
  ORDER BY total_count DESC;
END;
$$ LANGUAGE plpgsql;

-- Comentarios para documentación
COMMENT ON TABLE system_logs IS 'Centralized system logging table for all application logs';
COMMENT ON COLUMN system_logs.correlation_id IS 'UUID for tracking related logs across operations';
COMMENT ON COLUMN system_logs.metadata IS 'Additional structured data (max 5KB)';
COMMENT ON FUNCTION cleanup_old_logs() IS 'Automated retention policy: 30d for info, 90d for errors, 365d for critical';
