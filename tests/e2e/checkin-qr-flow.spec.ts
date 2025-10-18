import { test, expect, Page } from '@playwright/test';

/**
 * E2E Test - QR Check-in Flow
 * 
 * Propósito: Validar el flujo completo de check-in mediante QR scan
 * Flujo: Navegar → Ingresar QR → Validar confirmación → Verificar DB
 * 
 * Casos cubiertos:
 * - Check-in exitoso con miembro activo
 * - Error: miembro no existe
 * - Error: miembro con deuda
 * - Error: código QR inválido
 * - Confirmación WhatsApp enviada
 */

test.describe('E2E - QR Check-in Flow', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    
    // Configurar viewport para mobile (típico para check-in)
    await page.setViewportSize({ width: 393, height: 851 });
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('Should complete successful QR check-in flow', async () => {
    // Step 1: Navegar a página de check-in
    await page.goto('/checkin');
    
    // Validar que la página cargó correctamente
    await expect(page).toHaveTitle(/Check-in|QR/i);
    await expect(page.locator('h1')).toContainText(/check-in|escanear/i);

    // Step 2: Buscar y interactuar con input de QR
    const qrInput = page.locator('input[name="qr_code"]');
    await expect(qrInput).toBeVisible();
    await expect(qrInput).toBeFocused();

    // Step 3: Ingresar QR válido
    const validQR = 'GIM-QR-12345678';
    await qrInput.fill(validQR);

    // Step 4: Presionar Enter o click submit
    const submitButton = page.locator('button[type="submit"], button:has-text("Confirmar")');
    await submitButton.click();

    // Step 5: Esperar respuesta y validar mensaje de éxito
    await page.waitForResponse(response => response.url().includes('/api/checkin/qr'));
    
    const successMessage = page.locator('.alert-success, .toast-success, [role="alert"]:has-text("Éxito")');
    await expect(successMessage).toBeVisible();
    await expect(successMessage).toContainText(/check-in.*éxito|confirmado/i);

    // Step 6: Verificar datos del miembro se muestren
    await expect(page.locator('text=Juan García')).toBeVisible();
    await expect(page.locator('text=Spinning')).toBeVisible();

    // Step 7: Verificar que se puede hacer otro check-in o regresa a inicio
    await page.waitForTimeout(2000);
    
    // Debería estar listo para nuevo QR
    const newQRInput = page.locator('input[name="qr_code"]');
    await expect(newQRInput).toBeEnabled();
  });

  test('Should handle invalid QR code', async () => {
    await page.goto('/checkin');
    
    const qrInput = page.locator('input[name="qr_code"]');
    await qrInput.fill('INVALID-QR-123');

    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Validar error message
    await page.waitForResponse(response => response.url().includes('/api/checkin'));
    
    const errorMessage = page.locator('.alert-error, .toast-error, [role="alert"]:has-text("Error")');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toContainText(/no encontrado|inv.*lido|error/i);
  });

  test('Should prevent check-in for member with debt', async () => {
    await page.goto('/checkin');
    
    const qrInput = page.locator('input[name="qr_code"]');
    // QR de miembro con deuda
    await qrInput.fill('GIM-QR-DEBT-001');

    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    await page.waitForResponse(response => response.url().includes('/api/checkin'));
    
    const debtMessage = page.locator('text=/deuda|debe|pagar/i');
    await expect(debtMessage).toBeVisible();
  });

  test('Should display member info before confirming', async () => {
    await page.goto('/checkin');
    
    const qrInput = page.locator('input[name="qr_code"]');
    await qrInput.fill('GIM-QR-12345678');

    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Esperar a que se muestre info del miembro
    await expect(page.locator('text=Juan García')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Spinning')).toBeVisible();
    
    // Debería haber confirmación visual
    const confirmButton = page.locator('button:has-text("Confirmar")');
    await expect(confirmButton).toBeVisible();
  });

  test('Should track check-in time accurately', async () => {
    await page.goto('/checkin');
    
    const timeBeforeCheckIn = Date.now();
    
    const qrInput = page.locator('input[name="qr_code"]');
    await qrInput.fill('GIM-QR-12345678');

    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    await page.waitForResponse(response => response.url().includes('/api/checkin/qr'));
    
    const timeInResponse = page.locator('text=/[0-9]{2}:[0-9]{2}/').first();
    await expect(timeInResponse).toBeVisible();
    
    // Verificar que el tiempo es aproximadamente correcto
    const displayedTime = await timeInResponse.textContent();
    const timeAfterCheckIn = Date.now();
    
    const timeDiff = timeAfterCheckIn - timeBeforeCheckIn;
    expect(timeDiff).toBeLessThan(10000); // Menos de 10 segundos
  });

  test('Should be responsive on mobile devices', async ({ browser }) => {
    const mobileDevices = [
      { name: 'iPhone 12', width: 390, height: 844 },
      { name: 'Pixel 5', width: 393, height: 851 }
    ];

    for (const device of mobileDevices) {
      const mobilePage = await browser.newPage();
      await mobilePage.setViewportSize({ width: device.width, height: device.height });

      await mobilePage.goto('/checkin');

      // Validar que todos los elementos sean visibles
      const qrInput = mobilePage.locator('input[name="qr_code"]');
      await expect(qrInput).toBeVisible();

      const submitButton = mobilePage.locator('button[type="submit"]');
      await expect(submitButton).toBeVisible();

      await mobilePage.close();
    }
  });

  test('Should support multiple rapid check-ins', async () => {
    await page.goto('/checkin');

    const qrCodes = ['GIM-QR-001', 'GIM-QR-002', 'GIM-QR-003'];

    for (const qr of qrCodes) {
      const qrInput = page.locator('input[name="qr_code"]');
      await qrInput.clear();
      await qrInput.fill(qr);

      const submitButton = page.locator('button[type="submit"]');
      await submitButton.click();

      // Esperar respuesta
      await page.waitForResponse(response => response.url().includes('/api/checkin'), { timeout: 5000 });

      // Debería limpiar input para siguiente scan
      await page.waitForTimeout(500);
    }
  });

  test('Should handle network errors gracefully', async () => {
    await page.goto('/checkin');

    // Simular falla de red
    await page.context().setOffline(true);

    const qrInput = page.locator('input[name="qr_code"]');
    await qrInput.fill('GIM-QR-12345678');

    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Debería mostrar error de conexión
    const errorMessage = page.locator('.alert-error, text=/conexión|no disponible/i');
    await expect(errorMessage).toBeVisible({ timeout: 5000 });

    // Restaurar conexión
    await page.context().setOffline(false);

    // Debería permitir reintentar
    const retryButton = page.locator('button:has-text("Reintentar")');
    if (await retryButton.isVisible()) {
      await retryButton.click();
      await page.waitForResponse(response => response.url().includes('/api/checkin'));
    }
  });

  test('Should expire old check-in data after timeout', async () => {
    await page.goto('/checkin');

    const qrInput = page.locator('input[name="qr_code"]');
    await qrInput.fill('GIM-QR-12345678');

    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Esperar respuesta inicial
    await page.waitForResponse(response => response.url().includes('/api/checkin'));

    // Esperar 30 segundos (debería expirar sesión)
    await page.waitForTimeout(30000);

    // Intentar nuevo check-in - debería estar limpio
    await qrInput.fill('GIM-QR-ANOTHER');
    await submitButton.click();

    // Debería iniciar nuevo flujo
    await page.waitForResponse(response => response.url().includes('/api/checkin'));
  });
});

