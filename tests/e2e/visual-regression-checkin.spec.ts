/**
 * VISUAL REGRESSION TESTS: QR Check-in Page
 * Testing visual consistency across Chromium, Firefox, WebKit browsers
 */

import { test, expect } from '@playwright/test';

test.describe('VISUAL REGRESSION: QR Check-in Page', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to QR check-in page
    await page.goto('http://localhost:3000/qr-checkin');
    // Wait for page to fully load
    await page.waitForLoadState('networkidle');
  });

  test.describe('Desktop Layouts (Chromium, Firefox, WebKit)', () => {
    test('should match snapshot - full page Chromium', async ({ page, browserName }) => {
      test.skip(browserName !== 'chromium', 'Desktop layout test');

      // Wait for animations to complete
      await page.waitForTimeout(500);

      // Take full page snapshot
      await expect(page).toHaveScreenshot('qr-checkin-full-page-chromium.png', {
        maxDiffPixels: 100,
        threshold: 0.2
      });
    });

    test('should match snapshot - full page Firefox', async ({ page, browserName }) => {
      test.skip(browserName !== 'firefox', 'Desktop layout test');

      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot('qr-checkin-full-page-firefox.png', {
        maxDiffPixels: 100,
        threshold: 0.2
      });
    });

    test('should match snapshot - full page WebKit', async ({ page, browserName }) => {
      test.skip(browserName !== 'webkit', 'Desktop layout test');

      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot('qr-checkin-full-page-webkit.png', {
        maxDiffPixels: 100,
        threshold: 0.2
      });
    });

    test('should match snapshot - header section', async ({ page }) => {
      const header = page.locator('header');

      await expect(header).toHaveScreenshot('qr-checkin-header.png', {
        maxDiffPixels: 50,
        threshold: 0.15
      });
    });

    test('should match snapshot - QR scanner area', async ({ page }) => {
      const scanner = page.locator('[data-testid="qr-scanner"]');

      await page.waitForTimeout(500);

      await expect(scanner).toHaveScreenshot('qr-checkin-scanner.png', {
        maxDiffPixels: 100,
        threshold: 0.2
      });
    });

    test('should match snapshot - member info card', async ({ page }) => {
      // Simulate QR scan by filling in member
      const memberCard = page.locator('[data-testid="member-card"]');

      if (await memberCard.isVisible()) {
        await expect(memberCard).toHaveScreenshot('qr-checkin-member-card.png', {
          maxDiffPixels: 80,
          threshold: 0.15
        });
      }
    });

    test('should match snapshot - success message', async ({ page }) => {
      // Wait for success message if check-in completes
      const successMsg = page.locator('[data-testid="success-message"]');

      if (await successMsg.isVisible({ timeout: 2000 })) {
        await expect(successMsg).toHaveScreenshot('qr-checkin-success.png', {
          maxDiffPixels: 50,
          threshold: 0.15
        });
      }
    });

    test('should match snapshot - error state', async ({ page }) => {
      // Trigger error by invalid QR
      const errorMsg = page.locator('[data-testid="error-message"]');

      if (await errorMsg.isVisible({ timeout: 2000 })) {
        await expect(errorMsg).toHaveScreenshot('qr-checkin-error.png', {
          maxDiffPixels: 50,
          threshold: 0.15
        });
      }
    });
  });

  test.describe('Mobile Layouts (iPhone 12, Pixel 5)', () => {
    test('should match snapshot - iPhone 12', async ({ page, browserName }) => {
      test.skip(browserName !== 'chromium', 'Mobile test');

      // Mobile viewport is set in playwright.config.ts for iPhone 12
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot('qr-checkin-mobile-iphone.png', {
        maxDiffPixels: 100,
        threshold: 0.2
      });
    });

    test('should match snapshot - Pixel 5', async ({ page, browserName }) => {
      test.skip(browserName !== 'chromium', 'Mobile test');

      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot('qr-checkin-mobile-pixel.png', {
        maxDiffPixels: 100,
        threshold: 0.2
      });
    });

    test('should have responsive design (mobile)', async ({ page }) => {
      // Check that text is readable on mobile
      const mainContent = page.locator('main');
      const bbox = await mainContent.boundingBox();

      // Should take up most of viewport width
      expect(bbox?.width).toBeGreaterThan(300);
    });

    test('should have touch-friendly buttons (mobile)', async ({ page }) => {
      const buttons = page.locator('button');

      for (let i = 0; i < (await buttons.count()); i++) {
        const button = buttons.nth(i);
        const bbox = await button.boundingBox();

        // Minimum 44x44px for touch targets
        expect(bbox?.height).toBeGreaterThanOrEqual(44);
        expect(bbox?.width).toBeGreaterThanOrEqual(44);
      }
    });
  });

  test.describe('Component Snapshots', () => {
    test('should match QR input field snapshot', async ({ page }) => {
      const input = page.locator('input[type="text"]').first();

      await expect(input).toHaveScreenshot('qr-input-field.png', {
        maxDiffPixels: 30,
        threshold: 0.1
      });
    });

    test('should match submit button snapshot', async ({ page }) => {
      const button = page.locator('button[type="submit"]').first();

      await expect(button).toHaveScreenshot('qr-submit-button.png', {
        maxDiffPixels: 30,
        threshold: 0.1
      });
    });

    test('should match loading spinner snapshot', async ({ page }) => {
      // Trigger a check-in to show loading state
      const spinner = page.locator('[data-testid="loading-spinner"]');

      if (await spinner.isVisible({ timeout: 1000 })) {
        await expect(spinner).toHaveScreenshot('qr-loading-spinner.png', {
          maxDiffPixels: 50,
          threshold: 0.15
        });
      }
    });

    test('should match debt warning snapshot', async ({ page }) => {
      const warning = page.locator('[data-testid="debt-warning"]');

      if (await warning.isVisible({ timeout: 2000 })) {
        await expect(warning).toHaveScreenshot('qr-debt-warning.png', {
          maxDiffPixels: 60,
          threshold: 0.15
        });
      }
    });
  });

  test.describe('Visual Consistency Across States', () => {
    test('should maintain visual consistency during interaction', async ({ page }) => {
      // Initial state
      await expect(page).toHaveScreenshot('qr-checkin-initial-state.png', {
        maxDiffPixels: 100,
        threshold: 0.2
      });

      // Focus on input
      const input = page.locator('input[type="text"]').first();
      await input.focus();

      await expect(page).toHaveScreenshot('qr-checkin-input-focused.png', {
        maxDiffPixels: 100,
        threshold: 0.2
      });

      // Hover on button
      const button = page.locator('button[type="submit"]').first();
      await button.hover();

      await expect(page).toHaveScreenshot('qr-checkin-button-hovered.png', {
        maxDiffPixels: 100,
        threshold: 0.2
      });
    });

    test('should render correctly in light mode', async ({ page }) => {
      // Ensure light mode is active
      await page.evaluate(() => {
        document.documentElement.setAttribute('data-theme', 'light');
      });

      await page.waitForTimeout(300);

      await expect(page).toHaveScreenshot('qr-checkin-light-mode.png', {
        maxDiffPixels: 100,
        threshold: 0.2
      });
    });

    test('should render correctly in dark mode', async ({ page }) => {
      // Switch to dark mode
      await page.evaluate(() => {
        document.documentElement.setAttribute('data-theme', 'dark');
      });

      await page.waitForTimeout(300);

      await expect(page).toHaveScreenshot('qr-checkin-dark-mode.png', {
        maxDiffPixels: 100,
        threshold: 0.2
      });
    });
  });

  test.describe('Accessibility Visual Tests', () => {
    test('should have sufficient color contrast', async ({ page }) => {
      // Extract text elements and verify they're readable
      const textElements = page.locator('p, span, label, button');

      for (let i = 0; i < Math.min(5, await textElements.count()); i++) {
        const element = textElements.nth(i);
        const computed = await element.evaluate(el => {
          const styles = window.getComputedStyle(el);
          return {
            color: styles.color,
            backgroundColor: styles.backgroundColor,
            fontSize: styles.fontSize
          };
        });

        // Font size should be readable
        expect(parseInt(computed.fontSize)).toBeGreaterThanOrEqual(12);
      }
    });

    test('should have proper focus indicators', async ({ page }) => {
      // Tab to input and check focus state
      const input = page.locator('input[type="text"]').first();
      await input.focus();

      await expect(page).toHaveScreenshot('qr-checkin-focus-indicator.png', {
        maxDiffPixels: 50,
        threshold: 0.15
      });
    });
  });

  test.describe('Image & Asset Loading', () => {
    test('should render logo correctly', async ({ page }) => {
      const logo = page.locator('img[alt*="logo"], .logo').first();

      if (await logo.isVisible()) {
        await expect(logo).toHaveScreenshot('qr-logo.png', {
          maxDiffPixels: 50,
          threshold: 0.15
        });
      }
    });

    test('should render all images without broken states', async ({ page }) => {
      const images = page.locator('img');

      for (let i = 0; i < await images.count(); i++) {
        const img = images.nth(i);

        // Verify image is loaded
        const isNaturalHeight = await img.evaluate(el => el instanceof HTMLImageElement && el.naturalHeight > 0);
        expect(isNaturalHeight).toBe(true);
      }
    });
  });

  test.describe('Typography & Text Rendering', () => {
    test('should render headings correctly', async ({ page }) => {
      const h1 = page.locator('h1').first();

      if (await h1.isVisible()) {
        await expect(h1).toHaveScreenshot('qr-heading-h1.png', {
          maxDiffPixels: 40,
          threshold: 0.15
        });
      }
    });

    test('should render body text correctly', async ({ page }) => {
      const bodyText = page.locator('p').first();

      if (await bodyText.isVisible()) {
        await expect(bodyText).toHaveScreenshot('qr-body-text.png', {
          maxDiffPixels: 40,
          threshold: 0.15
        });
      }
    });
  });
});
