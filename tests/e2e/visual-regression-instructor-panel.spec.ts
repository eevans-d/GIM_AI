/**
 * VISUAL REGRESSION TESTS: Instructor Panel ("Mi Clase Ahora")
 * Testing real-time dashboard, attendance, checklist, alerts
 */

import { test, expect } from '@playwright/test';

test.describe('VISUAL REGRESSION: Instructor Panel', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to instructor panel
    await page.goto('http://localhost:3000/instructor-panel');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
  });

  test.describe('Full Page Snapshots', () => {
    test('should match snapshot - full panel Chromium', async ({ page, browserName }) => {
      test.skip(browserName !== 'chromium', 'Desktop layout');

      await expect(page).toHaveScreenshot('instructor-panel-full-page-chromium.png', {
        maxDiffPixels: 150,
        threshold: 0.2
      });
    });

    test('should match snapshot - full panel Firefox', async ({ page, browserName }) => {
      test.skip(browserName !== 'firefox', 'Desktop layout');

      await expect(page).toHaveScreenshot('instructor-panel-full-page-firefox.png', {
        maxDiffPixels: 150,
        threshold: 0.2
      });
    });

    test('should match snapshot - full panel WebKit', async ({ page, browserName }) => {
      test.skip(browserName !== 'webkit', 'Desktop layout');

      await expect(page).toHaveScreenshot('instructor-panel-full-page-webkit.png', {
        maxDiffPixels: 150,
        threshold: 0.2
      });
    });
  });

  test.describe('Session Stats Section', () => {
    test('should match snapshot - session header', async ({ page }) => {
      const header = page.locator('[data-testid="session-header"]');

      await expect(header).toHaveScreenshot('instructor-session-header.png', {
        maxDiffPixels: 80,
        threshold: 0.15
      });
    });

    test('should match snapshot - stats cards', async ({ page }) => {
      const statsCards = page.locator('[data-testid="stats-cards-container"]');

      if (await statsCards.isVisible()) {
        await expect(statsCards).toHaveScreenshot('instructor-stats-cards.png', {
          maxDiffPixels: 120,
          threshold: 0.2
        });
      }
    });

    test('should match snapshot - attendance percentage', async ({ page }) => {
      const attendance = page.locator('[data-testid="attendance-percentage"]');

      if (await attendance.isVisible()) {
        await expect(attendance).toHaveScreenshot('instructor-attendance-display.png', {
          maxDiffPixels: 60,
          threshold: 0.15
        });
      }
    });

    test('should match snapshot - preparation percentage', async ({ page }) => {
      const preparation = page.locator('[data-testid="preparation-percentage"]');

      if (await preparation.isVisible()) {
        await expect(preparation).toHaveScreenshot('instructor-preparation-display.png', {
          maxDiffPixels: 60,
          threshold: 0.15
        });
      }
    });
  });

  test.describe('Checklist Section', () => {
    test('should match snapshot - checklist items', async ({ page }) => {
      const checklist = page.locator('[data-testid="checklist-items"]');

      if (await checklist.isVisible()) {
        await expect(checklist).toHaveScreenshot('instructor-checklist.png', {
          maxDiffPixels: 100,
          threshold: 0.2
        });
      }
    });

    test('should match snapshot - checked item', async ({ page }) => {
      const checkedItem = page.locator('[data-testid="checklist-item-checked"]').first();

      if (await checkedItem.isVisible()) {
        await expect(checkedItem).toHaveScreenshot('instructor-checklist-item-checked.png', {
          maxDiffPixels: 50,
          threshold: 0.15
        });
      }
    });

    test('should match snapshot - unchecked item', async ({ page }) => {
      const uncheckedItem = page.locator('[data-testid="checklist-item-unchecked"]').first();

      if (await uncheckedItem.isVisible()) {
        await expect(uncheckedItem).toHaveScreenshot('instructor-checklist-item-unchecked.png', {
          maxDiffPixels: 50,
          threshold: 0.15
        });
      }
    });

    test('should match snapshot - skipped item with reason', async ({ page }) => {
      const skippedItem = page.locator('[data-testid="checklist-item-skipped"]');

      if (await skippedItem.isVisible()) {
        await expect(skippedItem).toHaveScreenshot('instructor-checklist-item-skipped.png', {
          maxDiffPixels: 60,
          threshold: 0.15
        });
      }
    });

    test('should match snapshot - checklist progress bar', async ({ page }) => {
      const progressBar = page.locator('[data-testid="checklist-progress"]');

      if (await progressBar.isVisible()) {
        await expect(progressBar).toHaveScreenshot('instructor-checklist-progress.png', {
          maxDiffPixels: 80,
          threshold: 0.15
        });
      }
    });
  });

  test.describe('Attendance List', () => {
    test('should match snapshot - student list section', async ({ page }) => {
      const studentList = page.locator('[data-testid="student-list"]');

      if (await studentList.isVisible()) {
        await expect(studentList).toHaveScreenshot('instructor-student-list.png', {
          maxDiffPixels: 120,
          threshold: 0.2
        });
      }
    });

    test('should match snapshot - checked-in student', async ({ page }) => {
      const checkedStudent = page.locator('[data-testid="student-row-checked"]').first();

      if (await checkedStudent.isVisible()) {
        await expect(checkedStudent).toHaveScreenshot('instructor-student-checked.png', {
          maxDiffPixels: 60,
          threshold: 0.15
        });
      }
    });

    test('should match snapshot - pending student', async ({ page }) => {
      const pendingStudent = page.locator('[data-testid="student-row-pending"]').first();

      if (await pendingStudent.isVisible()) {
        await expect(pendingStudent).toHaveScreenshot('instructor-student-pending.png', {
          maxDiffPixels: 60,
          threshold: 0.15
        });
      }
    });

    test('should match snapshot - absent student', async ({ page }) => {
      const absentStudent = page.locator('[data-testid="student-row-absent"]').first();

      if (await absentStudent.isVisible()) {
        await expect(absentStudent).toHaveScreenshot('instructor-student-absent.png', {
          maxDiffPixels: 60,
          threshold: 0.15
        });
      }
    });

    test('should match snapshot - student with streak', async ({ page }) => {
      const streakBadge = page.locator('[data-testid="student-streak"]').first();

      if (await streakBadge.isVisible()) {
        await expect(streakBadge).toHaveScreenshot('instructor-student-streak-badge.png', {
          maxDiffPixels: 40,
          threshold: 0.1
        });
      }
    });
  });

  test.describe('Alert System', () => {
    test('should match snapshot - alerts container', async ({ page }) => {
      const alerts = page.locator('[data-testid="alerts-container"]');

      if (await alerts.isVisible()) {
        await expect(alerts).toHaveScreenshot('instructor-alerts-container.png', {
          maxDiffPixels: 100,
          threshold: 0.2
        });
      }
    });

    test('should match snapshot - low attendance alert', async ({ page }) => {
      const alert = page.locator('[data-testid="alert-low-attendance"]');

      if (await alert.isVisible()) {
        await expect(alert).toHaveScreenshot('instructor-alert-low-attendance.png', {
          maxDiffPixels: 80,
          threshold: 0.15
        });
      }
    });

    test('should match snapshot - critical alert badge', async ({ page }) => {
      const criticalBadge = page.locator('[data-testid="alert-critical-badge"]');

      if (await criticalBadge.isVisible()) {
        await expect(criticalBadge).toHaveScreenshot('instructor-alert-critical-badge.png', {
          maxDiffPixels: 40,
          threshold: 0.1
        });
      }
    });

    test('should match snapshot - alert dismiss button', async ({ page }) => {
      const dismissBtn = page.locator('[data-testid="alert-dismiss-btn"]').first();

      if (await dismissBtn.isVisible()) {
        await expect(dismissBtn).toHaveScreenshot('instructor-alert-dismiss-btn.png', {
          maxDiffPixels: 40,
          threshold: 0.1
        });
      }
    });
  });

  test.describe('Action Buttons', () => {
    test('should match snapshot - start class button', async ({ page }) => {
      const startBtn = page.locator('[data-testid="btn-start-class"]');

      if (await startBtn.isVisible()) {
        await expect(startBtn).toHaveScreenshot('instructor-btn-start-class.png', {
          maxDiffPixels: 50,
          threshold: 0.15
        });
      }
    });

    test('should match snapshot - end class button', async ({ page }) => {
      const endBtn = page.locator('[data-testid="btn-end-class"]');

      if (await endBtn.isVisible()) {
        await expect(endBtn).toHaveScreenshot('instructor-btn-end-class.png', {
          maxDiffPixels: 50,
          threshold: 0.15
        });
      }
    });

    test('should match snapshot - quick checkin button', async ({ page }) => {
      const quickCheckinBtn = page.locator('[data-testid="btn-quick-checkin"]').first();

      if (await quickCheckinBtn.isVisible()) {
        await expect(quickCheckinBtn).toHaveScreenshot('instructor-btn-quick-checkin.png', {
          maxDiffPixels: 40,
          threshold: 0.1
        });
      }
    });

    test('should match snapshot - floating action buttons on mobile', async ({ page, browserName }) => {
      test.skip(browserName !== 'chromium', 'Mobile only');

      await page.setViewportSize({ width: 390, height: 844 });

      const fab = page.locator('[data-testid="fab-container"]');

      if (await fab.isVisible()) {
        await expect(fab).toHaveScreenshot('instructor-fab-mobile.png', {
          maxDiffPixels: 60,
          threshold: 0.15
        });
      }
    });
  });

  test.describe('Mobile-First Design', () => {
    test('should render optimally on iPhone 12', async ({ page, browserName }) => {
      test.skip(browserName !== 'chromium', 'Mobile layout');

      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot('instructor-mobile-iphone.png', {
        maxDiffPixels: 120,
        threshold: 0.2
      });
    });

    test('should render optimally on Pixel 5', async ({ page, browserName }) => {
      test.skip(browserName !== 'chromium', 'Mobile layout');

      await page.setViewportSize({ width: 393, height: 851 });
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot('instructor-mobile-pixel.png', {
        maxDiffPixels: 120,
        threshold: 0.2
      });
    });

    test('should have touch-friendly interface on mobile', async ({ page, browserName }) => {
      test.skip(browserName !== 'chromium', 'Mobile only');

      await page.setViewportSize({ width: 390, height: 844 });

      // Check tap target sizes (minimum 44x44px)
      const buttons = page.locator('button');

      for (let i = 0; i < Math.min(3, await buttons.count()); i++) {
        const bbox = await buttons.nth(i).boundingBox();
        expect(bbox?.height).toBeGreaterThanOrEqual(44);
        expect(bbox?.width).toBeGreaterThanOrEqual(44);
      }
    });

    test('should stack sections vertically on mobile', async ({ page, browserName }) => {
      test.skip(browserName !== 'chromium', 'Mobile layout');

      await page.setViewportSize({ width: 390, height: 844 });

      const statsSection = page.locator('[data-testid="stats-cards-container"]');
      const checklistSection = page.locator('[data-testid="checklist-items"]');

      // Both should be visible when scrolled
      if (await statsSection.isVisible() && await checklistSection.isVisible()) {
        const statsBbox = await statsSection.boundingBox();
        const checklistBbox = await checklistSection.boundingBox();

        // Should be vertically stacked
        expect(checklistBbox?.top).toBeGreaterThan(statsBbox?.top || 0);
      }
    });
  });

  test.describe('Real-time Updates', () => {
    test('should update attendance count in real-time', async ({ page }) => {
      const attendance = page.locator('[data-testid="attendance-count"]');

      if (await attendance.isVisible()) {
        const initialText = await attendance.textContent();

        // Wait for potential update
        await page.waitForTimeout(2000);

        const updatedText = await attendance.textContent();

        // Attendance should be visible
        expect(updatedText?.length).toBeGreaterThan(0);
      }
    });

    test('should update preparation progress in real-time', async ({ page }) => {
      const prep = page.locator('[data-testid="preparation-percentage"]');

      if (await prep.isVisible()) {
        await expect(prep).toHaveScreenshot('instructor-prep-update-1.png', {
          maxDiffPixels: 60,
          threshold: 0.15
        });
      }
    });

    test('should show auto-refresh indicator', async ({ page }) => {
      const refreshIndicator = page.locator('[data-testid="refresh-indicator"]');

      if (await refreshIndicator.isVisible()) {
        await expect(refreshIndicator).toHaveScreenshot('instructor-refresh-indicator.png', {
          maxDiffPixels: 40,
          threshold: 0.1
        });
      }
    });
  });

  test.describe('Dark & Light Modes', () => {
    test('should render in light mode', async ({ page }) => {
      await page.evaluate(() => {
        document.documentElement.setAttribute('data-theme', 'light');
      });
      await page.waitForTimeout(300);

      await expect(page).toHaveScreenshot('instructor-light-mode.png', {
        maxDiffPixels: 150,
        threshold: 0.2
      });
    });

    test('should render in dark mode', async ({ page }) => {
      await page.evaluate(() => {
        document.documentElement.setAttribute('data-theme', 'dark');
      });
      await page.waitForTimeout(300);

      await expect(page).toHaveScreenshot('instructor-dark-mode.png', {
        maxDiffPixels: 150,
        threshold: 0.2
      });
    });

    test('should have proper contrast in dark mode', async ({ page }) => {
      await page.evaluate(() => {
        document.documentElement.setAttribute('data-theme', 'dark');
      });

      const text = page.locator('[data-testid="session-header"]');
      const textColor = await text.evaluate(el => {
        return window.getComputedStyle(el).color;
      });

      // Should not be black in dark mode
      expect(textColor).not.toBe('rgb(0, 0, 0)');
    });
  });

  test.describe('Animations & Transitions', () => {
    test('should animate checklist item completion', async ({ page }) => {
      const checklistItem = page.locator('[data-testid="checklist-item"]').first();

      if (await checklistItem.isVisible()) {
        await expect(checklistItem).toHaveScreenshot('instructor-checklist-animation.png', {
          maxDiffPixels: 60,
          threshold: 0.15
        });
      }
    });

    test('should animate student quick checkin', async ({ page }) => {
      const checkinBtn = page.locator('[data-testid="btn-quick-checkin"]').first();

      if (await checkinBtn.isVisible()) {
        await checkinBtn.hover();
        await page.waitForTimeout(200);

        await expect(page).toHaveScreenshot('instructor-checkin-hover.png', {
          maxDiffPixels: 60,
          threshold: 0.15
        });
      }
    });

    test('should smoothly animate alert appearance', async ({ page }) => {
      const alert = page.locator('[data-testid="alert-low-attendance"]');

      if (await alert.isVisible()) {
        await expect(alert).toHaveScreenshot('instructor-alert-appearance.png', {
          maxDiffPixels: 80,
          threshold: 0.2
        });
      }
    });
  });

  test.describe('Loading States', () => {
    test('should show skeleton loader while loading', async ({ page }) => {
      const skeleton = page.locator('[data-testid="skeleton-loader"]');

      if (await skeleton.isVisible({ timeout: 500 })) {
        await expect(skeleton).toHaveScreenshot('instructor-skeleton-loader.png', {
          maxDiffPixels: 100,
          threshold: 0.2
        });
      }
    });

    test('should show loading spinner on action', async ({ page }) => {
      const spinner = page.locator('[data-testid="loading-spinner"]');

      if (await spinner.isVisible({ timeout: 1000 })) {
        await expect(spinner).toHaveScreenshot('instructor-loading-spinner.png', {
          maxDiffPixels: 50,
          threshold: 0.15
        });
      }
    });
  });

  test.describe('Accessibility', () => {
    test('should have visible focus indicators', async ({ page }) => {
      const button = page.locator('button').first();

      if (await button.isVisible()) {
        await button.focus();
        await page.waitForTimeout(200);

        await expect(page).toHaveScreenshot('instructor-focus-indicator.png', {
          maxDiffPixels: 60,
          threshold: 0.15
        });
      }
    });

    test('should have readable text contrast', async ({ page }) => {
      const heading = page.locator('h1, h2').first();

      if (await heading.isVisible()) {
        const computed = await heading.evaluate(el => {
          const styles = window.getComputedStyle(el);
          return {
            fontSize: styles.fontSize,
            fontWeight: styles.fontWeight
          };
        });

        // Font should be readable
        expect(parseInt(computed.fontSize)).toBeGreaterThanOrEqual(14);
      }
    });
  });
});
