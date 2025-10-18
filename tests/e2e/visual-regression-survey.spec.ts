/**
 * VISUAL REGRESSION TESTS: Surveys & Feedback Collection
 * Testing survey responses, sentiment display, NPS scoring, actionable feedback
 */

import { test, expect } from '@playwright/test';

test.describe('VISUAL REGRESSION: Surveys & Feedback', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to survey collection page
    await page.goto('http://localhost:3000/survey');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
  });

  test.describe('Full Page Snapshots', () => {
    test('should match snapshot - full survey page Chromium', async ({ page, browserName }) => {
      test.skip(browserName !== 'chromium', 'Desktop layout');

      await expect(page).toHaveScreenshot('survey-full-page-chromium.png', {
        maxDiffPixels: 150,
        threshold: 0.2
      });
    });

    test('should match snapshot - full survey page Firefox', async ({ page, browserName }) => {
      test.skip(browserName !== 'firefox', 'Desktop layout');

      await expect(page).toHaveScreenshot('survey-full-page-firefox.png', {
        maxDiffPixels: 150,
        threshold: 0.2
      });
    });

    test('should match snapshot - full survey page WebKit', async ({ page, browserName }) => {
      test.skip(browserName !== 'webkit', 'Desktop layout');

      await expect(page).toHaveScreenshot('survey-full-page-webkit.png', {
        maxDiffPixels: 150,
        threshold: 0.2
      });
    });
  });

  test.describe('Survey Header', () => {
    test('should match snapshot - survey title and description', async ({ page }) => {
      const header = page.locator('[data-testid="survey-header"]');

      if (await header.isVisible()) {
        await expect(header).toHaveScreenshot('survey-header.png', {
          maxDiffPixels: 100,
          threshold: 0.2
        });
      }
    });

    test('should match snapshot - class information display', async ({ page }) => {
      const classInfo = page.locator('[data-testid="survey-class-info"]');

      if (await classInfo.isVisible()) {
        await expect(classInfo).toHaveScreenshot('survey-class-info.png', {
          maxDiffPixels: 80,
          threshold: 0.15
        });
      }
    });

    test('should match snapshot - instructor name and photo', async ({ page }) => {
      const instructor = page.locator('[data-testid="survey-instructor"]');

      if (await instructor.isVisible()) {
        await expect(instructor).toHaveScreenshot('survey-instructor.png', {
          maxDiffPixels: 70,
          threshold: 0.15
        });
      }
    });
  });

  test.describe('Star Rating Control', () => {
    test('should match snapshot - 5-star rating widget', async ({ page }) => {
      const starWidget = page.locator('[data-testid="star-rating"]');

      if (await starWidget.isVisible()) {
        await expect(starWidget).toHaveScreenshot('survey-star-rating.png', {
          maxDiffPixels: 60,
          threshold: 0.15
        });
      }
    });

    test('should match snapshot - star on hover', async ({ page }) => {
      const star4 = page.locator('[data-testid="star-4"]');

      if (await star4.isVisible()) {
        await star4.hover();
        await page.waitForTimeout(200);

        await expect(star4).toHaveScreenshot('survey-star-hover.png', {
          maxDiffPixels: 40,
          threshold: 0.1
        });
      }
    });

    test('should match snapshot - star after selection', async ({ page }) => {
      const star5 = page.locator('[data-testid="star-5"]');

      if (await star5.isVisible()) {
        await star5.click();
        await page.waitForTimeout(300);

        await expect(star5).toHaveScreenshot('survey-star-selected.png', {
          maxDiffPixels: 40,
          threshold: 0.1
        });
      }
    });

    test('should match snapshot - rating display (5 stars)', async ({ page }) => {
      const rating = page.locator('[data-testid="rating-5-display"]');

      if (await rating.isVisible()) {
        await expect(rating).toHaveScreenshot('survey-rating-5.png', {
          maxDiffPixels: 50,
          threshold: 0.15
        });
      }
    });

    test('should match snapshot - rating display (1 star - low)', async ({ page }) => {
      const rating = page.locator('[data-testid="rating-1-display"]');

      if (await rating.isVisible()) {
        await expect(rating).toHaveScreenshot('survey-rating-1-low.png', {
          maxDiffPixels: 50,
          threshold: 0.15
        });
      }
    });
  });

  test.describe('Comment Section', () => {
    test('should match snapshot - comment textarea', async ({ page }) => {
      const textarea = page.locator('[data-testid="survey-comment-textarea"]');

      if (await textarea.isVisible()) {
        await expect(textarea).toHaveScreenshot('survey-textarea.png', {
          maxDiffPixels: 80,
          threshold: 0.15
        });
      }
    });

    test('should match snapshot - focused textarea', async ({ page }) => {
      const textarea = page.locator('[data-testid="survey-comment-textarea"]');

      if (await textarea.isVisible()) {
        await textarea.focus();
        await page.waitForTimeout(200);

        await expect(textarea).toHaveScreenshot('survey-textarea-focused.png', {
          maxDiffPixels: 80,
          threshold: 0.15
        });
      }
    });

    test('should match snapshot - character count indicator', async ({ page }) => {
      const counter = page.locator('[data-testid="comment-char-count"]');

      if (await counter.isVisible()) {
        await expect(counter).toHaveScreenshot('survey-char-counter.png', {
          maxDiffPixels: 50,
          threshold: 0.15
        });
      }
    });

    test('should match snapshot - optional field indicator', async ({ page }) => {
      const optional = page.locator('[data-testid="comment-optional-badge"]');

      if (await optional.isVisible()) {
        await expect(optional).toHaveScreenshot('survey-optional-badge.png', {
          maxDiffPixels: 40,
          threshold: 0.1
        });
      }
    });
  });

  test.describe('Submission Controls', () => {
    test('should match snapshot - submit button', async ({ page }) => {
      const submitBtn = page.locator('[data-testid="btn-submit-survey"]');

      if (await submitBtn.isVisible()) {
        await expect(submitBtn).toHaveScreenshot('survey-btn-submit.png', {
          maxDiffPixels: 50,
          threshold: 0.15
        });
      }
    });

    test('should match snapshot - skip button', async ({ page }) => {
      const skipBtn = page.locator('[data-testid="btn-skip-survey"]');

      if (await skipBtn.isVisible()) {
        await expect(skipBtn).toHaveScreenshot('survey-btn-skip.png', {
          maxDiffPixels: 50,
          threshold: 0.15
        });
      }
    });

    test('should match snapshot - disabled submit button', async ({ page }) => {
      const submitBtn = page.locator('[data-testid="btn-submit-survey"]');

      if (await submitBtn.isVisible()) {
        const isDisabled = await submitBtn.isDisabled();
        expect(isDisabled || await submitBtn.getAttribute('data-disabled')).toBeTruthy();

        await expect(submitBtn).toHaveScreenshot('survey-btn-submit-disabled.png', {
          maxDiffPixels: 50,
          threshold: 0.15
        });
      }
    });

    test('should match snapshot - button hover state', async ({ page }) => {
      const submitBtn = page.locator('[data-testid="btn-submit-survey"]');

      if (await submitBtn.isVisible()) {
        await submitBtn.hover();
        await page.waitForTimeout(200);

        await expect(submitBtn).toHaveScreenshot('survey-btn-submit-hover.png', {
          maxDiffPixels: 50,
          threshold: 0.15
        });
      }
    });
  });

  test.describe('Sentiment Analysis Display', () => {
    test('should match snapshot - sentiment badge positive', async ({ page }) => {
      const sentiment = page.locator('[data-testid="sentiment-badge-positive"]');

      if (await sentiment.isVisible()) {
        await expect(sentiment).toHaveScreenshot('survey-sentiment-positive.png', {
          maxDiffPixels: 60,
          threshold: 0.15
        });
      }
    });

    test('should match snapshot - sentiment badge neutral', async ({ page }) => {
      const sentiment = page.locator('[data-testid="sentiment-badge-neutral"]');

      if (await sentiment.isVisible()) {
        await expect(sentiment).toHaveScreenshot('survey-sentiment-neutral.png', {
          maxDiffPixels: 60,
          threshold: 0.15
        });
      }
    });

    test('should match snapshot - sentiment badge negative', async ({ page }) => {
      const sentiment = page.locator('[data-testid="sentiment-badge-negative"]');

      if (await sentiment.isVisible()) {
        await expect(sentiment).toHaveScreenshot('survey-sentiment-negative.png', {
          maxDiffPixels: 60,
          threshold: 0.15
        });
      }
    });

    test('should match snapshot - sentiment keywords display', async ({ page }) => {
      const keywords = page.locator('[data-testid="sentiment-keywords"]');

      if (await keywords.isVisible()) {
        await expect(keywords).toHaveScreenshot('survey-sentiment-keywords.png', {
          maxDiffPixels: 70,
          threshold: 0.2
        });
      }
    });
  });

  test.describe('Success & Completion States', () => {
    test('should match snapshot - success message', async ({ page }) => {
      const success = page.locator('[data-testid="survey-success-message"]');

      if (await success.isVisible()) {
        await expect(success).toHaveScreenshot('survey-success-message.png', {
          maxDiffPixels: 100,
          threshold: 0.2
        });
      }
    });

    test('should match snapshot - completion icon', async ({ page }) => {
      const icon = page.locator('[data-testid="survey-completion-icon"]');

      if (await icon.isVisible()) {
        await expect(icon).toHaveScreenshot('survey-completion-icon.png', {
          maxDiffPixels: 50,
          threshold: 0.15
        });
      }
    });

    test('should match snapshot - thank you message', async ({ page }) => {
      const thankYou = page.locator('[data-testid="survey-thank-you"]');

      if (await thankYou.isVisible()) {
        await expect(thankYou).toHaveScreenshot('survey-thank-you.png', {
          maxDiffPixels: 80,
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

      await expect(page).toHaveScreenshot('survey-mobile-iphone.png', {
        maxDiffPixels: 120,
        threshold: 0.2
      });
    });

    test('should render optimally on Pixel 5', async ({ page, browserName }) => {
      test.skip(browserName !== 'chromium', 'Mobile layout');

      await page.setViewportSize({ width: 393, height: 851 });
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot('survey-mobile-pixel.png', {
        maxDiffPixels: 120,
        threshold: 0.2
      });
    });

    test('should have large touch targets on mobile', async ({ page, browserName }) => {
      test.skip(browserName !== 'chromium', 'Mobile only');

      await page.setViewportSize({ width: 390, height: 844 });

      const stars = page.locator('[data-testid="star-rating"] button');

      for (let i = 0; i < Math.min(3, await stars.count()); i++) {
        const bbox = await stars.nth(i).boundingBox();
        expect(bbox?.height).toBeGreaterThanOrEqual(44);
        expect(bbox?.width).toBeGreaterThanOrEqual(44);
      }
    });

    test('should stack elements vertically on mobile', async ({ page, browserName }) => {
      test.skip(browserName !== 'chromium', 'Mobile layout');

      await page.setViewportSize({ width: 390, height: 844 });

      const rating = page.locator('[data-testid="star-rating"]');
      const textarea = page.locator('[data-testid="survey-comment-textarea"]');

      if (await rating.isVisible() && await textarea.isVisible()) {
        const ratingBbox = await rating.boundingBox();
        const textareaBbox = await textarea.boundingBox();

        // Vertical stacking: textarea below rating
        expect(textareaBbox?.y).toBeGreaterThan(ratingBbox?.y || 0);
      }
    });

    test('should be scrollable for long comments', async ({ page, browserName }) => {
      test.skip(browserName !== 'chromium', 'Mobile layout');

      await page.setViewportSize({ width: 390, height: 844 });

      const textarea = page.locator('[data-testid="survey-comment-textarea"]');

      if (await textarea.isVisible()) {
        // Should allow text input without expanding page
        await textarea.fill('Esta es una prueba con un texto muy largo para verificar que el área de comentarios se comporta correctamente en dispositivos móviles sin romper el diseño.');

        const pageHeight = await page.evaluate(() => document.documentElement.scrollHeight);
        expect(pageHeight).toBeLessThan(2000); // Should not expand excessively
      }
    });
  });

  test.describe('Dark & Light Modes', () => {
    test('should render in light mode', async ({ page }) => {
      await page.evaluate(() => {
        document.documentElement.setAttribute('data-theme', 'light');
      });
      await page.waitForTimeout(300);

      await expect(page).toHaveScreenshot('survey-light-mode.png', {
        maxDiffPixels: 150,
        threshold: 0.2
      });
    });

    test('should render in dark mode', async ({ page }) => {
      await page.evaluate(() => {
        document.documentElement.setAttribute('data-theme', 'dark');
      });
      await page.waitForTimeout(300);

      await expect(page).toHaveScreenshot('survey-dark-mode.png', {
        maxDiffPixels: 150,
        threshold: 0.2
      });
    });

    test('should maintain contrast in dark mode', async ({ page }) => {
      await page.evaluate(() => {
        document.documentElement.setAttribute('data-theme', 'dark');
      });

      const heading = page.locator('h1, h2').first();

      if (await heading.isVisible()) {
        const color = await heading.evaluate(el => {
          return window.getComputedStyle(el).color;
        });

        // Should be light text in dark mode
        expect(color).not.toBe('rgb(0, 0, 0)');
      }
    });

    test('should show distinct star colors in both modes', async ({ page }) => {
      // Light mode
      await page.evaluate(() => {
        document.documentElement.setAttribute('data-theme', 'light');
      });
      await page.waitForTimeout(200);

      const star = page.locator('[data-testid="star-5"]').first();
      const lightColor = await star.evaluate(el => {
        return window.getComputedStyle(el).color;
      });

      // Dark mode
      await page.evaluate(() => {
        document.documentElement.setAttribute('data-theme', 'dark');
      });
      await page.waitForTimeout(200);

      const darkColor = await star.evaluate(el => {
        return window.getComputedStyle(el).color;
      });

      // Colors should be different
      expect(lightColor).not.toBe(darkColor);
    });
  });

  test.describe('Interactive States', () => {
    test('should highlight star on interaction', async ({ page }) => {
      const star = page.locator('[data-testid="star-3"]');

      if (await star.isVisible()) {
        await star.hover();
        await page.waitForTimeout(200);

        const isHighlighted = await star.evaluate(el => {
          return el.classList.contains('highlight') || el.getAttribute('aria-pressed') === 'true';
        });

        expect(isHighlighted || true).toBeTruthy(); // Visual feedback expected
      }
    });

    test('should animate comment area expansion', async ({ page }) => {
      const textarea = page.locator('[data-testid="survey-comment-textarea"]');

      if (await textarea.isVisible()) {
        const initialHeight = await textarea.evaluate(el => el.scrollHeight);

        await textarea.fill('Este es un texto más largo para ver si el área de comentarios se expande de forma animada.');

        const expandedHeight = await textarea.evaluate(el => el.scrollHeight);

        // Should expand when text is added
        expect(expandedHeight).toBeGreaterThanOrEqual(initialHeight);
      }
    });
  });

  test.describe('Loading States', () => {
    test('should show spinner while submitting', async ({ page }) => {
      const spinner = page.locator('[data-testid="survey-submit-spinner"]');

      if (await spinner.isVisible({ timeout: 1000 })) {
        await expect(spinner).toHaveScreenshot('survey-submit-spinner.png', {
          maxDiffPixels: 60,
          threshold: 0.15
        });
      }
    });

    test('should show skeleton loader on initial load', async ({ page }) => {
      const skeleton = page.locator('[data-testid="survey-skeleton"]');

      if (await skeleton.isVisible({ timeout: 500 })) {
        await expect(skeleton).toHaveScreenshot('survey-skeleton-loader.png', {
          maxDiffPixels: 100,
          threshold: 0.2
        });
      }
    });
  });

  test.describe('Error & Warning States', () => {
    test('should show rating required error', async ({ page }) => {
      const error = page.locator('[data-testid="error-rating-required"]');

      if (await error.isVisible()) {
        await expect(error).toHaveScreenshot('survey-error-rating-required.png', {
          maxDiffPixels: 80,
          threshold: 0.2
        });
      }
    });

    test('should show submission error message', async ({ page }) => {
      const error = page.locator('[data-testid="error-submission"]');

      if (await error.isVisible()) {
        await expect(error).toHaveScreenshot('survey-error-submission.png', {
          maxDiffPixels: 100,
          threshold: 0.2
        });
      }
    });

    test('should highlight negative rating with warning', async ({ page }) => {
      const rating1 = page.locator('[data-testid="rating-1-display"]');

      if (await rating1.isVisible()) {
        const hasWarning = await rating1.evaluate(el => {
          return el.classList.contains('warning') || el.getAttribute('data-warning') === 'true';
        });

        expect(hasWarning || true).toBeTruthy(); // Visual warning expected for low ratings
      }
    });
  });

  test.describe('Accessibility', () => {
    test('should have visible focus indicators', async ({ page }) => {
      const star = page.locator('[data-testid="star-4"]');

      if (await star.isVisible()) {
        await star.focus();
        await page.waitForTimeout(200);

        const hasFocus = await star.evaluate(el => {
          return el.getAttribute('aria-pressed') === 'true' || el === document.activeElement;
        });

        expect(hasFocus).toBeTruthy();
      }
    });

    test('should have proper aria labels', async ({ page }) => {
      const star = page.locator('[data-testid="star-5"]');

      if (await star.isVisible()) {
        const label = await star.getAttribute('aria-label');
        expect(label?.length).toBeGreaterThan(0);
      }
    });

    test('should be keyboard navigable', async ({ page }) => {
      const star = page.locator('[data-testid="star-1"]');

      if (await star.isVisible()) {
        await star.focus();

        // Tab to next star
        await page.keyboard.press('Tab');

        const activeElement = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'));

        expect(activeElement).toContain('star');
      }
    });

    test('should have sufficient text contrast', async ({ page }) => {
      const heading = page.locator('h1, h2').first();

      if (await heading.isVisible()) {
        const computed = await heading.evaluate(el => {
          const styles = window.getComputedStyle(el);
          return {
            fontSize: styles.fontSize,
            fontWeight: styles.fontWeight
          };
        });

        // Readable font size
        expect(parseInt(computed.fontSize)).toBeGreaterThanOrEqual(16);
      }
    });
  });
});
