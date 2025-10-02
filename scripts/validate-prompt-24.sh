#!/bin/bash

# PROMPT 24: API ECOSYSTEM & WEBHOOKS - VALIDATION SCRIPT

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

TOTAL=0
PASSED=0
FAILED=0

test_validation() {
  TOTAL=$((TOTAL + 1))
  if eval "$2"; then
    echo -e "${GREEN}✓${NC} $1"
    PASSED=$((PASSED + 1))
    return 0
  else
    echo -e "${RED}✗${NC} $1"
    FAILED=$((FAILED + 1))
    return 1
  fi
}

echo "========================================"
echo "PROMPT 24: API ECOSYSTEM VALIDATION"
echo "========================================"
echo ""

# FILE EXISTENCE
echo "📁 File Existence (9 checks)"
echo "----------------------------------------"

test_validation "Database schema exists" "[ -f database/schemas/api_ecosystem.sql ]"
test_validation "OAuth2 provider exists" "[ -f security/authentication/oauth2-provider.js ]"
test_validation "API key service exists" "[ -f services/api-key-service.js ]"
test_validation "Webhook service exists" "[ -f services/webhook-service.js ]"
test_validation "OAuth2 middleware exists" "[ -f middleware/oauth2-middleware.js ]"
test_validation "API rate limiter exists" "[ -f security/api-rate-limiter.js ]"
test_validation "Webhook worker exists" "[ -f workers/webhook-delivery-processor.js ]"
test_validation "Auth routes exist" "[ -f routes/api/public/v1/auth.js ]"
test_validation "Webhook routes exist" "[ -f routes/api/public/v1/webhooks.js ]"

echo ""

# DATABASE SCHEMA VALIDATION
echo "🗄️  Database Schema (8 checks)"
echo "----------------------------------------"

test_validation "OAuth clients table defined" "grep -q 'CREATE TABLE.*oauth_clients' database/schemas/api_ecosystem.sql"
test_validation "OAuth tokens table defined" "grep -q 'CREATE TABLE.*oauth_tokens' database/schemas/api_ecosystem.sql"
test_validation "API keys table defined" "grep -q 'CREATE TABLE.*api_keys' database/schemas/api_ecosystem.sql"
test_validation "Webhooks table defined" "grep -q 'CREATE TABLE.*webhooks' database/schemas/api_ecosystem.sql"
test_validation "Webhook deliveries table defined" "grep -q 'CREATE TABLE.*webhook_deliveries' database/schemas/api_ecosystem.sql"
test_validation "Rate limits table defined" "grep -q 'CREATE TABLE.*api_rate_limits' database/schemas/api_ecosystem.sql"
test_validation "Generate API key function exists" "grep -q 'generate_api_key' database/schemas/api_ecosystem.sql"
test_validation "Webhook stats function exists" "grep -q 'get_webhook_stats' database/schemas/api_ecosystem.sql"

echo ""

# OAUTH2 PROVIDER VALIDATION
echo "🔐 OAuth2 Provider (10 checks)"
echo "----------------------------------------"

test_validation "OAuth2 has JWT generation" "grep -q 'generateAccessToken' security/authentication/oauth2-provider.js"
test_validation "OAuth2 has refresh token generation" "grep -q 'generateRefreshToken' security/authentication/oauth2-provider.js"
test_validation "OAuth2 has token verification" "grep -q 'verifyAccessToken' security/authentication/oauth2-provider.js"
test_validation "OAuth2 supports client credentials" "grep -q 'clientCredentialsGrant' security/authentication/oauth2-provider.js"
test_validation "OAuth2 supports authorization code" "grep -q 'authorizationCodeGrant' security/authentication/oauth2-provider.js"
test_validation "OAuth2 supports refresh token" "grep -q 'refreshTokenGrant' security/authentication/oauth2-provider.js"
test_validation "OAuth2 can revoke tokens" "grep -q 'revokeToken' security/authentication/oauth2-provider.js"
test_validation "OAuth2 can introspect tokens" "grep -q 'introspectToken' security/authentication/oauth2-provider.js"
test_validation "OAuth2 can register clients" "grep -q 'registerClient' security/authentication/oauth2-provider.js"
test_validation "OAuth2 uses Supabase" "grep -q '@supabase/supabase-js' security/authentication/oauth2-provider.js"

