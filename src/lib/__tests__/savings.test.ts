import { describe, it, expect } from 'vitest';
import { areaSplit, gallons, savings } from '../savings';
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

describe('savings', () => {
  it('is zero with no zones', () => expect(savings([], MUNI['Gilbert, AZ']).dollarsSaved).toBe(0));
  it('grows with lawn size', () => {
    const a = savings([{ type: 'premium_lawn', pts: sq(0, 0, 30) }], MUNI['Gilbert, AZ']);
    const b = savings([{ type: 'premium_lawn', pts: sq(0, 0, 60) }], MUNI['Gilbert, AZ']);
    expect(b.dollarsSaved).toBeGreaterThan(a.dollarsSaved);
  });
  it('grows with the water rate', () => {
    const z: Zone[] = [{ type: 'premium_lawn', pts: sq(0, 0, 40) }];
    expect(savings(z, MUNI['Gilbert, AZ']).dollarsSaved).toBeGreaterThan(savings(z, MUNI['Mesa, AZ']).dollarsSaved);
  });
  it('never reports negative savings', () => {
    expect(savings([{ type: 'premium_lawn', pts: sq(0, 0, 10) }], MUNI['Phoenix, AZ']).saved).toBeGreaterThanOrEqual(0);
  });
  it('honors the live map scale (same ft² → same savings at 2× px/ft)', () => {
    const base = savings([{ type: 'premium_lawn', pts: sq(0, 0, 50) }], MUNI['Gilbert, AZ'], PX_PER_FT);
    const zoomed: Zone[] = [{ type: 'premium_lawn', pts: sq(0, 0, 50).map((p) => ({ x: p.x * 2, y: p.y * 2 })) }];
    expect(savings(zoomed, MUNI['Gilbert, AZ'], PX_PER_FT * 2).dollarsSaved).toBeCloseTo(base.dollarsSaved, 2);
  });
});
