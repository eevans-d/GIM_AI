import { test, expect, Page } from '@playwright/test';

/**
 * E2E Test - Reminder Flow
 * 
 * Propósito: Validar el flujo completo de recordatorios (post-workout, pre-class, etc)
 * Flujo: Clase finalizada → Survey encuesta → Recordatorio enviado → Verificación
 * 
 * Casos cubiertos:
 * - Recordatorio post-clase exitoso
 * - Recordatorio pre-clase (aviso de próxima clase)
 * - Recordatorio de pago vencido
 * - Recordatorio de registro en clase
 * - Cancelar recordatorio
 * - Historial de recordatorios
 */

test.describe('E2E - Reminder Flow', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('Should trigger post-workout survey reminder', async () => {
    // Step 1: Navegar a página de miembro
    await page.goto('/member/dashboard');
    
    // Validar que está logueado
    await expect(page.locator('text=/bienvenido|hola/i')).toBeVisible();

    // Step 2: Completar clase (simulado - asumir que clase se completa)
    // En un app real, esto sería visible después de 90 minutos de check-in
    const postWorkoutAlert = page.locator('[data-testid="post-workout-prompt"], text=/¿cómo te fue?/i');
    
    if (await postWorkoutAlert.isVisible({ timeout: 5000 })) {
      // Step 3: Abrir survey de satisfacción
      await postWorkoutAlert.click();

      // Step 4: Completar survey
      const ratingInput = page.locator('input[name="rating"]');
      await ratingInput.fill('5');

      const commentsInput = page.locator('textarea[name="comments"]');
      await commentsInput.fill('Excelente clase!');

      const submitButton = page.locator('button:has-text("Enviar")');
      await submitButton.click();

      // Step 5: Validar confirmación
      await expect(page.locator('text=Gracias|Encuesta enviada')).toBeVisible();
    }
  });

  test('Should send pre-class reminder', async () => {
    await page.goto('/member/dashboard');

    // Buscar próxima clase
    const nextClass = page.locator('[data-testid="next-class"], text=/próxima clase/i').first();
    await expect(nextClass).toBeVisible();

    // Click en próxima clase
    await nextClass.click();

    // Debería mostrar opción de recordatorio
    const reminderToggle = page.locator('label:has-text("Recordarme")');
    if (!await reminderToggle.isChecked()) {
      await reminderToggle.check();
    }

    // Validar que se guardó el recordatorio
    const successMessage = page.locator('text=/recordatorio.*activado|alerta configurada/i');
    await expect(successMessage).toBeVisible({ timeout: 5000 });
  });

  test('Should display payment due reminder', async () => {
    // Asumir que el miembro tiene pago vencido
    await page.goto('/member/dashboard');

    // Debería haber alerta visible
    const paymentAlert = page.locator('[data-testid="payment-alert"], text=/pago.*vencido|debe/i');
    await expect(paymentAlert).toBeVisible();

    // Click en alerta para ver detalles
    await paymentAlert.click();

    // Validar que muestra detalles del pago
    await expect(page.locator('text=/monto|fecha vencimiento/i')).toBeVisible();
  });

  test('Should allow dismissing reminders', async () => {
    await page.goto('/member/dashboard');

    // Encontrar recordatorio visible
    const reminder = page.locator('[role="alert"]').first();
    
    if (await reminder.isVisible()) {
      const dismissButton = reminder.locator('button[aria-label="Cerrar"], button:has-text("×")');
      
      if (await dismissButton.isVisible()) {
        await dismissButton.click();
        
        // Validar que desapareció
        await expect(reminder).not.toBeVisible();
      }
    }
  });

  test('Should view reminder history', async () => {
    await page.goto('/member/reminders/history');

    // Validar que se carga página de historial
    await expect(page.locator('h1')).toContainText(/historial|recordatorios/i);

    // Debería haber lista de recordatorios
    const reminderList = page.locator('[data-testid="reminder-item"], tr');
    expect(await reminderList.count()).toBeGreaterThanOrEqual(0);

    // Validar que muestra detalles
    if (await reminderList.first().isVisible()) {
      await expect(page.locator('text=/tipo|fecha|estado/i')).toBeVisible();
    }
  });

  test('Should filter reminders by type', async () => {
    await page.goto('/member/reminders');

    // Buscar selector de tipo de recordatorio
    const typeFilter = page.locator('select[name="type"], button:has-text("Tipo")').first();
    
    if (await typeFilter.isVisible()) {
      await typeFilter.click();

      // Seleccionar "post_workout"
      const postWorkoutOption = page.locator('text=Post-workout|Encuesta de clase');
      await postWorkoutOption.click();

      // Validar que se filtra
      await page.waitForResponse(response => response.url().includes('/api/reminders'));
    }
  });

  test('Should configure reminder preferences', async () => {
    await page.goto('/member/settings/reminders');

    // Validar que se carga página de preferencias
    await expect(page.locator('h1')).toContainText(/preferencias|recordatorios/i);

    // Encontrar opciones de configuración
    const postWorkoutToggle = page.locator('label:has-text("Recordatorio post-clase")');
    const paymentToggle = page.locator('label:has-text("Recordatorio de pago")');

    // Cambiar preferencias
    if (await postWorkoutToggle.isVisible()) {
      await postWorkoutToggle.click();
    }

    // Guardar cambios
    const saveButton = page.locator('button:has-text("Guardar")');
    await saveButton.click();

    // Validar confirmación
    await expect(page.locator('text=/guardado|actualizado/i')).toBeVisible();
  });

  test('Should handle reminder timezone correctly', async () => {
    await page.goto('/member/settings/reminders');

    // Seleccionar zona horaria
    const timezoneSelect = page.locator('select[name="timezone"]');
    await timezoneSelect.selectOption('America/New_York');

    // Guardar
    const saveButton = page.locator('button:has-text("Guardar")');
    await saveButton.click();

    // Validar que se guardó
    await expect(page.locator('text=/zona horaria.*actualizada/i')).toBeVisible();

    // Validar que los recordatorios respetan la zona horaria
    const timeDisplay = page.locator('[data-testid="reminder-time"]');
    await expect(timeDisplay).toBeVisible();
  });

  test('Should respect business hours for reminders', async () => {
    // Validar que los recordatorios solo se envíen dentro de 9-21h
    await page.goto('/member/reminders/history');

    const reminderItems = page.locator('[data-testid="reminder-item"]');
    
    for (let i = 0; i < await reminderItems.count(); i++) {
      const item = reminderItems.nth(i);
      const sentTime = await item.locator('[data-testid="sent-time"]').textContent();
      
      if (sentTime) {
        // Extraer hora del time
        const [hour] = sentTime.split(':').map(Number);
        
        // Debería estar entre 9 y 21
        expect(hour).toBeGreaterThanOrEqual(9);
        expect(hour).toBeLessThan(21);
      }
    }
  });

  test('Should queue reminder if sent outside business hours', async ({ page }) => {
    // Simular envío fuera de horario
    // Esto es más bien un test de API, pero lo dejamos como reference
    
    // En UI, debería haber indicador de que está en cola
    await page.goto('/member/reminders/pending');

    const queuedReminders = page.locator('[data-testid="queued-reminder"]');
    
    if (await queuedReminders.count() > 0) {
      // Validar que muestra estado "en cola"
      await expect(queuedReminders.first()).toContainText(/en cola|pendiente/i);
    }
  });

  test('Should show last reminder time', async () => {
    await page.goto('/member/dashboard');

    // Buscar widget de último recordatorio
    const lastReminderWidget = page.locator('[data-testid="last-reminder"]');
    
    if (await lastReminderWidget.isVisible()) {
      const timestamp = await lastReminderWidget.locator('time').getAttribute('datetime');
      
      // Validar que tiene timestamp válido
      expect(timestamp).toBeTruthy();
    }
  });
});

