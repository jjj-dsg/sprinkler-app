import { test, expect } from '@playwright/test';
import { forceGridMode, enterPlanner, drawSquareZone, clickOverlay, placeAndSelectHead, headCount } from './helpers';

/**
 * UI-feature E2E: the interactive surfaces not covered by the core-loop suite —
 * head select/edit panel, radius/arc controls, delete, erase tool, zone-type
 * switching, location selection, Pro Plan, and the self-test panel. Run in
 * deterministic offline grid mode. Maps to specs/SPRINKLER_PLANNER.spec.md.
 */
test.beforeEach(async ({ page }) => {
  await forceGridMode(page);
});

test.describe('Feature: Property location & water rates (landing)', () => {
  test('quick-select city updates the rate preview', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Phoenix' }).click();
    await expect(page.getByText(/\$4\.95\/1,000 gal/)).toBeVisible();
  });

  test('manual city override via the datalist input updates the rate', async ({ page }) => {
    await page.goto('/');
    await page.locator('#city').fill('Scottsdale, AZ');
    await expect(page.getByText(/\$6\.10\/1,000 gal/)).toBeVisible();
  });

  test('unknown city shows a regional-estimate note', async ({ page }) => {
    await page.goto('/');
    await page.locator('#city').fill('Random Town, ZZ');
    await expect(page.getByText(/regional est\./i)).toBeVisible();
  });
});

test.describe('Feature: Self-test regression panel', () => {
  test('expands to show individual passing checks', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Self-test:/i }).click();
    await expect(page.getByText('pip inside')).toBeVisible();
    await expect(page.getByText(/BDD: draw/i)).toBeVisible();
  });
});

test.describe('Feature: Manual head placement', () => {
  test('clicking inside a zone in Heads mode places a head', async ({ page }) => {
    await enterPlanner(page);
    await drawSquareZone(page); // tool switches to Heads
    expect(await headCount(page)).toBe(0);
    await clickOverlay(page, 170, 170);
    expect(await headCount(page)).toBe(1);
  });
});

test.describe('Feature: Head selection & editing', () => {
  test('selecting a head opens the Edit Head panel', async ({ page }) => {
    await enterPlanner(page);
    await drawSquareZone(page);
    await placeAndSelectHead(page, 170, 170);
    await expect(page.getByText(/Edit Head —/)).toBeVisible();
  });

  test('changing head type updates the panel + coverage', async ({ page }) => {
    await enterPlanner(page);
    await drawSquareZone(page);
    await placeAndSelectHead(page, 170, 170);
    await page.getByTestId('head-type-select').selectOption({ label: 'Gear Rotor' });
    await expect(page.getByText('Edit Head — Gear Rotor')).toBeVisible();
  });

  test('radius slider updates the radius label live', async ({ page }) => {
    await enterPlanner(page);
    await drawSquareZone(page);
    await placeAndSelectHead(page, 170, 170);
    await page.getByTestId('radius-slider').fill('33');
    await expect(page.getByText('Spray Radius: 33 ft')).toBeVisible();
  });

  test('choosing a partial arc reveals the spray-direction control', async ({ page }) => {
    await enterPlanner(page);
    await drawSquareZone(page);
    await placeAndSelectHead(page, 170, 170);
    await page.getByTestId('arc-select').selectOption('180');
    await expect(page.getByText('Arc: 180°')).toBeVisible();
    await expect(page.getByText(/Spray Direction:/)).toBeVisible();
  });

  test('Remove deletes the head and closes the panel', async ({ page }) => {
    await enterPlanner(page);
    await drawSquareZone(page);
    await placeAndSelectHead(page, 170, 170);
    expect(await headCount(page)).toBe(1);
    await page.getByRole('button', { name: /Remove/i }).click();
    await expect(page.getByTestId('edit-head')).toHaveCount(0);
    expect(await headCount(page)).toBe(0);
  });
});

test.describe('Feature: Erase tool', () => {
  test('erases a head', async ({ page }) => {
    await enterPlanner(page);
    await drawSquareZone(page);
    await placeAndSelectHead(page, 170, 170);
    expect(await headCount(page)).toBe(1);
    await page.getByRole('button', { name: 'Erase' }).click();
    await clickOverlay(page, 170, 170); // re-reads box (toolbar shrank) → hits the head
    expect(await headCount(page)).toBe(0);
  });

  test('erases a zone', async ({ page }) => {
    await enterPlanner(page);
    await drawSquareZone(page);
    await expect(page.getByText(/ft²/).first()).toBeVisible();
    await page.getByRole('button', { name: 'Erase' }).click();
    await clickOverlay(page, 170, 170); // inside the zone, not on a head
    await expect(page.getByText('Draw your lawn')).toBeVisible(); // empty-state prompt returns
  });
});

test.describe('Feature: Zone classification', () => {
  test('switching zone type before drawing classifies the new zone', async ({ page }) => {
    await enterPlanner(page);
    await page.getByRole('button', { name: 'Shade Bed / Trees' }).click();
    await drawSquareZone(page);
    await expect(page.getByText(/Shade Bed/).first()).toBeVisible();
  });
});

test.describe('Feature: Real-time savings', () => {
  test('adding a second zone increases annual savings', async ({ page }) => {
    await enterPlanner(page);
    await drawSquareZone(page);
    const read = async () => parseInt((await page.getByTestId('annual-savings').innerText()).replace(/[^0-9]/g, ''), 10);
    const first = await read();
    // Draw another zone in a different area of the canvas.
    await page.getByRole('button', { name: 'Draw Zone' }).click();
    await clickOverlay(page, 300, 300); await clickOverlay(page, 420, 300);
    await clickOverlay(page, 420, 420); await clickOverlay(page, 300, 420);
    await page.getByRole('button', { name: /Finish/i }).click();
    expect(await read()).toBeGreaterThan(first);
  });
});

test.describe('Feature: Pro Plan monetization', () => {
  test('card is visible and checkout fires the (placeholder) flow', async ({ page }) => {
    await enterPlanner(page);
    await drawSquareZone(page);
    await expect(page.getByText(/Pro Plan — \$19/)).toBeVisible();
    const dialog = page.waitForEvent('dialog');
    await page.getByRole('button', { name: 'Export Pro Plan' }).click();
    const d = await dialog;
    expect(d.message()).toMatch(/Stripe/i);
    await d.accept();
  });
});
