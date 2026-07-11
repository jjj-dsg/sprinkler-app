/**
 * GET /api/verify-checkout
 * Verifies a Stripe Checkout session ID server-side.
 * Required Vercel env vars:
 *   STRIPE_SECRET_KEY  — sk_live_… or sk_test_…
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    return res.status(503).json({ error: 'Stripe not configured — set STRIPE_SECRET_KEY in Vercel env.' });
  }

  const { session_id } = req.query;
  if (!session_id || typeof session_id !== 'string') {
    return res.status(400).json({ error: 'session_id query parameter is required and must be a string' });
  }

  const stripe = new Stripe(secret, { apiVersion: '2025-05-28.basil' });

  try {
    const session = await stripe.checkout.sessions.retrieve(session_id);
    if (session.payment_status === 'paid') {
      return res.status(200).json({ verified: true });
    } else {
      return res.status(200).json({ verified: false });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return res.status(200).json({ verified: false, error: msg });
  }
}
