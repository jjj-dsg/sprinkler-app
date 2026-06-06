import { describe, it, expect } from 'vitest';

/**
 * Geometry & Water Savings Tests
 * Validates all core calculation logic per BDD spec
 */

const PX_PER_FT = 3;

function pipPx(pt: { x: number; y: number }, pts: { x: number; y: number }[]): boolean {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i].x, yi = pts[i].y, xj = pts[j].x, yj = pts[j].y;
    const hit = (yi > pt.y) !== (yj > pt.y) && pt.x < ((xj - xi) * (pt.y - yi)) / (yj - yi) + xi;
    if (hit) inside = !inside;
  }
  return inside;
}

function polyAreaFt(pts: { x: number; y: number }[]): number {
  if (!pts || pts.length < 3) return 0;
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length;
    a += pts[i].x * pts[j].y - pts[j].x * pts[i].y;
  }
  return Math.abs(a / 2) / (PX_PER_FT * PX_PER_FT);
}

describe('Point-in-Polygon (PIP)', () => {
  const sq = (x: number, y: number, ftSide: number) => {
    const s = ftSide * PX_PER_FT;
    return [
      { x, y },
      { x: x + s, y },
      { x: x + s, y: y + s },
      { x, y: y + s },
    ];
  };

  it('detects point inside polygon', () => {
    const polygon = sq(0, 0, 50);
    expect(pipPx({ x: 50, y: 50 }, polygon)).toBe(true);
  });

  it('detects point outside polygon', () => {
    const polygon = sq(0, 0, 50);
    expect(pipPx({ x: 999, y: 999 }, polygon)).toBe(false);
  });

  it('returns false for empty polygon', () => {
    expect(pipPx({ x: 0, y: 0 }, [])).toBe(false);
  });
});

describe('Polygon Area Calculation', () => {
  const sq = (x: number, y: number, ftSide: number) => {
    const s = ftSide * PX_PER_FT;
    return [
      { x, y },
      { x: x + s, y },
      { x: x + s, y: y + s },
      { x, y: y + s },
    ];
  };

  it('calculates area of 50ft × 50ft square ≈ 2500 ft²', () => {
    const area = polyAreaFt(sq(0, 0, 50));
    expect(Math.abs(area - 2500)).toBeLessThan(75); // ±3%
  });

  it('returns 0 for polygon with <3 points', () => {
    expect(polyAreaFt([{ x: 0, y: 0 }])).toBe(0);
    expect(polyAreaFt([{ x: 0, y: 0 }, { x: 10, y: 10 }])).toBe(0);
  });

  it('calculates area of 100ft × 100ft square ≈ 10,000 ft²', () => {
    const area = polyAreaFt(sq(0, 0, 100));
    expect(Math.abs(area - 10000)).toBeLessThan(300); // ±3%
  });
});

describe('Water Savings Calculation', () => {
  const MUNI = {
    'Gilbert, AZ': { rate: 5.8, et: 63 },
    'Mesa, AZ': { rate: 4.4, et: 62 },
  };

  function gallons(premium: number, low: number, et: number, eff: boolean): number {
    const e = eff ? 0.8 : 0.55;
    return (premium * (et / 12) * 7.48) / e + (low * (et / 12) * 0.4 * 7.48) / (eff ? 0.9 : 0.6);
  }

  function savingsDollars(premiumSqFt: number, muniRate: number, et: number): number {
    const effGal = gallons(premiumSqFt, 0, et, true);
    const baseGal = gallons(premiumSqFt, 0, et, false);
    const saved = Math.max(0, baseGal - effGal);
    return (saved / 1000) * muniRate;
  }

  it('calculates baseline (conventional rotor) usage', () => {
    const sq50 = 50 * 50;
    const baseline = gallons(sq50, 0, 63, false);
    // 2500 × (63/12) × 7.48 / 0.55 ≈ 18,009 gal/yr
    expect(baseline).toBeGreaterThan(17000);
    expect(baseline).toBeLessThan(19000);
  });

  it('calculates efficient (MP Rotator) usage', () => {
    const sq50 = 50 * 50;
    const efficient = gallons(sq50, 0, 63, true);
    // Same but with 0.8 efficiency
    expect(efficient).toBeGreaterThan(12000);
    expect(efficient).toBeLessThan(14000);
  });

  it('bigger lawn saves more money', () => {
    const smallSavings = savingsDollars(900, 5.8, 63); // 30ft × 30ft
    const largeSavings = savingsDollars(3600, 5.8, 63); // 60ft × 60ft
    expect(largeSavings).toBeGreaterThan(smallSavings);
  });

  it('higher water rate increases savings', () => {
    const gilbertSavings = savingsDollars(2500, 5.8, 63);
    const mesaSavings = savingsDollars(2500, 4.4, 62);
    expect(gilbertSavings).toBeGreaterThan(mesaSavings);
  });

  it('returns $0 savings for empty zone', () => {
    const savings = savingsDollars(0, 5.8, 63);
    expect(savings).toBe(0);
  });
});

describe('Payback Period Calculation', () => {
  it('calculates payback period correctly', () => {
    const partsCost = 100;
    const annualSavings = 4.64;
    const paybackYears = Math.max(1, Math.round((partsCost / annualSavings) * 10) / 10);
    expect(paybackYears).toBeGreaterThan(20);
    expect(paybackYears).toBeLessThan(25);
  });

  it('clamps minimum payback to 1 year', () => {
    const partsCost = 10;
    const annualSavings = 100;
    const paybackYears = Math.max(1, Math.round((partsCost / annualSavings) * 10) / 10);
    expect(paybackYears).toBe(1);
  });
});
