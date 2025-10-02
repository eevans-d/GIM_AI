#!/bin/bash

# PROMPT 18: INTEGRATION TESTING SUITE VALIDATION
# Valida todos los componentes del sistema de testing

echo "=========================================================================="
echo "PROMPT 18: INTEGRATION TESTING SUITE VALIDATION"
echo "=========================================================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASS_COUNT=0
FAIL_COUNT=0

# Function to check if file exists
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} File exists: $1"
        ((PASS_COUNT++))
        return 0
    else
        echo -e "${RED}✗${NC} File missing: $1"
        ((FAIL_COUNT++))
        return 1
    fi
}

# Function to check if directory exists
check_dir() {
    if [ -d "$1" ]; then
        echo -e "${GREEN}✓${NC} Directory exists: $1"
        ((PASS_COUNT++))
        return 0
    else
        echo -e "${RED}✗${NC} Directory missing: $1"
        ((FAIL_COUNT++))
        return 1
    fi
}

# Function to grep file content
check_content() {
    if grep -q "$2" "$1"; then
        echo -e "${GREEN}✓${NC} $1 contains: $2"
        ((PASS_COUNT++))
        return 0
    else
        echo -e "${RED}✗${NC} $1 missing: $2"
        ((FAIL_COUNT++))
        return 1
    fi
}

# Function to check npm script
check_script() {
    if npm run | grep -q "$1"; then
        echo -e "${GREEN}✓${NC} npm script exists: $1"
        ((PASS_COUNT++))
        return 0
    else
        echo -e "${RED}✗${NC} npm script missing: $1"
        ((FAIL_COUNT++))
        return 1
    fi
}

echo "----------------------------------------------------------------------"
echo "CATEGORY 1: E2E TEST FILES (7 checks)"
echo "----------------------------------------------------------------------"

check_file "tests/integration/e2e-complete-flow.spec.js"
check_content "tests/integration/e2e-complete-flow.spec.js" "E2E: Complete Member Journey"
check_content "tests/integration/e2e-complete-flow.spec.js" "QR Code Generation"
check_content "tests/integration/e2e-complete-flow.spec.js" "Check-in via QR"
check_content "tests/integration/e2e-complete-flow.spec.js" "WhatsApp Confirmation"
check_content "tests/integration/e2e-complete-flow.spec.js" "Post-Class Survey"
check_content "tests/integration/e2e-complete-flow.spec.js" "Dashboard Updates"

echo ""
echo "----------------------------------------------------------------------"
echo "CATEGORY 2: API INTEGRATION TESTS (10 checks)"
echo "----------------------------------------------------------------------"

check_file "tests/integration/api-endpoints.spec.js"
check_content "tests/integration/api-endpoints.spec.js" "QR Endpoints"
check_content "tests/integration/api-endpoints.spec.js" "Check-in Endpoints"
check_content "tests/integration/api-endpoints.spec.js" "Reminder Endpoints"
check_content "tests/integration/api-endpoints.spec.js" "Contextual Collection Endpoints"
check_content "tests/integration/api-endpoints.spec.js" "Survey Endpoints"
check_content "tests/integration/api-endpoints.spec.js" "Replacement Endpoints"
check_content "tests/integration/api-endpoints.spec.js" "Instructor Panel Endpoints"
check_content "tests/integration/api-endpoints.spec.js" "Dashboard Endpoints"
check_content "tests/integration/api-endpoints.spec.js" "Error Handling"

echo ""
echo "----------------------------------------------------------------------"
echo "CATEGORY 3: DATABASE INTEGRITY TESTS (11 checks)"
echo "----------------------------------------------------------------------"

check_file "tests/integration/database-integrity.spec.js"
check_content "tests/integration/database-integrity.spec.js" "Foreign Key Constraints"
check_content "tests/integration/database-integrity.spec.js" "Unique Constraints"
check_content "tests/integration/database-integrity.spec.js" "Check Constraints"
check_content "tests/integration/database-integrity.spec.js" "Triggers"
check_content "tests/integration/database-integrity.spec.js" "Stored Functions"
check_content "tests/integration/database-integrity.spec.js" "Materialized Views"
check_content "tests/integration/database-integrity.spec.js" "Transactions"
check_content "tests/integration/database-integrity.spec.js" "Data Consistency"
check_content "tests/integration/database-integrity.spec.js" "Indexes"
check_content "tests/integration/database-integrity.spec.js" "create_daily_snapshot"

echo ""
echo "----------------------------------------------------------------------"
echo "CATEGORY 4: QUEUE & WORKER TESTS (10 checks)"
echo "----------------------------------------------------------------------"

check_file "tests/integration/queue-worker.spec.js"
check_content "tests/integration/queue-worker.spec.js" "Contextual Collection Queue"
check_content "tests/integration/queue-worker.spec.js" "Post-Class Survey Queue"
check_content "tests/integration/queue-worker.spec.js" "Instructor Replacement Queue"
check_content "tests/integration/queue-worker.spec.js" "Instructor Alert Queue"
check_content "tests/integration/queue-worker.spec.js" "Queue Monitoring"
check_content "tests/integration/queue-worker.spec.js" "Cron Jobs"
check_content "tests/integration/queue-worker.spec.js" "Job Data Validation"
check_content "tests/integration/queue-worker.spec.js" "Queue Cleanup"
check_content "tests/integration/queue-worker.spec.js" "Error Handling"

