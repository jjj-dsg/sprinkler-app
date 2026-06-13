import { describe, it, expect } from 'vitest';
import { buildRecs } from '../recommendations';
import { PX_PER_FT } from '../data';
import type { Head, Pt, Zone } from '../types';

const sq = (x: number, y: number, ftSide: number): Pt[] => {
  const s = ftSide * PX_PER_FT;
  return [{ x, y }, { x: x + s, y }, { x: x + s, y: y + s }, { x, y: y + s }];
};
const head = (over: Partial<Head>): Head => ({ id: 1, x: 0, y: 0, type: 'mp_rotator', radius: 25, zoneType: 'premium_lawn', arc: 360, dir: 0, ...over });

describe('buildRecs', () => {
  it('warns when a rotor is used on premium turf', () => {
    const recs = buildRecs([{ type: 'premium_lawn', pts: sq(0, 0, 30) }], [head({ type: 'rotor', zoneType: 'premium_lawn' })]);
    expect(recs.some((r) => r.type === 'warn')).toBe(true);
  });
  it('does not warn for a recommended head', () => {
    const recs = buildRecs([{ type: 'premium_lawn', pts: sq(0, 0, 30) }], [head({ type: 'mp_rotator' })]);
    expect(recs.some((r) => r.type === 'warn')).toBe(false);
  });
  it('suggests Kurapia for a large all-turf yard', () => {
    expect(buildRecs([{ type: 'premium_lawn', pts: sq(0, 0, 40) }], []).some((r) => /Kurapia/i.test(r.text))).toBe(true);
  });
  it('suggests right-sizing for very large turf (>1500 ft²)', () => {
    expect(buildRecs([{ type: 'premium_lawn', pts: sq(0, 0, 45) }], []).some((r) => /Right-size/i.test(r.text))).toBe(true);
  });
  it('does not suggest Kurapia when low-water cover already exists', () => {
    const zones: Zone[] = [
      { type: 'premium_lawn', pts: sq(0, 0, 40) },
      { type: 'kurapia', pts: sq(200, 0, 10) },
    ];
    expect(buildRecs(zones, []).some((r) => /Convert a border strip/i.test(r.text))).toBe(false);
  });
  it('deduplicates identical recommendations', () => {
    const zones: Zone[] = [{ type: 'premium_lawn', pts: sq(0, 0, 30) }];
    const heads = [head({ id: 1, type: 'rotor' }), head({ id: 2, type: 'rotor' })];
    const warns = buildRecs(zones, heads).filter((r) => r.type === 'warn');
    expect(warns.length).toBe(1);
  });
});