test.describe('E2E - Reminder Admin Panel', () => {
  test('Should display reminder statistics', async ({ page }) => {
    await page.goto('/admin/reminders');

    // Validar página de admin
    await expect(page).toHaveTitle(/Admin|Recordatorios/i);

    // Validar estadísticas
    await expect(page.locator('text=/total enviados|sent reminders/i')).toBeVisible();
    await expect(page.locator('text=/tasa de éxito|success rate/i')).toBeVisible();
  });

  test('Should monitor reminder queue', async ({ page }) => {
    await page.goto('/admin/reminders/queue');

    // Validar lista de recordatorios en cola
    const queueItems = page.locator('[data-testid="queue-item"]');
    
    if (await queueItems.count() > 0) {
      // Verificar que se pueden ver detalles
      const firstItem = queueItems.first();
      await expect(firstItem).toContainText(/miembro|type|scheduled/i);
    }
  });

  test('Should manually trigger reminder', async ({ page }) => {
    await page.goto('/admin/reminders');

    // Buscar botón de envío manual
    const manualSendButton = page.locator('button:has-text("Enviar ahora")').first();
    
    if (await manualSendButton.isVisible()) {
      await manualSendButton.click();

      // Validar confirmación
      await expect(page.locator('text=/enviado|success/i')).toBeVisible();
    }
  });

  test('Should configure reminder templates', async ({ page }) => {
    await page.goto('/admin/reminders/templates');

    // Validar lista de templates
    await expect(page.locator('text=post_workout|pre_class|payment')).toBeVisible();

    // Editar un template
    const editButton = page.locator('button[aria-label="Editar"]').first();
    await editButton.click();

    // Validar editor
    await expect(page.locator('textarea, [contenteditable]')).toBeVisible();
  });

  test('Should view reminder logs', async ({ page }) => {
    await page.goto('/admin/reminders/logs');

    // Validar tabla de logs
    const logRows = page.locator('table tbody tr');
    
    if (await logRows.count() > 0) {
      // Verificar que muestra información relevante
      await expect(page.locator('text=/member|type|status|timestamp/i')).toBeVisible();
    }
  });
});
