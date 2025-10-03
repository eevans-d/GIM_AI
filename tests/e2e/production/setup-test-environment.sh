#!/bin/bash

################################################################################
# Setup Test Environment for E2E Testing
# 
# This script creates test data in the production/staging environment
# Required before running E2E tests
# 
# Usage:
#   ./tests/e2e/production/setup-test-environment.sh production
#   ./tests/e2e/production/setup-test-environment.sh staging
################################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

log_success() {
    echo -e "${GREEN}✓${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

log_section() {
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    echo ""
}

# Get environment from argument
ENVIRONMENT=${1:-production}

if [[ "$ENVIRONMENT" != "production" && "$ENVIRONMENT" != "staging" ]]; then
    log_error "Invalid environment: $ENVIRONMENT"
    echo "Usage: $0 [production|staging]"
    exit 1
fi

log_section "🚀 Setting up test environment: $ENVIRONMENT"

# Load environment variables
if [[ "$ENVIRONMENT" == "production" ]]; then
    ENV_FILE=".env.production"
    BASE_URL="${PRODUCTION_URL:-https://gim-ai-production.up.railway.app}"
else
    ENV_FILE=".env.staging"
    BASE_URL="${STAGING_URL:-https://gim-ai-staging.up.railway.app}"
fi

if [[ ! -f "$ENV_FILE" ]]; then
    log_error "Environment file not found: $ENV_FILE"
    exit 1
fi

log_info "Loading environment from: $ENV_FILE"
source "$ENV_FILE"

# Check if base URL is accessible
log_info "Checking if API is accessible at: $BASE_URL"
if ! curl -f -s "${BASE_URL}/health" > /dev/null; then
    log_error "API is not accessible at $BASE_URL"
    log_info "Please ensure the app is deployed and running"
    exit 1
fi
log_success "API is accessible"

# Authenticate as admin
log_section "🔐 Authenticating as admin"

ADMIN_EMAIL="${PRODUCTION_ADMIN_EMAIL:-admin@gimapp.com}"
ADMIN_PASSWORD="${PRODUCTION_ADMIN_PASSWORD}"

if [[ -z "$ADMIN_PASSWORD" ]]; then
    log_error "ADMIN_PASSWORD not set in environment"
    exit 1
fi

AUTH_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/v1/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"${ADMIN_EMAIL}\",\"password\":\"${ADMIN_PASSWORD}\"}")

AUTH_TOKEN=$(echo "$AUTH_RESPONSE" | jq -r '.token // empty')

if [[ -z "$AUTH_TOKEN" || "$AUTH_TOKEN" == "null" ]]; then
    log_error "Failed to authenticate"
    echo "$AUTH_RESPONSE" | jq '.'
    exit 1
fi

log_success "Authenticated successfully"
log_info "Token: ${AUTH_TOKEN:0:20}..."

# Create test member
log_section "👤 Creating test member"

TEST_MEMBER_PHONE="${TEST_MEMBER_PHONE:-+5491112345678}"
TEST_MEMBER_EMAIL="test.member.$(date +%s)@gimapp.com"
TEST_MEMBER_NAME="Test Member E2E"

CREATE_MEMBER_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/v1/members" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${AUTH_TOKEN}" \
    -d "{
        \"nombre\": \"${TEST_MEMBER_NAME}\",
        \"email\": \"${TEST_MEMBER_EMAIL}\",
        \"telefono\": \"${TEST_MEMBER_PHONE}\",
        \"fecha_nacimiento\": \"1990-01-01\",
        \"genero\": \"otro\",
        \"plan_id\": \"monthly\",
        \"status\": \"activo\"
    }")

MEMBER_ID=$(echo "$CREATE_MEMBER_RESPONSE" | jq -r '.id // empty')
MEMBER_QR=$(echo "$CREATE_MEMBER_RESPONSE" | jq -r '.codigo_qr // empty')

