#!/bin/bash

# ============================================================================
# PROMPT 11: VALLEY OPTIMIZATION - VALIDATION SCRIPT
# Valida la implementación completa del sistema de optimización valle
# ============================================================================

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

PASSED=0
FAILED=0

# Función para verificar
check() {
    local description="$1"
    local command="$2"
    
    printf "  Checking: %-60s" "$description"
    
    if eval "$command" > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC}"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}✗${NC}"
        ((FAILED++))
        return 1
    fi
}

echo ""
echo "╔═══════════════════════════════════════════════════════════════════╗"
echo "║      PROMPT 11: VALLEY OPTIMIZATION VALIDATION                   ║"
echo "║                    GIM_AI Project                                 ║"
echo "╚═══════════════════════════════════════════════════════════════════╝"
echo ""

# ============================================================================
# SECTION 1: DATABASE SCHEMA
# ============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1. Database Schema"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

check "Schema file exists" \
    "test -f database/schemas/valley_optimization_tables.sql"

check "valley_detections table defined" \
    "grep -q 'CREATE TABLE.*valley_detections' database/schemas/valley_optimization_tables.sql"

check "valley_promotions table defined" \
    "grep -q 'CREATE TABLE.*valley_promotions' database/schemas/valley_optimization_tables.sql"

check "valley_promotion_recipients table defined" \
    "grep -q 'CREATE TABLE.*valley_promotion_recipients' database/schemas/valley_optimization_tables.sql"

check "valley_strategy_escalations table defined" \
    "grep -q 'CREATE TABLE.*valley_strategy_escalations' database/schemas/valley_optimization_tables.sql"

check "class_occupancy_history table defined" \
    "grep -q 'CREATE TABLE.*class_occupancy_history' database/schemas/valley_optimization_tables.sql"

check "v_valley_classes_current view defined" \
    "grep -q 'CREATE MATERIALIZED VIEW.*v_valley_classes_current' database/schemas/valley_optimization_tables.sql"

check "occupancy_rate column in history" \
    "grep -q 'occupancy_rate.*DECIMAL' database/schemas/valley_optimization_tables.sql"

check "current_strategy_level with 4 levels" \
    "grep -q 'current_strategy_level.*BETWEEN 1 AND 4' database/schemas/valley_optimization_tables.sql"

check "Unique constraint on promotion-member" \
    "grep -q 'UNIQUE.*promotion_id.*member_id' database/schemas/valley_optimization_tables.sql"

# ============================================================================
# SECTION 2: DATABASE FUNCTIONS
# ============================================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2. Database Functions"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

check "Functions file exists" \
    "test -f database/functions/valley_optimization_functions.sql"

check "detect_valley_classes function" \
    "grep -q 'CREATE.*FUNCTION detect_valley_classes' database/functions/valley_optimization_functions.sql"

check "create_valley_detection function" \
    "grep -q 'CREATE.*FUNCTION create_valley_detection' database/functions/valley_optimization_functions.sql"

check "get_promotion_target_members function" \
    "grep -q 'CREATE.*FUNCTION get_promotion_target_members' database/functions/valley_optimization_functions.sql"

check "create_valley_promotion function" \
    "grep -q 'CREATE.*FUNCTION create_valley_promotion' database/functions/valley_optimization_functions.sql"

check "record_class_occupancy_daily function" \
    "grep -q 'CREATE.*FUNCTION record_class_occupancy_daily' database/functions/valley_optimization_functions.sql"

check "escalate_valley_strategy function" \
    "grep -q 'CREATE.*FUNCTION escalate_valley_strategy' database/functions/valley_optimization_functions.sql"

check "calculate_valley_roi function" \
    "grep -q 'CREATE.*FUNCTION calculate_valley_roi' database/functions/valley_optimization_functions.sql"

check "50% threshold check" \
    "grep -q '50' database/functions/valley_optimization_functions.sql"

check "Eligibility scoring logic" \
    "grep -q 'eligibility_score' database/functions/valley_optimization_functions.sql"

# ============================================================================
# SECTION 3: SERVICE LAYER
# ============================================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3. Service Layer"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

check "Service file exists" \
    "test -f services/valley-optimization-service.js"

check "runDailyValleyAnalysis function" \
    "grep -q 'async function runDailyValleyAnalysis' services/valley-optimization-service.js"

check "createPromotion function" \
    "grep -q 'async function createPromotion' services/valley-optimization-service.js"

check "getTargetMembers function" \
    "grep -q 'async function getTargetMembers' services/valley-optimization-service.js"