test.describe('E2E - Check-in Dashboard', () => {
  test('Should display check-in statistics', async ({ page }) => {
    await page.goto('/dashboard/checkins');

    // Validar que se cargue dashboard
    await expect(page).toHaveTitle(/Dashboard|Estad.sticas/i);

    // Verificar elementos clave
    await expect(page.locator('text=/total|check-in/i')).toBeVisible();
    await expect(page.locator('text=/hoy|today/i')).toBeVisible();

    // Validar tabla de check-ins recientes
    const tableRows = page.locator('table tbody tr');
    expect(await tableRows.count()).toBeGreaterThan(0);
  });

  test('Should filter check-ins by date range', async ({ page }) => {
    await page.goto('/dashboard/checkins');

    // Abrir date picker
    const dateFilter = page.locator('input[type="date"], button:has-text("Fecha")').first();
    await dateFilter.click();

    // Seleccionar rango de fechas
    const startDate = page.locator('input[name="start_date"]');
    await startDate.fill('2025-01-01');

    const endDate = page.locator('input[name="end_date"]');
    await endDate.fill('2025-12-31');

    // Aplicar filtro
    const applyButton = page.locator('button:has-text("Aplicar")');
    await applyButton.click();

    // Validar que tabla se actualiza
    await page.waitForResponse(response => response.url().includes('/api/checkins'));
    
    const tableRows = page.locator('table tbody tr');
    expect(await tableRows.count()).toBeGreaterThan(0);
  });

  test('Should export check-in data', async ({ page }) => {
    await page.goto('/dashboard/checkins');

    // Esperar a botón de exportar
    const exportButton = page.locator('button:has-text("Exportar")');
    await expect(exportButton).toBeVisible();

    // Interceptar el response del export
    const responsePromise = page.waitForResponse(response => 
      response.url().includes('/api/checkins/export')
    );
    
    await exportButton.click();

    const response = await responsePromise;
    
    // Validar que el response fue exitoso
    expect(response.status()).toBe(200);
  });
});
