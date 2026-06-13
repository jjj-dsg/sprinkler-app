import { describe, it, expect } from 'vitest';
import { buildAffiliateUrl, isPlaceholderAffiliate, hasAffiliateTag, AFFILIATE_COMMISSION_RATE } from '../affiliate';
import { HEADS } from '../data';

describe('AFFILIATE_COMMISSION_RATE', () => {
  it('is a realistic single-digit home-improvement rate', () => {
    expect(AFFILIATE_COMMISSION_RATE).toBeGreaterThan(0);
    expect(AFFILIATE_COMMISSION_RATE).toBeLessThanOrEqual(0.1);
  });
});

describe('buildAffiliateUrl', () => {
  const base = 'https://www.amazon.com/s?k=Hunter+MP+Rotator';

  it('returns the URL unchanged when no tag is set', () => {
    expect(buildAffiliateUrl(base, '')).toBe(base);
  });
  it('appends the associate tag as a query param', () => {
    const u = new URL(buildAffiliateUrl(base, 'desertservices-20'));
    expect(u.searchParams.get('tag')).toBe('desertservices-20');
    expect(u.searchParams.get('k')).toBe('Hunter MP Rotator'); // preserves existing params
  });
  it('is idempotent — re-tagging replaces, never duplicates', () => {
    const once = buildAffiliateUrl(base, 'desertservices-20');
    const twice = buildAffiliateUrl(once, 'desertservices-20');
    expect(twice).toBe(once);
    expect((twice.match(/tag=/g) || []).length).toBe(1);
  });
  it('returns the input unchanged for an unparseable URL', () => {
    expect(buildAffiliateUrl('not a url', 'desertservices-20')).toBe('not a url');
  });
});

describe('placeholder + tag detection', () => {
  it('flags a placeholder host', () => expect(isPlaceholderAffiliate('https://example.com/aff/x')).toBe(true));
  it('does not flag a real retailer host', () => expect(isPlaceholderAffiliate('https://www.amazon.com/s?k=x')).toBe(false));
  it('reports tag presence from env (unset in test env)', () => expect(typeof hasAffiliateTag()).toBe('boolean'));
});

describe('affiliate data integrity (guards production)', () => {
  it('no head still points at a placeholder host', () => {
    Object.values(HEADS).forEach((h) => {
      expect(isPlaceholderAffiliate(h.affiliate), `${h.brand} → ${h.affiliate}`).toBe(false);
    });
  });
  it('every affiliate URL is a valid https link', () => {
    Object.values(HEADS).forEach((h) => {
      const u = new URL(h.affiliate);
      expect(u.protocol).toBe('https:');
    });
  });
});
