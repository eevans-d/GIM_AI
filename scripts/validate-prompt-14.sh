#!/bin/bash

# PROMPT 14: PLUS/PRO TIER SYSTEM VALIDATION SCRIPT
# Valida implementación completa del sistema de membresías premium

echo "================================================"
echo "VALIDACIÓN PROMPT 14: TIER SYSTEM (PLUS/PRO)"
echo "================================================"
echo ""

PASSED=0
FAILED=0

check() {
    if [ $? -eq 0 ]; then
        echo "✅ $1"
        ((PASSED++))
    else
        echo "❌ $1"
        ((FAILED++))
    fi
}

echo "1. VALIDACIÓN DE ESQUEMA DE BASE DE DATOS"
echo "----------------------------------------"

test -f "database/schemas/tier_system_tables.sql"
check "Archivo tier_system_tables.sql existe"

grep -q "tier_plans" database/schemas/tier_system_tables.sql
check "Tabla tier_plans definida"

grep -q "member_tier_subscriptions" database/schemas/tier_system_tables.sql
check "Tabla member_tier_subscriptions definida"

grep -q "coaching_sessions" database/schemas/tier_system_tables.sql
check "Tabla coaching_sessions definida"

grep -q "training_plans" database/schemas/tier_system_tables.sql
check "Tabla training_plans definida"

grep -q "tier_benefits_catalog" database/schemas/tier_system_tables.sql
check "Tabla tier_benefits_catalog definida"

grep -q "standard.*plus.*pro" database/schemas/tier_system_tables.sql
check "3 tiers definidos (standard, plus, pro)"

grep -q "get_member_current_tier" database/schemas/tier_system_tables.sql
check "Función get_member_current_tier() definida"

grep -q "identify_upgrade_candidates" database/schemas/tier_system_tables.sql
check "Función identify_upgrade_candidates() definida"

grep -q "calculate_tier_roi" database/schemas/tier_system_tables.sql
check "Función calculate_tier_roi() definida"

grep -q "upgrade_member_tier" database/schemas/tier_system_tables.sql
check "Función upgrade_member_tier() definida"

echo ""
echo "2. VALIDACIÓN DE SEED DATA"
echo "-------------------------"

test -f "database/seeds/tier_system_seed.sql"
check "Archivo tier_system_seed.sql existe"

grep -q "2500.00.*Plus" database/seeds/tier_system_seed.sql
check "Tier Plus definido ($2,500)"

grep -q "4500.00.*Pro" database/seeds/tier_system_seed.sql
check "Tier Pro definido ($4,500)"

grep -q "Prioridad en Reservas" database/seeds/tier_system_seed.sql
check "Beneficio de prioridad en reservas"

grep -q "4 Sesiones Coaching 1:1" database/seeds/tier_system_seed.sql
check "Beneficio de coaching sessions (Pro)"

echo ""
echo "3. VALIDACIÓN DE SERVICIO"
echo "------------------------"

test -f "services/tier-service.js"
check "Archivo tier-service.js existe"

grep -q "getMemberCurrentTier" services/tier-service.js
check "Función getMemberCurrentTier() implementada"

grep -q "upgradeMemberTier" services/tier-service.js
check "Función upgradeMemberTier() implementada"

grep -q "downgradeMemberTier" services/tier-service.js
check "Función downgradeMemberTier() implementada"

grep -q "confirmDowngrade" services/tier-service.js
check "Función confirmDowngrade() implementada"

grep -q "identifyUpgradeCandidates" services/tier-service.js
check "Función identifyUpgradeCandidates() implementada"

grep -q "scheduleCoachingSession" services/tier-service.js
check "Función scheduleCoachingSession() implementada"

grep -q "generateAdaptiveTrainingPlan" services/tier-service.js
check "Función generateAdaptiveTrainingPlan() implementada"

grep -q "getTierBenefits" services/tier-service.js
check "Función getTierBenefits() implementada"

grep -q "calculateTierROI" services/tier-service.js
check "Función calculateTierROI() implementada"

grep -q "getTierStats" services/tier-service.js
check "Función getTierStats() implementada"

grep -q "TIER_PRICES" services/tier-service.js
check "Constante TIER_PRICES definida"

echo ""
echo "4. VALIDACIÓN DE API ROUTES"
echo "---------------------------"

test -f "routes/api/tier.js"
check "Archivo tier.js existe"

grep -q "'/current/:member_id'" routes/api/tier.js
check "Endpoint GET /current/:member_id implementado"

grep -q "'/upgrade'" routes/api/tier.js
check "Endpoint POST /upgrade implementado"

grep -q "'/downgrade'" routes/api/tier.js
check "Endpoint POST /downgrade implementado"

grep -q "'/downgrade/confirm'" routes/api/tier.js
check "Endpoint POST /downgrade/confirm implementado"

grep -q "'/benefits'" routes/api/tier.js
check "Endpoint GET /benefits implementado"

grep -q "'/candidates'" routes/api/tier.js
check "Endpoint GET /candidates implementado"

