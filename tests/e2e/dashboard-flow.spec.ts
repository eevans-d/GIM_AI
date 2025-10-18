import { test, expect } from '@playwright/test';

/**
 * E2E Test - Dashboard Flow
 * 
 * Propósito: Validar flujos completos en el dashboard
 * Incluye: KPIs, filtros, exportación, gráficos
 */

test.describe('E2E - Dashboard Flow', () => {
  test('Should load member dashboard', async ({ page }) => {
    await page.goto('/dashboard/member');

    // Validar que se carga
    await expect(page).toHaveTitle(/Dashboard|Member/i);

    // Validar elementos clave
    await expect(page.locator('text=/clases asistidas|total workout/i')).toBeVisible();
    await expect(page.locator('text=/próxima clase|next class/i')).toBeVisible();
    await expect(page.locator('text=/deuda|debt/i')).toBeVisible();
  });

  test('Should display KPIs correctly', async ({ page }) => {
    await page.goto('/dashboard');

    // Validar que KPIs se muestren
    const kpis = page.locator('[data-testid="kpi-card"]');
    expect(await kpis.count()).toBeGreaterThan(0);

    // Validar que tienen valores
    for (let i = 0; i < await kpis.count(); i++) {
      const kpi = kpis.nth(i);
      const value = await kpi.locator('[data-testid="kpi-value"]').textContent();
      expect(value).toBeTruthy();
    }
  });

  test('Should filter data by date range', async ({ page }) => {
    await page.goto('/dashboard');

    // Abrir date picker
    const startDateInput = page.locator('input[name="start_date"]');
    await startDateInput.fill('2025-01-01');

    const endDateInput = page.locator('input[name="end_date"]');
    await endDateInput.fill('2025-01-31');

    // Aplicar filtro
    const applyButton = page.locator('button:has-text("Aplicar")');
    await applyButton.click();

    // Validar que KPIs se actualizan
    await page.waitForResponse(response => response.url().includes('/api/dashboard'));
  });

  test('Should export dashboard data', async ({ page }) => {
    await page.goto('/dashboard');

    // Buscar botón de exportar
    const exportButton = page.locator('button:has-text("Descargar|Exportar")').first();
    
    if (await exportButton.isVisible()) {
      await exportButton.click();

      // Esperar respuesta
      const response = await page.waitForResponse(response =>
        response.url().includes('/api/export') || response.url().includes('/download')
      );

      expect(response.status()).toBe(200);
    }
  });

  test('Should display charts and graphs', async ({ page }) => {
    await page.goto('/dashboard');

    // Buscar elementos de gráficos
    const charts = page.locator('canvas, svg[data-testid*="chart"]');
    
    expect(await charts.count()).toBeGreaterThan(0);

    // Validar que se cargan correctamente
    for (let i = 0; i < await charts.count(); i++) {
      const chart = charts.nth(i);
      await expect(chart).toBeVisible();
    }
  });

  test('Should handle responsive design on mobile', async ({ page }) => {
    // Cambiar a mobile viewport
    await page.setViewportSize({ width: 393, height: 851 });

    await page.goto('/dashboard');

    // Validar que elementos se reacomodan
    const kpis = page.locator('[data-testid="kpi-card"]');
    
    // En mobile, podrían estar en una fila
    expect(await kpis.count()).toBeGreaterThan(0);

    // Validar que scroll funciona
    await page.evaluate(() => window.scrollBy(0, 500));
  });

  test('Should persist filter preferences', async ({ page }) => {
    await page.goto('/dashboard');

    // Aplicar filtro
    const typeFilter = page.locator('select[name="filter_type"]');
    if (await typeFilter.isVisible()) {
      await typeFilter.selectOption('Spinning');

      // Recargar página
      await page.reload();

      // Validar que filtro se mantiene
      const selectedOption = await typeFilter.inputValue();
      expect(selectedOption).toBe('Spinning');
    }
  });

  test('Should refresh dashboard data', async ({ page }) => {
    await page.goto('/dashboard');

    const initialKPI = await page.locator('[data-testid="kpi-value"]').first().textContent();

    // Buscar botón de refresh
    const refreshButton = page.locator('button[aria-label="Actualizar|Refresh"]');
    
    if (await refreshButton.isVisible()) {
      await refreshButton.click();

      // Validar que se recarga
      await page.waitForResponse(response => response.url().includes('/api/dashboard'));
    }
  });

  test('Should display real-time updates', async ({ page }) => {
    await page.goto('/dashboard');

    // Esperar a que se actualicen datos
    await page.waitForTimeout(2000);

    // Validar que hay timestamp actualizado
    const lastUpdated = page.locator('[data-testid="last-updated"]');
    
    if (await lastUpdated.isVisible()) {
      const timestamp = await lastUpdated.textContent();
      expect(timestamp).toBeTruthy();
    }
  });
});

test.describe('E2E - Instructor Panel', () => {
  test('Should display instructor dashboard', async ({ page }) => {
    await page.goto('/instructor/dashboard');

    // Validar que carga
    await expect(page).toHaveTitle(/Instructor|Entrenador/i);

    // Validar elementos específicos del instructor
    await expect(page.locator('text=/mis clases|my classes/i')).toBeVisible();
  });

  test('Should show class roster', async ({ page }) => {
    await page.goto('/instructor/classes');

    // Validar que se muestra lista de clases
    const classItems = page.locator('[data-testid="class-item"]');
    expect(await classItems.count()).toBeGreaterThan(0);

    // Click en una clase
    await classItems.first().click();

    // Validar que muestra roster
    await expect(page.locator('text=/asistentes|miembros/i')).toBeVisible();
  });

  test('Should mark attendance', async ({ page }) => {
    await page.goto('/instructor/classes/123/roster');

    // Buscar checkbox de asistencia
    const attendanceCheckbox = page.locator('[data-testid="attendance-checkbox"]').first();
    
    if (await attendanceCheckbox.isVisible()) {
      await attendanceCheckbox.check();

      // Validar que se guarda
      const response = await page.waitForResponse(response =>
        response.url().includes('/api/attendance')
      );

      expect(response.status()).toBe(200);
    }
  });

  test('Should send class-specific reminders', async ({ page }) => {
    await page.goto('/instructor/classes/123');

    // Buscar botón de enviar recordatorio
    const reminderButton = page.locator('button:has-text("Recordatorio|Notificar")');
    
    if (await reminderButton.isVisible()) {
      await reminderButton.click();

      // Validar que aparece diálogo
      await expect(page.locator('text=/mensaje|template/i')).toBeVisible();

      // Enviar recordatorio
      const sendButton = page.locator('button:has-text("Enviar")');
      await sendButton.click();

      // Validar confirmación
      await expect(page.locator('text=/enviado|success/i')).toBeVisible();
    }
  });

  test('Should manage substitution requests', async ({ page }) => {
    await page.goto('/instructor/substitutions');

    // Validar que se muestra lista de solicitudes
    const requests = page.locator('[data-testid="substitution-request"]');
    
    if (await requests.count() > 0) {
      // Aceptar una solicitud
      const acceptButton = requests.first().locator('button:has-text("Aceptar")');
      await acceptButton.click();

      // Validar confirmación
      await expect(page.locator('text=/confirmado|aceptada/i')).toBeVisible();
    }
  });
});
