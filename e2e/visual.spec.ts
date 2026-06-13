import { test } from '@playwright/test';
import { forceGridMode, enterPlanner, drawSquareZone } from './helpers';

/**
 * Visual capture harness — NOT pass/fail assertions. Produces labeled PNGs in
 * screenshots/ for any key UI state so a human or an AI can eyeball the app
 * without running it manually. Run with: `npm run screenshots`.
 */
const shot = (name: string) => `screenshots/${name}.png`;

test.beforeEach(async ({ page }) => {
  await forceGridMode(page);
});

test('landing screen', async ({ page }) => {
  await page.goto('/');
  await page.screenshot({ path: shot('01-landing'), fullPage: true });
});

test('landing with self-test panel open', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Self-test:/i }).click();
  await page.screenshot({ path: shot('02-self-test-panel'), fullPage: true });
});

test('empty planner canvas', async ({ page }) => {
  await enterPlanner(page);
  await page.screenshot({ path: shot('03-planner-empty'), fullPage: true });
});

test('planner with a finished zone', async ({ page }) => {
  await enterPlanner(page);
  await drawSquareZone(page);
  await page.screenshot({ path: shot('04-zone-drawn'), fullPage: true });
});

test('planner with auto-placed heads and savings', async ({ page }) => {
  await enterPlanner(page);
  await drawSquareZone(page);
  await page.getByRole('button', { name: /AI Auto-Place/i }).click();
  await page.waitForTimeout(200);
  await page.screenshot({ path: shot('05-autoplaced-plan'), fullPage: true });
});

test('mobile viewport — planner', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await enterPlanner(page);
  await drawSquareZone(page);
  await page.getByRole('button', { name: /AI Auto-Place/i }).click();
  await page.waitForTimeout(200);
  await page.screenshot({ path: shot('06-mobile-plan'), fullPage: true });
});
