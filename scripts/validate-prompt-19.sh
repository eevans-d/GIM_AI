#!/bin/bash

# PROMPT 19 VALIDATION: Security Hardening
# Validates all security components implementation

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0

check() {
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    local description="$1"
    local command="$2"
    
    echo -n "  [$TOTAL_CHECKS] $description... "
    
    if eval "$command" > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC}"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
        return 0
    else
        echo -e "${RED}✗${NC}"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
        return 1
    fi
}

section() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════════════════════════╗"
echo "║           PROMPT 19: SECURITY HARDENING VALIDATION               ║"
echo "║                    GIM_AI Project                                 ║"
echo "╚═══════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

cd "$PROJECT_ROOT"

# ============================================================================
# SECTION 1: INPUT VALIDATION & SANITIZATION
# ============================================================================
section "1. Input Validation & Sanitization"

check "Input validator file exists" \
    "test -f security/input-validator.js"

check "Joi dependency installed" \
    "grep -q '\"joi\"' package.json"

check "Validator.js dependency installed" \
    "grep -q '\"validator\"' package.json"

check "XSS dependency installed" \
    "grep -q '\"xss\"' package.json"

check "Member schema defined" \
    "grep -q 'member:.*Joi.object' security/input-validator.js"

check "Checkin schema defined" \
    "grep -q 'checkin:.*Joi.object' security/input-validator.js"

check "Clase schema defined" \
    "grep -q 'clase:.*Joi.object' security/input-validator.js"

check "Payment schema defined" \
    "grep -q 'payment:.*Joi.object' security/input-validator.js"

check "Survey schema defined" \
    "grep -q 'survey:.*Joi.object' security/input-validator.js"

check "Login schema defined" \
    "grep -q 'login:.*Joi.object' security/input-validator.js"

check "Password validation includes complexity requirements" \
    "grep -q 'pattern.*a-z.*A-Z.*\\\\d' security/input-validator.js"

check "validateSchema function exists" \
    "grep -q 'function validateSchema' security/input-validator.js"

check "validatePhone function exists" \
    "grep -q 'function validatePhone' security/input-validator.js"

check "validateEmail function exists" \
    "grep -q 'function validateEmail' security/input-validator.js"

check "validateUUID function exists" \
    "grep -q 'function validateUUID' security/input-validator.js"

check "Disposable email blocking" \
    "grep -q 'disposableDomains\\|disposable.*email' security/input-validator.js"

check "SQL injection detection function exists" \
    "grep -q 'function isSQLSafe' security/input-validator.js"

check "SQL injection patterns check for OR injection" \
    "grep -q 'OR.*AND' security/input-validator.js"

check "SQL injection patterns check for UNION" \
    "grep -q 'UNION.*SELECT' security/input-validator.js"

check "SQL injection patterns check for DROP" \
    "grep -q 'DROP.*TABLE' security/input-validator.js"

check "XSS sanitization function exists" \
    "grep -q 'function sanitizeString' security/input-validator.js"

check "Recursive object sanitization exists" \
    "grep -q 'function sanitizeObject' security/input-validator.js"

check "Sensitive data masking for logs" \
    "grep -q 'function sanitizeForLogging' security/input-validator.js"

check "Password masking in logs" \
    "grep -q 'password.*REDACTED\\|REDACTED.*password' security/input-validator.js"

check "Phone partial masking in logs" \
    "grep -q 'telefono.*\\.slice' security/input-validator.js"

check "validateBody middleware exists" \
    "grep -q 'function validateBody' security/input-validator.js"

check "validateQuery middleware exists" \
    "grep -q 'function validateQuery' security/input-validator.js"

check "validateParams middleware exists" \
    "grep -q 'function validateParams' security/input-validator.js"

# ============================================================================
# SECTION 2: RATE LIMITING
# ============================================================================
section "2. Advanced Rate Limiting"

check "Rate limiter file exists" \
    "test -f security/rate-limiter.js"

check "rate-limiter-flexible dependency installed" \
    "grep -q '\"rate-limiter-flexible\"' package.json"

check "Redis dependency installed for rate limiting" \
    "grep -q '\"redis\"' package.json"

