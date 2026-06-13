/** Smart-recommendation engine: flags suboptimal heads and suggests water-wise tweaks. */
import { HEADS, PX_PER_FT, ZONE_TYPES } from './data';
import { areaSplit } from './savings';
import type { HeadKey, Head, Recommendation, Zone, ZoneTypeKey } from './types';

export function buildRecs(zones: Zone[], heads: Head[], scale: number = PX_PER_FT): Recommendation[] {
  const recs: Recommendation[] = [];
  const { premium, low } = areaSplit(zones, scale);

  zones.forEach((z) => {
    const zt = ZONE_TYPES[z.type as ZoneTypeKey];
    heads
      .filter((h) => h.zoneType === z.type)
      .forEach((h) => {
        if (zt.avoid.includes(h.type as HeadKey)) {
          recs.push({
            type: 'warn',
            text: `${HEADS[h.type as HeadKey].name} isn't ideal in ${zt.label} — local premium lawns favor ${HEADS[zt.rec[0]].name}.`,
          });
        }
      });
  });

  if (premium > 800 && low === 0) {
    recs.push({
      type: 'tip',
      text: 'Convert a border strip to Kurapia or a shaded bed. Living low-water groundcover cuts irrigation ~60% while keeping a cool microclimate — no fake turf, no gravel.',
    });
  }
  if (premium > 1500) {
    recs.push({
      type: 'tip',
      text: 'Right-size the turf: a smaller, well-shaded lawn stays cooler and fights urban heat-island effect.',
    });
  }

  const seen = new Set<string>();
  return recs.filter((r) => (seen.has(r.text) ? false : (seen.add(r.text), true)));
}
