/** Water-usage and dollar-savings model (ET-based). */
import { HEADS, PX_PER_FT } from './data';
import { pipPx, pipPxInclusive, polyAreaFt } from './geometry';
import type { Head, RateProfile, Zone } from './types';

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
 * Fraction (0–1) of a zone's area actually reached by placed heads assigned to it
 * (first-zone-match, boundary-tolerant — same assignment rule buildValveSchedule's
 * PDF output uses). Sampled on a 2ft grid using each head's real coverage radius.
 * No heads in the zone → 0, so an empty plan reads $0 instead of a zone-size guess.
 */
export function coverageFraction(zone: Zone, heads: Head[], scale: number = PX_PER_FT): number {
  const zoneHeads = heads.filter((h) => pipPxInclusive({ x: h.x, y: h.y }, zone.pts));
  if (!zoneHeads.length) return 0;
  const xs = zone.pts.map((p) => p.x), ys = zone.pts.map((p) => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const step = scale * 2;
  let inside = 0, covered = 0;
  for (let y = minY + step / 2; y < maxY; y += step) {
    for (let x = minX + step / 2; x < maxX; x += step) {
      if (!pipPx({ x, y }, zone.pts)) continue;
      inside++;
      if (zoneHeads.some((h) => Math.hypot(h.x - x, h.y - y) <= HEADS[h.type].radius * scale)) covered++;
    }
  }
  return inside === 0 ? 0 : covered / inside;
}

/** Zone area actually reached by placed heads (ft²), split turf vs. low-water. */
export function coveredAreaSplit(zones: Zone[], heads: Head[], scale: number = PX_PER_FT) {
  let premium = 0, low = 0;
  zones.forEach((z) => {
    const covered = polyAreaFt(z.pts, scale) * coverageFraction(z, heads, scale);
    if (z.type === 'premium_lawn' || z.type === 'standard_lawn') premium += covered;
    else if (z.type === 'kurapia' || z.type === 'shade_bed') low += covered;
  });
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

/**
 * Annual savings in gallons and dollars vs. conventional rotors, computed from the
 * area actually reached by placed heads — an empty plan or an unplaced zone reads
 * $0, and the figure grows as heads are placed/AI-auto-placed across the lawn.
 */
export function savings(zones: Zone[], heads: Head[], m: Pick<RateProfile, 'et' | 'rate'>, scale: number = PX_PER_FT) {
  const { premium, low } = coveredAreaSplit(zones, heads, scale);
  const effGal = gallons(premium, low, m.et, true);
  const baseGal = gallons(premium, low, m.et, false);
  const saved = Math.max(0, baseGal - effGal);
  return { effGal, saved, dollarsSaved: (saved / 1000) * m.rate, effCost: (effGal / 1000) * m.rate };
}
