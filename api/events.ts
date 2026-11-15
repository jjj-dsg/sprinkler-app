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

const MAX_EVENTS_PER_BATCH = 50;

function isValidEvent(value: unknown): value is AnalyticsEvent {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.name === 'string' &&
    candidate.name.trim().length > 0 &&
    candidate.name.length <= 100 &&
    typeof candidate.ts === 'number' &&
    Number.isFinite(candidate.ts) &&
    candidate.properties !== null &&
    typeof candidate.properties === 'object' &&
    !Array.isArray(candidate.properties)
  );
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const rawEvents = Array.isArray(req.body) ? req.body.slice(0, MAX_EVENTS_PER_BATCH) : [];
  const events: AnalyticsEvent[] = rawEvents.filter(isValidEvent);

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
