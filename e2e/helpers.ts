import type { Page } from '@playwright/test';

/**
 * Force the deterministic offline "grid mode": abort the Leaflet CDN, Google
 * tiles, and Nominatim so tests never depend on the network and the map falls
 * back to the SVG grid immediately (script onerror → status 'failed').
 */
export async function forceGridMode(page: Page) {
  await page.route(/cdnjs\.cloudflare\.com\/.*leaflet/i, (r) => r.abort());
  await page.route(/mt1\.google\.com/i, (r) => r.abort());
  await page.route(/nominatim\.openstreetmap\.org/i, (r) => r.abort());
}

/** Enter the planner from the landing screen (no address → uses chosen muni center). */
export async function enterPlanner(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: /Load My Property/i }).click();
  await page.getByText(/Draw your lawn/i).waitFor();
}

/**
 * Click at an offset inside the map overlay. Re-reads the overlay box on EVERY
 * call — the toolbar height changes between tools (the head-type row appears
 * only in Heads mode), which shifts the map; a cached box would click stale
 * coordinates.
 */
export async function clickOverlay(page: Page, dx: number, dy: number) {
  const box = await page.getByTestId('overlay').boundingBox();
  if (!box) throw new Error('overlay not found');
  await page.mouse.click(box.x + dx, box.y + dy);
}

/** Draw a square zone of the active zone type and finish it (leaves tool on 'head'). */
export async function drawSquareZone(page: Page) {
  await clickOverlay(page, 80, 80);
  await clickOverlay(page, 260, 80);
  await clickOverlay(page, 260, 260);
  await clickOverlay(page, 80, 260);
  await page.getByRole('button', { name: /Finish/i }).click();
}

/** Read the unambiguous "Sprinkler heads" count from the Property Breakdown. */
export async function headCount(page: Page): Promise<number> {
  const val = await page.getByText('Sprinkler heads', { exact: true })
    .locator('xpath=following-sibling::span').innerText();
  return parseInt(val, 10);
}

/**
 * Place a single head at an overlay offset (must be in Heads mode), then click
 * the same spot to select it so the Edit Head panel opens.
 */
export async function placeAndSelectHead(page: Page, dx: number, dy: number) {
  await clickOverlay(page, dx, dy); // empty spot → places a head
  await clickOverlay(page, dx, dy); // same spot → hits the dot → selects it
  await page.getByTestId('edit-head').waitFor();
}
