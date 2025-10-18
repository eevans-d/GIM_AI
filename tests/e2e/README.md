# 🎭 End-to-End Testing - Playwright Suite

## Descripción

Suite completa de E2E tests usando Playwright para validar flujos completos del sistema GIM_AI:

- **QR Check-in**: Escaneo QR → Validación → Confirmación WhatsApp
- **Reminders**: Scheduling → Dispatch → Entrega en horario de negocio
- **Dashboard**: KPIs → Filtros → Exportación → Gráficos
- **Instructor Panel**: Asistencia → Notificaciones → Sustituciones

## Instalación

```bash
# Playwright ya está instalado
npm install --save-dev @playwright/test

# Instalar navegadores
npx playwright install chromium firefox webkit
```

## Estructura

```
tests/e2e/
├── checkin-qr-flow.spec.ts       # QR check-in e integración
├── reminder-flow.spec.ts         # Sistema de recordatorios
├── dashboard-flow.spec.ts        # Dashboard y estadísticas
├── README.md                      # Este archivo
└── helpers/                       # Helpers compartidos (opcional)
    ├── auth.ts                    # Login/logout helpers
    ├── fixtures.ts                # Datos de test
    └── api.ts                     # API helpers
```

## Uso Rápido

### 1. Iniciar Servidor

```bash
# Terminal 1
npm start
# Servidor en http://localhost:3000
```

### 2. Ejecutar Tests

```bash
# Terminal 2
# Todos los E2E tests
npx playwright test

# Tests específicos
npx playwright test tests/e2e/checkin-qr-flow.spec.ts

# Tests con UI mode (recomendado para debugging)
npx playwright test --ui

# Tests en headed mode (ver navegador)
npx playwright test --headed

# Tests en un navegador específico
npx playwright test --project=chromium
```

### 3. Ver Resultados

```bash
# Abrir reporte HTML
npx playwright show-report

# Ver videos de fallos (si están habilitados)
ls tests/e2e/test-results/
```

## Configuración (playwright.config.ts)

### Base URL
```
baseURL: 'http://localhost:3000'
```

### Timeouts
- **Test timeout**: 30 segundos por test
- **Action timeout**: 10 segundos por acción
- **Navigation timeout**: 30 segundos

### Browsers
- Chromium (Desktop)
- Firefox (Desktop)
- WebKit (Desktop)
- Mobile Chrome (Pixel 5)
- Mobile Safari (iPhone 12)

### Reportes
- **HTML**: `tests/e2e/test-results/index.html`
- **JSON**: `tests/e2e/results.json`
- **JUnit**: `tests/e2e/results.xml` (para CI)

## Escribir Nuevos Tests

### Patrón Básico

```typescript
import { test, expect } from '@playwright/test';

test.describe('E2E - Mi Feature', () => {
  test('Should do something', async ({ page }) => {
    // Arrange
    await page.goto('/mi-pagina');

    // Act
    await page.locator('button').click();

    // Assert
    await expect(page.locator('text=Éxito')).toBeVisible();
  });
});
```

### Buenas Prácticas

1. **Use data-testid** para elementos estables
   ```typescript
   <button data-testid="submit-btn">Enviar</button>
   
   await page.locator('[data-testid="submit-btn"]').click();
   ```

2. **Esperar elementos correctamente**
   ```typescript
   // ❌ Incorrecto
   await page.locator('button').click();
   
   // ✅ Correcto
   await expect(page.locator('button')).toBeVisible();
   await page.locator('button').click();
   ```

3. **Usar locators específicos**
   ```typescript
   // ❌ Muy genérico
   page.locator('div').click();
   
   // ✅ Específico
   page.locator('[data-testid="checkin-submit"]').click();
   ```

4. **Tests independientes**
   ```typescript
   // ❌ Dependencia entre tests
   test('Step 1: Login', ...)
   test('Step 2: Navigate', ...) // Depende de Step 1
   
   // ✅ Independientes
   test('Should login and navigate', async ({ page }) => {
     // Login
     // Navigate
   });
   ```

## Fixtures Compartidos

### Autenticación

```typescript
import { test as base } from '@playwright/test';

const test = base.extend({
  authenticatedPage: async ({ page }, use) => {
    await page.goto('/login');
    await page.locator('input[name="email"]').fill('test@gym.com');
    await page.locator('input[name="password"]').fill('password123');
    await page.locator('button:has-text("Login")').click();
    await page.waitForNavigation();
    
    await use(page);
  }
});

test('Should access protected page', async ({ authenticatedPage }) => {
  await authenticatedPage.goto('/dashboard');
  // ...
});
```

### Datos de Test

