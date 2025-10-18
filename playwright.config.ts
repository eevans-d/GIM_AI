import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for GIM_AI E2E Testing
 * 
 * Propósito: Configurar Playwright para tests end-to-end
 * Incluye: Base URL, timeouts, screenshot capture, video recording
 */

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '*.spec.ts',
  
  // Timeout para cada test
  timeout: 30000,
  
  // Global timeout para todas las operaciones
  globalTimeout: 600000,
  
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 1,

  reporter: [
    ['html', { open: 'never' }],
    ['json', { outputFile: 'tests/e2e/results.json' }],
    ['junit', { outputFile: 'tests/e2e/results.xml' }],
    ['list']
  ],

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    /* Test against mobile viewports. */
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  // Ejecutar servidor antes de los tests
  webServer: {
    command: 'npm start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
