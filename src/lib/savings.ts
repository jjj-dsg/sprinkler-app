/** Water-usage and dollar-savings model (ET-based). */
import { PX_PER_FT } from './data';
import { polyAreaFt } from './geometry';
import type { RateProfile, Zone } from './types';

/** Split zone area (ft²) into turf vs. low-water cover at the given map scale. */
export function areaSplit(zones: Zone[], scale: number = PX_PER_FT) {
  const premium = zones
    .filter((z) => z.type === 'premium_lawn' || z.type === 'standard_lawn')
    .reduce((s, z) => s + polyAreaFt(z.pts, scale), 0);
  const low = zones
    .filter((z) => z.type === 'kurapia' || z.type === 'shade_bed')
    .reduce((s, z) => s + polyAreaFt(z.pts, scale), 0);
  return { premium, low, total: premium + low };
}

/**
 * Annual gallons. Turf uses full ET; low-water cover ~40% of it. `eff` toggles
 * water-saving heads (higher application efficiency) vs. conventional rotors.
 */
export function gallons(premium: number, low: number, et: number, eff: boolean): number {
  const turfEff = eff ? 0.8 : 0.55;
  const coverEff = eff ? 0.9 : 0.6;
  return (premium * (et / 12) * 7.48) / turfEff + (low * (et / 12) * 0.4 * 7.48) / coverEff;
}

/** Annual savings in gallons and dollars vs. conventional rotors. */
export function savings(zones: Zone[], m: Pick<RateProfile, 'et' | 'rate'>, scale: number = PX_PER_FT) {
  const { premium, low } = areaSplit(zones, scale);
  const effGal = gallons(premium, low, m.et, true);
  const baseGal = gallons(premium, low, m.et, false);
  const saved = Math.max(0, baseGal - effGal);
  return { effGal, saved, dollarsSaved: (saved / 1000) * m.rate, effCost: (effGal / 1000) * m.rate };
}
