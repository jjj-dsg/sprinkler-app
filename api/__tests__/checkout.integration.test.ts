// @vitest-environment node
/**
 * Real Stripe test-mode integration coverage for api/checkout.ts and
 * api/verify-checkout.ts — the exact server-side logic the 2026-07-10
 * checkout-return verification fix (see e2e/checkout-verify.spec.ts) protects
 * on the client side, but that Playwright suite mocks the network call, so it
 * never actually exercises the Stripe integration. This suite makes real
 * calls to Stripe's TEST-MODE API (no mocking) so a regression in session
 * creation or payment verification is caught here, not self-attested.
 *
 * Deliberately skipped unless STRIPE_SECRET_KEY_TEST + STRIPE_PRICE_ID_TEST
 * are set — these must be Stripe TEST-mode credentials only (sk_test_…,
 * price_… from a test-mode product), never the live keys used in
 * production. See docs/adr/0002-stripe-test-mode-payment-gate.md for the
 * reasoning and what upgrades this gate once those credentials exist.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import checkoutHandler from '../checkout';
import verifyHandler from '../verify-checkout';

const TEST_SECRET_KEY = process.env.STRIPE_SECRET_KEY_TEST;
const TEST_PRICE_ID = process.env.STRIPE_PRICE_ID_TEST;
const hasTestCreds = Boolean(TEST_SECRET_KEY && TEST_PRICE_ID);

if (TEST_SECRET_KEY?.startsWith('sk_live_')) {
  // Fail loudly rather than silently spend real money against a live key.
  throw new Error(
    'STRIPE_SECRET_KEY_TEST is a LIVE key (sk_live_…) — this suite runs on every push/PR ' +
      'and must only ever use Stripe TEST-mode credentials (sk_test_…).'
  );
}

function makeReq(overrides: Partial<VercelRequest>): VercelRequest {
  return { method: 'GET', headers: {}, query: {}, body: undefined, ...overrides } as VercelRequest;
}

interface FakeRes {
  statusCode: number;
  body: unknown;
}

function makeRes(): VercelResponse & FakeRes {
  const res: FakeRes & { status: (c: number) => VercelResponse; json: (b: unknown) => VercelResponse } = {
    statusCode: 200,
    body: undefined,
    status(code: number) {
      res.statusCode = code;
      return res as unknown as VercelResponse;
    },
    json(payload: unknown) {
      res.body = payload;
      return res as unknown as VercelResponse;
    },
  };
  return res as unknown as VercelResponse & FakeRes;
}

describe.skipIf(!hasTestCreds)('Stripe test-mode integration (real API, no mocks)', () => {
  const originalSecret = process.env.STRIPE_SECRET_KEY;
  const originalPrice = process.env.STRIPE_PRICE_ID;
  let stripe: Stripe;

  beforeAll(() => {
    process.env.STRIPE_SECRET_KEY = TEST_SECRET_KEY;
    process.env.STRIPE_PRICE_ID = TEST_PRICE_ID;
    stripe = new Stripe(TEST_SECRET_KEY as string, { apiVersion: '2026-05-27.dahlia' });
  });

  afterAll(() => {
    process.env.STRIPE_SECRET_KEY = originalSecret;
    process.env.STRIPE_PRICE_ID = originalPrice;
  });

  it('creates a real Stripe Checkout session for the $19 Pro Plan', async () => {
    const req = makeReq({ method: 'POST', headers: { origin: 'https://sprinkler-app-psi.vercel.app' } });
    const res = makeRes();

    await checkoutHandler(req, res);

    expect(res.statusCode).toBe(200);
    const body = res.body as { url?: string };
    expect(body.url).toMatch(/^https:\/\/checkout\.stripe\.com\//);
  });

  it('reports a freshly created (never paid) session as NOT verified', async () => {
    // Minted directly via the Stripe SDK (same real test-mode API the handler
    // uses) so the fixture doesn't depend on parsing a session id out of the
    // hosted Checkout URL, which is an implementation detail of Stripe's, not ours.
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: TEST_PRICE_ID as string, quantity: 1 }],
      success_url: 'https://sprinkler-app-psi.vercel.app/?checkout=success',
      cancel_url: 'https://sprinkler-app-psi.vercel.app/?checkout=cancel',
    });

    const req = makeReq({ method: 'GET', query: { session_id: session.id } });
    const res = makeRes();

    await verifyHandler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ verified: false });
  });

  it('reports a nonexistent session id as NOT verified (real Stripe 404, surfaced not thrown)', async () => {
    const req = makeReq({ method: 'GET', query: { session_id: 'cs_test_does_not_exist_00000000000000000000000000' } });
    const res = makeRes();

    await verifyHandler(req, res);

    expect(res.statusCode).toBe(200);
    const body = res.body as { verified: boolean; error?: string };
    expect(body.verified).toBe(false);
    expect(body.error).toBeTruthy();
  });
});

if (!hasTestCreds) {
  // Not a real test — makes the reason for the skip block above visible in CI
  // output instead of a silent "0 tests matched" style gap.
  describe('Stripe test-mode integration', () => {
    it.skip('SKIPPED: set STRIPE_SECRET_KEY_TEST + STRIPE_PRICE_ID_TEST (test-mode only) to run', () => {});
  });
}
