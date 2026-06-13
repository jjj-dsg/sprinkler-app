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

/** Returns a click helper that maps offsets into the map overlay's box. */
export async function overlayClicker(page: Page) {
  const overlay = page.getByTestId('overlay');
  const box = await overlay.boundingBox();
  if (!box) throw new Error('overlay not found');
  return (dx: number, dy: number) => page.mouse.click(box.x + dx, box.y + dy);
}

/** Draw a square zone of the active zone type and finish it. */
export async function drawSquareZone(page: Page) {
  const click = await overlayClicker(page);
  await click(80, 80);
  await click(260, 80);
  await click(260, 260);
  await click(80, 260);
  await page.getByRole('button', { name: /Finish/i }).click();
}
