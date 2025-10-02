#!/bin/bash

# PROMPT 7: Validation Script
# Script para validar la implementación del sistema de cobranza contextual

echo "=================================="
echo "PROMPT 7: Validation Script"
echo "Contextual Collection System"
echo "=================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0

# Helper function
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $1"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} $1 - NOT FOUND"
        ((FAILED++))
    fi
}

check_content() {
    if grep -q "$2" "$1" 2>/dev/null; then
        echo -e "${GREEN}✓${NC} $1 contains '$2'"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} $1 missing '$2'"
        ((FAILED++))
    fi
}

echo "1. Checking Database Files..."
echo "------------------------------"
check_file "database/schemas/collections_table.sql"
check_file "database/functions/trigger_contextual_collection.sql"
check_file "database/migrations/007_contextual_collection.sql"
echo ""

echo "2. Checking Backend Services..."
echo "------------------------------"
check_file "services/contextual-collection-service.js"
check_content "services/contextual-collection-service.js" "detectMemberDebt"
check_content "services/contextual-collection-service.js" "schedulePostWorkoutCollection"
check_content "services/contextual-collection-service.js" "generatePaymentLink"
echo ""

echo "3. Checking API Routes..."
echo "------------------------------"
check_file "routes/api/collection.js"
check_content "routes/api/collection.js" "POST /api/collection/schedule"
check_content "routes/api/collection.js" "GET /api/collection/stats"
check_content "routes/api/collection.js" "POST /api/collection/webhook"
echo ""

echo "4. Checking Queue Processor..."
echo "------------------------------"
check_file "workers/collection-queue-processor.js"
check_content "workers/collection-queue-processor.js" "send-collection-message"
echo ""

echo "5. Checking WhatsApp Template..."
echo "------------------------------"
check_file "whatsapp/templates/debt_post_workout.json"
check_content "whatsapp/templates/debt_post_workout.json" "debt_post_workout"
echo ""

echo "6. Checking Integration..."
echo "------------------------------"
check_content "index.js" "require('./routes/api/collection')"
check_content "index.js" "require('./workers/collection-queue-processor')"
check_content "index.js" "app.use('/api/collection', collectionRoutes)"
echo ""

echo "7. Checking Tests..."
echo "------------------------------"
check_file "tests/integration/contextual-collection.spec.js"
check_content "tests/integration/contextual-collection.spec.js" "detectMemberDebt"
check_content "tests/integration/contextual-collection.spec.js" "schedulePostWorkoutCollection"
echo ""

echo "8. Checking Documentation..."
echo "------------------------------"
check_file "docs/prompt-07-contextual-collection.md"
check_file "docs/PROMPT_07_DAY1_COMPLETED.md"
echo ""

echo "9. Checking Configuration..."
echo "------------------------------"
check_content ".env.example" "MERCADOPAGO_ACCESS_TOKEN"
check_content ".env.example" "COLLECTION_DELAY_MINUTES"
check_content ".env.example" "COLLECTION_MIN_DEBT_AMOUNT"
echo ""

echo "=================================="
echo "VALIDATION SUMMARY"
echo "=================================="
echo -e "${GREEN}Passed: $PASSED${NC}"
if [ $FAILED -gt 0 ]; then
    echo -e "${RED}Failed: $FAILED${NC}"
else
    echo -e "${GREEN}Failed: $FAILED${NC}"
fi
echo "=================================="

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ ALL CHECKS PASSED!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Apply database migration: psql -f database/migrations/007_contextual_collection.sql"
    echo "2. Configure MercadoPago credentials in .env"
    echo "3. Submit WhatsApp template for approval"
    echo "4. Run integration tests: npm run test:integration"
    echo "5. Deploy to staging environment"
    exit 0
else
    echo -e "${RED}✗ SOME CHECKS FAILED${NC}"
    echo "Please review the failed checks above"
    exit 1
fi
