import { test, expect } from '@playwright/test';
import { forceGridMode, enterPlanner } from './helpers';

/**
 * Device scope (2026-07-19): SprinklerSmart is gated to tablet + desktop, matching
 * ../outdoor lighting (Lumio)'s same decision — phone support is a deliberate
 * follow-on, not shipped half-working. Regression coverage for src/components/DeviceGate.tsx.
 */
test.beforeEach(async ({ page }) => {
  await forceGridMode(page);
});

test.describe('Feature: Device gate', () => {
  test('blocks a phone-width viewport with the gate screen, not the app', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await expect(page.getByText(/optimized for.*tablet and desktop/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Load My Property/i })).not.toBeVisible();
  });

  test('allows an iPad-width viewport through to the app', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 }); // gate breakpoint, inclusive
    await page.goto('/');
    await expect(page.getByRole('button', { name: /Load My Property/i })).toBeVisible();
    await expect(page.getByText(/optimized for.*tablet and desktop/i)).not.toBeVisible();
  });

  test('the planner still works at iPad width', async ({ page }) => {
    await page.setViewportSize({ width: 820, height: 1180 });
    await enterPlanner(page);
    await expect(page.getByText(/Draw your lawn/i)).toBeVisible();
  });

  test('resizing below the breakpoint mid-session shows the gate', async ({ page }) => {
    await enterPlanner(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByText(/optimized for.*tablet and desktop/i)).toBeVisible();
  });
});
