/** Static domain data: sprinkler heads, municipalities, zone types. */
import type { HeadKey, HeadSpec, Muni, ZoneType, ZoneTypeKey } from './types';

/** Pixels-per-foot fallback used when no live map scale is available (offline grid mode). */
export const PX_PER_FT = 3;

export const HEADS: Record<HeadKey, HeadSpec> = {
  mp_rotator: { name: 'MP Rotator (water-saving)', brand: 'Hunter MP Rotator', radius: 25, saving: true, color: '#0ea5e9', price: 6.5, affiliate: 'https://example.com/aff/hunter-mp' },
  popup_spray: { name: 'Pop-up Spray + HE nozzle', brand: 'Rain Bird 1804 + R-VAN', radius: 15, saving: true, color: '#22c55e', price: 4.0, affiliate: 'https://example.com/aff/rainbird-rvan' },
  rotor: { name: 'Gear Rotor', brand: 'Generic gear rotor', radius: 35, saving: false, color: '#f59e0b', price: 9.0, affiliate: 'https://example.com/aff/rotor' },
  drip: { name: 'Drip / Inline', brand: 'Netafim Inline Drip', radius: 8, saving: true, color: '#a855f7', price: 0.6, affiliate: 'https://example.com/aff/netafim' },
};

export const MUNI: Record<string, Muni> = {
  'Gilbert, AZ': { rate: 5.8, et: 63, style: 'premium', note: 'Tiered rates rising fast — irrigation hits top brackets.', center: [33.3528, -111.789] },
  'Phoenix, AZ': { rate: 4.95, et: 62, style: 'premium', note: 'High ET desert — savings huge.', center: [33.4484, -112.074] },
  'Scottsdale, AZ': { rate: 6.1, et: 64, style: 'premium', note: 'Premium lawns, strict water rules.', center: [33.4942, -111.9261] },
  'Chandler, AZ': { rate: 4.6, et: 63, style: 'premium', note: 'Lower valley rates, premium lawns.', center: [33.3062, -111.8413] },
  'Mesa, AZ': { rate: 4.4, et: 62, style: 'standard', note: 'Valley desert, moderate rates.', center: [33.4152, -111.8315] },
  'Las Vegas, NV': { rate: 5.4, et: 66, style: 'standard', note: 'Rebates for efficient heads.', center: [36.1699, -115.1398] },
  'Los Angeles, CA': { rate: 8.2, et: 50, style: 'premium', note: 'High rates — efficiency pays fast.', center: [34.0522, -118.2437] },
  'Other / Custom': { rate: 5.0, et: 50, style: 'standard', note: 'National averages.', center: [33.45, -112.07] },
};

export const STATE_DEF: Record<string, { rate: number; et: number; style: 'premium' | 'standard' }> = {
  AZ: { rate: 5.2, et: 62, style: 'premium' },
  CA: { rate: 7.5, et: 50, style: 'premium' },
  NV: { rate: 5.4, et: 66, style: 'standard' },
  TX: { rate: 6.0, et: 52, style: 'premium' },
  CO: { rate: 4.1, et: 44, style: 'standard' },
};

export const STATE_NAMES: Record<string, string> = {
  Arizona: 'AZ',
  California: 'CA',
  Nevada: 'NV',
  Texas: 'TX',
  Colorado: 'CO',
};

export const ZONE_TYPES: Record<ZoneTypeKey, ZoneType> = {
  premium_lawn: { label: 'Premium Lawn', color: '#16a34a', rec: ['mp_rotator', 'popup_spray'], avoid: ['rotor'] },
  standard_lawn: { label: 'Standard Lawn', color: '#65a30d', rec: ['mp_rotator', 'popup_spray'], avoid: [] },
  kurapia: { label: 'Kurapia / Low-Water Cover', color: '#0d9488', rec: ['drip', 'mp_rotator'], avoid: ['rotor'] },
  shade_bed: { label: 'Shade Bed / Trees', color: '#7c3aed', rec: ['drip'], avoid: ['popup_spray', 'rotor'] },
};
