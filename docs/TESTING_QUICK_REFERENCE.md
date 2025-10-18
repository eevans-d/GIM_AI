# 🧪 GIM_AI Testing Quick Reference

## Cheat Sheet

### Run Tests

```bash
# All tests
npm test

# By layer
npm run test:unit              # Unit only
npm run test:integration       # Integration only
npm run test:security          # Security only
npm run test:playwright        # E2E only
npm run perf:test              # Performance only

# Specific file
npm test -- checkin-service.spec.js

# Watch mode
npm run test:watch

# With coverage
npm run test:unit -- --coverage
```

### Playwright

```bash
# UI mode (best for debugging)
npm run test:playwright:ui

# Debug mode
npm run test:playwright:debug

# Headed (see browser)
npm run test:playwright:headed

# Report
npm run test:playwright:report
```

### Jest Patterns

```javascript
// Describe a feature
describe('CheckinService', () => {
  
  // Group related tests
  describe('#validateQR()', () => {
    
    // Single test
    it('should validate QR code', () => {
      // Arrange
      const qr = 'GIM-QR-123';
      
      // Act
      const result = service.validateQR(qr);
      
      // Assert
      expect(result).toBe(true);
    });
  });
});
```

### Playwright Patterns

```typescript
import { test, expect, Page } from '@playwright/test';

test.describe('My Feature', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
  });

  test('should do something', async () => {
    // Navigate
    await page.goto('/my-page');

    // Interact
    await page.locator('button').click();

    // Assert
    await expect(page.locator('text=Success')).toBeVisible();
  });

  test.afterEach(async () => {
    await page.close();
  });
});
```

### Mocking

```javascript
// Mock module
jest.mock('../../services/external', () => ({
  callAPI: jest.fn().mockResolvedValue({ success: true })
}));

// Mock function
const mockFn = jest.fn()
  .mockReturnValue('value')
  .mockRejectedValueOnce(new Error('Failed'));

// Mock implementation
jest.spyOn(service, 'method').mockImplementation(() => {
  return 'mocked value';
});

// Clear mocks
jest.clearAllMocks();
afterEach(() => jest.clearAllMocks());
```

### Async Testing

```javascript
// Promises
it('should handle async', async () => {
  const result = await service.doSomething();
  expect(result).toBe('value');
});

// Wait for condition
await expect(page.locator('text=Done')).toBeVisible();

// Wait for response
const response = await page.waitForResponse(
  r => r.url().includes('/api/endpoint')
);
expect(response.status()).toBe(200);

// Wait for navigation
await Promise.all([
  page.waitForNavigation(),
  page.click('a')
]);
```

### Locators (Playwright)

```typescript
// By test ID (best)
page.locator('[data-testid="submit-btn"]')

// By role
page.locator('button:has-text("Submit")')
page.locator('input[name="email"]')

// By text
page.locator('text=Welcome')
page.locator('text=/Hello|Hola/i') // Regex

// By CSS
page.locator('.button-primary')
page.locator('#main-header')

// Chaining
page.locator('form').locator('button')
```

### Assertions (Jest)

```javascript
// Equality
expect(value).toBe('exact')
expect(value).toEqual({ id: 1 })

// Truthiness
expect(value).toBeTruthy()
expect(value).toBeFalsy()

// Numbers
expect(count).toBeGreaterThan(0)
expect(time).toBeLessThan(1000)

// Strings
expect(message).toContain('error')
expect(message).toMatch(/err/)

// Arrays
expect(arr).toHaveLength(3)
expect(arr).toContain('item')

// Objects
expect(obj).toHaveProperty('id')
expect(obj).toEqual(expect.objectContaining({ id: 1 }))

// Errors
expect(() => fn()).toThrow('message')
expect(promise).rejects.toThrow()
```

### Assertions (Playwright)

```typescript
// Visibility
await expect(page.locator('button')).toBeVisible()
await expect(page.locator('button')).toBeHidden()

// Content
await expect(page).toHaveTitle('Page Title')
await expect(page.locator('h1')).toContainText('Welcome')

// State
await expect(page.locator('input')).toBeEnabled()
await expect(page.locator('input')).toBeDisabled()
await expect(page.locator('input')).toBeChecked()

// Attributes
await expect(page.locator('a')).toHaveAttribute('href', '/page')
await expect(page.locator('input')).toHaveValue('typed text')

// Count
await expect(page.locator('li')).toHaveCount(5)
```

