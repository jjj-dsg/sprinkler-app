import { test } from '@playwright/test';
import { forceGridMode, enterPlanner, drawSquareZone, clickOverlay } from './helpers';

/**
 * App Store Connect screenshot capture — 1290x2796 (iPhone 6.7"), which ASC
 * also accepts for the 6.5" slot, so one size covers the required iPhone slots.
 * NOT pass/fail assertions. Run with: `npm run store:screenshots`.
 * Output feeds fastlane's `screenshots` lane (fastlane/metadata/screenshots/en-US/).
 */
test.use({ viewport: { width: 1290, height: 2796 } });

const shot = (name: string) => `fastlane/metadata/screenshots/en-US/${name}.png`;

test.beforeEach(async ({ page }) => {
  await forceGridMode(page);
});

test('01 landing', async ({ page }) => {
  await page.goto('/');
  await page.screenshot({ path: shot('01_landing') });
});

test('02 planner with auto-placed heads and savings', async ({ page }) => {
  await enterPlanner(page);
  await drawSquareZone(page);
  await page.getByRole('button', { name: /AI Auto-Place/i }).click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: shot('02_auto_place_savings') });
});

test('03 pro plan blueprint export', async ({ page }) => {
  await enterPlanner(page);
  await drawSquareZone(page);
  await page.getByRole('button', { name: /AI Auto-Place/i }).click();
  await page.waitForTimeout(300);
  await clickOverlay(page, 170, 170);
  await page.screenshot({ path: shot('03_pro_plan') });
});
