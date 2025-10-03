# E2E Production Testing Guide

## Overview

This directory contains end-to-end tests designed to run against a **live production or staging environment**. These tests validate critical user journeys and system integration points.

## 🎯 Test Scenarios

### 1. Health Check ✅
- Validates system health endpoint
- Checks all services (database, Redis, WhatsApp)
- Verifies uptime and status

### 2. Admin Authentication 🔐
- Tests JWT authentication flow
- Validates admin role and permissions
- Obtains token for subsequent tests

### 3. QR Check-in Flow 📱
- Complete check-in process via QR code
- Database validation
- WhatsApp confirmation message
- n8n workflow trigger

### 4. Members API 👥
- List members with pagination
- Get member details
- Validate response structure

### 5. Classes API 🏋️
- List classes by date
- Get class details
- Check capacity and availability

### 6. WhatsApp Webhook 💬
- Webhook verification
- Challenge-response validation

### 7. API Rate Limiting 🚦
- Tests rate limit enforcement
- Validates headers
- Confirms 429 responses

### 8. Security Headers 🔒
- Checks security headers presence
- Validates CSP, HSTS, XSS protection
- Helmet.js configuration

## 📋 Prerequisites

### 1. Deployed Application

Deploy GIM_AI to Railway or Render using the [Deployment Guide](../../../docs/DEPLOYMENT_GUIDE.md):

```bash
# Follow Railway deployment guide
# Ensure all services are running:
# - Node.js app
# - PostgreSQL
# - Redis
# - n8n (optional for some tests)
```

### 2. Environment Variables

Create `.env.production` or `.env.staging`:

```bash
# App URL
PRODUCTION_URL=https://gim-ai-production.up.railway.app
STAGING_URL=https://gim-ai-staging.up.railway.app

# Admin credentials
PRODUCTION_ADMIN_EMAIL=admin@gimapp.com
PRODUCTION_ADMIN_PASSWORD=your_secure_password

STAGING_ADMIN_EMAIL=admin@staging.gimapp.com
STAGING_ADMIN_PASSWORD=your_staging_password

# Test member
TEST_MEMBER_PHONE=+5491112345678
TEST_MEMBER_QR=GIM_TEST_MEMBER_001

# WhatsApp
WHATSAPP_WEBHOOK_VERIFY_TOKEN=gim_ai_webhook_2025
```

### 3. Test Data

Create test data using the setup script:

```bash
chmod +x tests/e2e/production/setup-test-environment.sh
./tests/e2e/production/setup-test-environment.sh production
```

This creates:
- ✅ Test member with QR code
- ✅ Test instructor
- ✅ Future test class (for reservations)
- ✅ Past test class (for check-ins)

### 4. WhatsApp Templates Approved

Ensure WhatsApp message templates are approved in Meta Business Manager:
- `checkin_confirmation`
- `payment_reminder`
- `survey_request`
- etc.

**⏱️ Note**: Template approval takes 24-48 hours from Meta.

## 🚀 Running Tests

### Run All Tests

```bash
# Production environment
node tests/e2e/production/run-e2e-tests.js

# Staging environment
node tests/e2e/production/run-e2e-tests.js --env=staging
```

### Run Specific Scenario

```bash
# Health check only
node tests/e2e/production/run-e2e-tests.js --scenario=health

# Check-in flow only
node tests/e2e/production/run-e2e-tests.js --scenario=checkin

# Available scenarios:
# - health
# - auth
# - checkin
# - members
# - classes
# - webhook
# - ratelimit
# - security
```

### With Environment Variables

```bash
# Load test environment
source .test-env

# Set production URL
export PRODUCTION_URL=https://your-app.up.railway.app
export PRODUCTION_ADMIN_PASSWORD=your_password

# Run tests
node tests/e2e/production/run-e2e-tests.js
```

## 📊 Expected Output

```
╔════════════════════════════════════════════════════════════════╗
║         GIM_AI E2E Production Test Suite                      ║
╚════════════════════════════════════════════════════════════════╝

[2025-10-03T15:30:00.000Z] ℹ Environment: production
[2025-10-03T15:30:00.000Z] ℹ Base URL: https://gim-ai-production.up.railway.app
[2025-10-03T15:30:00.000Z] ℹ Test Member QR: GIM_TEST_MEMBER_001

🏥 Scenario 1: Health Check
[2025-10-03T15:30:01.000Z] ▸ GET /health
[2025-10-03T15:30:01.123Z] ✓ Response: 200 OK
[2025-10-03T15:30:01.123Z] ✓ Health check passed
[2025-10-03T15:30:01.123Z] ℹ   - Status: healthy
[2025-10-03T15:30:01.123Z] ℹ   - Uptime: 3600 seconds
[2025-10-03T15:30:01.123Z] ℹ   - Database: healthy
[2025-10-03T15:30:01.123Z] ℹ   - Redis: healthy
[2025-10-03T15:30:01.123Z] ℹ   - WhatsApp: healthy

🔐 Scenario 2: Admin Authentication
[2025-10-03T15:30:02.000Z] ▸ POST /api/v1/auth/login
[2025-10-03T15:30:02.345Z] ✓ Response: 200 OK
[2025-10-03T15:30:02.345Z] ✓ Admin authentication passed
[2025-10-03T15:30:02.345Z] ℹ   - User: admin@gimapp.com
[2025-10-03T15:30:02.345Z] ℹ   - Role: admin
[2025-10-03T15:30:02.345Z] ℹ   - Token: eyJhbGciOiJIUzI1NiIs...

... (more tests)

Test Summary

✓ Passed:  8
✗ Failed:  0
⊗ Skipped: 0
⏱ Duration: 12.34s

Detailed Results

✓ 1. Health Check
✓ 2. Admin Authentication
✓ 3. QR Check-in Flow
✓ 4. Members API
✓ 5. Classes API
✓ 6. WhatsApp Webhook
✓ 7. Rate Limiting
   Note: Triggered after 100 requests
✓ 8. Security Headers
   Note: 4/4 headers present

[2025-10-03T15:30:15.000Z] ✓ All tests passed!
```