if [[ -z "$MEMBER_ID" || "$MEMBER_ID" == "null" ]]; then
    # Member might already exist, try to find it
    log_warning "Failed to create member, checking if already exists..."
    
    FIND_MEMBER_RESPONSE=$(curl -s -X GET "${BASE_URL}/api/v1/members?telefono=${TEST_MEMBER_PHONE}" \
        -H "Authorization: Bearer ${AUTH_TOKEN}")
    
    MEMBER_ID=$(echo "$FIND_MEMBER_RESPONSE" | jq -r '.data[0].id // empty')
    MEMBER_QR=$(echo "$FIND_MEMBER_RESPONSE" | jq -r '.data[0].codigo_qr // empty')
    
    if [[ -z "$MEMBER_ID" || "$MEMBER_ID" == "null" ]]; then
        log_error "Failed to create or find test member"
        echo "$CREATE_MEMBER_RESPONSE" | jq '.'
        exit 1
    fi
    
    log_success "Found existing test member"
else
    log_success "Test member created successfully"
fi

log_info "Member ID: $MEMBER_ID"
log_info "Member QR: $MEMBER_QR"
log_info "Member Phone: $TEST_MEMBER_PHONE"

# Export for use in tests
echo "export TEST_MEMBER_ID=$MEMBER_ID" > .test-env
echo "export TEST_MEMBER_QR=$MEMBER_QR" >> .test-env
echo "export TEST_MEMBER_PHONE=$TEST_MEMBER_PHONE" >> .test-env

# Create test instructor
log_section "👨‍🏫 Creating test instructor"

TEST_INSTRUCTOR_NAME="Test Instructor E2E"
TEST_INSTRUCTOR_EMAIL="test.instructor.$(date +%s)@gimapp.com"
TEST_INSTRUCTOR_PHONE="+5491187654321"

CREATE_INSTRUCTOR_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/v1/instructors" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${AUTH_TOKEN}" \
    -d "{
        \"nombre\": \"${TEST_INSTRUCTOR_NAME}\",
        \"email\": \"${TEST_INSTRUCTOR_EMAIL}\",
        \"telefono\": \"${TEST_INSTRUCTOR_PHONE}\",
        \"especialidades\": [\"spinning\", \"funcional\"],
        \"certificaciones\": [\"Instructor Nacional de Fitness\"],
        \"status\": \"activo\"
    }")

INSTRUCTOR_ID=$(echo "$CREATE_INSTRUCTOR_RESPONSE" | jq -r '.id // empty')

if [[ -z "$INSTRUCTOR_ID" || "$INSTRUCTOR_ID" == "null" ]]; then
    log_warning "Failed to create instructor, checking if already exists..."
    
    FIND_INSTRUCTOR_RESPONSE=$(curl -s -X GET "${BASE_URL}/api/v1/instructors?search=${TEST_INSTRUCTOR_NAME}" \
        -H "Authorization: Bearer ${AUTH_TOKEN}")
    
    INSTRUCTOR_ID=$(echo "$FIND_INSTRUCTOR_RESPONSE" | jq -r '.data[0].id // empty')
    
    if [[ -z "$INSTRUCTOR_ID" || "$INSTRUCTOR_ID" == "null" ]]; then
        log_error "Failed to create or find test instructor"
        echo "$CREATE_INSTRUCTOR_RESPONSE" | jq '.'
        exit 1
    fi
    
    log_success "Found existing test instructor"
else
    log_success "Test instructor created successfully"
fi

log_info "Instructor ID: $INSTRUCTOR_ID"

echo "export TEST_INSTRUCTOR_ID=$INSTRUCTOR_ID" >> .test-env

# Create test class (today + 2 hours)
log_section "🏋️ Creating test class"

# Calculate class start time (2 hours from now)
CLASS_DATE=$(date -u -d '+2 hours' +%Y-%m-%d)
CLASS_TIME=$(date -u -d '+2 hours' +%H:%M:%S)

CREATE_CLASS_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/v1/classes" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${AUTH_TOKEN}" \
    -d "{
        \"nombre\": \"Test Class E2E\",
        \"tipo\": \"spinning\",
        \"instructor_id\": \"${INSTRUCTOR_ID}\",
        \"fecha\": \"${CLASS_DATE}\",
        \"hora_inicio\": \"${CLASS_TIME}\",
        \"duracion_minutos\": 60,
        \"capacidad_maxima\": 20,
        \"descripcion\": \"Test class for E2E testing\",
        \"nivel\": \"intermedio\"
    }")

