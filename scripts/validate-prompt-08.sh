#!/bin/bash

# ===================================================================
# PROMPT 8 VALIDATION SCRIPT: Post-Class Survey System
# ===================================================================

echo "=================================================="
echo "🔍 VALIDATING PROMPT 8: POST-CLASS SURVEY SYSTEM"
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
check_file "database/schemas/surveys_table.sql"
check_file "database/functions/trigger_post_class_survey.sql"
echo ""

echo "📁 2. DATABASE SCHEMA VALIDATION"
echo "--------------------------------"
check_string "database/schemas/surveys_table.sql" "CREATE TABLE surveys"
check_string "database/schemas/surveys_table.sql" "sentiment VARCHAR(20)"
check_string "database/schemas/surveys_table.sql" "nps_category VARCHAR(20)"
check_string "database/schemas/surveys_table.sql" "CREATE INDEX idx_surveys_instructor"
check_string "database/schemas/surveys_table.sql" "CREATE INDEX idx_surveys_actionable"
check_string "database/schemas/surveys_table.sql" "CREATE FUNCTION calculate_instructor_nps"
check_string "database/schemas/surveys_table.sql" "CREATE MATERIALIZED VIEW mv_instructor_performance"
echo ""

echo "📁 3. TRIGGER FUNCTIONS"
echo "----------------------"
check_string "database/functions/trigger_post_class_survey.sql" "CREATE OR REPLACE FUNCTION schedule_post_class_survey"
check_string "database/functions/trigger_post_class_survey.sql" "CREATE TRIGGER trigger_schedule_survey"
check_string "database/functions/trigger_post_class_survey.sql" "CREATE TRIGGER trigger_detect_actionable"
echo ""

echo "📁 4. WHATSAPP TEMPLATES"
echo "-----------------------"
check_file "whatsapp/templates/post_class_survey.json"
check_file "whatsapp/templates/survey_low_rating_followup.json"
check_string "whatsapp/templates/post_class_survey.json" "post_class_survey"
check_string "whatsapp/templates/survey_low_rating_followup.json" "survey_low_rating_followup"
echo ""

echo "📁 5. BACKEND SERVICES"
echo "---------------------"
check_file "services/survey-service.js"
check_string "services/survey-service.js" "analyzeSentiment"
check_string "services/survey-service.js" "schedulePostClassSurvey"
check_string "services/survey-service.js" "processSurveyResponse"
check_string "services/survey-service.js" "calculateInstructorNPS"
check_string "services/survey-service.js" "GoogleGenerativeAI"
echo ""

echo "📁 6. API ROUTES"
echo "---------------"
check_file "routes/api/surveys.js"
check_string "routes/api/surveys.js" "router.post('/schedule'"
check_string "routes/api/surveys.js" "router.post('/response'"
check_string "routes/api/surveys.js" "router.get('/instructor/:id/nps'"
check_string "routes/api/surveys.js" "router.get('/instructor/:id/trend'"
check_string "routes/api/surveys.js" "router.get('/actionable'"
check_string "routes/api/surveys.js" "router.post('/:id/action-taken'"
echo ""

echo "📁 7. QUEUE PROCESSOR"
echo "--------------------"
check_file "workers/survey-queue-processor.js"
check_string "workers/survey-queue-processor.js" "surveyQueue.process('send-survey-message'"
check_string "workers/survey-queue-processor.js" "surveyQueue.process('send-low-rating-followup'"
check_string "workers/survey-queue-processor.js" "surveyQueue.on('completed'"
echo ""

echo "📁 8. INDEX.JS INTEGRATION"
echo "-------------------------"
check_string "index.js" "const surveysRoutes = require('./routes/api/surveys')"
check_string "index.js" "app.use('/api/surveys', surveysRoutes)"
check_string "index.js" "require('./workers/survey-queue-processor')"
echo ""

echo "📁 9. TESTS"
echo "----------"
check_file "tests/integration/surveys.spec.js"
check_string "tests/integration/surveys.spec.js" "describe('Survey System Integration Tests'"
check_string "tests/integration/surveys.spec.js" "should schedule a post-class survey"
check_string "tests/integration/surveys.spec.js" "should calculate NPS correctly"
check_string "tests/integration/surveys.spec.js" "should analyze positive sentiment"
echo ""

echo "📁 10. ENVIRONMENT CONFIGURATION"
echo "-------------------------------"
check_file ".env.example"
check_string ".env.example" "GEMINI_API_KEY"
check_string ".env.example" "SURVEY_DELAY_MINUTES"
check_string ".env.example" "SURVEY_RESPONSE_RATE_TARGET"
echo ""

echo "📁 11. DOCUMENTATION"
echo "-------------------"
check_file "docs/PROMPT_08_POST_CLASS_SURVEYS_COMPLETED.md"
check_string "docs/PROMPT_08_POST_CLASS_SURVEYS_COMPLETED.md" "PROMPT 8: Post-Class Survey System"
check_string "docs/PROMPT_08_POST_CLASS_SURVEYS_COMPLETED.md" "Google Gemini AI Integration"
check_string "docs/PROMPT_08_POST_CLASS_SURVEYS_COMPLETED.md" "API Reference"
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
  echo "🎉 PROMPT 8 Implementation Complete!"
  echo ""
  echo "Next Steps:"
  echo "  1. Update .env with GEMINI_API_KEY"
  echo "  2. Run database migrations"
  echo "  3. Deploy WhatsApp templates to Meta Business Suite"
  echo "  4. Run integration tests: npm test tests/integration/surveys.spec.js"
  echo "  5. Proceed to PROMPT 9: Automatic Instructor Replacement System"
  echo ""
  exit 0
fi
