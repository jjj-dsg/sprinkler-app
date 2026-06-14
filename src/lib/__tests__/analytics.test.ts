import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { analytics } from '../analytics';
import { AFFILIATE_COMMISSION_RATE } from '../affiliate';
import type { Head, Zone } from '../types';

/**
 * Verifies the analytics funnel events fire with the right names + shaped
 * properties. We spy on the singleton's public `track` so the queue/flush
 * side-effects are bypassed.
 */
const zone: Zone = { type: 'premium_lawn', pts: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }] };
const head: Head = { id: 1, x: 0, y: 0, type: 'mp_rotator', radius: 25, zoneType: 'premium_lawn', arc: 360, dir: 0 };

describe('analytics events', () => {
  let spy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => { spy = vi.spyOn(analytics, 'track').mockImplementation(() => {}); });
  afterEach(() => spy.mockRestore());

  it('plan_designed carries zone/head counts and rounded savings', () => {
    analytics.trackPlanDesigned([zone], [head], { dollarsSaved: 123.7 }, 2500.4);
    expect(spy).toHaveBeenCalledWith('plan_designed', expect.objectContaining({
      zones_count: 1, heads_count: 1, total_area_sqft: 2500, estimated_annual_savings_usd: 124,
    }));
  });

  it('pro_plan_initiated fires with monetization metadata', () => {
    analytics.trackProPlanInitiated([zone], [head], { dollarsSaved: 200 });
    expect(spy).toHaveBeenCalledWith('pro_plan_initiated', expect.objectContaining({
      monetization_type: 'pro_plan', zones_count: 1, heads_count: 1,
    }));
  });

  it('affiliate_clicked computes revenue from the shared commission rate', () => {
    analytics.trackAffiliateClick('Hunter MP Rotator', 4, 26);
    const [event, props] = spy.mock.calls[0];
    expect(event).toBe('affiliate_clicked');
    expect(props).toMatchObject({ brand: 'Hunter MP Rotator', quantity: 4, total_usd: 26, monetization_type: 'affiliate' });
    expect(props?.revenue_usd).toBeCloseTo(26 * AFFILIATE_COMMISSION_RATE, 5);
  });

  it('pro_plan_purchased converts Stripe cents to dollars', () => {
    analytics.trackProPlanPurchased(1900, { plan: 'pro' });
    const [event, props] = spy.mock.calls[0];
    expect(event).toBe('pro_plan_purchased');
    expect(props?.revenue_usd).toBe(19);
  });
});