CLASS_ID=$(echo "$CREATE_CLASS_RESPONSE" | jq -r '.id // empty')

if [[ -z "$CLASS_ID" || "$CLASS_ID" == "null" ]]; then
    log_error "Failed to create test class"
    echo "$CREATE_CLASS_RESPONSE" | jq '.'
    # Don't exit, classes might be optional for some tests
    log_warning "Continuing without test class..."
else
    log_success "Test class created successfully"
    log_info "Class ID: $CLASS_ID"
    log_info "Class Date: $CLASS_DATE $CLASS_TIME"
    
    echo "export TEST_CLASS_ID=$CLASS_ID" >> .test-env
    echo "export TEST_CLASS_DATE=$CLASS_DATE" >> .test-env
fi

# Create past class for check-in testing
log_section "🕐 Creating past class for check-in testing"

PAST_CLASS_DATE=$(date -u -d '-1 hour' +%Y-%m-%d)
PAST_CLASS_TIME=$(date -u -d '-1 hour' +%H:%M:%S)

CREATE_PAST_CLASS_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/v1/classes" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${AUTH_TOKEN}" \
    -d "{
        \"nombre\": \"Test Class E2E (Past)\",
        \"tipo\": \"funcional\",
        \"instructor_id\": \"${INSTRUCTOR_ID}\",
        \"fecha\": \"${PAST_CLASS_DATE}\",
        \"hora_inicio\": \"${PAST_CLASS_TIME}\",
        \"duracion_minutos\": 60,
        \"capacidad_maxima\": 20,
        \"descripcion\": \"Past test class for check-in E2E testing\",
        \"nivel\": \"intermedio\"
    }")

PAST_CLASS_ID=$(echo "$CREATE_PAST_CLASS_RESPONSE" | jq -r '.id // empty')

if [[ -z "$PAST_CLASS_ID" || "$PAST_CLASS_ID" == "null" ]]; then
    log_warning "Failed to create past test class"
    log_info "Check-in tests may not work without a valid class"
else
    log_success "Past test class created successfully"
    log_info "Past Class ID: $PAST_CLASS_ID"
    
    echo "export TEST_PAST_CLASS_ID=$PAST_CLASS_ID" >> .test-env
fi

# Summary
log_section "✅ Test environment setup complete"

echo ""
log_success "Test data created successfully:"
echo ""
echo "  Test Member:"
echo "    - ID: $MEMBER_ID"
echo "    - QR Code: $MEMBER_QR"
echo "    - Phone: $TEST_MEMBER_PHONE"
echo ""
echo "  Test Instructor:"
echo "    - ID: $INSTRUCTOR_ID"
echo "    - Name: $TEST_INSTRUCTOR_NAME"
echo ""

if [[ -n "$CLASS_ID" ]]; then
    echo "  Future Test Class:"
    echo "    - ID: $CLASS_ID"
    echo "    - Date/Time: $CLASS_DATE $CLASS_TIME"
    echo ""
fi

if [[ -n "$PAST_CLASS_ID" ]]; then
    echo "  Past Test Class (for check-in):"
    echo "    - ID: $PAST_CLASS_ID"
    echo "    - Date/Time: $PAST_CLASS_DATE $PAST_CLASS_TIME"
    echo ""
fi

echo ""
log_info "Test environment variables saved to: .test-env"
log_info "Source this file before running tests:"
echo ""
echo "  source .test-env"
echo "  export PRODUCTION_URL=$BASE_URL"
echo "  export PRODUCTION_ADMIN_EMAIL=$ADMIN_EMAIL"
echo "  export PRODUCTION_ADMIN_PASSWORD=\$PRODUCTION_ADMIN_PASSWORD"
echo "  node tests/e2e/production/run-e2e-tests.js"
echo ""

log_success "Setup complete! Ready to run E2E tests."
