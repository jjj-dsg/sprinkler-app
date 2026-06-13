/**
 * Affiliate link helpers — the highest-probability-to-profit path for this app
 * (~100% margin, zero backend). Product URLs live in `data.ts`; the associate
 * tag is injected at runtime from the `VITE_AFFILIATE_TAG` env var, so going
 * live is a one-value Vercel env change with no code edit.
 */

/** Realistic blended commission for the Tools/Home-Improvement category (~3%). */
export const AFFILIATE_COMMISSION_RATE = 0.03;

const TAG = import.meta.env.VITE_AFFILIATE_TAG ?? '';

/** A URL still pointing at a placeholder host (not yet a real retailer link). */
export function isPlaceholderAffiliate(url: string): boolean {
  return /example\.com/i.test(url);
}

/** True once a real associate tag is configured (controls disclosure copy, etc.). */
export function hasAffiliateTag(): boolean {
  return TAG.length > 0;
}

/**
 * Append the Amazon Associates tag to a product/search URL. Idempotent and
 * safe: returns the original URL unchanged if no tag is set or the URL is
 * unparseable, so the app never ships a broken `?tag=`.
 */
export function buildAffiliateUrl(productUrl: string, tag: string = TAG): string {
  if (!tag) return productUrl;
  try {
    const u = new URL(productUrl);
    u.searchParams.set('tag', tag);
    return u.toString();
  } catch {
    return productUrl;
  }
}