echo ""

# API KEY SERVICE VALIDATION
echo "🔑 API Key Service (8 checks)"
echo "----------------------------------------"

test_validation "API key service generates keys" "grep -q 'generateAPIKey' services/api-key-service.js"
test_validation "API key service creates keys" "grep -q 'createAPIKey' services/api-key-service.js"
test_validation "API key service validates keys" "grep -q 'validateAPIKey' services/api-key-service.js"
test_validation "API key service lists keys" "grep -q 'listAPIKeys' services/api-key-service.js"
test_validation "API key service revokes keys" "grep -q 'revokeAPIKey' services/api-key-service.js"
test_validation "API key service rotates keys" "grep -q 'rotateAPIKey' services/api-key-service.js"
test_validation "API key service tracks usage" "grep -q 'trackUsage' services/api-key-service.js"
test_validation "API key service gets stats" "grep -q 'getUsageStats' services/api-key-service.js"

echo ""

# WEBHOOK SERVICE VALIDATION
echo "🪝 Webhook Service (10 checks)"
echo "----------------------------------------"

test_validation "Webhook service registers webhooks" "grep -q 'registerWebhook' services/webhook-service.js"
test_validation "Webhook service triggers events" "grep -q 'triggerEvent' services/webhook-service.js"
test_validation "Webhook service queues delivery" "grep -q 'queueDelivery' services/webhook-service.js"
test_validation "Webhook service delivers webhooks" "grep -q 'deliverWebhook' services/webhook-service.js"
test_validation "Webhook service generates signatures" "grep -q 'generateSignature' services/webhook-service.js"
test_validation "Webhook service verifies signatures" "grep -q 'verifySignature' services/webhook-service.js"
test_validation "Webhook service lists webhooks" "grep -q 'listWebhooks' services/webhook-service.js"
test_validation "Webhook service deletes webhooks" "grep -q 'deleteWebhook' services/webhook-service.js"
test_validation "Webhook service gets stats" "grep -q 'getWebhookStats' services/webhook-service.js"
test_validation "Webhook uses Bull queue" "grep -q 'Bull' services/webhook-service.js"

echo ""

# MIDDLEWARE VALIDATION
echo "🛡️  Middleware (6 checks)"
echo "----------------------------------------"

test_validation "OAuth2 middleware authenticates" "grep -q 'authenticate' middleware/oauth2-middleware.js"
test_validation "OAuth2 middleware checks scopes" "grep -q 'requireScopes' middleware/oauth2-middleware.js"
test_validation "OAuth2 middleware extracts tokens" "grep -q 'extractToken' middleware/oauth2-middleware.js"
test_validation "OAuth2 middleware has optional auth" "grep -q 'optionalAuthenticate' middleware/oauth2-middleware.js"
test_validation "OAuth2 middleware validates Bearer" "grep -q 'Bearer' middleware/oauth2-middleware.js"
test_validation "OAuth2 middleware validates ApiKey" "grep -q 'ApiKey' middleware/oauth2-middleware.js"

echo ""

# RATE LIMITER VALIDATION
echo "⏱️  Rate Limiter (8 checks)"
echo "----------------------------------------"

test_validation "Rate limiter checks limits" "grep -q 'checkLimit' security/api-rate-limiter.js"
test_validation "Rate limiter has middleware" "grep -q 'middleware' security/api-rate-limiter.js"
test_validation "Rate limiter gets status" "grep -q 'getStatus' security/api-rate-limiter.js"
test_validation "Rate limiter resets limits" "grep -q 'resetLimit' security/api-rate-limiter.js"
test_validation "Rate limiter uses Redis" "grep -q 'ioredis' security/api-rate-limiter.js"
test_validation "Rate limiter tracks hourly" "grep -q 'hourly' security/api-rate-limiter.js"
test_validation "Rate limiter tracks daily" "grep -q 'daily' security/api-rate-limiter.js"
test_validation "Rate limiter sets headers" "grep -q 'X-RateLimit' security/api-rate-limiter.js"