```typescript
export const testData = {
  validQR: 'GIM-QR-12345678',
  invalidQR: 'INVALID-123',
  memberWithDebt: 'GIM-QR-DEBT-001',
  member: {
    name: 'Juan García',
    email: 'juan@gym.com',
    phone: '5551234567'
  },
  class: {
    name: 'Spinning',
    instructor: 'Carlos',
    time: '18:00'
  }
};
```

## Debugging

### Modo UI (Recomendado)

```bash
npx playwright test --ui
```

Permite:
- Ver navegador en tiempo real
- Pausar en assertions
- Navegar por timeline
- Reproducir acciones individuales

### Modo Debug

```bash
PWDEBUG=1 npx playwright test tests/e2e/checkin-qr-flow.spec.ts
```

Abre Inspector de Playwright con:
- Breakpoints
- Step-through execution
- Console access

### Logs y Traces

```typescript
test('My test', async ({ page }) => {
  // Habilitar trace
  await page.context().tracing.start({ screenshots: true, snapshots: true });

  // Tu test aquí
  await page.goto('/');

  // Guardar trace
  await page.context().tracing.stop({ 
    path: 'trace.zip' 
  });
});
```

Visualizar: `npx playwright show-trace trace.zip`

### Screenshots y Videos

```typescript
test('My test', async ({ page, context }) => {
  // Screenshot en punto específico
  await page.screenshot({ path: 'debug.png' });

  // Videos se guardan automáticamente si fallan
  // (configurado en playwright.config.ts)
});
```

## CI/CD Integration

### GitHub Actions

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      
      - run: npm install
      - run: npm start &
      - run: npx playwright test
      
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

## Troubleshooting

### ❌ "Target page, context or browser has been closed"

```typescript
// ❌ Incorrect
test('My test', async ({ page }) => {
  page.goto('/');
  // ...
  page.close(); // No hagas esto!
  // Intentar usar page después falla
});

// ✅ Correct
test('My test', async ({ page }) => {
  page.goto('/');
  // ...
  // Playwright cierra la página automáticamente
});
```

### ❌ "Timeout waiting for element"

```typescript
// ❌ Timeout por elemento no visible
await page.locator('button:has-text("Save")').click();

// ✅ Esperar elemento primero
await expect(page.locator('button:has-text("Save")')).toBeVisible();
await page.locator('button:has-text("Save")').click();

// ✅ O aumentar timeout
await page.locator('button:has-text("Save")', { timeout: 60000 }).click();
```

### ❌ "E2E tests failing locally but passing in CI"

Causas comunes:
- **Viewport diferente**: Mobile en local, desktop en CI
- **Timeouts diferentes**: Máquina más lenta en CI
- **Datos de test**: Base de datos limpia en CI

Solución:
```bash
# Ejecutar con mismo viewport que CI
npx playwright test --project="Mobile Chrome"

# Aumentar timeouts
npx playwright test --timeout=60000
```

## Best Practices

### ✅ Hacer
- Tests independientes y reproducibles
- Use explicit waits no implicit
- Nombres descriptivos para locators (data-testid)
- Fixtures para código compartido
- Reporte detallado en CI

### ❌ No Hacer
- Tests que dependan de orden de ejecución
- Waits genéricas (waitForTimeout)
- Selectors frágiles (nth-child, índices)
- Tests contra datos productivos
- Screenshots de toda la página en CI

## Performance Tips

1. **Ejecutar en paralelo** (desarrollo)
   ```bash
   npx playwright test
   ```

2. **Ejecutar serie en CI**
   ```bash
   # playwright.config.ts
   workers: process.env.CI ? 1 : 4
   ```

3. **Usar Mobile Chrome en CI** (más rápido que Firefox)
   ```bash
   npx playwright test --project="Mobile Chrome"
   ```

4. **Cache assets**
   ```typescript
   test('My test', async ({ page, context }) => {
     // Cache habilitado automáticamente
     await page.goto('/');
   });
   ```

## Integraciones

### Slack Notifications

```bash
# Instalar
npm install --save-dev @zegocloud/playwright-slack-reporter

# Usar en CI
npx playwright test --reporter=@zegocloud/playwright-slack-reporter
```

### Visual Regression

```bash
# Capturar baseline
npx playwright test --update-snapshots

# Ejecutar tests
npx playwright test

# Ver diferencias
npx playwright show-report
```

## Referencias

- [Playwright Documentation](https://playwright.dev)
- [Locators Guide](https://playwright.dev/docs/locators)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Guide](https://playwright.dev/docs/debug)

## Próximos Pasos

1. ✅ Tests básicos creados
2. 🔄 Ejecutar tests y validar en CI
3. 📊 Agregar visual regression tests
4. 🔐 Tests de seguridad (SQL injection, XSS)
5. ⚡ Performance profiling

---

**Created**: 2025-10-18  
**Last Updated**: 2025-10-18  
**Maintenance**: QA Team