## Test Structure Template

### Unit Test

```javascript
describe('FeatureName', () => {
  let dependency;
  let service;

  beforeEach(() => {
    dependency = createMockDependency();
    service = new Service(dependency);
  });

  describe('Method', () => {
    it('should do X when Y', () => {
      const result = service.method(input);
      expect(result).toBe(expected);
    });

    it('should handle error when Z', () => {
      expect(() => service.method(invalid))
        .toThrow('Error message');
    });
  });
});
```

### Integration Test

```javascript
describe('Integration - API Endpoint', () => {
  let app;
  let db;

  beforeEach(async () => {
    app = createApp();
    db = await createTestDatabase();
  });

  afterEach(async () => {
    await db.cleanup();
  });

  it('should process request end-to-end', async () => {
    const response = await request(app)
      .post('/api/endpoint')
      .send(testData)
      .expect(200);

    const stored = await db.query('SELECT * FROM table');
    expect(stored).toHaveLength(1);
  });
});
```

### E2E Test

```typescript
test.describe('User Flow', () => {
  test('should complete flow', async ({ page }) => {
    // Navigate
    await page.goto('/start');
    
    // Interact
    await page.locator('input[name="name"]').fill('John');
    await page.locator('button:has-text("Submit")').click();
    
    // Verify
    await expect(page.locator('text=Success')).toBeVisible();
    
    // Check results
    const data = await page.locator('[data-testid="result"]')
      .textContent();
    expect(data).toContain('John');
  });
});
```

## File Organization

### Where to put tests?

| Code | Test Location | Pattern |
|------|---------------|---------|
| Services | `tests/unit/services/*.spec.js` | Unit |
| API Routes | `tests/integration/*.spec.js` | Integration |
| Utils | `tests/unit/utils/*.spec.js` | Unit |
| Auth | `tests/security/*.spec.js` | Security |
| Flows | `tests/e2e/*.spec.ts` | E2E |
| Performance | `performance/` | Artillery |

## Common Commands

```bash
# Run tests and generate coverage
npm test -- --coverage

# Run specific test file
npm test -- checkin.spec.js

# Run tests matching name
npm test -- --testNamePattern="Check-in"

# Run tests in watch mode
npm run test:watch

# Run single test
npm test -- --testNamePattern="should validate"

# Bail on first failure
npm test -- --bail

# Show test times
npm test -- --verbose

# Update snapshots
npm test -- --updateSnapshot

# Run only failed tests
npm test -- --onlyChanged
```

## Configuration Files

| File | Purpose |
|------|---------|
| `jest.config.js` | Main Jest config |
| `jest.security.config.js` | Security tests config |
| `jest.integration.config.js` | Integration tests config |
| `playwright.config.ts` | Playwright config |
| `.babelrc` | Babel transpilation |
| `tests/jest.setup.js` | Global setup |

## Debug Tips

### Jest
```bash
# Add console logs
console.log('Value:', variable);

# Debug specific test
NODE_OPTIONS="--inspect-brk" npm test -- --runInBand

# Use only on specific test
it.only('test', () => { ... });

# Skip test temporarily
it.skip('test', () => { ... });
```

### Playwright
```bash
# Pause test
await page.pause();

# Screenshot
await page.screenshot({ path: 'debug.png' });

# View page HTML
console.log(await page.content());

# Get element text
const text = await page.locator('button').textContent();
```

## Performance Benchmarks

| Test Type | Target Time | Max Time |
|-----------|------------|----------|
| Unit Test | <100ms | <500ms |
| Integration | <1s | <5s |
| E2E Test | <10s | <30s |
| Full Suite | <5min | <10min |

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Tests timeout | Increase timeout: `test('...', async () => {}, 10000)` |
| Cannot find module | Check jest.config.js moduleNameMapper |
| Async errors | Use async/await or return promises |
| Flaky tests | Add explicit waits, don't use waitForTimeout |
| Mock not working | Clear mocks between tests: `jest.clearAllMocks()` |

## Resources

- [Jest Docs](https://jestjs.io/)
- [Playwright Docs](https://playwright.dev/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

---

**Print this page for quick reference!** 📋