## 🧹 Cleanup

After testing, remove test data:

```bash
chmod +x tests/e2e/production/cleanup-test-environment.sh
./tests/e2e/production/cleanup-test-environment.sh production
```

This removes:
- Test member
- Test instructor
- Test classes
- `.test-env` file

## 🐛 Troubleshooting

### Test Fails: "API is not accessible"

**Problem**: Cannot connect to base URL

**Solutions**:
1. Check deployment is running:
   ```bash
   curl https://your-app.up.railway.app/health
   ```
2. Verify PRODUCTION_URL is correct
3. Check Railway/Render logs for errors

### Test Fails: "Failed to authenticate"

**Problem**: Admin login fails

**Solutions**:
1. Verify admin credentials in `.env.production`
2. Check database for admin user:
   ```sql
   SELECT email, role FROM users WHERE role = 'admin';
   ```
3. Reset admin password if needed

### Test Fails: "Test member QR not found"

**Problem**: Test member doesn't exist

**Solutions**:
1. Run setup script:
   ```bash
   ./tests/e2e/production/setup-test-environment.sh production
   ```
2. Verify member was created in database
3. Check TEST_MEMBER_QR matches database

### Test Fails: "WhatsApp messages not sending"

**Problem**: WhatsApp integration not working

**Solutions**:
1. Check WhatsApp credentials:
   ```bash
   curl ${PRODUCTION_URL}/health | jq '.services.whatsapp'
   ```
2. Verify templates are approved in Meta Business Manager
3. Check rate limiting (max 2 messages/day per user)
4. Verify business hours (9-21h) or use `force: true`

### Test Fails: "Rate limiting not triggered"

**Problem**: Rate limit didn't activate

**Solutions**:
- This is a warning, not an error
- Rate limiting may be disabled in production
- Check `config/whatsapp.config.js` for limits
- Verify Redis is connected (rate limiter backend)

## 📈 Continuous Integration

### GitHub Actions

Add E2E tests to CI pipeline:

```yaml
name: E2E Production Tests

on:
  schedule:
    - cron: '0 */6 * * *' # Every 6 hours
  workflow_dispatch:

jobs:
  e2e-tests:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run E2E Tests
        env:
          PRODUCTION_URL: ${{ secrets.PRODUCTION_URL }}
          PRODUCTION_ADMIN_EMAIL: ${{ secrets.PRODUCTION_ADMIN_EMAIL }}
          PRODUCTION_ADMIN_PASSWORD: ${{ secrets.PRODUCTION_ADMIN_PASSWORD }}
          TEST_MEMBER_QR: ${{ secrets.TEST_MEMBER_QR }}
        run: node tests/e2e/production/run-e2e-tests.js
      
      - name: Notify on failure
        if: failure()
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: 'E2E tests failed in production'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

### Monitoring Integration

Integrate with monitoring tools:

```javascript
// Send test results to Sentry
const Sentry = require('@sentry/node');

Sentry.captureMessage('E2E Test Suite Completed', {
  level: results.failed > 0 ? 'error' : 'info',
  extra: {
    passed: results.passed,
    failed: results.failed,
    duration: duration,
    scenarios: results.scenarios
  }
});
```

## 📚 Additional Resources

- [Deployment Guide](../../../docs/DEPLOYMENT_GUIDE.md)
- [API Documentation](../../../docs/API_DOCUMENTATION.md)
- [FAQ & Troubleshooting](../../../docs/FAQ.md)
- [WhatsApp Integration Guide](../../../whatsapp/README.md)

## 🔗 Related Files

- `run-e2e-tests.js` - Main test suite
- `setup-test-environment.sh` - Create test data
- `cleanup-test-environment.sh` - Remove test data
- `.env.production` - Production environment variables
- `.test-env` - Generated test environment variables

## 📝 Notes

- **🔒 Security**: Never commit `.env.production` or `.test-env` to Git
- **⏱️ Duration**: Full suite takes ~15-30 seconds
- **🌐 Network**: Tests require internet connection to production
- **💰 Cost**: Minimal (few API calls, no data stored long-term)
- **♻️ Cleanup**: Always run cleanup script after testing
- **📊 Monitoring**: Test results can be sent to Sentry/Slack/etc.

## ✅ Checklist Before Running

- [ ] App deployed to Railway/Render
- [ ] All environment variables configured
- [ ] Database migrations run
- [ ] Redis connected
- [ ] WhatsApp credentials configured
- [ ] Templates approved by Meta (24-48h wait)
- [ ] Admin user created in database
- [ ] Test data created (run setup script)
- [ ] Webhooks configured (optional)
- [ ] Health endpoint returns 200 OK

## 🎉 Success Criteria

All tests pass with:
- ✅ Health check: All services healthy
- ✅ Authentication: Admin can login
- ✅ Check-in: QR code validates and records
- ✅ APIs: All endpoints return expected data
- ✅ WhatsApp: Webhook verification passes
- ✅ Rate limiting: Enforced correctly
- ✅ Security: All headers present

**Total time**: ~15-30 seconds  
**Expected pass rate**: 100% (8/8 tests)

---

**Last Updated**: October 3, 2025  
**Version**: 1.0.0  
**Author**: GIM_AI Team