check "recordConversion function" \
    "grep -q 'async function recordConversion' services/valley-optimization-service.js"

check "evaluateEscalation function" \
    "grep -q 'async function evaluateEscalation' services/valley-optimization-service.js"

check "escalateStrategy function" \
    "grep -q 'async function escalateStrategy' services/valley-optimization-service.js"

check "VALLEY_THRESHOLD constant (50%)" \
    "grep -q 'VALLEY_THRESHOLD.*50' services/valley-optimization-service.js"

check "4 strategy levels defined" \
    "grep -q 'STRATEGY_LEVELS' services/valley-optimization-service.js"

check "Logger integration" \
    "grep -q 'logger.*createLogger' services/valley-optimization-service.js"

# ============================================================================
# SECTION 4: API ROUTES
# ============================================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4. API Routes"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

check "Routes file exists" \
    "test -f routes/api/valley-optimization.js"

check "POST /analyze endpoint" \
    "grep -q \"router.post('/analyze'\" routes/api/valley-optimization.js"

check "GET /detections endpoint" \
    "grep -q \"router.get('/detections'\" routes/api/valley-optimization.js"

check "POST /promotions endpoint" \
    "grep -q \"router.post('/promotions'\" routes/api/valley-optimization.js"

check "GET /promotions/:id endpoint" \
    "grep -q \"router.get('/promotions/:id'\" routes/api/valley-optimization.js"

check "PUT /promotions/:id/activate endpoint" \
    "grep -q \"router.put('/promotions/:id/activate'\" routes/api/valley-optimization.js"

check "POST /conversions endpoint" \
    "grep -q \"router.post('/conversions'\" routes/api/valley-optimization.js"

check "POST /escalate endpoint" \
    "grep -q \"router.post.*escalate\" routes/api/valley-optimization.js"

check "GET /stats endpoint" \
    "grep -q \"router.get('/stats'\" routes/api/valley-optimization.js"

check "Error handling middleware" \
    "grep -q 'next(error)' routes/api/valley-optimization.js"

# ============================================================================
# SECTION 5: WHATSAPP TEMPLATES
# ============================================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "5. WhatsApp Templates"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

check "Valley promotion template exists" \
    "test -f whatsapp/templates/valley_promotion_offer.json"

check "Template has category MARKETING" \
    "grep -q '\"category\".*\"MARKETING\"' whatsapp/templates/valley_promotion_offer.json"

check "Template has member_name variable" \
    "grep -q 'member_name' whatsapp/templates/valley_promotion_offer.json"

check "Template has discount_percentage variable" \
    "grep -q 'discount_percentage' whatsapp/templates/valley_promotion_offer.json"

check "Template has quick reply buttons" \
    "grep -q 'QUICK_REPLY' whatsapp/templates/valley_promotion_offer.json"

# ============================================================================
# SECTION 6: QUEUE WORKERS
# ============================================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "6. Queue Workers"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

check "Worker file exists" \
    "test -f workers/valley-optimization-processor.js"

check "Bull queue defined" \
    "grep -q 'new Bull' workers/valley-optimization-processor.js"

check "send-promotion job processor" \
    "grep -q \"process('send-promotion'\" workers/valley-optimization-processor.js"

check "daily-analysis job processor" \
    "grep -q \"process('daily-analysis'\" workers/valley-optimization-processor.js"

check "schedulePromotionSending function" \
    "grep -q 'function schedulePromotionSending' workers/valley-optimization-processor.js"

check "scheduleDailyAnalysis function" \
    "grep -q 'function scheduleDailyAnalysis' workers/valley-optimization-processor.js"

check "WhatsApp integration" \
    "grep -q 'whatsappSender' workers/valley-optimization-processor.js"

check "Retry logic with backoff" \
    "grep -q 'backoff' workers/valley-optimization-processor.js"

# ============================================================================
# SUMMARY
# ============================================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "VALIDATION SUMMARY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "  ${GREEN}Passed:${NC} $PASSED"
echo -e "  ${RED}Failed:${NC} $FAILED"
echo -e "  ${BLUE}Total:${NC}  $((PASSED + FAILED))"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                 ✓ ALL VALIDATIONS PASSED                          ║${NC}"
    echo -e "${GREEN}║          PROMPT 11 Implementation Complete                        ║${NC}"
    echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    exit 0
else
    echo -e "${RED}╔═══════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║                 ✗ SOME VALIDATIONS FAILED                         ║${NC}"
    echo -e "${RED}║          Please review the failed checks above                    ║${NC}"
    echo -e "${RED}╚═══════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    exit 1
fi