echo ""
echo "----------------------------------------------------------------------"
echo "CATEGORY 5: WHATSAPP INTEGRATION TESTS (10 checks)"
echo "----------------------------------------------------------------------"

check_file "tests/integration/whatsapp-mocked.spec.js"
check_content "tests/integration/whatsapp-mocked.spec.js" "Template Message Sending"
check_content "tests/integration/whatsapp-mocked.spec.js" "Rate Limiting"
check_content "tests/integration/whatsapp-mocked.spec.js" "Business Hours"
check_content "tests/integration/whatsapp-mocked.spec.js" "Webhook Processing"
check_content "tests/integration/whatsapp-mocked.spec.js" "Delivery Tracking"
check_content "tests/integration/whatsapp-mocked.spec.js" "Template Variable Substitution"
check_content "tests/integration/whatsapp-mocked.spec.js" "Multi-language Support"
check_content "tests/integration/whatsapp-mocked.spec.js" "nock"
check_content "tests/integration/whatsapp-mocked.spec.js" "checkin_confirmation"

echo ""
echo "----------------------------------------------------------------------"
echo "CATEGORY 6: PERFORMANCE TESTS (8 checks)"
echo "----------------------------------------------------------------------"

check_file "tests/performance/artillery-config.yml"
check_file "tests/performance/artillery-processor.js"
check_content "tests/performance/artillery-config.yml" "Dashboard KPIs Load Test"
check_content "tests/performance/artillery-config.yml" "Check-in Flow Stress Test"
check_content "tests/performance/artillery-config.yml" "Survey Submission Load Test"
check_content "tests/performance/artillery-config.yml" "Instructor Panel Concurrent Access"
check_content "tests/performance/artillery-processor.js" "generateRandomMemberId"
check_content "tests/performance/artillery-processor.js" "generateRandomQRCode"

echo ""
echo "----------------------------------------------------------------------"
echo "CATEGORY 7: CI/CD PIPELINE (12 checks)"
echo "----------------------------------------------------------------------"

check_file ".github/workflows/integration-testing.yml"
check_content ".github/workflows/integration-testing.yml" "Integration Testing Suite"
check_content ".github/workflows/integration-testing.yml" "lint:"
check_content ".github/workflows/integration-testing.yml" "unit-tests:"
check_content ".github/workflows/integration-testing.yml" "integration-tests:"
check_content ".github/workflows/integration-testing.yml" "e2e-tests:"
check_content ".github/workflows/integration-testing.yml" "performance-tests:"
check_content ".github/workflows/integration-testing.yml" "database-tests:"
check_content ".github/workflows/integration-testing.yml" "security-scan:"
check_content ".github/workflows/integration-testing.yml" "test-summary:"
check_content ".github/workflows/integration-testing.yml" "postgres:"
check_content ".github/workflows/integration-testing.yml" "redis:"

echo ""
echo "----------------------------------------------------------------------"
echo "CATEGORY 8: NPM SCRIPTS (12 checks)"
echo "----------------------------------------------------------------------"

check_script "test:unit"
check_script "test:integration"
check_script "test:database"
check_script "test:e2e"
check_script "test:api"
check_script "test:queue"
check_script "test:whatsapp"
check_script "test:performance"
check_script "test:all"
check_script "lint"
check_script "format"
check_script "format:check"

echo ""
echo "----------------------------------------------------------------------"
echo "CATEGORY 9: DEPENDENCIES (5 checks)"
echo "----------------------------------------------------------------------"

check_content "package.json" "\"nock\""
check_content "package.json" "\"artillery\""
check_content "package.json" "\"jest\""
check_content "package.json" "\"@supabase/supabase-js\""
check_content "package.json" "\"bull\""

echo ""
echo "----------------------------------------------------------------------"
echo "CATEGORY 10: TEST INFRASTRUCTURE (8 checks)"
echo "----------------------------------------------------------------------"

check_dir "tests/integration"
check_dir "tests/performance"
check_dir ".github/workflows"
check_file "tests/__mocks__/winston.js"
check_file "tests/__mocks__/winston-daily-rotate-file.js"
check_file "tests/jest.setup.js"
check_file "jest.config.js"
check_content "jest.config.js" "testEnvironment"

echo ""
echo "----------------------------------------------------------------------"
echo "CATEGORY 11: DOCUMENTATION (5 checks)"
echo "----------------------------------------------------------------------"

check_file "tests/README.md"
check_content "tests/README.md" "integration"
check_content "tests/README.md" "E2E"
check_content "tests/README.md" "performance"
check_content "tests/README.md" "CI/CD"

echo ""
echo "=========================================================================="
echo "VALIDATION SUMMARY"
echo "=========================================================================="
echo -e "✓ Passed: ${GREEN}${PASS_COUNT}${NC}"
echo -e "✗ Failed: ${RED}${FAIL_COUNT}${NC}"
echo -e "Total:   $((PASS_COUNT + FAIL_COUNT))"
echo ""

if [ $FAIL_COUNT -eq 0 ]; then
    echo -e "${GREEN}🎉 ALL CHECKS PASSED!${NC}"
    echo "Prompt 18 implementation is complete and validated."
    exit 0
else
    PERCENTAGE=$((PASS_COUNT * 100 / (PASS_COUNT + FAIL_COUNT)))
    echo -e "${YELLOW}⚠ ${FAIL_COUNT} checks failed (${PERCENTAGE}% success rate)${NC}"
    echo "Review the failed checks above."
    exit 1
fi