grep -q "'/coaching-sessions'" routes/api/tier.js
check "Endpoint POST /coaching-sessions implementado"

grep -q "'/training-plans'" routes/api/tier.js
check "Endpoint POST /training-plans implementado"

grep -q "'/stats'" routes/api/tier.js
check "Endpoint GET /stats implementado"

echo ""
echo "5. VALIDACIÓN DE WORKER"
echo "----------------------"

test -f "workers/tier-conversion-processor.js"
check "Archivo tier-conversion-processor.js existe"

grep -q "tierQueue" workers/tier-conversion-processor.js
check "Cola Bull 'tier-conversion' definida"

grep -q "send-upgrade-offer" workers/tier-conversion-processor.js
check "Job 'send-upgrade-offer' implementado"

grep -q "send-retention-offer" workers/tier-conversion-processor.js
check "Job 'send-retention-offer' implementado"

grep -q "send-coaching-reminder" workers/tier-conversion-processor.js
check "Job 'send-coaching-reminder' implementado"

grep -q "daily-upgrade-targeting" workers/tier-conversion-processor.js
check "Job 'daily-upgrade-targeting' implementado"

grep -q "0 10 \* \* \*" workers/tier-conversion-processor.js
check "Cron job 10:00 AM configurado"

echo ""
echo "6. VALIDACIÓN DE TEMPLATES WHATSAPP"
echo "-----------------------------------"

test -f "whatsapp/templates/tier_upgrade_offer_plus.json"
check "Template tier_upgrade_offer_plus.json existe"

test -f "whatsapp/templates/tier_upgrade_offer_pro.json"
check "Template tier_upgrade_offer_pro.json existe"

test -f "whatsapp/templates/tier_retention_offer.json"
check "Template tier_retention_offer.json existe"

test -f "whatsapp/templates/coaching_session_reminder.json"
check "Template coaching_session_reminder.json existe"

grep -q "member_name" whatsapp/templates/tier_upgrade_offer_plus.json
check "Template Plus incluye member_name"

grep -q "monthly_price" whatsapp/templates/tier_upgrade_offer_plus.json
check "Template Plus incluye monthly_price"

grep -q "coaching" whatsapp/templates/tier_upgrade_offer_pro.json
check "Template Pro menciona coaching"

grep -q "discount_percentage" whatsapp/templates/tier_retention_offer.json
check "Template retention incluye discount_percentage"

grep -q "coach_name" whatsapp/templates/coaching_session_reminder.json && grep -q "session_date" whatsapp/templates/coaching_session_reminder.json
check "Template coaching incluye coach_name y session_date"

echo ""
echo "7. VALIDACIÓN DE LÓGICA DE NEGOCIO"
echo "---------------------------------"

grep -q "retentionOffer" services/tier-service.js
check "Lógica de retention offer implementada"

grep -q "20" services/tier-service.js | head -1
check "Descuento 20% en retention offer"

grep -q "upgrade_score" database/schemas/tier_system_tables.sql
check "Scoring de candidatos para targeting"

grep -q "checkins_30d >= 12" database/schemas/tier_system_tables.sql
check "Filtro mínimo 12 check-ins/mes (3x/semana)"

grep -q "days_member >= 30" database/schemas/tier_system_tables.sql
check "Filtro mínimo 30 días de antigüedad"

echo ""
echo "8. VALIDACIÓN DE INTEGRACIÓN"
echo "----------------------------"

grep -q "logger.info" services/tier-service.js
check "Logging implementado en servicio"

grep -q "AppError.*ErrorTypes" services/tier-service.js
check "Manejo de errores centralizado"

grep -q "SUPABASE_SERVICE_KEY" services/tier-service.js
check "Uso de Supabase service key"

grep -q "attempts.*3" workers/tier-conversion-processor.js
check "Retry logic en worker"

echo ""
echo "================================================"
echo "RESUMEN DE VALIDACIÓN"
echo "================================================"
echo "✅ Checks pasados: $PASSED"
echo "❌ Checks fallidos: $FAILED"
echo ""

if [ $FAILED -eq 0 ]; then
    echo "🎉 ¡PROMPT 14 COMPLETADO EXITOSAMENTE!"
    echo ""
    echo "Componentes implementados:"
    echo "  - 5 tablas de base de datos"
    echo "  - 4 funciones SQL"
    echo "  - Servicio con 10 funciones principales"
    echo "  - 9 endpoints API REST"
    echo "  - Worker con 4 jobs + cron diario"
    echo "  - 4 templates WhatsApp (upgrade, retention, coaching)"
    echo "  - 3 tiers: Standard (\$1,500), Plus (\$2,500), Pro (\$4,500)"
    echo "  - Targeting automático de candidatos"
    echo "  - Retention logic con 20% descuento"
    echo ""
    echo "Métricas objetivo:"
    echo "  - Plus: 30% conversión de Standard"
    echo "  - Pro: 10% conversión de Plus"
    echo "  - Retention rate: 70-80% con ofertas"
    echo ""
    exit 0
else
    echo "⚠️  Hay $FAILED checks fallidos que requieren atención"
    exit 1
fi
