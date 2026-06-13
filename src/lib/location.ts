/** Geocoding helpers: resolve a city/state into a water-rate profile. */
import { MUNI, STATE_DEF, STATE_NAMES } from './data';
import type { RateProfile } from './types';

/** Nominatim `address` payload (only the fields we read). */
export type GeoAddress = {
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  county?: string;
  state?: string;
  ['ISO3166-2-lvl4']?: string;
};

/** Resolve a city + state into a rate profile: exact muni → state default → null. */
export function resolveMuni(city: string | null, st: string | null): RateProfile | null {
  const key = city && st ? `${city}, ${st}` : null;
  if (key && key in MUNI) return { name: key, ...MUNI[key] };
  if (st && st in STATE_DEF) {
    return { name: city ? `${city}, ${st}` : st, ...STATE_DEF[st], note: `${st} regional estimate.` };
  }
  return null;
}

/** Extract a normalized { city, st } from a Nominatim address object. */
export function parseGeo(a: GeoAddress | null | undefined): { city: string | null; st: string | null } {
  if (!a) return { city: null, st: null };
  return {
    city: a.city || a.town || a.village || a.municipality || a.county || null,
    st: a['ISO3166-2-lvl4']?.split('-')[1] || (a.state ? STATE_NAMES[a.state] : null) || null,
  };
}
