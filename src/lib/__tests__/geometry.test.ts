import { describe, it, expect } from 'vitest';
import {
  pipPx, pipPxInclusive, polyAreaFt, segmentDist, detectHeadArc, arcPath, autoPlace,
} from '../geometry';
import { PX_PER_FT } from '../data';
import type { Pt, Zone } from '../types';

/** Build an axis-aligned square (ft side) at the default px/ft scale. */
const sq = (x: number, y: number, ftSide: number): Pt[] => {
  const s = ftSide * PX_PER_FT;
  return [{ x, y }, { x: x + s, y }, { x: x + s, y: y + s }, { x, y: y + s }];
};

describe('pipPx (point-in-polygon)', () => {
  it('detects a point inside', () => expect(pipPx({ x: 50, y: 50 }, sq(0, 0, 50))).toBe(true));
  it('detects a point outside', () => expect(pipPx({ x: 999, y: 999 }, sq(0, 0, 50))).toBe(false));
  it('returns false for a degenerate polygon', () => expect(pipPx({ x: 0, y: 0 }, [])).toBe(false));
  it('treats a point on the far side correctly', () => expect(pipPx({ x: -1, y: 50 }, sq(0, 0, 50))).toBe(false));
  // Regression: ray-casting is unreliable exactly on vertices — autoPlace() deliberately
  // places heads at every zone corner, and 3 of 4 corners failed raw pipPx here (only
  // the (0,0) origin corner passed), which silently under-counted zone-attributed heads
  // in buildValveSchedule's PDF output. pipPx itself is intentionally left as-is (it's also
  // used as autoPlace's interior-fill gate, which never tests exact boundary points).
  it('is unreliable exactly on a polygon vertex (why pipPxInclusive exists)', () => {
    const square = sq(0, 0, 50);
    expect(pipPx(square[1], square)).toBe(false);
    expect(pipPx(square[2], square)).toBe(false);
    expect(pipPx(square[3], square)).toBe(false);
  });
});

describe('pipPxInclusive (boundary-tolerant point-in-polygon)', () => {
  it('treats every zone corner as in-zone, unlike raw pipPx', () => {
    const square = sq(0, 0, 50);
    square.forEach((corner) => expect(pipPxInclusive(corner, square)).toBe(true));
  });
  it('treats a point on an edge midpoint as in-zone', () => {
    const square = sq(0, 0, 50);
    const midpoint = { x: (square[0].x + square[1].x) / 2, y: square[0].y };
    expect(pipPxInclusive(midpoint, square)).toBe(true);
  });
  it('still rejects a point genuinely outside the zone', () => {
    expect(pipPxInclusive({ x: 9999, y: 9999 }, sq(0, 0, 50))).toBe(false);
  });
  it('still detects a point inside', () => {
    expect(pipPxInclusive({ x: 50, y: 50 }, sq(0, 0, 50))).toBe(true);
  });
});

describe('polyAreaFt', () => {
  it('computes a 50ft square ≈ 2500 ft²', () => expect(polyAreaFt(sq(0, 0, 50))).toBeCloseTo(2500, 0));
  it('returns 0 for fewer than 3 points', () => expect(polyAreaFt([{ x: 0, y: 0 }])).toBe(0));
  it('is scale-invariant in feet: doubling px/ft keeps ft² the same', () => {
    const ptsAtDouble: Pt[] = sq(0, 0, 50).map((p) => ({ x: p.x * 2, y: p.y * 2 }));
    expect(polyAreaFt(ptsAtDouble, PX_PER_FT * 2)).toBeCloseTo(2500, 0);
  });
  it('grows with the polygon', () => expect(polyAreaFt(sq(0, 0, 60))).toBeGreaterThan(polyAreaFt(sq(0, 0, 30))));
});

describe('segmentDist', () => {
  it('measures perpendicular distance to a horizontal edge', () => {
    const r = segmentDist({ x: 5, y: 3 }, { x: 0, y: 0 }, { x: 10, y: 0 });
    expect(r.dist).toBeCloseTo(3, 5);
    expect(r.ny).toBeCloseTo(1, 5); // normal points toward the point (upward)
  });
  it('handles a zero-length segment', () => {
    const r = segmentDist({ x: 3, y: 4 }, { x: 0, y: 0 }, { x: 0, y: 0 });
    expect(r.dist).toBeCloseTo(5, 5);
  });
});