check "API rate limiter defined (100/min)" \
    "grep -q 'api:.*points.*100' security/rate-limiter.js"

check "Login rate limiter defined (5/15min)" \
    "grep -q 'login:.*points.*5' security/rate-limiter.js"

check "Check-in rate limiter defined (10/day)" \
    "grep -q 'checkin:.*points.*10' security/rate-limiter.js"

check "WhatsApp rate limiter defined (2/day)" \
    "grep -q 'whatsapp:.*points.*2' security/rate-limiter.js"

check "Dashboard rate limiter defined" \
    "grep -q 'dashboard:' security/rate-limiter.js"

check "Instructor panel rate limiter defined" \
    "grep -q 'instructorPanel:' security/rate-limiter.js"

check "QR generation rate limiter defined" \
    "grep -q 'qrGeneration:' security/rate-limiter.js"

check "Survey submission rate limiter defined" \
    "grep -q 'surveySubmission:' security/rate-limiter.js"

check "Redis storage configured" \
    "grep -q 'RateLimiterRedis' security/rate-limiter.js"

check "Memory fallback configured" \
    "grep -q 'RateLimiterMemory' security/rate-limiter.js"

check "consumeRateLimit function exists" \
    "grep -q 'function consumeRateLimit' security/rate-limiter.js"

check "Rate limit middleware factory exists" \
    "grep -q 'function rateLimitMiddleware' security/rate-limiter.js"

check "Rate limit headers set (X-RateLimit-Limit)" \
    "grep -q 'X-RateLimit-Limit' security/rate-limiter.js"

check "Rate limit headers set (X-RateLimit-Remaining)" \
    "grep -q 'X-RateLimit-Remaining' security/rate-limiter.js"

check "Retry-After header set when blocked" \
    "grep -q 'Retry-After' security/rate-limiter.js"

check "Custom key extractors for different endpoints" \
    "grep -q 'keyExtractor' security/rate-limiter.js"

# ============================================================================
# SECTION 3: JWT AUTHENTICATION
# ============================================================================
section "3. JWT Authentication"

check "JWT auth file exists" \
    "test -f security/authentication/jwt-auth.js"

check "jsonwebtoken dependency installed" \
    "grep -q '\"jsonwebtoken\"' package.json"

check "bcryptjs dependency installed" \
    "grep -q '\"bcryptjs\"' package.json"

check "ROLES constant defined" \
    "grep -q 'const ROLES' security/authentication/jwt-auth.js"

check "ADMIN role exists" \
    "grep -q \"ADMIN:.*'admin'\" security/authentication/jwt-auth.js"

check "STAFF role exists" \
    "grep -q \"STAFF:.*'staff'\" security/authentication/jwt-auth.js"

check "INSTRUCTOR role exists" \
    "grep -q \"INSTRUCTOR:.*'instructor'\" security/authentication/jwt-auth.js"

check "MEMBER role exists" \
    "grep -q \"MEMBER:.*'member'\" security/authentication/jwt-auth.js"

check "PERMISSIONS constant defined" \
    "grep -q 'const PERMISSIONS' security/authentication/jwt-auth.js"

check "Admin has all permissions" \
    "grep -q \"\\[ROLES.ADMIN\\]:.*write:all\" security/authentication/jwt-auth.js"

check "generateToken function exists" \
    "grep -q 'function generateToken' security/authentication/jwt-auth.js"

check "verifyToken function exists" \
    "grep -q 'function verifyToken' security/authentication/jwt-auth.js"

check "JWT has issuer claim" \
    "grep -q \"issuer:.*'gim-ai'\" security/authentication/jwt-auth.js"

check "JWT has audience claim" \
    "grep -q \"audience:.*'gim-ai-client'\" security/authentication/jwt-auth.js"

check "hashPassword function exists" \
    "grep -q 'function hashPassword' security/authentication/jwt-auth.js"

check "bcrypt salt rounds >= 12" \
    "grep -q 'genSalt.*12' security/authentication/jwt-auth.js"

check "verifyPassword function exists" \
    "grep -q 'function verifyPassword' security/authentication/jwt-auth.js"

check "authenticateUser function exists" \
    "grep -q 'function authenticateUser' security/authentication/jwt-auth.js"

