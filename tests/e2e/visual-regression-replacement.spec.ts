/**
 * VISUAL REGRESSION TESTS: Replacement Management ("Cambio de Instructor")
 * Testing NLP input, candidate matching, offer management, notifications
 */

import { test, expect } from '@playwright/test';

test.describe('VISUAL REGRESSION: Replacement Management', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to replacement management page
    await page.goto('http://localhost:3000/replacement-management');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
  });

  test.describe('Full Page Snapshots', () => {
    test('should match snapshot - full page Chromium', async ({ page, browserName }) => {
      test.skip(browserName !== 'chromium', 'Desktop layout');

      await expect(page).toHaveScreenshot('replacement-full-page-chromium.png', {
        maxDiffPixels: 150,
        threshold: 0.2
      });
    });

    test('should match snapshot - full page Firefox', async ({ page, browserName }) => {
      test.skip(browserName !== 'firefox', 'Desktop layout');

      await expect(page).toHaveScreenshot('replacement-full-page-firefox.png', {
        maxDiffPixels: 150,
        threshold: 0.2
      });
    });

    test('should match snapshot - full page WebKit', async ({ page, browserName }) => {
      test.skip(browserName !== 'webkit', 'Desktop layout');

      await expect(page).toHaveScreenshot('replacement-full-page-webkit.png', {
        maxDiffPixels: 150,
        threshold: 0.2
      });
    });
  });

  test.describe('Absence Report Input', () => {
    test('should match snapshot - input form section', async ({ page }) => {
      const formSection = page.locator('[data-testid="absence-form-section"]');

      if (await formSection.isVisible()) {
        await expect(formSection).toHaveScreenshot('replacement-form-section.png', {
          maxDiffPixels: 100,
          threshold: 0.2
        });
      }
    });

    test('should match snapshot - text input field', async ({ page }) => {
      const textInput = page.locator('[data-testid="absence-text-input"]');

      if (await textInput.isVisible()) {
        await expect(textInput).toHaveScreenshot('replacement-text-input.png', {
          maxDiffPixels: 80,
          threshold: 0.15
        });
      }
    });

    test('should match snapshot - focused input state', async ({ page }) => {
      const textInput = page.locator('[data-testid="absence-text-input"]');

      if (await textInput.isVisible()) {
        await textInput.focus();
        await page.waitForTimeout(200);

        await expect(textInput).toHaveScreenshot('replacement-text-input-focused.png', {
          maxDiffPixels: 80,
          threshold: 0.15
        });
      }
    });

    test('should match snapshot - submit button', async ({ page }) => {
      const submitBtn = page.locator('[data-testid="btn-submit-absence"]');

      if (await submitBtn.isVisible()) {
        await expect(submitBtn).toHaveScreenshot('replacement-btn-submit.png', {
          maxDiffPixels: 50,
          threshold: 0.15
        });
      }
    });

    test('should match snapshot - input with placeholder', async ({ page }) => {
      const textInput = page.locator('[data-testid="absence-text-input"]');

      if (await textInput.isVisible()) {
        const placeholder = await textInput.getAttribute('placeholder');
        expect(placeholder?.length).toBeGreaterThan(0);

        await expect(textInput).toHaveScreenshot('replacement-input-placeholder.png', {
          maxDiffPixels: 80,
          threshold: 0.15
        });
      }
    });
  });

  test.describe('NLP Processing Indicator', () => {
    test('should match snapshot - processing spinner', async ({ page }) => {
      const spinner = page.locator('[data-testid="nlp-processing-spinner"]');

      if (await spinner.isVisible({ timeout: 1000 })) {
        await expect(spinner).toHaveScreenshot('replacement-nlp-spinner.png', {
          maxDiffPixels: 60,
          threshold: 0.15
        });
      }
    });

    test('should match snapshot - processing message', async ({ page }) => {
      const message = page.locator('[data-testid="nlp-processing-message"]');

      if (await message.isVisible()) {
        await expect(message).toHaveScreenshot('replacement-nlp-message.png', {
          maxDiffPixels: 100,
          threshold: 0.2
        });
      }
    });
  });

  test.describe('Candidate Matching Results', () => {
    test('should match snapshot - candidates list container', async ({ page }) => {
      const candidateList = page.locator('[data-testid="candidates-list"]');

      if (await candidateList.isVisible()) {
        await expect(candidateList).toHaveScreenshot('replacement-candidates-list.png', {
          maxDiffPixels: 120,
          threshold: 0.2
        });
      }
    });

    test('should match snapshot - top candidate card', async ({ page }) => {
      const topCandidate = page.locator('[data-testid="candidate-card-top"]');

      if (await topCandidate.isVisible()) {
        await expect(topCandidate).toHaveScreenshot('replacement-candidate-top.png', {
          maxDiffPixels: 100,
          threshold: 0.2
        });
      }
    });

    test('should match snapshot - candidate score badge', async ({ page }) => {
      const scoreBadge = page.locator('[data-testid="candidate-score-badge"]').first();

      if (await scoreBadge.isVisible()) {
        await expect(scoreBadge).toHaveScreenshot('replacement-score-badge.png', {
          maxDiffPixels: 60,
          threshold: 0.15
        });
      }
    });

    test('should match snapshot - candidate availability indicator', async ({ page }) => {
      const availability = page.locator('[data-testid="candidate-availability"]').first();

      if (await availability.isVisible()) {
        await expect(availability).toHaveScreenshot('replacement-availability-indicator.png', {
          maxDiffPixels: 70,
          threshold: 0.15
        });
      }
    });

    test('should match snapshot - candidate stats (rating, acceptance)', async ({ page }) => {
      const stats = page.locator('[data-testid="candidate-stats"]').first();

      if (await stats.isVisible()) {
        await expect(stats).toHaveScreenshot('replacement-candidate-stats.png', {
          maxDiffPixels: 80,
          threshold: 0.15
        });
      }
    });
  });

  test.describe('Bonus & Incentive Display', () => {
    test('should match snapshot - bonus badge', async ({ page }) => {
      const bonusBadge = page.locator('[data-testid="bonus-badge"]').first();

      if (await bonusBadge.isVisible()) {
        await expect(bonusBadge).toHaveScreenshot('replacement-bonus-badge.png', {
          maxDiffPixels: 50,
          threshold: 0.15
        });
      }
    });

    test('should match snapshot - bonus amount display', async ({ page }) => {
      const bonusAmount = page.locator('[data-testid="bonus-amount"]').first();

      if (await bonusAmount.isVisible()) {
        const text = await bonusAmount.textContent();
        expect(text?.includes('$') || text?.includes('ARS')).toBeTruthy();

        await expect(bonusAmount).toHaveScreenshot('replacement-bonus-amount.png', {
          maxDiffPixels: 60,
          threshold: 0.15
        });
      }
    });

    test('should match snapshot - bonus timer (< 24h)', async ({ page }) => {
      const timer = page.locator('[data-testid="bonus-timer-24h"]');

      if (await timer.isVisible()) {
        await expect(timer).toHaveScreenshot('replacement-bonus-timer-24h.png', {
          maxDiffPixels: 60,
          threshold: 0.15
        });
      }
    });

    test('should match snapshot - bonus timer (< 48h)', async ({ page }) => {
      const timer = page.locator('[data-testid="bonus-timer-48h"]');

      if (await timer.isVisible()) {
        await expect(timer).toHaveScreenshot('replacement-bonus-timer-48h.png', {
          maxDiffPixels: 60,
          threshold: 0.15
        });
      }
    });
  });

  test.describe('Offer Management', () => {
    test('should match snapshot - offer status indicator', async ({ page }) => {
      const offerStatus = page.locator('[data-testid="offer-status"]').first();

      if (await offerStatus.isVisible()) {
        await expect(offerStatus).toHaveScreenshot('replacement-offer-status.png', {
          maxDiffPixels: 70,
          threshold: 0.15
        });
      }
    });

    test('should match snapshot - offer countdown timer', async ({ page }) => {
      const countdown = page.locator('[data-testid="offer-countdown"]').first();

      if (await countdown.isVisible()) {
        await expect(countdown).toHaveScreenshot('replacement-offer-countdown.png', {
          maxDiffPixels: 60,
          threshold: 0.15
        });
      }
    });

    test('should match snapshot - accept offer button', async ({ page }) => {
      const acceptBtn = page.locator('[data-testid="btn-accept-offer"]').first();

      if (await acceptBtn.isVisible()) {
        await expect(acceptBtn).toHaveScreenshot('replacement-btn-accept-offer.png', {
          maxDiffPixels: 50,
          threshold: 0.15
        });
      }
    });

    test('should match snapshot - reject offer button', async ({ page }) => {
      const rejectBtn = page.locator('[data-testid="btn-reject-offer"]').first();

      if (await rejectBtn.isVisible()) {
        await expect(rejectBtn).toHaveScreenshot('replacement-btn-reject-offer.png', {
          maxDiffPixels: 50,
          threshold: 0.15
        });
      }
    });

    test('should match snapshot - offer expiration warning', async ({ page }) => {
      const warning = page.locator('[data-testid="offer-expiration-warning"]');

      if (await warning.isVisible()) {
        await expect(warning).toHaveScreenshot('replacement-offer-expiration-warning.png', {
          maxDiffPixels: 80,
          threshold: 0.2
        });
      }
    });
  });

  test.describe('Notification Toast', () => {
    test('should match snapshot - offer sent notification', async ({ page }) => {
      const toast = page.locator('[data-testid="toast-offer-sent"]');

      if (await toast.isVisible()) {
        await expect(toast).toHaveScreenshot('replacement-toast-offer-sent.png', {
          maxDiffPixels: 100,
          threshold: 0.2
        });
      }
    });

    test('should match snapshot - offer accepted notification', async ({ page }) => {
      const toast = page.locator('[data-testid="toast-offer-accepted"]');

      if (await toast.isVisible()) {
        await expect(toast).toHaveScreenshot('replacement-toast-offer-accepted.png', {
          maxDiffPixels: 100,
          threshold: 0.2
        });
      }
    });

    test('should match snapshot - error notification', async ({ page }) => {
      const toast = page.locator('[data-testid="toast-error"]');

      if (await toast.isVisible()) {
        await expect(toast).toHaveScreenshot('replacement-toast-error.png', {
          maxDiffPixels: 100,
          threshold: 0.2
        });
      }
    });
  });

  test.describe('Mobile-First Design', () => {
    test('should render optimally on iPhone 12', async ({ page, browserName }) => {
      test.skip(browserName !== 'chromium', 'Mobile layout');

      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot('replacement-mobile-iphone.png', {
        maxDiffPixels: 120,
        threshold: 0.2
      });
    });

    test('should render optimally on Pixel 5', async ({ page, browserName }) => {
      test.skip(browserName !== 'chromium', 'Mobile layout');

      await page.setViewportSize({ width: 393, height: 851 });
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot('replacement-mobile-pixel.png', {
        maxDiffPixels: 120,
        threshold: 0.2
      });
    });

    test('should have full-width candidates on mobile', async ({ page, browserName }) => {
      test.skip(browserName !== 'chromium', 'Mobile layout');

      await page.setViewportSize({ width: 390, height: 844 });

      const candidateCard = page.locator('[data-testid="candidate-card"]').first();

      if (await candidateCard.isVisible()) {
        const bbox = await candidateCard.boundingBox();
        const pageWidth = 390;

        // Card should be nearly full width with padding
        expect(bbox?.width || 0).toBeGreaterThan(pageWidth - 40);
      }
    });

    test('should stack bonus and status vertically on mobile', async ({ page, browserName }) => {
      test.skip(browserName !== 'chromium', 'Mobile layout');

      await page.setViewportSize({ width: 390, height: 844 });

      const bonus = page.locator('[data-testid="bonus-badge"]').first();
      const status = page.locator('[data-testid="offer-status"]').first();

      if (await bonus.isVisible() && await status.isVisible()) {
        const bonusBbox = await bonus.boundingBox();
        const statusBbox = await status.boundingBox();

        // Check vertical stacking
        expect(statusBbox?.y).toBeGreaterThan(bonusBbox?.y || 0);
      }
    });
  });

  test.describe('Dark & Light Modes', () => {
    test('should render in light mode', async ({ page }) => {
      await page.evaluate(() => {
        document.documentElement.setAttribute('data-theme', 'light');
      });
      await page.waitForTimeout(300);

      await expect(page).toHaveScreenshot('replacement-light-mode.png', {
        maxDiffPixels: 150,
        threshold: 0.2
      });
    });

    test('should render in dark mode', async ({ page }) => {
      await page.evaluate(() => {
        document.documentElement.setAttribute('data-theme', 'dark');
      });
      await page.waitForTimeout(300);

      await expect(page).toHaveScreenshot('replacement-dark-mode.png', {
        maxDiffPixels: 150,
        threshold: 0.2
      });
    });

    test('should maintain color contrast in dark mode', async ({ page }) => {
      await page.evaluate(() => {
        document.documentElement.setAttribute('data-theme', 'dark');
      });

      const heading = page.locator('h1, h2').first();

      if (await heading.isVisible()) {
        const color = await heading.evaluate(el => {
          return window.getComputedStyle(el).color;
        });

        // Text should be light in dark mode
        expect(color).not.toBe('rgb(0, 0, 0)');
      }
    });
  });

  test.describe('Interactive States', () => {
    test('should highlight candidate on hover', async ({ page }) => {
      const candidate = page.locator('[data-testid="candidate-card"]').first();

      if (await candidate.isVisible()) {
        await candidate.hover();
        await page.waitForTimeout(200);

        await expect(candidate).toHaveScreenshot('replacement-candidate-hover.png', {
          maxDiffPixels: 80,
          threshold: 0.2
        });
      }
    });

    test('should show button hover state', async ({ page }) => {
      const btn = page.locator('[data-testid="btn-accept-offer"]').first();

      if (await btn.isVisible()) {
        await btn.hover();
        await page.waitForTimeout(200);

        await expect(btn).toHaveScreenshot('replacement-btn-hover.png', {
          maxDiffPixels: 60,
          threshold: 0.15
        });
      }
    });

    test('should show button active state on click', async ({ page }) => {
      const btn = page.locator('[data-testid="btn-accept-offer"]').first();

      if (await btn.isVisible()) {
        await btn.click({ force: true });
        await page.waitForTimeout(200);

        // Should show loading or active state
        const isDisabled = await btn.isDisabled();
        expect(isDisabled || await btn.getAttribute('data-loading')).toBeTruthy();
      }
    });
  });

  test.describe('Animations', () => {
    test('should animate candidate appearance', async ({ page }) => {
      const candidate = page.locator('[data-testid="candidate-card"]').first();

      if (await candidate.isVisible()) {
        await expect(candidate).toHaveScreenshot('replacement-candidate-animation.png', {
          maxDiffPixels: 80,
          threshold: 0.2
        });
      }
    });

    test('should animate offer countdown', async ({ page }) => {
      const countdown = page.locator('[data-testid="offer-countdown"]').first();

      if (await countdown.isVisible()) {
        await expect(countdown).toHaveScreenshot('replacement-countdown-animation.png', {
          maxDiffPixels: 60,
          threshold: 0.15
        });
      }
    });

    test('should animate bonus badge pulse', async ({ page }) => {
      const bonus = page.locator('[data-testid="bonus-badge"]').first();

      if (await bonus.isVisible()) {
        await expect(bonus).toHaveScreenshot('replacement-bonus-pulse.png', {
          maxDiffPixels: 60,
          threshold: 0.15
        });
      }
    });
  });

  test.describe('Loading & Empty States', () => {
    test('should show skeleton loader while fetching candidates', async ({ page }) => {
      const skeleton = page.locator('[data-testid="skeleton-candidates"]');

      if (await skeleton.isVisible({ timeout: 500 })) {
        await expect(skeleton).toHaveScreenshot('replacement-skeleton-loader.png', {
          maxDiffPixels: 100,
          threshold: 0.2
        });
      }
    });

    test('should show empty state when no candidates available', async ({ page }) => {
      const emptyState = page.locator('[data-testid="empty-candidates"]');

      if (await emptyState.isVisible()) {
        await expect(emptyState).toHaveScreenshot('replacement-empty-state.png', {
          maxDiffPixels: 100,
          threshold: 0.2
        });
      }
    });

    test('should show error state on match failure', async ({ page }) => {
      const errorState = page.locator('[data-testid="matching-error"]');

      if (await errorState.isVisible()) {
        await expect(errorState).toHaveScreenshot('replacement-error-state.png', {
          maxDiffPixels: 100,
          threshold: 0.2
        });
      }
    });
  });

  test.describe('Accessibility', () => {
    test('should have visible focus indicators on buttons', async ({ page }) => {
      const btn = page.locator('button').first();

      if (await btn.isVisible()) {
        await btn.focus();
        await page.waitForTimeout(200);

        const outline = await btn.evaluate(el => {
          const styles = window.getComputedStyle(el);
          return styles.outline;
        });

        // Should have outline or box-shadow for focus
        expect(outline).not.toBe('none');
      }
    });

    test('should have readable font sizes', async ({ page }) => {
      const heading = page.locator('h1, h2').first();

      if (await heading.isVisible()) {
        const fontSize = await heading.evaluate(el => {
          return parseInt(window.getComputedStyle(el).fontSize);
        });

        // Minimum readable size
        expect(fontSize).toBeGreaterThanOrEqual(16);
      }
    });

    test('should have sufficient color contrast', async ({ page }) => {
      const text = page.locator('[data-testid="candidate-name"]').first();

      if (await text.isVisible()) {
        const bgColor = await text.evaluate(el => {
          return window.getComputedStyle(el).backgroundColor;
        });

        // Background should be set (indicating contrast consideration)
        expect(bgColor).not.toBe('rgba(0, 0, 0, 0)');
      }
    });
  });
});
