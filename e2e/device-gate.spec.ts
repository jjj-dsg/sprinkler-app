import { test, expect } from '@playwright/test';
import { forceGridMode, enterPlanner, drawSquareZone } from './helpers';

/**
 * Device scope (2026-07-19): SprinklerSmart is gated to tablet + desktop, matching
 * ../outdoor lighting (Lumio)'s same decision — phone support is a deliberate
 * follow-on, not shipped half-working. Regression coverage for src/components/DeviceGate.tsx.
 */
test.beforeEach(async ({ page }) => {
  await forceGridMode(page);
});

test.describe('Feature: Device gate', () => {
  test('blocks a phone-width viewport with a full-viewport gate screen', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await expect(page.getByText(/optimized for.*tablet and desktop/i)).toBeVisible();
    // The app underneath stays mounted (see the resize-recovery test below for why), so
    // "not visible" on the button would be meaningless — a covered element still reports
    // visible in the DOM. Prove occlusion instead: the gate overlay covers the full viewport.
    const box = await page.locator('div.fixed.inset-0.z-\\[99999\\]').boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(390);
    expect(box?.height).toBeGreaterThanOrEqual(844);
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

  // Regression: the gate used to conditionally return either the app OR the gate screen,
  // which unmounted <App/> the instant width crossed the breakpoint — wiping an in-progress,
  // un-persisted plan (drawn zones, placed heads) if a supported iPad/desktop user merely
  // narrowed their window and back. The gate now overlays on top instead of swapping out.
  test('resizing down and back up preserves in-progress plan state', async ({ page }) => {
    await page.setViewportSize({ width: 820, height: 1180 });
    await enterPlanner(page);
    await drawSquareZone(page);
    await expect(page.getByText(/ft²/).first()).toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByText(/optimized for.*tablet and desktop/i)).toBeVisible();

    await page.setViewportSize({ width: 820, height: 1180 });
    await expect(page.getByText(/optimized for.*tablet and desktop/i)).not.toBeVisible();
    await expect(page.getByText(/ft²/).first()).toBeVisible(); // zone survived, not reset
  });
});
