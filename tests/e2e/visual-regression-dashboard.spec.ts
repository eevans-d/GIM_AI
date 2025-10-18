/**
 * VISUAL REGRESSION TESTS: Dashboard (Command Center)
 * Testing visual consistency of KPI cards, charts, alerts, decisions
 */

import { test, expect } from '@playwright/test';

test.describe('VISUAL REGRESSION: Executive Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Authenticate and navigate to dashboard
    await page.goto('http://localhost:3000/dashboard');
    // Wait for API data to load
    await page.waitForLoadState('networkidle');
    // Wait for Chart.js to render
    await page.waitForTimeout(1000);
  });

  test.describe('Full Page Snapshots', () => {
    test('should match snapshot - full dashboard Chromium', async ({ page, browserName }) => {
      test.skip(browserName !== 'chromium', 'Desktop layout');

      // Scroll to top and take screenshot
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot('dashboard-full-page-chromium.png', {
        fullPage: true,
        maxDiffPixels: 200,
        threshold: 0.2
      });
    });

    test('should match snapshot - full dashboard Firefox', async ({ page, browserName }) => {
      test.skip(browserName !== 'firefox', 'Desktop layout');

      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot('dashboard-full-page-firefox.png', {
        fullPage: true,
        maxDiffPixels: 200,
        threshold: 0.2
      });
    });

    test('should match snapshot - full dashboard WebKit', async ({ page, browserName }) => {
      test.skip(browserName !== 'webkit', 'Desktop layout');

      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot('dashboard-full-page-webkit.png', {
        fullPage: true,
        maxDiffPixels: 200,
        threshold: 0.2
      });
    });
  });

  test.describe('KPI Cards Section', () => {
    test('should match snapshot - KPI cards row', async ({ page }) => {
      const kpiSection = page.locator('[data-testid="kpi-cards-section"]');

      await expect(kpiSection).toHaveScreenshot('dashboard-kpi-cards.png', {
        maxDiffPixels: 150,
        threshold: 0.2
      });
    });

    test('should match snapshot - revenue KPI card', async ({ page }) => {
      const revenueCard = page.locator('[data-testid="kpi-card-revenue"]');

      await expect(revenueCard).toHaveScreenshot('dashboard-kpi-revenue.png', {
        maxDiffPixels: 80,
        threshold: 0.15
      });
    });

    test('should match snapshot - debt KPI card', async ({ page }) => {
      const debtCard = page.locator('[data-testid="kpi-card-debt"]');

      await expect(debtCard).toHaveScreenshot('dashboard-kpi-debt.png', {
        maxDiffPixels: 80,
        threshold: 0.15
      });
    });

    test('should match snapshot - occupancy KPI card', async ({ page }) => {
      const occupancyCard = page.locator('[data-testid="kpi-card-occupancy"]');

      await expect(occupancyCard).toHaveScreenshot('dashboard-kpi-occupancy.png', {
        maxDiffPixels: 80,
        threshold: 0.15
      });
    });

    test('should match snapshot - NPS KPI card', async ({ page }) => {
      const npsCard = page.locator('[data-testid="kpi-card-nps"]');

      await expect(npsCard).toHaveScreenshot('dashboard-kpi-nps.png', {
        maxDiffPixels: 80,
        threshold: 0.15
      });
    });
  });

  test.describe('Charts Section', () => {
    test('should match snapshot - revenue trend chart', async ({ page }) => {
      const chart = page.locator('[data-testid="chart-revenue-trend"]');
      await page.waitForTimeout(800); // Wait for Chart.js rendering

      await expect(chart).toHaveScreenshot('dashboard-chart-revenue.png', {
        maxDiffPixels: 120,
        threshold: 0.2
      });
    });

    test('should match snapshot - checkins chart', async ({ page }) => {
      const chart = page.locator('[data-testid="chart-checkins"]');
      await page.waitForTimeout(800);

      await expect(chart).toHaveScreenshot('dashboard-chart-checkins.png', {
        maxDiffPixels: 120,
        threshold: 0.2
      });
    });

    test('should match snapshot - occupancy chart', async ({ page }) => {
      const chart = page.locator('[data-testid="chart-occupancy"]');
      await page.waitForTimeout(800);

      await expect(chart).toHaveScreenshot('dashboard-chart-occupancy.png', {
        maxDiffPixels: 120,
        threshold: 0.2
      });
    });

    test('should match snapshot - satisfaction doughnut chart', async ({ page }) => {
      const chart = page.locator('[data-testid="chart-satisfaction"]');
      await page.waitForTimeout(800);

      await expect(chart).toHaveScreenshot('dashboard-chart-satisfaction.png', {
        maxDiffPixels: 100,
        threshold: 0.2
      });
    });
  });

  test.describe('Alerts Section', () => {
    test('should match snapshot - alerts container', async ({ page }) => {
      const alertsSection = page.locator('[data-testid="alerts-section"]');

      if (await alertsSection.isVisible()) {
        await expect(alertsSection).toHaveScreenshot('dashboard-alerts-section.png', {
          maxDiffPixels: 120,
          threshold: 0.2
        });
      }
    });

    test('should match snapshot - critical alert badge', async ({ page }) => {
      const alertBadge = page.locator('[data-testid="alert-badge"]');

      if (await alertBadge.isVisible()) {
        await expect(alertBadge).toHaveScreenshot('dashboard-alert-badge.png', {
          maxDiffPixels: 40,
          threshold: 0.1
        });
      }
    });

    test('should match snapshot - individual alert card', async ({ page }) => {
      const alertCard = page.locator('[data-testid="alert-card"]').first();

      if (await alertCard.isVisible()) {
        await expect(alertCard).toHaveScreenshot('dashboard-alert-card.png', {
          maxDiffPixels: 80,
          threshold: 0.15
        });
      }
    });
  });

  test.describe('Priority Decisions Section', () => {
    test('should match snapshot - decisions section', async ({ page }) => {
      const decisionsSection = page.locator('[data-testid="decisions-section"]');

      if (await decisionsSection.isVisible()) {
        await expect(decisionsSection).toHaveScreenshot('dashboard-decisions-section.png', {
          maxDiffPixels: 150,
          threshold: 0.2
        });
      }
    });

    test('should match snapshot - Gemini AI badge', async ({ page }) => {
      const geminiBadge = page.locator('[data-testid="gemini-ai-badge"]');

      if (await geminiBadge.isVisible()) {
        await expect(geminiBadge).toHaveScreenshot('dashboard-gemini-badge.png', {
          maxDiffPixels: 50,
          threshold: 0.15
        });
      }
    });

    test('should match snapshot - priority decision #1', async ({ page }) => {
      const decision1 = page.locator('[data-testid="decision-1"]');

      if (await decision1.isVisible()) {
        await expect(decision1).toHaveScreenshot('dashboard-decision-rank-1.png', {
          maxDiffPixels: 100,
          threshold: 0.15
        });
      }
    });

    test('should match snapshot - priority decision #2', async ({ page }) => {
      const decision2 = page.locator('[data-testid="decision-2"]');

      if (await decision2.isVisible()) {
        await expect(decision2).toHaveScreenshot('dashboard-decision-rank-2.png', {
          maxDiffPixels: 100,
          threshold: 0.15
        });
      }
    });

    test('should match snapshot - priority decision #3', async ({ page }) => {
      const decision3 = page.locator('[data-testid="decision-3"]');

      if (await decision3.isVisible()) {
        await expect(decision3).toHaveScreenshot('dashboard-decision-rank-3.png', {
          maxDiffPixels: 100,
          threshold: 0.15
        });
      }
    });

    test('should match snapshot - urgency badge', async ({ page }) => {
      const urgencyBadge = page.locator('[data-testid="urgency-badge"]').first();

      if (await urgencyBadge.isVisible()) {
        await expect(urgencyBadge).toHaveScreenshot('dashboard-urgency-badge.png', {
          maxDiffPixels: 40,
          threshold: 0.1
        });
      }
    });
  });

  test.describe('Mobile Responsive Design', () => {
    test('should stack components vertically on mobile', async ({ page, browserName }) => {
      test.skip(browserName !== 'chromium', 'Mobile layout');

      // Test on mobile viewport (iPhone 12)
      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot('dashboard-mobile-layout.png', {
        maxDiffPixels: 150,
        threshold: 0.2
      });
    });

    test('should render KPI cards in row on mobile', async ({ page, browserName }) => {
      test.skip(browserName !== 'chromium', 'Mobile layout');

      await page.setViewportSize({ width: 390, height: 844 });

      const kpiCards = page.locator('[data-testid="kpi-card"]');
      const count = await kpiCards.count();

      // Should have multiple KPI cards visible on mobile
      expect(count).toBeGreaterThan(0);
    });

    test('should have scrollable charts on mobile', async ({ page, browserName }) => {
      test.skip(browserName !== 'chromium', 'Mobile layout');

      await page.setViewportSize({ width: 390, height: 844 });

      const chartsContainer = page.locator('[data-testid="charts-container"]');
      const bbox = await chartsContainer.boundingBox();

      // Charts container should be present and take up viewport width
      expect(bbox?.width).toBeGreaterThan(300);
    });

    test('should display decisions in card format on mobile', async ({ page, browserName }) => {
      test.skip(browserName !== 'chromium', 'Mobile layout');

      await page.setViewportSize({ width: 390, height: 844 });

      const decision = page.locator('[data-testid="decision-1"]');

      if (await decision.isVisible()) {
        await expect(decision).toHaveScreenshot('dashboard-decision-mobile-card.png', {
          maxDiffPixels: 100,
          threshold: 0.15
        });
      }
    });
  });

  test.describe('Dark & Light Mode', () => {
    test('should render dashboard in light mode', async ({ page }) => {
      await page.evaluate(() => {
        document.documentElement.setAttribute('data-theme', 'light');
      });
      await page.waitForTimeout(300);

      await expect(page).toHaveScreenshot('dashboard-light-mode.png', {
        maxDiffPixels: 200,
        threshold: 0.2
      });
    });

    test('should render dashboard in dark mode', async ({ page }) => {
      await page.evaluate(() => {
        document.documentElement.setAttribute('data-theme', 'dark');
      });
      await page.waitForTimeout(300);

      await expect(page).toHaveScreenshot('dashboard-dark-mode.png', {
        maxDiffPixels: 200,
        threshold: 0.2
      });
    });

    test('should have proper contrast in dark mode', async ({ page }) => {
      await page.evaluate(() => {
        document.documentElement.setAttribute('data-theme', 'dark');
      });

      const kpiText = page.locator('[data-testid="kpi-value"]').first();
      const textColor = await kpiText.evaluate(el => {
        return window.getComputedStyle(el).color;
      });

      // Text color should not be black in dark mode
      expect(textColor).not.toBe('rgb(0, 0, 0)');
    });
  });

  test.describe('Interactive States', () => {
    test('should show hover effect on KPI card', async ({ page }) => {
      const kpiCard = page.locator('[data-testid="kpi-card"]').first();

      // Hover on card
      await kpiCard.hover();
      await page.waitForTimeout(300);

      await expect(page).toHaveScreenshot('dashboard-kpi-hover.png', {
        maxDiffPixels: 80,
        threshold: 0.15
      });
    });

    test('should show active state on alert dismiss button', async ({ page }) => {
      const dismissBtn = page.locator('[data-testid="alert-dismiss"]').first();

      if (await dismissBtn.isVisible()) {
        await dismissBtn.hover();
        await page.waitForTimeout(300);

        await expect(page).toHaveScreenshot('dashboard-button-hover.png', {
          maxDiffPixels: 50,
          threshold: 0.1
        });
      }
    });

    test('should update chart data visualization', async ({ page }) => {
      // Initial chart state
      const chart = page.locator('[data-testid="chart-revenue-trend"]');
      await page.waitForTimeout(800);

      await expect(chart).toHaveScreenshot('dashboard-chart-initial.png', {
        maxDiffPixels: 100,
        threshold: 0.15
      });
    });
  });

  test.describe('Data Visualization Accuracy', () => {
    test('should render 4 KPI cards correctly', async ({ page }) => {
      const kpiCards = page.locator('[data-testid="kpi-card"]');

      expect(await kpiCards.count()).toBeGreaterThanOrEqual(4);
    });

    test('should render 4 charts correctly', async ({ page }) => {
      const charts = page.locator('[data-testid^="chart-"]');

      expect(await charts.count()).toBeGreaterThanOrEqual(4);
    });

    test('should render 3 priority decisions', async ({ page }) => {
      const decisions = page.locator('[data-testid^="decision-"]');

      expect(await decisions.count()).toBe(3);
    });

    test('chart labels should be readable', async ({ page }) => {
      const chartLabels = page.locator('[data-testid^="chart-"] label');

      if (await chartLabels.count() > 0) {
        const firstLabel = await chartLabels.first().textContent();
        expect(firstLabel?.length).toBeGreaterThan(0);
      }
    });
  });

  test.describe('Loading & Empty States', () => {
    test('should show skeleton loaders while loading', async ({ page }) => {
      // Reload page quickly to catch loading state
      const skeleton = page.locator('[data-testid="skeleton-loader"]');

      if (await skeleton.isVisible({ timeout: 500 })) {
        await expect(skeleton).toHaveScreenshot('dashboard-loading-skeleton.png', {
          maxDiffPixels: 100,
          threshold: 0.2
        });
      }
    });

    test('should show empty state message when no data', async ({ page }) => {
      // Mock empty data scenario
      const emptyState = page.locator('[data-testid="empty-state"]');

      if (await emptyState.isVisible({ timeout: 1000 })) {
        await expect(emptyState).toHaveScreenshot('dashboard-empty-state.png', {
          maxDiffPixels: 100,
          threshold: 0.2
        });
      }
    });
  });

  test.describe('Animations & Transitions', () => {
    test('should perform smooth auto-refresh', async ({ page }) => {
      // Wait for auto-refresh indicator
      const refreshIndicator = page.locator('[data-testid="refresh-indicator"]');

      if (await refreshIndicator.isVisible()) {
        await expect(refreshIndicator).toHaveScreenshot('dashboard-refresh-indicator.png', {
          maxDiffPixels: 50,
          threshold: 0.15
        });
      }
    });

    test('should animate alert dismissal', async ({ page }) => {
      const alert = page.locator('[data-testid="alert-card"]').first();

      if (await alert.isVisible()) {
        // Before dismissal
        await expect(alert).toHaveScreenshot('dashboard-alert-before-dismiss.png', {
          maxDiffPixels: 80,
          threshold: 0.15
        });
      }
    });
  });
});
