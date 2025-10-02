#!/bin/bash

# ===================================================================
# PROMPT 9 VALIDATION SCRIPT: Instructor Replacement System
# ===================================================================

echo "=================================================="
echo "🔍 VALIDATING PROMPT 9: INSTRUCTOR REPLACEMENT SYSTEM"
echo "=================================================="
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

SUCCESS=0
FAILED=0

# Function to check file existence
check_file() {
  if [ -f "$1" ]; then
    echo -e "${GREEN}✓${NC} $1 exists"
    SUCCESS=$((SUCCESS + 1))
  else
    echo -e "${RED}✗${NC} $1 NOT FOUND"
    FAILED=$((FAILED + 1))
  fi
}

# Function to check string in file
check_string() {
  if grep -q "$2" "$1"; then
    echo -e "${GREEN}✓${NC} Found '$2' in $1"
    SUCCESS=$((SUCCESS + 1))
  else
    echo -e "${RED}✗${NC} NOT FOUND '$2' in $1"
    FAILED=$((FAILED + 1))
  fi
}

echo "📁 1. DATABASE COMPONENTS"
echo "-------------------------"
check_file "database/schemas/replacements_table.sql"
check_file "database/functions/match_replacement_candidates.sql"
echo ""

echo "📁 2. DATABASE SCHEMA VALIDATION"
echo "--------------------------------"
check_string "database/schemas/replacements_table.sql" "CREATE TABLE.*replacements"
check_string "database/schemas/replacements_table.sql" "CREATE TABLE.*instructor_availability"
check_string "database/schemas/replacements_table.sql" "CREATE TABLE.*replacement_offers"
check_string "database/schemas/replacements_table.sql" "bonus_tier VARCHAR"
check_string "database/schemas/replacements_table.sql" "candidate_ids UUID"
check_string "database/schemas/replacements_table.sql" "calculate_replacement_bonus"
check_string "database/schemas/replacements_table.sql" "get_instructor_replacement_stats"
check_string "database/schemas/replacements_table.sql" "v_active_replacements"
check_string "database/schemas/replacements_table.sql" "v_replacement_metrics"
echo ""

echo "📁 3. MATCHING FUNCTIONS"
echo "-----------------------"
check_string "database/functions/match_replacement_candidates.sql" "match_replacement_candidates"
check_string "database/functions/match_replacement_candidates.sql" "priority_score"
check_string "database/functions/match_replacement_candidates.sql" "parse_absence_datetime"
check_string "database/functions/match_replacement_candidates.sql" "register_instructor_absence"
echo ""

echo "📁 4. WHATSAPP TEMPLATES"
echo "-----------------------"
check_file "whatsapp/templates/replacement_offer.json"
check_file "whatsapp/templates/replacement_accepted_confirmation.json"
check_file "whatsapp/templates/replacement_student_notification.json"
check_file "whatsapp/templates/replacement_original_instructor_notification.json"
check_file "whatsapp/templates/absence_confirmation.json"
echo ""

echo "📁 5. BACKEND SERVICES"
echo "---------------------"
check_file "services/replacement-service.js"
check_string "services/replacement-service.js" "reportAbsence"
check_string "services/replacement-service.js" "findAndOfferReplacement"
check_string "services/replacement-service.js" "processOfferResponse"
check_string "services/replacement-service.js" "acceptReplacementOffer"
check_string "services/replacement-service.js" "notifyReplacementAccepted"
check_string "services/replacement-service.js" "replacementQueue"
echo ""

echo "📁 6. API ROUTES"
echo "---------------"
check_file "routes/api/replacements.js"
check_string "routes/api/replacements.js" "router.post('/absence'"
check_string "routes/api/replacements.js" "router.post('/:id/find-candidates'"
check_string "routes/api/replacements.js" "router.post('/offers/:offerId/respond'"
check_string "routes/api/replacements.js" "router.get('/active'"
check_string "routes/api/replacements.js" "router.get('/instructor/:instructorId/stats'"
check_string "routes/api/replacements.js" "router.get('/metrics'"
check_string "routes/api/replacements.js" "router.post('/availability'"
echo ""

echo "📁 7. QUEUE PROCESSOR"
echo "--------------------"
check_file "workers/replacement-queue-processor.js"
check_string "workers/replacement-queue-processor.js" "replacementQueue.process('send-offer'"
check_string "workers/replacement-queue-processor.js" "replacementQueue.process('send-confirmation'"
check_string "workers/replacement-queue-processor.js" "replacementQueue.process('send-student-notification'"
check_string "workers/replacement-queue-processor.js" "replacementQueue.process('send-absence-confirmation'"
echo ""

echo "📁 8. INDEX.JS INTEGRATION"
echo "-------------------------"
check_string "index.js" "const replacementsRoutes = require('./routes/api/replacements')"
check_string "index.js" "app.use('/api/replacements', replacementsRoutes)"
check_string "index.js" "require('./workers/replacement-queue-processor')"
echo ""

echo "📁 9. TESTS"
echo "----------"
check_file "tests/integration/replacements.spec.js"
check_string "tests/integration/replacements.spec.js" "Replacement System Integration Tests"
check_string "tests/integration/replacements.spec.js" "should report absence with natural language parsing"
check_string "tests/integration/replacements.spec.js" "should find and rank replacement candidates"
check_string "tests/integration/replacements.spec.js" "should accept replacement offer"
check_string "tests/integration/replacements.spec.js" "should decline replacement offer"
echo ""

echo "📁 10. ENVIRONMENT CONFIGURATION"
echo "-------------------------------"
check_file ".env.example"
check_string ".env.example" "REPLACEMENT_OFFER_EXPIRY_MINUTES"
check_string ".env.example" "REPLACEMENT_MAX_CANDIDATES"
check_string ".env.example" "REPLACEMENT_BONUS_URGENT"
check_string ".env.example" "REPLACEMENT_BONUS_STANDARD"
echo ""

echo "=================================================="
echo "📊 VALIDATION SUMMARY"
echo "=================================================="
TOTAL=$((SUCCESS + FAILED))
PERCENTAGE=$((SUCCESS * 100 / TOTAL))

echo -e "${GREEN}✓ Passed:${NC} $SUCCESS/$TOTAL checks ($PERCENTAGE%)"
if [ $FAILED -gt 0 ]; then
  echo -e "${RED}✗ Failed:${NC} $FAILED/$TOTAL checks"
  echo ""
  echo -e "${YELLOW}⚠️  Some validations failed. Review output above.${NC}"
  exit 1
else
  echo ""
  echo -e "${GREEN}✅ ALL VALIDATIONS PASSED!${NC}"
  echo ""
  echo "🎉 PROMPT 9 Implementation Complete!"
  echo ""
  echo "Next Steps:"
  echo "  1. Update .env with REPLACEMENT_* variables"
  echo "  2. Run database migrations (replacements tables + functions)"
  echo "  3. Deploy WhatsApp templates to Meta Business Suite (5 templates)"
  echo "  4. Configure instructor availability in database"
  echo "  5. Run integration tests: npm test tests/integration/replacements.spec.js"
  echo "  6. Proceed to PROMPT 10: Instructor Panel 'My Class Now'"
  echo ""
  exit 0
fi
