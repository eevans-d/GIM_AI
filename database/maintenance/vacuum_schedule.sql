-- PROMPT 20: DATABASE OPTIMIZATION - MAINTENANCE SCHEDULES
-- Scripts automatizados de VACUUM, ANALYZE y mantenimiento de índices

-- ============================================
-- VACUUM CONFIGURATION
-- ============================================

-- Tablas de alta escritura (autovacuum agresivo)
ALTER TABLE checkins SET (
    autovacuum_vacuum_scale_factor = 0.05,  -- Vacuum al 5% de filas modificadas
    autovacuum_analyze_scale_factor = 0.025, -- Analyze al 2.5%
    autovacuum_vacuum_cost_delay = 10       -- Menor delay para más frecuencia
);

ALTER TABLE payments SET (
    autovacuum_vacuum_scale_factor = 0.05,
    autovacuum_analyze_scale_factor = 0.025,
    autovacuum_vacuum_cost_delay = 10
);

ALTER TABLE reservas SET (
    autovacuum_vacuum_scale_factor = 0.05,
    autovacuum_analyze_scale_factor = 0.025,
    autovacuum_vacuum_cost_delay = 10
);

-- Tablas grandes con acceso de lectura (menos agresivo)
ALTER TABLE members SET (
    autovacuum_vacuum_scale_factor = 0.1,   -- Vacuum al 10%
    autovacuum_analyze_scale_factor = 0.05, -- Analyze al 5%
    autovacuum_vacuum_cost_delay = 20
);

ALTER TABLE clases SET (
    autovacuum_vacuum_scale_factor = 0.1,
    autovacuum_analyze_scale_factor = 0.05,
    autovacuum_vacuum_cost_delay = 20
);

-- ============================================
-- MANUAL VACUUM FUNCTIONS
-- ============================================

CREATE OR REPLACE FUNCTION vacuum_high_traffic_tables()
RETURNS void AS $$
BEGIN
    VACUUM ANALYZE checkins;
    VACUUM ANALYZE payments;
    VACUUM ANALYZE reservas;
    
    RAISE NOTICE 'High-traffic tables vacuumed at %', NOW();
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION vacuum_all_tables()
RETURNS void AS $$
BEGIN
    VACUUM ANALYZE members;
    VACUUM ANALYZE clases;
    VACUUM ANALYZE checkins;
    VACUUM ANALYZE payments;
    VACUUM ANALYZE reservas;
    VACUUM ANALYZE member_tier_subscriptions;
    VACUUM ANALYZE coaching_sessions;
    VACUUM ANALYZE training_plans;
    VACUUM ANALYZE whatsapp_message_log;
    
    RAISE NOTICE 'All tables vacuumed at %', NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- INDEX MAINTENANCE
-- ============================================

CREATE OR REPLACE FUNCTION reindex_bloated_indexes()
RETURNS TABLE(
    index_name TEXT,
    table_name TEXT,
    bloat_pct NUMERIC,
    action_taken TEXT
) AS $$
DECLARE
    r RECORD;
    v_bloat_threshold NUMERIC := 30; -- Reindex si bloat > 30%
BEGIN
    FOR r IN
        SELECT 
            idx.indexrelname::TEXT AS idx_name,
            idx.relname::TEXT AS tbl_name,
            100 * (pg_relation_size(idx.indexrelid) - pg_relation_size(idx.indexrelid, 'main'))::NUMERIC / 
                NULLIF(pg_relation_size(idx.indexrelid), 0) AS bloat
        FROM pg_stat_user_indexes idx
        WHERE idx.schemaname = 'public'
        AND pg_relation_size(idx.indexrelid) > 1000000 -- Solo indexes > 1MB
    LOOP
        IF r.bloat > v_bloat_threshold THEN
            EXECUTE format('REINDEX INDEX CONCURRENTLY %I', r.idx_name);
            
            RETURN QUERY SELECT 
                r.idx_name, 
                r.tbl_name, 
                r.bloat, 
                'REINDEXED'::TEXT;
        ELSE
            RETURN QUERY SELECT 
                r.idx_name, 
                r.tbl_name, 
                r.bloat, 
                'OK'::TEXT;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- STATISTICS UPDATE
-- ============================================

CREATE OR REPLACE FUNCTION update_statistics_critical_tables()
RETURNS void AS $$
BEGIN
    -- Actualizar estadísticas de columnas clave
    ANALYZE members (id, nombre, telefono, activo);
    ANALYZE checkins (miembro_id, clase_id, fecha);
    ANALYZE clases (tipo_clase, horario_inicio, capacidad_maxima);
    ANALYZE payments (member_id, payment_status, payment_date, amount);
    
    RAISE NOTICE 'Critical table statistics updated at %', NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- BLOAT DETECTION
