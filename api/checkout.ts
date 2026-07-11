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

  const origin = req.headers.origin || 'https://sprinkler-app-psi.vercel.app';
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
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return res.status(500).json({ error: msg });
  }
}
