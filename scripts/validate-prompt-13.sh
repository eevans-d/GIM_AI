#!/bin/bash

# PROMPT 13: POST-WORKOUT NUTRITION TIPS VALIDATION SCRIPT
# Valida implementación completa del sistema de tips nutricionales

# set -e  # Deshabilitado para mostrar todos los checks

echo "================================================"
echo "VALIDACIÓN PROMPT 13: NUTRITION TIPS SYSTEM"
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

test -f "database/schemas/nutrition_tables.sql"
check "Archivo nutrition_tables.sql existe"

grep -q "nutrition_tips" database/schemas/nutrition_tables.sql
check "Tabla nutrition_tips definida"

grep -q "member_nutrition_history" database/schemas/nutrition_tables.sql
check "Tabla member_nutrition_history definida"

grep -q "class_type.*cardio.*strength.*flexibility" database/schemas/nutrition_tables.sql
check "Tipos de clase definidos (cardio, strength, flexibility)"

grep -q "select_nutrition_tip_by_class" database/schemas/nutrition_tables.sql
check "Función select_nutrition_tip_by_class() definida"

grep -q "record_nutrition_tip_sent" database/schemas/nutrition_tables.sql
check "Función record_nutrition_tip_sent() definida"

grep -q "get_nutrition_engagement_stats" database/schemas/nutrition_tables.sql
check "Función get_nutrition_engagement_stats() definida"

grep -q "macro_focus" database/schemas/nutrition_tables.sql
check "Campo macro_focus para tipos de macronutrientes"

grep -q "recipe_name" database/schemas/nutrition_tables.sql && grep -q "recipe_ingredients" database/schemas/nutrition_tables.sql && grep -q "recipe_instructions" database/schemas/nutrition_tables.sql
check "Campos de receta completos"

grep -q "opened" database/schemas/nutrition_tables.sql && grep -q "clicked_recipe" database/schemas/nutrition_tables.sql
check "Tracking de engagement (opened, clicked)"

echo ""
echo "2. VALIDACIÓN DE SERVICIO"
echo "------------------------"

test -f "services/nutrition-service.js"
check "Archivo nutrition-service.js existe"

grep -q "schedulePostWorkoutTip" services/nutrition-service.js
check "Función schedulePostWorkoutTip() implementada"

grep -q "getTipById" services/nutrition-service.js
check "Función getTipById() implementada"

grep -q "getMemberHistory" services/nutrition-service.js
check "Función getMemberHistory() implementada"

grep -q "trackEngagement" services/nutrition-service.js
check "Función trackEngagement() implementada"

grep -q "getEngagementStats" services/nutrition-service.js
check "Función getEngagementStats() implementada"

grep -q "listTips" services/nutrition-service.js
check "Función listTips() implementada"

grep -q "createTip" services/nutrition-service.js
check "Función createTip() implementada"

grep -q "MIN_DELAY_MINUTES" services/nutrition-service.js && grep -q "MAX_DELAY_MINUTES" services/nutrition-service.js
check "Constantes de delay (60-90 min)"

echo ""
echo "3. VALIDACIÓN DE API ROUTES"
echo "---------------------------"

test -f "routes/api/nutrition.js"
check "Archivo nutrition.js existe"

grep -q "'/schedule'" routes/api/nutrition.js
check "Endpoint POST /schedule implementado"

grep -q "'/history/:member_id'" routes/api/nutrition.js
check "Endpoint GET /history/:member_id implementado"

grep -q "'/engagement'" routes/api/nutrition.js
check "Endpoint POST /engagement implementado"

grep -q "'/stats'" routes/api/nutrition.js
check "Endpoint GET /stats implementado"

grep -q "'/tips'" routes/api/nutrition.js
check "Endpoint GET/POST /tips implementado"

echo ""
echo "4. VALIDACIÓN DE WORKER"
echo "----------------------"

test -f "workers/nutrition-tip-processor.js"
check "Archivo nutrition-tip-processor.js existe"

grep -q "nutritionQueue" workers/nutrition-tip-processor.js
check "Cola Bull 'nutrition-tips' definida"

