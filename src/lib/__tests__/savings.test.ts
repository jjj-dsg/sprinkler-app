import { describe, it, expect } from 'vitest';
import { areaSplit, coverageFraction, gallons, savings } from '../savings';
import { autoPlace } from '../geometry';
import { MUNI, PX_PER_FT } from '../data';
import type { Pt, Zone } from '../types';

const sq = (x: number, y: number, ftSide: number): Pt[] => {
  const s = ftSide * PX_PER_FT;
  return [{ x, y }, { x: x + s, y }, { x: x + s, y: y + s }, { x, y: y + s }];
};

describe('areaSplit', () => {
  it('separates turf from low-water cover', () => {
    const zones: Zone[] = [
      { type: 'premium_lawn', pts: sq(0, 0, 50) },
      { type: 'kurapia', pts: sq(0, 0, 30) },
    ];
    const { premium, low, total } = areaSplit(zones);
    expect(premium).toBeCloseTo(2500, 0);
    expect(low).toBeCloseTo(900, 0);
    expect(total).toBeCloseTo(3400, 0);
  });
  it('classifies standard_lawn as turf and shade_bed as low-water', () => {
    expect(areaSplit([{ type: 'standard_lawn', pts: sq(0, 0, 20) }]).premium).toBeGreaterThan(0);
    expect(areaSplit([{ type: 'shade_bed', pts: sq(0, 0, 20) }]).low).toBeGreaterThan(0);
  });
});

describe('gallons', () => {
  it('efficient use is below baseline for the same area', () => {
    expect(gallons(2500, 0, 63, true)).toBeLessThan(gallons(2500, 0, 63, false));
  });
  it('scales linearly with turf area', () => {
    expect(gallons(5000, 0, 63, true)).toBeCloseTo(2 * gallons(2500, 0, 63, true), 5);
  });
  it('low-water cover uses less than turf of equal area', () => {
    expect(gallons(0, 2500, 63, true)).toBeLessThan(gallons(2500, 0, 63, true));
  });
});

describe('coverageFraction', () => {
  it('is 0 for a zone with no heads', () => {
    expect(coverageFraction({ type: 'premium_lawn', pts: sq(0, 0, 40) }, [])).toBe(0);
  });
  it('is ~1 for a zone fully auto-placed', () => {
    const z: Zone = { type: 'premium_lawn', pts: sq(0, 0, 40) };
    expect(coverageFraction(z, autoPlace([z]))).toBeGreaterThan(0.9);
  });
  it('ignores heads placed in a different zone', () => {
    const z: Zone = { type: 'premium_lawn', pts: sq(0, 0, 40) };
    const other: Zone = { type: 'premium_lawn', pts: sq(1000, 1000, 40) };
    expect(coverageFraction(z, autoPlace([other]))).toBe(0);
  });
});

describe('savings', () => {
  it('is zero with no zones', () => expect(savings([], [], MUNI['Gilbert, AZ']).dollarsSaved).toBe(0));
  it('is zero for a drawn zone with no heads placed yet', () => {
    const z: Zone[] = [{ type: 'premium_lawn', pts: sq(0, 0, 40) }];
    expect(savings(z, [], MUNI['Gilbert, AZ']).dollarsSaved).toBe(0);
  });
  it('grows as heads are placed to cover more of the lawn', () => {
    const z: Zone[] = [{ type: 'premium_lawn', pts: sq(0, 0, 40) }];
    const allHeads = autoPlace(z);
    const none = savings(z, [], MUNI['Gilbert, AZ']).dollarsSaved;
    const some = savings(z, allHeads.slice(0, 1), MUNI['Gilbert, AZ']).dollarsSaved;
    const full = savings(z, allHeads, MUNI['Gilbert, AZ']).dollarsSaved;
    expect(some).toBeGreaterThanOrEqual(none);
    expect(full).toBeGreaterThan(some);
  });
  it('grows with lawn size at equal (full) coverage', () => {
    const za: Zone[] = [{ type: 'premium_lawn', pts: sq(0, 0, 30) }];
    const zb: Zone[] = [{ type: 'premium_lawn', pts: sq(0, 0, 60) }];
    const a = savings(za, autoPlace(za), MUNI['Gilbert, AZ']);
    const b = savings(zb, autoPlace(zb), MUNI['Gilbert, AZ']);
    expect(b.dollarsSaved).toBeGreaterThan(a.dollarsSaved);
  });
  it('grows with the water rate', () => {
    const z: Zone[] = [{ type: 'premium_lawn', pts: sq(0, 0, 40) }];
    const hs = autoPlace(z);
    expect(savings(z, hs, MUNI['Gilbert, AZ']).dollarsSaved).toBeGreaterThan(savings(z, hs, MUNI['Mesa, AZ']).dollarsSaved);
  });
  it('never reports negative savings', () => {
    const z: Zone[] = [{ type: 'premium_lawn', pts: sq(0, 0, 10) }];
    expect(savings(z, autoPlace(z), MUNI['Phoenix, AZ']).saved).toBeGreaterThanOrEqual(0);
  });
  it('honors the live map scale (same ft² + same coverage → same savings at 2× px/ft)', () => {
    const zone: Zone = { type: 'premium_lawn', pts: sq(0, 0, 50) };
    const base = savings([zone], autoPlace([zone]), MUNI['Gilbert, AZ'], PX_PER_FT);
    const zoomedZone: Zone = { type: 'premium_lawn', pts: sq(0, 0, 50).map((p) => ({ x: p.x * 2, y: p.y * 2 })) };
    const zoomed = savings([zoomedZone], autoPlace([zoomedZone], PX_PER_FT * 2), MUNI['Gilbert, AZ'], PX_PER_FT * 2);
    expect(zoomed.dollarsSaved).toBeCloseTo(base.dollarsSaved, 0);
  });
});
