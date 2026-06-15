import { describe, it, expect } from 'vitest';
import { buildValveSchedule, buildMaterialsRows, calcPaybackYears } from '../pdf';
import type { Zone, Head } from '../types';

/** 300×300 px square zone at default PX_PER_FT=3 → 100×100 ft = 10,000 ft² */
function sq(x = 0, y = 0, pxSide = 300): Zone {
  return {
    id: x * 1000 + y,
    type: 'premium_lawn',
    pts: [{ x, y }, { x: x + pxSide, y }, { x: x + pxSide, y: y + pxSide }, { x, y: y + pxSide }],
  };
}

function head(id: number, x: number, y: number, type: Head['type'] = 'mp_rotator'): Head {
  return { id, x, y, type, radius: 25, zoneType: 'premium_lawn', arc: 360, dir: 0 };
}

describe('buildValveSchedule', () => {
  it('returns one row per zone', () => {
    const zones = [sq(0, 0), sq(400, 0)];
    const heads: Head[] = [head(1, 150, 150), head(2, 550, 150)];
    const rows = buildValveSchedule(zones, heads, 3, 63);
    expect(rows).toHaveLength(2);
    expect(rows[0].zone).toBe(1);
    expect(rows[1].zone).toBe(2);
  });

  it('correctly assigns heads to the zone containing them', () => {
    const zones = [sq(0, 0, 300), sq(400, 0, 300)];
    const heads: Head[] = [head(1, 150, 150), head(2, 150, 150), head(3, 550, 150)];
    const rows = buildValveSchedule(zones, heads, 3, 63);
    expect(rows[0].heads).toBe(2);
    expect(rows[1].heads).toBe(1);
  });

  it('reports area in ft²', () => {
    const zones = [sq(0, 0, 300)]; // 300px / 3 px-per-ft = 100ft side → 10,000 ft²
    const rows = buildValveSchedule(zones, [], 3, 63);
    expect(rows[0].area).toBe(10000);
  });

  it('minPerCycle is at least 3 minutes', () => {
    const zones = [{ id: 1, type: 'shade_bed' as const, pts: [{ x: 0, y: 0 }, { x: 30, y: 0 }, { x: 30, y: 30 }] }];
    const rows = buildValveSchedule(zones, [], 3, 10); // very low ET
    expect(rows[0].minPerCycle).toBeGreaterThanOrEqual(3);
  });

  it('uses zone ET factor — shade_bed uses less water than premium_lawn', () => {
    const zL = [sq(0, 0)];
    const zS = [{ id: 9, type: 'shade_bed' as const, pts: [{ x: 0, y: 0 }, { x: 300, y: 0 }, { x: 300, y: 300 }, { x: 0, y: 300 }] }];
    const lawn = buildValveSchedule(zL, [], 3, 63)[0].minPerCycle;
    const shade = buildValveSchedule(zS, [], 3, 63)[0].minPerCycle;
    expect(shade).toBeLessThan(lawn);
  });

  it('headTypes string lists placed heads', () => {
    const zones = [sq(0, 0)];
    const heads: Head[] = [head(1, 150, 150, 'mp_rotator'), head(2, 200, 200, 'drip')];
    const rows = buildValveSchedule(zones, heads, 3, 63);
    expect(rows[0].headTypes).toMatch(/MP Rotator/i);
    expect(rows[0].headTypes).toMatch(/Drip/i);
  });

  it('reports daysPerWeek = 3', () => {
    const rows = buildValveSchedule([sq()], [], 3, 63);
    expect(rows[0].daysPerWeek).toBe(3);
  });
});

describe('buildMaterialsRows', () => {
  it('aggregates head counts by type', () => {
    const heads: Head[] = [head(1, 0, 0, 'mp_rotator'), head(2, 0, 0, 'mp_rotator'), head(3, 0, 0, 'drip')];
    const rows = buildMaterialsRows(heads);
    const mp = rows.find((r) => r.model.toLowerCase().includes('mp rotator'));
    expect(mp?.qty).toBe(2);
    const drip = rows.find((r) => r.model.toLowerCase().includes('drip'));
    expect(drip?.qty).toBe(1);
  });

  it('computes line total correctly', () => {
    const heads: Head[] = [head(1, 0, 0, 'mp_rotator'), head(2, 0, 0, 'mp_rotator')];
    const rows = buildMaterialsRows(heads);
    const mp = rows.find((r) => r.model.toLowerCase().includes('mp rotator'))!;
    expect(mp.total).toBeCloseTo(mp.unitPrice * mp.qty, 5);
  });

  it('returns empty array for no heads', () => {
    expect(buildMaterialsRows([])).toEqual([]);
  });
});

describe('calcPaybackYears', () => {
  it('divides parts total by annual savings', () => {
    expect(calcPaybackYears(500, 100)).toBe(5);
  });

  it('rounds to one decimal', () => {
    expect(calcPaybackYears(100, 30)).toBe(3.3);
  });

  it('returns null if savings is zero', () => {
    expect(calcPaybackYears(500, 0)).toBeNull();
  });
});
