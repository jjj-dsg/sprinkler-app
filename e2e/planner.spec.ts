import { test, expect } from '@playwright/test';
import { forceGridMode, enterPlanner, drawSquareZone, clickOverlay } from './helpers';

/**
 * BDD end-to-end coverage for the core planning loop, run against the built app
 * in offline grid mode (deterministic, no network). Maps to scenarios in
 * specs/SPRINKLER_PLANNER.spec.md.
 */
test.beforeEach(async ({ page }) => {
  await forceGridMode(page);
});

test.describe('Feature: Landing & property load', () => {
  test('shows the self-test badge and all checks pass', async ({ page }) => {
    // Panel is hidden from real users (reads as debug residue on a paid app's landing
    // screen) — opt in with ?debug=1 to exercise it, same as a support/QA session would.
    await page.goto('/?debug=1');
    const badge = page.getByRole('button', { name: /Self-test:/i });
    await expect(badge).toBeVisible();
    await expect(badge).toContainText(/Self-test: (\d+)\/\1 passing/); // N/N
  });

  test('loads the planner canvas and prompts to draw', async ({ page }) => {
    await enterPlanner(page);
    await expect(page.getByText(/Draw your lawn/i)).toBeVisible();
    await expect(page.getByText(/grid mode \(offline\)/i)).toBeVisible();
  });
});

test.describe('Feature: Zone drawing', () => {
  test('Finish is gated until 3+ points, then renders area', async ({ page }) => {
    await enterPlanner(page);
    await clickOverlay(page, 80, 80);
    await clickOverlay(page, 200, 80);
    await expect(page.getByText(/1 more/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Finish/i })).toHaveCount(0);
    await clickOverlay(page, 200, 200);
    await page.getByRole('button', { name: /Finish/i }).click();
    await expect(page.getByText(/ft²/).first()).toBeVisible();
  });
});

test.describe('Feature: Auto-place & savings', () => {
  test('draw → AI auto-place → heads render and savings is positive', async ({ page }) => {
    await enterPlanner(page);
    await drawSquareZone(page);
    await page.getByRole('button', { name: /AI Auto-Place/i }).click();

    // Heads render as coverage circles in the overlay.
    const dots = page.locator('[data-testid="overlay"] circle');
    await expect.poll(async () => dots.count()).toBeGreaterThan(0);

    // Savings card shows a non-zero dollar figure.
    const savings = page.getByTestId('annual-savings');
    await expect(savings).toBeVisible();
    await expect(savings).not.toHaveText('$0/yr');
  });

  test('Property Breakdown reflects placed heads', async ({ page }) => {
    await enterPlanner(page);
    await drawSquareZone(page);
    await page.getByRole('button', { name: /AI Auto-Place/i }).click();
    await expect(page.getByText('Sprinkler heads').locator('..')).toContainText(/[1-9]/);
  });

  test('Shop This Plan renders real (non-placeholder) affiliate links', async ({ page }) => {
    await enterPlanner(page);
    await drawSquareZone(page);
    await page.getByRole('button', { name: /AI Auto-Place/i }).click();
    const buy = page.getByRole('link', { name: /Buy/i }).first();
    await expect(buy).toBeVisible();
    const href = await buy.getAttribute('href');
    expect(href).toMatch(/amazon\.com/);
    expect(href).not.toMatch(/example\.com/);
    expect(await buy.getAttribute('rel')).toContain('sponsored');
  });
});

test.describe('Feature: Smart recommendations', () => {
  test('placing a gear rotor on premium turf raises a warning', async ({ page }) => {
    await enterPlanner(page);
    await drawSquareZone(page); // premium_lawn by default, tool switches to head
    // Select the Gear Rotor head type, then place one inside the zone.
    await page.getByRole('button', { name: /Gear Rotor/i }).click();
    await clickOverlay(page, 170, 170);
    await expect(page.getByText(/isn't ideal in Premium Lawn/i)).toBeVisible();
  });
});
