-- ===================================
-- PROMPT 7: Migration Script
-- Aplicar esquema de cobranza contextual
-- ===================================

-- Rollback script (ejecutar en caso de error)
-- DROP TRIGGER IF EXISTS trigger_schedule_contextual_collection ON checkins;
-- DROP FUNCTION IF EXISTS schedule_contextual_collection() CASCADE;
-- DROP FUNCTION IF EXISTS get_collection_conversion_stats(INTEGER) CASCADE;
-- DROP FUNCTION IF EXISTS detect_member_debt(UUID) CASCADE;
-- DROP FUNCTION IF EXISTS get_pending_collections(INTEGER) CASCADE;
-- DROP TABLE IF EXISTS collections CASCADE;
-- DELETE FROM system_config WHERE key LIKE 'collection_%';

BEGIN;

-- Ejecutar schemas
\i database/schemas/collections_table.sql

-- Ejecutar functions y triggers
\i database/functions/trigger_contextual_collection.sql

-- Verificar que todo se creó correctamente
DO $$
DECLARE
    v_table_exists BOOLEAN;
    v_trigger_exists BOOLEAN;
BEGIN
    -- Verificar tabla collections
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'collections'
    ) INTO v_table_exists;
    
    IF NOT v_table_exists THEN
        RAISE EXCEPTION 'Tabla collections no fue creada';
    END IF;
    
    -- Verificar trigger
    SELECT EXISTS (
        SELECT FROM information_schema.triggers 
        WHERE trigger_name = 'trigger_schedule_contextual_collection'
    ) INTO v_trigger_exists;
    
    IF NOT v_trigger_exists THEN
        RAISE EXCEPTION 'Trigger trigger_schedule_contextual_collection no fue creado';
    END IF;
    
    RAISE NOTICE 'Migration exitosa: Tabla collections y triggers creados correctamente';
END $$;

COMMIT;

-- Verificación post-migration
SELECT 
    'collections' as table_name,
    COUNT(*) as row_count
FROM collections
UNION ALL
SELECT 
    'system_config (collection_*)' as table_name,
    COUNT(*) as row_count
FROM system_config
WHERE key LIKE 'collection_%';

-- Listar funciones creadas
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name LIKE '%collection%'
ORDER BY routine_name;