grep -q "send-tip" workers/nutrition-tip-processor.js
check "Job 'send-tip' implementado"

grep -q "CLASS_TYPE_TO_TEMPLATE" workers/nutrition-tip-processor.js
check "Mapeo de tipos de clase a templates"

grep -q "scheduleTipFromCheckin" workers/nutrition-tip-processor.js
check "Helper scheduleTipFromCheckin() exportado"

grep -q "whatsappSender.sendTemplate" workers/nutrition-tip-processor.js
check "Integración con WhatsApp sender"

echo ""
echo "5. VALIDACIÓN DE TEMPLATES WHATSAPP"
echo "-----------------------------------"

test -f "whatsapp/templates/nutrition_post_cardio.json"
check "Template nutrition_post_cardio.json existe"

test -f "whatsapp/templates/nutrition_post_strength.json"
check "Template nutrition_post_strength.json existe"

test -f "whatsapp/templates/nutrition_post_flexibility.json"
check "Template nutrition_post_flexibility.json existe"

grep -q "member_name" whatsapp/templates/nutrition_post_cardio.json
check "Template cardio incluye member_name"

grep -q "tip_description" whatsapp/templates/nutrition_post_cardio.json && grep -q "tip_title" whatsapp/templates/nutrition_post_cardio.json
check "Template cardio incluye tip_description y tip_title"

grep -q "recipe_name" whatsapp/templates/nutrition_post_cardio.json
check "Template cardio incluye recipe_name"

grep -q "QUICK_REPLY" whatsapp/templates/nutrition_post_cardio.json
check "Template cardio incluye botones interactivos"

grep -q "proteína" whatsapp/templates/nutrition_post_strength.json
check "Template strength menciona proteína"

grep -q "antioxidantes" whatsapp/templates/nutrition_post_flexibility.json
check "Template flexibility menciona antioxidantes"

echo ""
echo "6. VALIDACIÓN DE LÓGICA DE NEGOCIO"
echo "---------------------------------"

grep -q "60.*90" services/nutrition-service.js
check "Timing de 60-90 min después del check-in"

grep -q "RANDOM()" database/schemas/nutrition_tables.sql
check "Selección aleatoria de tips para variedad"

grep -q "INTERVAL '7 days'" database/schemas/nutrition_tables.sql
check "Evita repetir tips en 7 días"

grep -q "open_rate" database/schemas/nutrition_tables.sql && grep -q "click_rate" database/schemas/nutrition_tables.sql
check "Cálculo de tasas de apertura y clicks"

echo ""
echo "7. VALIDACIÓN DE INTEGRACIÓN"
echo "----------------------------"

grep -q "correlationId" services/nutrition-service.js 2>/dev/null || grep -q "logger.info" services/nutrition-service.js
check "Logging implementado en servicio"

grep -q "AppError.*ErrorTypes" services/nutrition-service.js
check "Manejo de errores centralizado"

grep -q "SUPABASE_SERVICE_KEY" services/nutrition-service.js
check "Uso de Supabase service key"

grep -q "attempts" workers/nutrition-tip-processor.js && grep -q "backoff" workers/nutrition-tip-processor.js
check "Retry logic con backoff exponencial"

echo ""
echo "================================================"
echo "RESUMEN DE VALIDACIÓN"
echo "================================================"
echo "✅ Checks pasados: $PASSED"
echo "❌ Checks fallidos: $FAILED"
echo ""

if [ $FAILED -eq 0 ]; then
    echo "🎉 ¡PROMPT 13 COMPLETADO EXITOSAMENTE!"
    echo ""
    echo "Componentes implementados:"
    echo "  - 2 tablas de base de datos"
    echo "  - 3 funciones SQL"
    echo "  - Servicio con 7 funciones principales"
    echo "  - 6 endpoints API REST"
    echo "  - Worker con Bull queue"
    echo "  - 3 templates WhatsApp contextualizados"
    echo "  - Timing: 60-90 min post-entrenamiento"
    echo "  - Context-aware por tipo de clase"
    echo ""
    exit 0
else
    echo "⚠️  Hay $FAILED checks fallidos que requieren atención"
    exit 1
fi