check "User activation status checked" \
    "grep -q 'activo' security/authentication/jwt-auth.js"

check "refreshAccessToken function exists" \
    "grep -q 'function refreshAccessToken' security/authentication/jwt-auth.js"

check "authenticateJWT middleware exists" \
    "grep -q 'function authenticateJWT' security/authentication/jwt-auth.js"

check "Bearer token extraction" \
    "grep -q 'Bearer' security/authentication/jwt-auth.js"

check "requireRole middleware exists" \
    "grep -q 'function requireRole' security/authentication/jwt-auth.js"

check "requirePermission middleware exists" \
    "grep -q 'function requirePermission' security/authentication/jwt-auth.js"

check "createUser function exists" \
    "grep -q 'function createUser' security/authentication/jwt-auth.js"

check "changePassword function exists" \
    "grep -q 'function changePassword' security/authentication/jwt-auth.js"

# ============================================================================
# SECTION 4: SECURITY HEADERS & CORS
# ============================================================================
section "4. Security Headers & CORS"

check "Security middleware file exists" \
    "test -f security/security-middleware.js"

check "Helmet dependency installed" \
    "grep -q '\"helmet\"' package.json"

check "CORS dependency installed" \
    "grep -q '\"cors\"' package.json"

check "Allowed origins configured" \
    "grep -q 'allowedOrigins' security/security-middleware.js"

check "CORS options defined" \
    "grep -q 'corsOptions' security/security-middleware.js"

check "CORS credentials support" \
    "grep -q 'credentials.*true' security/security-middleware.js"

check "CORS allowed methods defined" \
    "grep -q 'methods.*GET.*POST.*PUT.*DELETE' security/security-middleware.js"

check "Helmet config defined" \
    "grep -q 'helmetConfig' security/security-middleware.js"

check "Content Security Policy configured" \
    "grep -q 'contentSecurityPolicy' security/security-middleware.js"

check "CSP defaultSrc directive" \
    "grep -q \"defaultSrc.*'self'\" security/security-middleware.js"

check "CSP objectSrc blocked" \
    "grep -q \"objectSrc.*'none'\" security/security-middleware.js"

check "HSTS configured" \
    "grep -q 'hsts:' security/security-middleware.js"

check "HSTS max-age >= 1 year" \
    "grep -q 'maxAge.*31536000' security/security-middleware.js"

check "HSTS includeSubDomains" \
    "grep -q 'includeSubDomains.*true' security/security-middleware.js"

check "X-Frame-Options set to deny" \
    "grep -q \"action.*'deny'\" security/security-middleware.js"

check "X-Content-Type-Options nosniff" \
    "grep -q 'noSniff.*true' security/security-middleware.js"

check "Referrer-Policy configured" \
    "grep -q 'referrerPolicy' security/security-middleware.js"

check "Custom security headers function" \
    "grep -q 'function customSecurityHeaders' security/security-middleware.js"

check "Permissions-Policy configured" \
    "grep -q 'Permissions-Policy' security/security-middleware.js"

check "applySecurityMiddleware function exists" \
    "grep -q 'function applySecurityMiddleware' security/security-middleware.js"

# ============================================================================
# SECTION 5: DATABASE SECURITY
# ============================================================================
section "5. Database Security"

check "Users auth tables SQL exists" \
    "test -f database/schemas/users_auth_tables.sql"

check "Users table with UUID primary key" \
    "grep -q 'id UUID PRIMARY KEY' database/schemas/users_auth_tables.sql"

check "Email unique constraint" \
    "grep -q 'email.*UNIQUE' database/schemas/users_auth_tables.sql"

check "Password hash column" \
    "grep -q 'password_hash' database/schemas/users_auth_tables.sql"

check "Role constraint with valid values" \
    "grep -q 'role.*CHECK.*admin.*staff.*instructor' database/schemas/users_auth_tables.sql"

check "Active status column" \
    "grep -q 'activo.*BOOLEAN' database/schemas/users_auth_tables.sql"

check "Updated_at trigger" \
    "grep -q 'trigger_users_updated_at' database/schemas/users_auth_tables.sql"

check "Refresh tokens table" \
    "grep -q 'CREATE TABLE.*refresh_tokens' database/schemas/users_auth_tables.sql"

