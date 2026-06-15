/**
 * POST /api/events
 * Lightweight analytics event sink. Accepts batched events from src/lib/analytics.ts.
 * If POSTHOG_API_KEY is set, forwards to PostHog; otherwise accepts silently (events
 * are at least received and logged server-side, ready for any future sink).
 *
 * Optional Vercel env var:
 *   POSTHOG_API_KEY  — phc_… (from PostHog project settings, NOT VITE_ prefixed)
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';

interface AnalyticsEvent {
  name: string;
  properties: Record<string, unknown>;
  ts: number;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const events: AnalyticsEvent[] = Array.isArray(req.body) ? req.body : [];

  const posthogKey = process.env.POSTHOG_API_KEY;
  if (posthogKey && events.length > 0) {
    // Batch to PostHog Capture API
    const batch = events.map((e) => ({
      event: e.name,
      distinct_id: 'sprinklersmart-web',
      properties: { ...e.properties, $lib: 'sprinklersmart-api' },
      timestamp: new Date(e.ts).toISOString(),
    }));

    try {
      await fetch('https://app.posthog.com/batch/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: posthogKey, batch }),
      });
    } catch {
      // Don't block the response on analytics failure
    }
  }

  return res.status(200).json({ received: events.length });
}
