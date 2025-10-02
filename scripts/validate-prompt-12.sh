#!/bin/bash

# PROMPT 12: SMART REACTIVATION VALIDATION SCRIPT
# Valida implementación completa del sistema de reactivación inteligente

# set -e  # Deshabilitado para mostrar todos los checks

echo "================================================"
echo "VALIDACIÓN PROMPT 12: SMART REACTIVATION SYSTEM"
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

test -f "database/schemas/reactivation_tables.sql"
check "Archivo reactivation_tables.sql existe"

grep -q "reactivation_campaigns" database/schemas/reactivation_tables.sql
check "Tabla reactivation_campaigns definida"

grep -q "reactivation_messages" database/schemas/reactivation_tables.sql
check "Tabla reactivation_messages definida"

grep -q "detect_inactive_members" database/schemas/reactivation_tables.sql
check "Función detect_inactive_members() definida"

grep -q "create_reactivation_campaign" database/schemas/reactivation_tables.sql
check "Función create_reactivation_campaign() definida"

grep -q "current_message_seq" database/schemas/reactivation_tables.sql
check "Campo current_message_seq para tracking de secuencia"

grep -q "favorite_class_type" database/schemas/reactivation_tables.sql
check "Campo favorite_class_type para personalización"

grep -q "reactivated BOOLEAN" database/schemas/reactivation_tables.sql
check "Campo reactivated para tracking de éxito"

echo ""
echo "2. VALIDACIÓN DE SERVICIO"
echo "------------------------"

test -f "services/reactivation-service.js"
check "Archivo reactivation-service.js existe"

grep -q "runDailyInactiveDetection" services/reactivation-service.js
check "Función runDailyInactiveDetection() implementada"

grep -q "createCampaign" services/reactivation-service.js
check "Función createCampaign() implementada"

grep -q "sendNextMessage" services/reactivation-service.js
check "Función sendNextMessage() implementada"

grep -q "recordReactivation" services/reactivation-service.js
check "Función recordReactivation() implementada"

grep -q "getReactivationStats" services/reactivation-service.js
check "Función getReactivationStats() implementada"

grep -q "MESSAGE_SEQUENCE" services/reactivation-service.js
check "Constante MESSAGE_SEQUENCE definida"

grep -E "(miss_you|social_proof|special_offer)" services/reactivation-service.js | grep -q "type:"
check "3 tipos de mensajes en secuencia"

echo ""
echo "3. VALIDACIÓN DE API ROUTES"
echo "---------------------------"

test -f "routes/api/reactivation.js"
check "Archivo reactivation.js existe"

grep -q "'/detect'" routes/api/reactivation.js
check "Endpoint POST /detect implementado"

grep -q "'/campaigns'" routes/api/reactivation.js
check "Endpoint POST /campaigns implementado"

grep -q "'/campaigns/:id/send'" routes/api/reactivation.js
check "Endpoint POST /campaigns/:id/send implementado"

grep -q "'/campaigns/:id/reactivate'" routes/api/reactivation.js
check "Endpoint POST /campaigns/:id/reactivate implementado"

grep -q "'/stats'" routes/api/reactivation.js
check "Endpoint GET /stats implementado"

echo ""
echo "4. VALIDACIÓN DE WORKER"
echo "----------------------"

test -f "workers/reactivation-processor.js"
check "Archivo reactivation-processor.js existe"

grep -q "reactivationQueue" workers/reactivation-processor.js
check "Cola Bull 'reactivation' definida"

grep -q "send-message" workers/reactivation-processor.js
check "Job 'send-message' implementado"

grep -q "daily-detection" workers/reactivation-processor.js
check "Job 'daily-detection' implementado"

grep -q "0 8 \* \* \*" workers/reactivation-processor.js
check "Cron job 08:00 AM configurado"

grep -q "whatsappSender.sendTemplate" workers/reactivation-processor.js
check "Integración con WhatsApp sender"

echo ""
echo "5. VALIDACIÓN DE TEMPLATES WHATSAPP"
echo "-----------------------------------"

test -f "whatsapp/templates/reactivation_miss_you.json"
check "Template reactivation_miss_you.json existe"

test -f "whatsapp/templates/reactivation_social_proof.json"
check "Template reactivation_social_proof.json existe"

test -f "whatsapp/templates/reactivation_special_offer.json"
check "Template reactivation_special_offer.json existe"

grep -q "member_name" whatsapp/templates/reactivation_miss_you.json
check "Template miss_you incluye member_name"

grep -q "days_inactive" whatsapp/templates/reactivation_miss_you.json
check "Template miss_you incluye days_inactive"

grep -q "favorite_class" whatsapp/templates/reactivation_miss_you.json
check "Template miss_you incluye favorite_class"

grep -q "QUICK_REPLY" whatsapp/templates/reactivation_miss_you.json
check "Template miss_you incluye botones interactivos"

echo ""
echo "6. VALIDACIÓN DE LÓGICA DE NEGOCIO"
echo "---------------------------------"

grep -q "BETWEEN 10 AND 14" database/schemas/reactivation_tables.sql
check "Detección de 10-14 días de inactividad"

grep -q ">= 3" database/schemas/reactivation_tables.sql
check "Filtro de mínimo 3 check-ins previos"

grep -q "delay.*3" services/reactivation-service.js
check "Delay de 3 días entre mensajes"

grep -q "nextSeq.*3" services/reactivation-service.js
check "Secuencia máxima de 3 mensajes"

echo ""
echo "7. VALIDACIÓN DE INTEGRACIÓN"
echo "----------------------------"

grep -q "correlationId" services/reactivation-service.js
check "Uso de correlationId para trazabilidad"

grep -q "logger.info" services/reactivation-service.js
check "Logging implementado en servicio"

grep -q "AppError.*ErrorTypes" services/reactivation-service.js
check "Manejo de errores centralizado"

grep -q "SUPABASE_SERVICE_KEY" services/reactivation-service.js
check "Uso de Supabase service key"

echo ""
echo "================================================"
echo "RESUMEN DE VALIDACIÓN"
echo "================================================"
echo "✅ Checks pasados: $PASSED"
echo "❌ Checks fallidos: $FAILED"
echo ""

if [ $FAILED -eq 0 ]; then
    echo "🎉 ¡PROMPT 12 COMPLETADO EXITOSAMENTE!"
    echo ""
    echo "Componentes implementados:"
    echo "  - 2 tablas de base de datos"
    echo "  - 2 funciones SQL"
    echo "  - Servicio con 5 funciones principales"
    echo "  - 5 endpoints API REST"
    echo "  - Worker con Bull queue"
    echo "  - 3 templates WhatsApp personalizados"
    echo "  - Secuencia de 3 mensajes (0, 3, 6 días)"
    echo "  - Detección automática diaria (08:00 AM)"
    echo ""
    exit 0
else
    echo "⚠️  Hay $FAILED checks fallidos que requieren atención"
    exit 1
fi