check "Token expiration tracking" \
    "grep -q 'expires_at' database/schemas/users_auth_tables.sql"

check "Token revocation support" \
    "grep -q 'revoked.*BOOLEAN' database/schemas/users_auth_tables.sql"

check "Login attempts table" \
    "grep -q 'CREATE TABLE.*login_attempts' database/schemas/users_auth_tables.sql"

check "Login attempt IP tracking" \
    "grep -q 'ip_address' database/schemas/users_auth_tables.sql"

check "Security audit log table" \
    "grep -q 'CREATE TABLE.*security_audit_log' database/schemas/users_auth_tables.sql"

check "Audit event type column" \
    "grep -q 'event_type' database/schemas/users_auth_tables.sql"

check "Audit event data JSONB" \
    "grep -q 'event_data.*JSONB' database/schemas/users_auth_tables.sql"

check "Cleanup function for expired tokens" \
    "grep -q 'cleanup_expired_tokens' database/schemas/users_auth_tables.sql"

# ============================================================================
# SECTION 6: SECURITY AUDIT SERVICE
# ============================================================================
section "6. Security Audit & Logging"

check "Security audit service exists" \
    "test -f security/security-audit.js"

check "AUDIT_EVENTS constant defined" \
    "grep -q 'const AUDIT_EVENTS' security/security-audit.js"

check "LOGIN_SUCCESS event" \
    "grep -q \"LOGIN_SUCCESS:.*'login_success'\" security/security-audit.js"

check "LOGIN_FAILURE event" \
    "grep -q \"LOGIN_FAILURE:.*'login_failure'\" security/security-audit.js"

check "UNAUTHORIZED_ACCESS event" \
    "grep -q \"UNAUTHORIZED_ACCESS\" security/security-audit.js"

check "RATE_LIMIT_EXCEEDED event" \
    "grep -q \"RATE_LIMIT_EXCEEDED\" security/security-audit.js"

check "SQL_INJECTION_ATTEMPT event" \
    "grep -q \"SQL_INJECTION_ATTEMPT\" security/security-audit.js"

check "XSS_ATTEMPT event" \
    "grep -q \"XSS_ATTEMPT\" security/security-audit.js"

check "SEVERITY_LEVELS constant defined" \
    "grep -q 'const SEVERITY_LEVELS' security/security-audit.js"

check "logSecurityEvent function exists" \
    "grep -q 'function logSecurityEvent' security/security-audit.js"

check "logLoginAttempt function exists" \
    "grep -q 'function logLoginAttempt' security/security-audit.js"

check "checkSuspiciousLoginActivity function" \
    "grep -q 'function checkSuspiciousLoginActivity' security/security-audit.js"

check "Suspicious activity threshold (5+ attempts)" \
    "grep -q '5.*failed.*attempts' security/security-audit.js"

check "getSecurityEvents function exists" \
    "grep -q 'function getSecurityEvents' security/security-audit.js"

check "auditMiddleware function exists" \
    "grep -q 'function auditMiddleware' security/security-audit.js"

# ============================================================================
# SECTION 7: AUTHENTICATION ROUTES
# ============================================================================
section "7. Authentication Routes"

check "Auth routes file exists" \
    "test -f routes/api/auth.js"

check "POST /login route" \
    "grep -q \"post.*'/login'\" routes/api/auth.js"

check "Login route uses loginRateLimiter" \
    "grep -q 'loginRateLimiter' routes/api/auth.js"

check "Login route uses validateBody" \
    "grep -q \"validateBody.*'login'\" routes/api/auth.js"

check "POST /refresh route" \
    "grep -q \"post.*'/refresh'\" routes/api/auth.js"

check "POST /change-password route" \
    "grep -q \"post.*'/change-password'\" routes/api/auth.js"

check "Change password requires authentication" \
    "grep -q 'authenticateJWT' routes/api/auth.js"

check "POST /create-user route" \
    "grep -q \"post.*'/create-user'\" routes/api/auth.js"

check "Create user requires admin role" \
    "grep -q 'requireRole.*ADMIN' routes/api/auth.js"

check "GET /me route" \
    "grep -q \"get.*'/me'\" routes/api/auth.js"

