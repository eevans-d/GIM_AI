#!/bin/bash

################################################################################
# Cleanup Test Environment
# 
# Removes test data created by setup-test-environment.sh
# 
# Usage:
#   ./tests/e2e/production/cleanup-test-environment.sh production
#   ./tests/e2e/production/cleanup-test-environment.sh staging
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

log_section "🧹 Cleaning up test environment: $ENVIRONMENT"

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

# Load test environment variables
if [[ ! -f ".test-env" ]]; then
    log_error "Test environment file not found: .test-env"
    log_info "Run setup-test-environment.sh first"
    exit 1
fi

source .test-env

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

# Delete test classes
log_section "🗑️ Deleting test classes"

if [[ -n "$TEST_CLASS_ID" ]]; then
    log_info "Deleting future test class: $TEST_CLASS_ID"
    DELETE_CLASS_RESPONSE=$(curl -s -X DELETE "${BASE_URL}/api/v1/classes/${TEST_CLASS_ID}" \
        -H "Authorization: Bearer ${AUTH_TOKEN}")
    
    if [[ $(echo "$DELETE_CLASS_RESPONSE" | jq -r '.success // false') == "true" ]]; then
        log_success "Future test class deleted"
    else
        log_warning "Failed to delete future test class (may not exist)"
    fi
else
    log_warning "No future test class ID found"
fi

if [[ -n "$TEST_PAST_CLASS_ID" ]]; then
    log_info "Deleting past test class: $TEST_PAST_CLASS_ID"
    DELETE_PAST_CLASS_RESPONSE=$(curl -s -X DELETE "${BASE_URL}/api/v1/classes/${TEST_PAST_CLASS_ID}" \
        -H "Authorization: Bearer ${AUTH_TOKEN}")
    
    if [[ $(echo "$DELETE_PAST_CLASS_RESPONSE" | jq -r '.success // false') == "true" ]]; then
        log_success "Past test class deleted"
    else
        log_warning "Failed to delete past test class (may not exist)"
    fi
else
    log_warning "No past test class ID found"
fi

# Delete test instructor
log_section "🗑️ Deleting test instructor"

if [[ -n "$TEST_INSTRUCTOR_ID" ]]; then
    log_info "Deleting test instructor: $TEST_INSTRUCTOR_ID"
    DELETE_INSTRUCTOR_RESPONSE=$(curl -s -X DELETE "${BASE_URL}/api/v1/instructors/${TEST_INSTRUCTOR_ID}" \
        -H "Authorization: Bearer ${AUTH_TOKEN}")
    
    if [[ $(echo "$DELETE_INSTRUCTOR_RESPONSE" | jq -r '.success // false') == "true" ]]; then
        log_success "Test instructor deleted"
    else
        log_warning "Failed to delete test instructor (may not exist)"
    fi
else
    log_warning "No test instructor ID found"
fi

# Delete test member
log_section "🗑️ Deleting test member"

if [[ -n "$TEST_MEMBER_ID" ]]; then
    log_info "Deleting test member: $TEST_MEMBER_ID"
    DELETE_MEMBER_RESPONSE=$(curl -s -X DELETE "${BASE_URL}/api/v1/members/${TEST_MEMBER_ID}" \
        -H "Authorization: Bearer ${AUTH_TOKEN}")
    
    if [[ $(echo "$DELETE_MEMBER_RESPONSE" | jq -r '.success // false') == "true" ]]; then
        log_success "Test member deleted"
    else
        log_warning "Failed to delete test member (may not exist)"
    fi
else
    log_warning "No test member ID found"
fi

# Delete test environment file
log_section "🗑️ Cleaning up test environment file"

if [[ -f ".test-env" ]]; then
    rm .test-env
    log_success "Test environment file removed"
fi

# Summary
log_section "✅ Cleanup complete"

echo ""
log_success "Test data cleanup completed"
log_info "The test environment has been reset"
echo ""
