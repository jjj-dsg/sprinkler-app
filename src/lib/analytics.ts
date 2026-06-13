/**
 * Analytics & Monetization Tracking
 *
 * Batches events client-side and flushes to a backend endpoint (TODO: wire URL).
 * Funnel events: session_start, plan_designed, pro_plan_initiated,
 * pro_plan_purchased, affiliate_clicked.
 */
import { AFFILIATE_COMMISSION_RATE } from './affiliate';
import type { Head, Zone } from './types';

type Props = Record<string, unknown>;

interface AnalyticsEvent {
  event: string;
  properties?: Props;
  timestamp?: number;
}

interface MonetizationEvent extends AnalyticsEvent {
  monetization_type: 'pro_plan' | 'affiliate' | 'conversion';
  revenue_usd?: number;
}

class Analytics {
  private queue: AnalyticsEvent[] = [];
  private readonly batchSize = 10;
  private readonly flushInterval = 5000; // 5s

  constructor() {
    if (typeof window !== 'undefined') {
      window.setInterval(() => this.flush(), this.flushInterval);
      window.addEventListener('beforeunload', () => this.flush());
    }
  }

  /** Track a generic event. */
  track(event: string, properties?: Props) {
    this.queue.push({ event, properties, timestamp: Date.now() });
    if (this.queue.length >= this.batchSize) this.flush();
  }

  /** Track monetization events (Pro Plan, Affiliate, Conversions). */
  trackMonetization(event: MonetizationEvent) {
    this.track(event.event, {
      ...event.properties,
      monetization_type: event.monetization_type,
      revenue_usd: event.revenue_usd,
    });
  }

  /** Plan-design completion (≥1 zone and ≥1 head). */
  trackPlanDesigned(zones: Zone[], heads: Head[], savings: { dollarsSaved: number }, totalAreaSqft: number) {
    this.track('plan_designed', {
      zones_count: zones.length,
      heads_count: heads.length,
      total_area_sqft: Math.round(totalAreaSqft),
      estimated_annual_savings_usd: Math.round(savings.dollarsSaved),
    });
  }

  /** Pro Plan button click (monetization funnel step 1). */
  trackProPlanInitiated(zones: Zone[], heads: Head[], savings: { dollarsSaved: number }) {
    this.trackMonetization({
      event: 'pro_plan_initiated',
      monetization_type: 'pro_plan',
      properties: {
        zones_count: zones.length,
        heads_count: heads.length,
        estimated_savings_usd: Math.round(savings.dollarsSaved),
      },
    });
  }

  /** Stripe payment success (monetization funnel step 2). */
  trackProPlanPurchased(amountCents: number, planDetails: Props) {
    this.trackMonetization({
      event: 'pro_plan_purchased',
      monetization_type: 'pro_plan',
      revenue_usd: amountCents / 100,
      properties: planDetails,
    });
  }

  /** Affiliate link click. */
  trackAffiliateClick(brand: string, quantity: number, cost: number) {
    this.trackMonetization({
      event: 'affiliate_clicked',
      monetization_type: 'affiliate',
      revenue_usd: cost * AFFILIATE_COMMISSION_RATE,
      properties: { brand, quantity, total_usd: cost },
    });
  }

  /** Send a batch of events to the analytics backend. */
  private async flush() {
    if (this.queue.length === 0) return;
    const events = this.queue.splice(0, this.batchSize);

    if (import.meta.env.DEV) {
      console.log('📊 Analytics Batch:', events);
      return;
    }

    // TODO: POST `events` to the analytics endpoint once provisioned.
    void events;
  }
}

export const analytics = new Analytics();
