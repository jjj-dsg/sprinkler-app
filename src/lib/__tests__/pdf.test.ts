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

  // Regression: autoPlace() places heads at every zone corner + along edges (correct
  // head-to-head irrigation coverage), but raw ray-casting point-in-polygon is unreliable
  // exactly on those boundary points — this silently dropped most real heads from a zone's
  // valve-schedule row, understating the "Heads" count shown on the actual paid PDF blueprint
  // (e.g. reporting 6 of 13 real heads for a single-zone plan).
  it('counts heads placed exactly on zone corners/edges, not just the interior', () => {
    const zones = [sq(0, 0, 300)];
    const [p0, p1, p2, p3] = zones[0].pts;
    const heads: Head[] = [
      head(1, p0.x, p0.y), head(2, p1.x, p1.y), head(3, p2.x, p2.y), head(4, p3.x, p3.y),
      head(5, (p0.x + p1.x) / 2, p0.y), // edge midpoint
    ];
    const rows = buildValveSchedule(zones, heads, 3, 63);
    expect(rows[0].heads).toBe(5);
  });

  // Regression: pipPxInclusive()'s edge tolerance means a head sitting on a border shared
  // by two adjacent zones (a normal thing to draw — e.g. splitting a yard into two zone
  // types along a line) independently passes the boundary check for BOTH zones. Without
  // deduplication, that double-counts the head in both zones' rows, corrupting the head
  // count and flow-rate math shown on the paid PDF blueprint.
  it('assigns a head on a shared zone border to exactly one zone, not both', () => {
    const zones = [sq(0, 0, 300), sq(300, 0, 300)]; // adjacent, sharing the x=300 edge
    const heads: Head[] = [head(1, 300, 150)]; // sits exactly on the shared border
    const rows = buildValveSchedule(zones, heads, 3, 63);
    expect(rows[0].heads + rows[1].heads).toBe(1);
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