describe('detectHeadArc', () => {
  const zone = sq(0, 0, 50); // 150px square
  it('returns full 360° for an interior point', () => {
    expect(detectHeadArc({ x: 75, y: 75 }, zone, 10).arc).toBe(360);
  });
  it('returns 180° (edge) near a single boundary', () => {
    expect(detectHeadArc({ x: 75, y: 4 }, zone, 10).arc).toBe(180);
  });
  it('returns 90° (corner) near two boundaries', () => {
    expect(detectHeadArc({ x: 4, y: 4 }, zone, 10).arc).toBe(90);
  });
});

describe('arcPath', () => {
  it('produces an SVG pie-slice path string', () => {
    const d = arcPath(100, 100, 50, 90, 0);
    expect(d.startsWith('M 100 100')).toBe(true);
    expect(d).toContain('A 50 50');
  });
  it('flags the large-arc sweep for arcs > 180°', () => {
    expect(arcPath(0, 0, 10, 270, 0)).toMatch(/A 10 10 0 1 1/);
  });
});

describe('autoPlace', () => {
  it('is deterministic across runs (no Date.now/Math.random)', () => {
    const z: Zone[] = [{ type: 'premium_lawn', pts: sq(20, 20, 50) }];
    expect(autoPlace(z).length).toBe(autoPlace(z).length);
  });
  it('places every head inside the zone or on its boundary (edge heads)', () => {
    const z: Zone[] = [{ type: 'premium_lawn', pts: sq(20, 20, 50) }];
    const heads = autoPlace(z);
    const onEdge = (p: Pt) => z[0].pts.some((_, i) => segmentDist(p, z[0].pts[i], z[0].pts[(i + 1) % z[0].pts.length]).dist <= 0.5);
    expect(heads.length).toBeGreaterThan(0);
    expect(heads.every((h) => pipPx(h, z[0].pts) || onEdge(h))).toBe(true);
  });

  it('places interior-fill heads strictly inside (full 360° arc)', () => {
    const z: Zone[] = [{ type: 'premium_lawn', pts: sq(0, 0, 90) }];
    const interior = autoPlace(z).filter((h) => h.arc >= 360);
    expect(interior.length).toBeGreaterThan(0);
    expect(interior.every((h) => pipPx(h, z[0].pts))).toBe(true);
  });
  it('uses the recommended head type for the zone', () => {
    expect(autoPlace([{ type: 'premium_lawn', pts: sq(0, 0, 50) }]).every((h) => h.type === 'mp_rotator')).toBe(true);
    expect(autoPlace([{ type: 'kurapia', pts: sq(0, 0, 40) }]).every((h) => h.type === 'drip')).toBe(true);
  });
  // Regression: a small lawn (e.g. a real ~2,170 ft² / ~46 ft-wide yard) was getting the
  // 25 ft-radius MP Rotator regardless of size, so the throw blanketed the street/beds
  // instead of the grass. pickHeadForZone right-sizes to a head whose radius actually
  // fits the zone's smaller dimension.
  it('right-sizes the head to a small zone instead of always using the largest recommended radius', () => {
    const heads = autoPlace([{ type: 'premium_lawn', pts: sq(0, 0, 45) }]);
    expect(heads.length).toBeGreaterThan(0);
    expect(heads.every((h) => h.type === 'popup_spray')).toBe(true);
  });
  it('still uses the larger-throw head once the zone is big enough to fit it', () => {
    const heads = autoPlace([{ type: 'premium_lawn', pts: sq(0, 0, 60) }]);
    expect(heads.every((h) => h.type === 'mp_rotator')).toBe(true);
  });
  it('assigns unique head ids', () => {
    const heads = autoPlace([{ type: 'premium_lawn', pts: sq(0, 0, 50) }]);
    expect(new Set(heads.map((h) => h.id)).size).toBe(heads.length);
  });
  it('scales head count with zone size', () => {
    const small = autoPlace([{ type: 'premium_lawn', pts: sq(0, 0, 30) }]).length;
    const big = autoPlace([{ type: 'premium_lawn', pts: sq(0, 0, 90) }]).length;
    expect(big).toBeGreaterThan(small);
  });
});
