/**
 * Analytics & Monetization Tracking
 *
 * Tracks user behavior, plan designs, monetization funnels.
 * Supports: Google Analytics 4, Segment, or custom HTTP endpoint.
 *
 * Future integrations:
 * - Stripe webhook for pro plan purchases
 * - Affiliate link tracking
 * - Mobile app cohort analysis (iOS/Android via Capacitor)
 */

interface AnalyticsEvent {
  event: string;
  properties?: Record<string, any>;
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
    // Batch events and flush periodically
    setInterval(() => this.flush(), this.flushInterval);

    // Flush on beforeunload to capture final events
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => this.flush());
    }
  }

  /**
   * Track a generic event
   */
  track(event: string, properties?: Record<string, any>) {
    this.queue.push({
      event,
      properties,
      timestamp: Date.now(),
    });

    if (this.queue.length >= this.batchSize) {
      this.flush();
    }
  }

  /**
   * Track monetization events (Pro Plan, Affiliate, Conversions)
   */
  trackMonetization(event: MonetizationEvent) {
    this.track(event.event, {
      ...event.properties,
      monetization_type: event.monetization_type,
      revenue_usd: event.revenue_usd,
    });
  }

  /**
   * Track plan design completion
   */
  trackPlanDesigned(zones: any[], heads: any[], savings: { dollarsSaved: number }) {
    this.track('plan_designed', {
      zones_count: zones.length,
      heads_count: heads.length,
      total_area_sqft: zones.reduce((sum, z) => sum + (z.pts?.length || 0), 0),
      estimated_annual_savings_usd: Math.round(savings.dollarsSaved),
    });
  }

  /**
   * Track Pro Plan button click (monetization funnel step 1)
   */
  trackProPlanInitiated(zones: any[], heads: any[], savings: { dollarsSaved: number }) {
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

  /**
   * Track Stripe payment success (monetization funnel step 2)
   * Called from Stripe webhook or client confirmation
   */
  trackProPlanPurchased(amount: number, planDetails: Record<string, any>) {
    this.trackMonetization({
      event: 'pro_plan_purchased',
      monetization_type: 'pro_plan',
      revenue_usd: amount / 100, // Stripe returns cents
      properties: planDetails,
    });
  }

  /**
   * Track affiliate link click (monetization funnel alternative)
   */
  trackAffiliateClick(brand: string, quantity: number, cost: number) {
    this.trackMonetization({
      event: 'affiliate_clicked',
      monetization_type: 'affiliate',
      revenue_usd: cost * 0.05, // Estimate 5% commission
      properties: {
        brand,
        quantity,
        total_usd: cost,
      },
    });
  }

  /**
   * Send batch of events to backend
   */
  private async flush() {
    if (this.queue.length === 0) return;

    const events = this.queue.splice(0, this.batchSize);

    // TODO: Replace with real analytics endpoint
    // For now, log to console in dev
    if (import.meta.env.DEV) {
      console.log('📊 Analytics Batch:', events);
    }

    // Production: send to your analytics backend
    if (import.meta.env.PROD) {
      try {
        // await fetch('/api/analytics', {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify({ events }),
        // });
      } catch (e) {
        console.error('Analytics flush failed:', e);
      }
    }
  }
}

export const analytics = new Analytics();