-- ============================================

CREATE OR REPLACE FUNCTION detect_table_bloat()
RETURNS TABLE(
    table_name TEXT,
    total_size TEXT,
    bloat_size TEXT,
    bloat_pct NUMERIC,
    recommendation TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.tablename::TEXT,
        pg_size_pretty(pg_total_relation_size(t.schemaname||'.'||t.tablename))::TEXT AS total,
        pg_size_pretty(pg_total_relation_size(t.schemaname||'.'||t.tablename) - pg_relation_size(t.schemaname||'.'||t.tablename, 'main'))::TEXT AS bloat,
        (100 * (pg_total_relation_size(t.schemaname||'.'||t.tablename) - pg_relation_size(t.schemaname||'.'||t.tablename, 'main'))::NUMERIC / 
            NULLIF(pg_total_relation_size(t.schemaname||'.'||t.tablename), 0))::NUMERIC(5,2) AS bloat_percentage,
        CASE 
            WHEN (100 * (pg_total_relation_size(t.schemaname||'.'||t.tablename) - pg_relation_size(t.schemaname||'.'||t.tablename, 'main'))::NUMERIC / 
                NULLIF(pg_total_relation_size(t.schemaname||'.'||t.tablename), 0)) > 30 THEN 'VACUUM FULL required'
            WHEN (100 * (pg_total_relation_size(t.schemaname||'.'||t.tablename) - pg_relation_size(t.schemaname||'.'||t.tablename, 'main'))::NUMERIC / 
                NULLIF(pg_total_relation_size(t.schemaname||'.'||t.tablename), 0)) > 15 THEN 'VACUUM recommended'
            ELSE 'OK'
        END::TEXT AS recommendation
    FROM pg_tables t
    WHERE t.schemaname = 'public'
    ORDER BY pg_total_relation_size(t.schemaname||'.'||t.tablename) DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- PARTITION PREPARATION (Future-proofing)
-- ============================================

-- Preparar checkins para particionado por fecha (cuando crezca)
-- No se crea aún, solo documentación

COMMENT ON TABLE checkins IS 'PARTITION_CANDIDATE: Particionar por fecha cuando > 10M rows';
COMMENT ON TABLE payments IS 'PARTITION_CANDIDATE: Particionar por payment_date cuando > 5M rows';

-- ============================================
-- MAINTENANCE SCHEDULE DOCUMENTATION
-- ============================================

COMMENT ON FUNCTION vacuum_high_traffic_tables IS 'Ejecutar cada hora en horarios valle (3-6 AM)';
COMMENT ON FUNCTION vacuum_all_tables IS 'Ejecutar diariamente a las 3 AM';
COMMENT ON FUNCTION reindex_bloated_indexes IS 'Ejecutar semanalmente domingo 2 AM';
COMMENT ON FUNCTION update_statistics_critical_tables IS 'Ejecutar cada 6 horas';
COMMENT ON FUNCTION detect_table_bloat IS 'Ejecutar semanalmente para monitoreo';

-- ============================================
-- DATABASE SIZE MONITORING
-- ============================================

CREATE OR REPLACE FUNCTION get_database_size_metrics()
RETURNS TABLE(
    metric_name TEXT,
    metric_value TEXT,
    metric_numeric BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 'Database Size'::TEXT, pg_size_pretty(pg_database_size(current_database()))::TEXT, pg_database_size(current_database())
    UNION ALL
    SELECT 'Tables Size'::TEXT, pg_size_pretty(SUM(pg_total_relation_size(schemaname||'.'||tablename)))::TEXT, SUM(pg_total_relation_size(schemaname||'.'||tablename))
    FROM pg_tables WHERE schemaname = 'public'
    UNION ALL
    SELECT 'Indexes Size'::TEXT, pg_size_pretty(SUM(pg_relation_size(indexrelid)))::TEXT, SUM(pg_relation_size(indexrelid))
    FROM pg_stat_user_indexes WHERE schemaname = 'public'
    UNION ALL
    SELECT 'Largest Table'::TEXT, tablename::TEXT, pg_total_relation_size(schemaname||'.'||tablename)
    FROM pg_tables WHERE schemaname = 'public'
    ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC LIMIT 1;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_database_size_metrics IS 'Métricas de tamaño de base de datos para monitoreo';