# ============================================================================
# SECTION 8: INTEGRATION WITH MAIN APP
# ============================================================================
section "8. Integration with Main Application"

check "Security middleware imported in index.js" \
    "grep -q 'security-middleware' index.js"

check "applySecurityMiddleware called" \
    "grep -q 'applySecurityMiddleware' index.js"

check "API rate limiter applied globally" \
    "grep -q \"'/api'.*apiRateLimiter\" index.js"

check "Auth routes registered" \
    "grep -q \"'/api/auth'\" index.js"

check "Auth routes imported" \
    "grep -q \"require.*routes/api/auth\" index.js"

# ============================================================================
# SECTION 9: SECURITY TESTS
# ============================================================================
section "9. Security Tests"

check "Security integration tests exist" \
    "test -f tests/integration/security.spec.js"

check "Input validation tests" \
    "grep -q 'Input Validation' tests/integration/security.spec.js"

check "JWT authentication tests" \
    "grep -q 'JWT Authentication' tests/integration/security.spec.js"

check "SQL injection prevention tests" \
    "grep -q 'SQL Injection Prevention' tests/integration/security.spec.js"

check "XSS prevention tests" \
    "grep -q 'XSS Prevention' tests/integration/security.spec.js"

check "Security headers tests" \
    "grep -q 'Security Headers' tests/integration/security.spec.js"

check "CORS configuration tests" \
    "grep -q 'CORS Configuration' tests/integration/security.spec.js"

check "Sensitive data masking tests" \
    "grep -q 'Sensitive Data Masking' tests/integration/security.spec.js"

check "Tests check for valid member data" \
    "grep -q 'should accept valid member data' tests/integration/security.spec.js"

check "Tests check for invalid phone" \
    "grep -q 'should reject invalid phone' tests/integration/security.spec.js"

check "Tests check for XSS attempts" \
    "grep -q 'should reject XSS attempts' tests/integration/security.spec.js"

check "Tests check for disposable email" \
    "grep -q 'should reject disposable email' tests/integration/security.spec.js"

check "Tests check password hashing" \
    "grep -q 'should hash password securely' tests/integration/security.spec.js"

check "Tests check password verification" \
    "grep -q 'should verify correct password' tests/integration/security.spec.js"

check "Tests check SQL injection detection" \
    "grep -q 'should detect OR-based injection' tests/integration/security.spec.js"

check "Tests check script tag removal" \
    "grep -q 'should remove script tags' tests/integration/security.spec.js"

check "Tests check X-Content-Type-Options header" \
    "grep -q 'should set X-Content-Type-Options header' tests/integration/security.spec.js"

check "Tests check password masking" \
    "grep -q 'should mask passwords' tests/integration/security.spec.js"

# ============================================================================
# SECTION 10: DOCUMENTATION & COMPLETION
# ============================================================================
section "10. Documentation & Project Status"

check "IMPLEMENTATION_STATUS.md exists" \
    "test -f docs/IMPLEMENTATION_STATUS.md"

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}VALIDATION SUMMARY${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  Total Checks:  ${BLUE}$TOTAL_CHECKS${NC}"
echo -e "  Passed:        ${GREEN}$PASSED_CHECKS${NC}"
echo -e "  Failed:        ${RED}$FAILED_CHECKS${NC}"
echo ""

if [ $FAILED_CHECKS -eq 0 ]; then
    PERCENTAGE=100
    echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                     ✓ ALL CHECKS PASSED                          ║${NC}"
    echo -e "${GREEN}║              PROMPT 19 VALIDATION: ${PERCENTAGE}% COMPLETE                 ║${NC}"
    echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════════╝${NC}"
    exit 0
else
    PERCENTAGE=$((PASSED_CHECKS * 100 / TOTAL_CHECKS))
    echo -e "${YELLOW}╔═══════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${YELLOW}║                  ⚠ SOME CHECKS FAILED                            ║${NC}"
    echo -e "${YELLOW}║              PROMPT 19 VALIDATION: ${PERCENTAGE}% COMPLETE                 ║${NC}"
    echo -e "${YELLOW}╚═══════════════════════════════════════════════════════════════════╝${NC}"
    exit 1
fi
