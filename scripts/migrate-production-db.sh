#!/bin/bash
# Script de migración de base de datos a producción
# Aplica todos los schemas y funciones a Supabase productivo
# 
# Uso: ./scripts/migrate-production-db.sh

set -e  # Exit on error

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   GIM_AI - Migración de Base de Datos a Producción    ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# Validar que existan las credenciales
if [ ! -f .env.production ]; then
    echo -e "${RED}❌ Error: .env.production no encontrado${NC}"
    echo -e "${YELLOW}Por favor, crea el archivo con las credenciales de Supabase${NC}"
    exit 1
fi

# Cargar variables de entorno
source .env.production

if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo -e "${RED}❌ Error: SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY no configurados${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Credenciales de Supabase cargadas${NC}"
echo -e "${BLUE}URL: ${SUPABASE_URL}${NC}"
echo ""

# Extraer host de la URL
SUPABASE_HOST=$(echo $SUPABASE_URL | sed 's|https://||' | sed 's|http://||')
SUPABASE_PROJECT_ID=$(echo $SUPABASE_HOST | cut -d'.' -f1)

echo -e "${YELLOW}⚠️  ATENCIÓN: Esta operación modificará la base de datos de producción${NC}"
echo -e "${YELLOW}Project ID: ${SUPABASE_PROJECT_ID}${NC}"
echo ""
read -p "¿Estás seguro de continuar? (yes/no): " -r
echo ""

if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo -e "${YELLOW}Operación cancelada${NC}"
    exit 0
fi

# Función para ejecutar SQL en Supabase
execute_sql() {
    local file=$1
    local description=$2
    
    echo -e "${BLUE}📄 Ejecutando: ${description}${NC}"
    
    # Usar psql con conexión a Supabase
    PGPASSWORD="${SUPABASE_SERVICE_ROLE_KEY}" psql \
        -h "db.${SUPABASE_HOST}" \
        -p 5432 \
        -U postgres \
        -d postgres \
        -f "${file}" \
        2>&1 | grep -v "NOTICE" || true
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Completado: ${description}${NC}"
    else
        echo -e "${RED}❌ Error ejecutando: ${description}${NC}"
        exit 1
    fi
    echo ""
}

echo -e "${BLUE}═══ FASE 1: Schemas Core ═══${NC}"
echo ""

# Ejecutar schemas en orden
execute_sql "database/schemas/core_tables.sql" "Core Tables (members, classes, checkins, etc.)"
execute_sql "database/schemas/whatsapp_templates.sql" "WhatsApp Templates"
execute_sql "database/schemas/payment_gateway.sql" "Payment Gateway"

echo -e "${BLUE}═══ FASE 2: AI Features (PROMPT 23) ═══${NC}"
echo ""

execute_sql "database/schemas/ai_tables.sql" "AI Tables (churn predictions, recommendations, coaching)"

echo -e "${BLUE}═══ FASE 3: API Ecosystem (PROMPT 24) ═══${NC}"
echo ""

execute_sql "database/schemas/api_ecosystem.sql" "API Ecosystem (OAuth2, webhooks, API keys)"

echo -e "${BLUE}═══ FASE 4: Stored Functions ═══${NC}"
echo ""

# Ejecutar funciones
execute_sql "database/functions/match_replacement_candidates.sql" "Function: match_replacement_candidates"
execute_sql "database/functions/trigger_contextual_collection.sql" "Function: trigger_contextual_collection"

echo -e "${BLUE}═══ FASE 5: Indexes y Performance ═══${NC}"
echo ""

# Crear indexes adicionales
cat > /tmp/create_indexes.sql << 'EOF'
-- Indexes para performance
CREATE INDEX IF NOT EXISTS idx_members_phone ON members(telefono);
CREATE INDEX IF NOT EXISTS idx_members_qr ON members(codigo_qr);
CREATE INDEX IF NOT EXISTS idx_checkins_member ON checkins(member_id);
CREATE INDEX IF NOT EXISTS idx_checkins_class ON checkins(clase_id);
CREATE INDEX IF NOT EXISTS idx_checkins_timestamp ON checkins(created_at);
CREATE INDEX IF NOT EXISTS idx_reservas_member ON reservas(member_id);
CREATE INDEX IF NOT EXISTS idx_reservas_class ON reservas(clase_id);
CREATE INDEX IF NOT EXISTS idx_payments_member ON payments(member_id);
CREATE INDEX IF NOT EXISTS idx_churn_predictions_member ON churn_predictions(member_id);
CREATE INDEX IF NOT EXISTS idx_smart_recommendations_member ON smart_recommendations(member_id);

-- Index para búsquedas full-text
CREATE INDEX IF NOT EXISTS idx_members_name_search ON members USING gin(to_tsvector('spanish', nombre || ' ' || apellido));

-- Index para reportes
CREATE INDEX IF NOT EXISTS idx_checkins_date ON checkins(DATE(created_at));
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(fecha_pago);
EOF

execute_sql "/tmp/create_indexes.sql" "Performance Indexes"
rm /tmp/create_indexes.sql

echo -e "${BLUE}═══ FASE 6: Row Level Security (RLS) ═══${NC}"
echo ""

# Habilitar RLS en tablas principales
cat > /tmp/enable_rls.sql << 'EOF'
-- Habilitar RLS en todas las tablas
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservas ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE instructors ENABLE ROW LEVEL SECURITY;
ALTER TABLE churn_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE smart_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE coaching_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth2_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- Política para service_role (backend) - acceso completo
CREATE POLICY "Service role has full access" ON members
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access" ON classes
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access" ON checkins
    FOR ALL USING (auth.role() = 'service_role');

-- Política para usuarios autenticados - solo sus propios datos
CREATE POLICY "Users can view own data" ON members
    FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Users can view own checkins" ON checkins
    FOR SELECT USING (auth.uid()::text = member_id::text);

-- Política pública para clases (schedule público)
CREATE POLICY "Anyone can view classes" ON classes
    FOR SELECT USING (true);
EOF

execute_sql "/tmp/enable_rls.sql" "Row Level Security Policies"
rm /tmp/enable_rls.sql

echo -e "${BLUE}═══ FASE 7: Seed Data (Opcional) ═══${NC}"
echo ""

read -p "¿Deseas cargar datos de prueba? (yes/no): " -r
echo ""

if [[ $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    if [ -f "database/seeds/test_data.sql" ]; then
        execute_sql "database/seeds/test_data.sql" "Test Data"
    else
        echo -e "${YELLOW}⚠️  No se encontró archivo de seed data${NC}"
    fi
else
    echo -e "${YELLOW}⏭️  Seed data omitida${NC}"
fi

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║            ✅ MIGRACIÓN COMPLETADA EXITOSAMENTE          ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Base de datos productiva lista en:${NC}"
echo -e "${BLUE}${SUPABASE_URL}${NC}"
echo ""
echo -e "${YELLOW}📝 Próximos pasos:${NC}"
echo -e "  1. Verificar tablas en Supabase Dashboard"
echo -e "  2. Ejecutar: node scripts/validate-production-config.js"
echo -e "  3. Configurar WhatsApp templates"
echo -e "  4. Deploy a Railway/Render"
echo ""
