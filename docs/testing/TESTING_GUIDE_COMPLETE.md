# 📚 GIM_AI Testing Guide - Complete Reference

## Table of Contents

1. [Overview](#overview)
2. [Test Architecture](#test-architecture)
3. [Unit Testing](#unit-testing)
4. [Integration Testing](#integration-testing)
5. [E2E Testing](#e2e-testing)
6. [Performance Testing](#performance-testing)
7. [Security Testing](#security-testing)
8. [Best Practices](#best-practices)
9. [Debugging & Troubleshooting](#debugging--troubleshooting)
10. [CI/CD Integration](#cicd-integration)

---

## Overview

### Testing Pyramid

```
        E2E Testing
        (Playwright)
       ↙         ↖
   Integration   Performance
   (Jest)        (Artillery)
  ↙         ↖
Unit Testing + Security Testing
(Jest)
```

### Coverage Targets

| Layer | Framework | Coverage | Target |
|-------|-----------|----------|--------|
| Unit | Jest | 70% CI, 0% local | Business logic |
| Integration | Jest | N/A | API + Database |
| E2E | Playwright | Manual | Critical flows |
| Performance | Artillery | Manual | Load validation |
| Security | Jest | 100% | Auth + Validation |

---

## Test Architecture

### Project Structure

```
tests/
├── unit/
│   ├── services/              # Servicios
│   ├── utils/                 # Utilidades
│   ├── validation/            # Validadores
│   └── handlers/              # Handlers
├── integration/
│   ├── checkin-service.spec.js
│   ├── reminder-service.spec.js
│   ├── api-endpoints.spec.js
│   └── jest.setup.integration.js
├── security/
│   ├── rate-limiting.spec.js
│   ├── jwt-auth.spec.js
│   ├── input-validation.spec.js
│   └── jest.setup.security.js
├── e2e/
│   ├── checkin-qr-flow.spec.ts
│   ├── reminder-flow.spec.ts
│   └── dashboard-flow.spec.ts
└── performance/
    ├── run-performance-tests.sh
    ├── artillery-config.yml
    └── processor.js
```

### Test Naming Convention

```
tests/[layer]/[feature]-[testType].spec.js

Ejemplos:
- tests/unit/payment-service.spec.js
- tests/integration/checkin-service.spec.js
- tests/security/jwt-auth.spec.js
- tests/e2e/checkin-qr-flow.spec.ts
```

---

## Unit Testing

### Setup

```bash
# Run all unit tests
npm run test:unit

# Run with coverage
npm run test:unit --coverage

# Run specific test
npm run test:unit -- tests/unit/services/checkin.spec.js

# Watch mode
npm run test:watch
```

### Pattern: Basic Unit Test

```javascript
describe('CheckinService', () => {
  let service;

  beforeEach(() => {
    service = new CheckinService();
  });

  describe('#validateQRCode()', () => {
    it('should return true for valid QR code', () => {
      const result = service.validateQRCode('GIM-QR-12345678');
      expect(result).toBe(true);
    });

    it('should return false for invalid QR code', () => {
      const result = service.validateQRCode('INVALID-QR');
      expect(result).toBe(false);
    });

    it('should throw error for null input', () => {
      expect(() => {
        service.validateQRCode(null);
      }).toThrow();
    });
  });
});
```

### Pattern: Mocking Dependencies

```javascript
import { CheckinService } from '../../services/checkin-service';
import * as QRValidator from '../../utils/qr-validator';

jest.mock('../../utils/qr-validator');

describe('CheckinService with mocks', () => {
  beforeEach(() => {
    QRValidator.validate.mockResolvedValue(true);
  });

  it('should use mocked validator', async () => {
    const service = new CheckinService();
    const result = await service.validateQRCode('GIM-QR-12345678');
    
    expect(QRValidator.validate).toHaveBeenCalledWith('GIM-QR-12345678');
    expect(result).toBe(true);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });
});
```

### Pattern: Testing Error Handling

```javascript
describe('Error Handling', () => {
  it('should handle database errors gracefully', async () => {
    const db = {
      query: jest.fn().mockRejectedValue(new Error('DB Error'))
    };

    const service = new CheckinService(db);

    await expect(
      service.checkIn('member-123', 'class-456')
    ).rejects.toThrow('Database error');
  });

  it('should provide helpful error messages', async () => {
    const service = new CheckinService();

    try {
      service.validateQRCode(null);
    } catch (error) {
      expect(error.message).toContain('QR code required');
    }
  });
});
```

### Best Practices for Unit Tests

✅ **DO**
- Test one thing per test
- Use descriptive names
- Mock external dependencies
- Test error paths
- Keep tests fast (<100ms)

❌ **DON'T**
- Make HTTP requests in unit tests
- Access database directly
- Test implementation details
- Share state between tests
- Use real timers (use `jest.useFakeTimers()`)

---

## Integration Testing

### Setup

```bash
# Run all integration tests
npm run test:integration

# Run specific suite
npm run test:integration -- tests/integration/checkin-service.spec.js

# Run in band (one at a time)
npm run test:integration
```

### Pattern: API Endpoint Testing

```javascript
const request = require('supertest');
const app = require('../../index');

describe('POST /api/checkin/qr', () => {
  it('should successfully check in with valid data', async () => {
    const response = await request(app)
      .post('/api/checkin/qr')
      .set('X-Correlation-ID', 'test-123')
      .send({
        qr_code: 'GIM-QR-12345678',
        member_id: 'member-123',
        class_id: 'class-456'
      })
      .expect(200);

    expect(response.body).toEqual({
      success: true,
      checkin_id: expect.any(String),
      member_name: expect.any(String)
    });
  });

  it('should return 400 for invalid input', async () => {
    const response = await request(app)
      .post('/api/checkin/qr')
      .send({})
      .expect(400);

    expect(response.body.error).toBeDefined();
  });
});
```

### Pattern: Database Integration

```javascript
describe('Integration - Check-in with Database', () => {
  let db;

  beforeEach(async () => {
    db = await createTestDatabase();
    await db.seed(testData);
  });

  afterEach(async () => {
    await db.cleanup();
  });

  it('should insert checkin record', async () => {
    const service = new CheckinService(db);

    const result = await service.checkIn('member-123', 'class-456');

    const stored = await db.query(
      'SELECT * FROM checkins WHERE id = ?',
      [result.id]
    );

    expect(stored).toEqual(expect.objectContaining({
      member_id: 'member-123',
      class_id: 'class-456'
    }));
  });
});
```

### Pattern: Async Operations

```javascript
describe('Async Integration Tests', () => {
  it('should handle queue operations', async () => {
    const queue = new Queue();

    // Enqueue task
    const jobId = await queue.add({
      type: 'send-reminder',
      memberId: 'member-123'
    });

    // Process queue
    const processed = await queue.process();

    // Verify
    expect(processed).toContain(jobId);
  });

  it('should handle concurrent requests', async () => {
    const promises = Array.from({ length: 5 }, (_, i) =>
      request(app)
        .post('/api/checkin/qr')
        .send({
          qr_code: `GIM-QR-${i}`,
          member_id: `member-${i}`,
          class_id: 'class-456'
        })
    );

    const responses = await Promise.all(promises);

    responses.forEach(response => {
      expect(response.statusCode).toBe(200);
    });
  });
});
```

### Best Practices for Integration Tests

✅ **DO**
- Test actual API endpoints
- Use test database (isolated)
- Mock external services (WhatsApp, n8n)
- Test error responses
- Clean up after each test

❌ **DON'T**
- Make real API calls to WhatsApp
- Use production database
- Skip error case testing
- Leave test data in database
- Run tests in parallel without isolation

---

## E2E Testing

### Setup

```bash
# Run all Playwright tests
npm run test:playwright

# Run with UI (recommended)
npm run test:playwright:ui

# Debug mode
npm run test:playwright:debug

# See results
npm run test:playwright:report
```

### Pattern: Basic E2E Test

```typescript
import { test, expect, Page } from '@playwright/test';

test.describe('QR Check-in', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    await page.setViewportSize({ width: 393, height: 851 }); // Mobile
  });

  test('Should complete QR check-in flow', async () => {
    // Arrange
    await page.goto('/checkin');

    // Act
    const qrInput = page.locator('input[name="qr_code"]');
    await qrInput.fill('GIM-QR-12345678');
    
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Assert
    await expect(page.locator('text=Éxito')).toBeVisible();
    await expect(page.locator('text=Juan García')).toBeVisible();
  });
});
```

### Pattern: Handling Async Operations

```typescript
test('Should handle API response', async ({ page }) => {
  await page.goto('/checkin');

  // Start response listener BEFORE triggering action
  const responsePromise = page.waitForResponse(
    response => response.url().includes('/api/checkin')
  );

  // Trigger action
  await page.locator('button[type="submit"]').click();

  // Wait for response
  const response = await responsePromise;
  expect(response.status()).toBe(200);
});
```

### Pattern: Mobile Testing

```typescript
test.describe('Mobile Flow', () => {
  const devices = [
    { name: 'iPhone 12', width: 390, height: 844 },
    { name: 'Pixel 5', width: 393, height: 851 }
  ];

  for (const device of devices) {
    test(`Should work on ${device.name}`, async ({ browser }) => {
      const page = await browser.newPage();
      await page.setViewportSize({ width: device.width, height: device.height });

      // Your test here
      await page.goto('/checkin');
      // ...

      await page.close();
    });
  }
});
```

### Best Practices for E2E Tests

✅ **DO**
- Use `data-testid` for stable selectors
- Wait for elements explicitly
- Test critical user flows only
- Use mobile viewport for mobile apps
- Independent tests (no dependencies)

❌ **DON'T**
- Use fragile selectors (nth-child)
- Rely on specific text (translations)
- Test every permission combination
- Use `waitForTimeout()` (implicit waits)
- Depend on test execution order

---

## Performance Testing

### Setup

```bash
# Run performance tests (requires server running)
npm run perf:test

# View results
npm run perf:report
```

### Phases Explained

1. **Warm-up** (1 min, 1 req/sec)
   - Establece conexiones base
   - Calibra sistemas

2. **Ramp-up** (2 min, 5→15 req/sec)
   - Aumenta carga gradualmente
   - Monitorea degradación

3. **Sustained** (3 min, 15 req/sec)
   - Carga constante
   - Valida rate limiting

4. **Spike** (1 min, 50 req/sec)
   - Pico súbito
   - Prueba robustez

5. **Cool-down** (2 min, 15→1 req/sec)
   - Reduce gradualmente
   - Verifica recuperación

### Metrics Interpretation

| Métrica | Umbral | Acción |
|---------|--------|--------|
| P95 Latency | < 500ms | Si > 500ms: Optimizar queries |
| P99 Latency | < 2000ms | Si > 2000ms: Revisar index |
| Error Rate | < 1% | Si > 1%: Revisar logs |
| Rate Limit | > 0 | Si = 0: Verificar rate limiter |

---

## Security Testing

### Setup

```bash
# Run all security tests
npm run test:security

# Run specific suite
npm run test:security -- tests/security/jwt-auth.spec.js

# With coverage
npm run test:security -- --coverage
```

### Test Coverage

### Rate Limiting
- API rate limits (100/min)
- Login rate limits (5/15min)
- WhatsApp rate limits (2/day)
- Custom endpoints

### JWT Authentication
- Token generation
- Token validation
- Token refresh
- Token expiration
- Role-based access

### Input Validation
- XSS prevention
- SQL injection prevention
- Email validation
- Phone number validation
- URL validation

### Pattern: Security Test

```javascript
describe('Security - JWT Auth', () => {
  it('should reject invalid token', async () => {
    const response = await request(app)
      .get('/api/protected')
      .set('Authorization', 'Bearer invalid-token')
      .expect(401);

    expect(response.body.error).toContain('Invalid token');
  });

  it('should reject expired token', async () => {
    const expiredToken = jwt.sign(
      { user_id: '123' },
      process.env.JWT_SECRET,
      { expiresIn: '-1h' } // Expired
    );

    const response = await request(app)
      .get('/api/protected')
      .set('Authorization', `Bearer ${expiredToken}`)
      .expect(401);

    expect(response.body.error).toContain('Expired');
  });
});
```

---

## Best Practices

### General Principles

1. **Test Pyramid**
   - 70% Unit tests (fast, isolated)
   - 20% Integration tests (realistic)
   - 10% E2E tests (critical paths)

2. **AAA Pattern**
   ```
   Arrange - Setup test data
   Act     - Perform action
   Assert  - Verify result
   ```

3. **DRY Principle**
   ```javascript
   // Reusable setup
   const createTestMember = () => ({
     id: 'member-123',
     name: 'Juan García',
     phone: '5551234567'
   });

   // Use in multiple tests
   describe('Member tests', () => {
     const member = createTestMember();
     // ...
   });
   ```

4. **Isolation**
   - Each test should be independent
   - No shared state
   - No test order dependency

5. **Documentation**
   ```javascript
   // ✅ Good: Clear intent
   it('should reject check-in when member has debt', async () => {
     // ...
   });

   // ❌ Bad: Unclear
   it('should fail when condition is met', async () => {
     // ...
   });
   ```

### Test Data Management

```javascript
// Good: Use factories
const createMember = (overrides = {}) => ({
  id: uuidv4(),
  name: 'Test Member',
  phone: '5551234567',
  ...overrides
});

// Use
const member = createMember({ name: 'Juan' });
const adminMember = createMember({ role: 'admin' });
```

### Error Testing

```javascript
describe('Error Cases', () => {
  // ✅ Do test all error paths
  it('should handle validation errors', async () => { /* ... */ });
  it('should handle database errors', async () => { /* ... */ });
  it('should handle network errors', async () => { /* ... */ });
  it('should handle permission errors', async () => { /* ... */ });
});
```

---

## Debugging & Troubleshooting

### Debug Jest Tests

```bash
# Debug specific test
node --inspect-brk node_modules/.bin/jest --runInBand tests/unit/my.spec.js

# Then open chrome://inspect
```

### Debug Playwright Tests

```bash
# UI mode (recommended)
npm run test:playwright:ui

# Debug mode with inspector
npm run test:playwright:debug

# Headed mode (see browser)
npm run test:playwright:headed

# Generate trace
npx playwright test --trace on
npx playwright show-trace trace.zip
```

### Common Issues

#### Jest: "Cannot find module"
```javascript
// Fix: Check jest.config.js moduleNameMapper
moduleNameMapper: {
  '^@/(.*)$': '<rootDir>/src/$1'
}
```

#### Jest: "Timeout of 5000ms exceeded"
```javascript
// Solution 1: Increase timeout
test('My test', async () => { ... }, 10000);

// Solution 2: Use fake timers
jest.useFakeTimers();
jest.advanceTimersByTime(5000);
jest.useRealTimers();
```

#### Playwright: "Target page closed"
```typescript
// ❌ Wrong
test('Test', async ({ page }) => {
  await page.close();
  await page.goto('/'); // Error!
});

// ✅ Correct
test('Test', async ({ page }) => {
  await page.goto('/');
  // Don't close page, Playwright does it automatically
});
```

#### Playwright: "Element not found"
```typescript
// ✅ Always wait for element first
await expect(page.locator('button')).toBeVisible();
await page.locator('button').click();

// Or use timeout
await page.locator('button', { timeout: 10000 }).click();
```

---

## CI/CD Integration

### GitHub Actions

```yaml
name: Tests

on: [push, pull_request]

jobs:
  unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npm run test:unit -- --coverage

  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:security

  integration:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:13
        env:
          POSTGRES_PASSWORD: test
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:integration

  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx playwright install
      - run: npm start &
      - run: npm run test:playwright
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

---

## Test Metrics & Reporting

### Coverage Goals

```
Lines       : 75% (unit tests)
Functions   : 75% (unit tests)
Branches    : 70% (unit tests)
Statements  : 75% (unit tests)
```

### View Coverage Report

```bash
# Generate coverage
npm run test:unit -- --coverage

# Open report
open coverage/lcov-report/index.html
```

---

## Quick Reference

### Run Commands

| Command | Purpose |
|---------|---------|
| `npm test` | All tests |
| `npm run test:unit` | Unit tests only |
| `npm run test:integration` | Integration tests |
| `npm run test:security` | Security tests |
| `npm run test:playwright` | E2E tests |
| `npm run perf:test` | Performance tests |
| `npm run test:all` | Complete suite |

### Filtering Tests

```bash
# Run tests matching pattern
npm test -- --testNamePattern="Check-in"

# Run single file
npm test -- tests/unit/payment.spec.js

# Run tests with tag
npm test -- --testNamePattern="@critical"
```

---

## Next Steps

1. ✅ Review this guide
2. 🔄 Run all test suites locally
3. 📊 Monitor test coverage
4. 🐛 Debug failing tests
5. 📈 Improve coverage iteratively

---

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Library](https://testing-library.com/)
- [Artillery Documentation](https://artillery.io/docs)

---

**Last Updated**: 2025-10-18  
**Version**: 1.0  
**Maintained By**: QA Team