echo ""

# WORKER VALIDATION
echo "⚙️  Webhook Worker (5 checks)"
echo "----------------------------------------"

test_validation "Worker processes deliveries" "grep -q 'process.*deliver' workers/webhook-delivery-processor.js"
test_validation "Worker uses Bull queue" "grep -q 'Bull.*webhook-delivery' workers/webhook-delivery-processor.js"
test_validation "Worker handles completed jobs" "grep -q 'completed' workers/webhook-delivery-processor.js"
test_validation "Worker handles failed jobs" "grep -q 'failed' workers/webhook-delivery-processor.js"
test_validation "Worker handles graceful shutdown" "grep -q 'SIGTERM' workers/webhook-delivery-processor.js"

echo ""

# API ROUTES VALIDATION
echo "🌐 API Routes (8 checks)"
echo "----------------------------------------"

test_validation "Auth routes have token endpoint" "grep -q '/oauth/token' routes/api/public/v1/auth.js"
test_validation "Auth routes have revoke endpoint" "grep -q '/oauth/revoke' routes/api/public/v1/auth.js"
test_validation "Auth routes have introspect endpoint" "grep -q '/oauth/introspect' routes/api/public/v1/auth.js"
test_validation "Auth routes have register endpoint" "grep -q '/oauth/register' routes/api/public/v1/auth.js"
test_validation "Auth routes handle API keys" "grep -q '/api-keys' routes/api/public/v1/auth.js"
test_validation "Webhook routes register webhooks" "grep -q 'POST.*/' routes/api/public/v1/webhooks.js"
test_validation "Webhook routes list webhooks" "grep -q 'GET.*/' routes/api/public/v1/webhooks.js"
test_validation "Webhook routes show stats" "grep -q 'stats' routes/api/public/v1/webhooks.js"

echo ""

# CODE QUALITY
echo "✨ Code Quality (10 checks)"
echo "----------------------------------------"

test_validation "OAuth2 has error handling" "grep -q 'try' security/authentication/oauth2-provider.js"
test_validation "OAuth2 uses logger" "grep -q 'logger' security/authentication/oauth2-provider.js"
test_validation "API keys use crypto" "grep -q 'crypto' services/api-key-service.js"
test_validation "Webhooks use HMAC" "grep -qi 'hmac' services/webhook-service.js"
test_validation "Webhooks have timeout" "grep -q 'timeout' services/webhook-service.js"
test_validation "Rate limiter uses sliding window" "grep -q 'window' security/api-rate-limiter.js"
test_validation "Middleware exports functions" "grep -q 'module.exports' middleware/oauth2-middleware.js"
test_validation "Routes use authentication" "grep -q 'authenticate' routes/api/public/v1/auth.js"
test_validation "Worker logs events" "grep -q 'logger' workers/webhook-delivery-processor.js"
test_validation "Services export classes" "grep -q 'module.exports' services/webhook-service.js"

echo ""

# SUMMARY
echo "========================================"
echo "VALIDATION SUMMARY"
echo "========================================"
echo ""
echo "Total Validations: $TOTAL"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

PERCENTAGE=$((PASSED * 100 / TOTAL))
echo "Success Rate: ${PERCENTAGE}%"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✓ ALL VALIDATIONS PASSED!${NC}"
  echo ""
  echo "PROMPT 24 implementation complete."
  echo ""
  echo "Expected Impact:"
  echo "  • Enable third-party integrations"
  echo "  • Real-time event notifications"
  echo "  • API monetization opportunity"
  echo "  • Developer ecosystem growth"
  echo "  • Enterprise-ready authentication"
  echo ""
  exit 0
else
  echo -e "${RED}✗ SOME VALIDATIONS FAILED${NC}"
  exit 1
fi
