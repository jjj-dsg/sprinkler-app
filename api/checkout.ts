/**
 * POST /api/checkout
 * Creates a Stripe Checkout session for the Pro Plan ($19).
 * Secret key never leaves the server. Only VITE_STRIPE_PK (publishable) is client-safe.
 *
 * Required Vercel env vars (server-side only, never VITE_ prefixed):
 *   STRIPE_SECRET_KEY  — sk_live_… or sk_test_…
 *   STRIPE_PRICE_ID    — price_… (the $19 Pro Plan price object from Stripe dashboard)
 *
 * Optional:
 *   STRIPE_SUCCESS_URL — override the redirect URL after successful payment
 *   STRIPE_CANCEL_URL  — override the redirect URL after cancellation
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';

const DEFAULT_ORIGIN = 'https://sprinkler-app-psi.vercel.app';

function resolveCheckoutOrigin(rawOrigin: string | string[] | undefined): string {
  const candidate = Array.isArray(rawOrigin) ? rawOrigin[0] : rawOrigin;
  if (!candidate) return DEFAULT_ORIGIN;
  try {
    const parsed = new URL(candidate);
    if (
      parsed.protocol === 'https:' &&
      (parsed.hostname === 'sprinkler-app-psi.vercel.app' ||
        /^[a-z0-9-]+(?:--[a-z0-9-]+)?\.vercel\.app$/i.test(parsed.hostname))
    ) {
      return parsed.origin;
    }
    if (
      (parsed.protocol === 'http:' || parsed.protocol === 'https:') &&
      (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1')
    ) {
      return parsed.origin;
    }
  } catch {
    // Fall back to canonical production origin on malformed header
  }
  return DEFAULT_ORIGIN;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const secret = process.env.STRIPE_SECRET_KEY;
  const priceId = process.env.STRIPE_PRICE_ID;

  if (!secret || !priceId) {
    return res.status(503).json({ error: 'Stripe not configured — set STRIPE_SECRET_KEY and STRIPE_PRICE_ID in Vercel env.' });
  }

  const stripe = new Stripe(secret, { apiVersion: '2026-05-27.dahlia' });

  const origin = resolveCheckoutOrigin(req.headers.origin);
  const baseSuccessUrl = process.env.STRIPE_SUCCESS_URL || `${origin}/?checkout=success`;
  const successUrl = baseSuccessUrl.includes('?')
    ? `${baseSuccessUrl}&session_id={CHECKOUT_SESSION_ID}`
    : `${baseSuccessUrl}?session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl  = process.env.STRIPE_CANCEL_URL  || `${origin}/?checkout=cancel`;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { product: 'pro_plan_pdf' },
    });

    if (!session.url) {
      return res.status(500).json({ error: 'Stripe returned no checkout URL' });
    }

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('[checkout] failed', err);
    return res.status(500).json({ error: 'Unable to create checkout session' });
  }
}
