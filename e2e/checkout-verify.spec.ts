import { test, expect } from '@playwright/test';

/**
 * Regression coverage for the checkout-return verification fix (2026-07-10): the
 * $19 Pro Plan PDF must NOT unlock from a bare `?checkout=success` URL — it has to
 * be confirmed against /api/verify-checkout first. Mocks the API since there's no
 * live Stripe backend in this test env; exercises the client-side gating logic.
 * Maps to docs/MOBILE_TESTFLIGHT.md's monetization-integrity note.
 */
test.describe('Feature: Checkout return verification', () => {
  test('a verified session shows the success toast', async ({ page }) => {
    await page.route('**/api/verify-checkout*', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ verified: true }) })
    );
    await page.goto('/?checkout=success&session_id=cs_test_verified');
    await expect(page.getByRole('alert')).toContainText(/payment complete/i);
  });

  test('an unverified session (payment not completed) does NOT show the success toast', async ({ page }) => {
    await page.route('**/api/verify-checkout*', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ verified: false }) })
    );
    await page.goto('/?checkout=success&session_id=cs_test_unpaid');
    await expect(page.getByRole('alert')).toContainText(/cancelled/i);
    await expect(page.getByRole('alert')).not.toContainText(/payment complete/i);
  });

  test('a success URL with no session_id (e.g. hand-typed) does NOT unlock the download', async ({ page }) => {
    await page.goto('/?checkout=success');
    await expect(page.getByRole('alert')).toContainText(/cancelled/i);
  });
});
