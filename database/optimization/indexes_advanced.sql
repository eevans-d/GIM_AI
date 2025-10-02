-- PROMPT 20: DATABASE OPTIMIZATION - ADVANCED INDEXES
-- Indexes compuestos, parciales y especializados para máximo performance

-- ============================================
-- COMPOSITE INDEXES (Queries con múltiples condiciones)
-- ============================================

-- Búsquedas de check-ins por miembro y rango de fechas (común en reportes)
CREATE INDEX IF NOT EXISTS idx_checkins_member_date_composite 
ON checkins(miembro_id, fecha DESC);

-- Búsquedas de clases por tipo y horario (búsquedas de clases disponibles)
CREATE INDEX IF NOT EXISTS idx_clases_tipo_horario_composite 
ON clases(tipo_clase, horario_inicio);

-- Búsquedas de pagos por miembro y estado (deuda detection)
CREATE INDEX IF NOT EXISTS idx_pagos_member_status_composite 
ON payments(member_id, payment_status, payment_date DESC);

-- Reservas por clase y estado (occupancy calculation)
CREATE INDEX IF NOT EXISTS idx_reservas_clase_status_composite 
ON reservas(clase_id, status) WHERE status != 'cancelled';

-- ============================================
-- PARTIAL INDEXES (Solo filas relevantes)
-- ============================================

-- Solo miembros activos (95% de queries)
CREATE INDEX IF NOT EXISTS idx_members_active_partial 
ON members(id, nombre, telefono) WHERE activo = TRUE;

-- Solo check-ins últimos 90 días (queries de engagement)
CREATE INDEX IF NOT EXISTS idx_checkins_recent_partial 
ON checkins(miembro_id, fecha) 
WHERE fecha >= CURRENT_DATE - INTERVAL '90 days';

-- Solo clases futuras (reservas y disponibilidad)
CREATE INDEX IF NOT EXISTS idx_clases_upcoming_partial 
ON clases(id, horario_inicio, capacidad_maxima) 
WHERE horario_inicio >= NOW();

-- Solo pagos pendientes (debt collection)
CREATE INDEX IF NOT EXISTS idx_payments_pending_partial 
ON payments(member_id, amount, due_date) 
WHERE payment_status = 'pending';

-- Solo suscripciones activas de tiers premium (tier system)
CREATE INDEX IF NOT EXISTS idx_tier_subs_active_partial 
ON member_tier_subscriptions(member_id, tier_name, monthly_price) 
WHERE status = 'active';

-- ============================================
-- GIN INDEXES (JSONB y arrays)
-- ============================================

-- Training plans con JSONB (búsquedas en plan_details)
CREATE INDEX IF NOT EXISTS idx_training_plans_details_gin 
ON training_plans USING gin(plan_details);

-- WhatsApp message metadata (si tuviéramos JSONB metadata)
-- CREATE INDEX IF NOT EXISTS idx_whatsapp_metadata_gin 
-- ON whatsapp_messages USING gin(metadata);

-- ============================================
-- BRIN INDEXES (Datos temporales grandes)
-- ============================================

-- Check-ins por fecha (tabla grande, orden cronológico)
CREATE INDEX IF NOT EXISTS idx_checkins_fecha_brin 
ON checkins USING brin(fecha) WITH (pages_per_range = 128);

-- Payments por fecha (tabla grande, orden cronológico)
CREATE INDEX IF NOT EXISTS idx_payments_date_brin 
ON payments USING brin(payment_date) WITH (pages_per_range = 128);

-- Coaching sessions por fecha (orden cronológico)
CREATE INDEX IF NOT EXISTS idx_coaching_sessions_date_brin 
ON coaching_sessions USING brin(session_date) WITH (pages_per_range = 128);

-- ============================================
-- COVERING INDEXES (Include columns)
-- ============================================

-- Members con columnas más consultadas incluidas
CREATE INDEX IF NOT EXISTS idx_members_id_covering 
ON members(id) INCLUDE (nombre, telefono, email, activo);

-- Clases con info completa para listados
CREATE INDEX IF NOT EXISTS idx_clases_tipo_covering 
ON clases(tipo_clase) INCLUDE (nombre, horario_inicio, instructor, capacidad_maxima);

-- ============================================
-- EXPRESSION INDEXES (Funciones en WHERE)
-- ============================================

-- Búsquedas case-insensitive de miembros
CREATE INDEX IF NOT EXISTS idx_members_nombre_lower 
ON members(LOWER(nombre));

CREATE INDEX IF NOT EXISTS idx_members_email_lower 
ON members(LOWER(email));

-- Extraer día de la semana de clases (búsquedas por día)
CREATE INDEX IF NOT EXISTS idx_clases_day_of_week 
ON clases((EXTRACT(DOW FROM horario_inicio)));

-- Mes de pagos (reportes mensuales)
CREATE INDEX IF NOT EXISTS idx_payments_month_year 
ON payments((DATE_TRUNC('month', payment_date)));

-- ============================================
-- UNIQUE INDEXES (Constraints + Performance)
-- ============================================

-- QR codes únicos por miembro
CREATE UNIQUE INDEX IF NOT EXISTS idx_members_qr_unique 
ON members(codigo_qr) WHERE codigo_qr IS NOT NULL;

-- Teléfono único (evitar duplicados)
CREATE UNIQUE INDEX IF NOT EXISTS idx_members_phone_unique 
ON members(telefono) WHERE activo = TRUE;

-- Email único
CREATE UNIQUE INDEX IF NOT EXISTS idx_members_email_unique 
ON members(email) WHERE email IS NOT NULL AND activo = TRUE;

-- ============================================
-- STATISTICS & COMMENTS
-- ============================================

-- Actualizar estadísticas después de crear indexes
ANALYZE members;
ANALYZE checkins;
ANALYZE clases;
ANALYZE payments;
ANALYZE reservas;
ANALYZE member_tier_subscriptions;
ANALYZE coaching_sessions;
ANALYZE training_plans;

COMMENT ON INDEX idx_checkins_member_date_composite IS 'Composite index: check-ins por miembro y fecha (reportes)';
COMMENT ON INDEX idx_checkins_recent_partial IS 'Partial index: solo check-ins últimos 90 días (90% de queries)';
COMMENT ON INDEX idx_members_active_partial IS 'Partial index: solo miembros activos (95% de queries)';
COMMENT ON INDEX idx_checkins_fecha_brin IS 'BRIN index: check-ins por fecha (tabla grande temporal)';
COMMENT ON INDEX idx_training_plans_details_gin IS 'GIN index: búsquedas en JSONB plan_details';
COMMENT ON INDEX idx_members_nombre_lower IS 'Expression index: búsquedas case-insensitive de nombre';

-- Resumen de indexes creados
SELECT 
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexname::regclass)) AS index_size
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
