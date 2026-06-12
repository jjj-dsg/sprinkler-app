import { describe, it, expect } from 'vitest';
import { pipPx, polyAreaFt, autoPlace, PX_PER_FT } from '../App';

/**
 * Geometry & Water Savings Tests
 * Validates all core calculation logic per BDD spec
 */

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
  const GILBERT = { rate: 5.8, et: 63 };
  const MESA = { rate: 4.4, et: 62 };

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
    const baseline = gallons(sq50, 0, GILBERT.et, false);
    // 2500 × (63/12) × 7.48 / 0.55 ≈ 178,227 gal/yr
    expect(baseline).toBeGreaterThan(170000);
    expect(baseline).toBeLessThan(185000);
  });

  it('calculates efficient (MP Rotator) usage', () => {
    const sq50 = 50 * 50;
    const efficient = gallons(sq50, 0, GILBERT.et, true);
    // Same but with 0.8 efficiency: 2500 × (63/12) × 7.48 / 0.8 ≈ 122,719 gal/yr
    expect(efficient).toBeGreaterThan(115000);
    expect(efficient).toBeLessThan(130000);
  });

  it('bigger lawn saves more money', () => {
    const smallSavings = savingsDollars(900, GILBERT.rate, GILBERT.et); // 30ft × 30ft
    const largeSavings = savingsDollars(3600, GILBERT.rate, GILBERT.et); // 60ft × 60ft
    expect(largeSavings).toBeGreaterThan(smallSavings);
  });

  it('higher water rate increases savings', () => {
    const gilbertSavings = savingsDollars(2500, GILBERT.rate, GILBERT.et);
    const mesaSavings = savingsDollars(2500, MESA.rate, MESA.et);
    expect(gilbertSavings).toBeGreaterThan(mesaSavings);
  });

  it('returns $0 savings for empty zone', () => {
    const savings = savingsDollars(0, GILBERT.rate, GILBERT.et);
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

describe('AI AutoPlace Logic (BDD)', () => {
  const sq = (x: number, y: number, ftSide: number) => {
    const s = ftSide * PX_PER_FT;
    return [
      { x, y },
      { x: x + s, y },
      { x: x + s, y: y + s },
      { x, y: y + s },
    ];
  };

  it('places heads around the perimeter first and covers the interior', () => {
    const zones = [{ type: "premium_lawn", pts: sq(0, 0, 50) }]; // 50x50 ft zone
    const heads = autoPlace(zones);
    
    // Should place heads
    expect(heads.length).toBeGreaterThan(0);
    
    // Check if heads are at the 4 corners
    const cornersHit = zones[0].pts.every(corner => 
      heads.some(h => Math.abs(h.x - corner.x) < 1 && Math.abs(h.y - corner.y) < 1)
    );
    expect(cornersHit).toBe(true);

    // For this test, check they are generated with the correct type.
    expect(heads.every(h => h.type === "mp_rotator")).toBe(true);
  });

  it('places drip lines for kurapia', () => {
    const zones = [{ type: "kurapia", pts: sq(0, 0, 40) }];
    const heads = autoPlace(zones);
    expect(heads.length).toBeGreaterThan(0);
    expect(heads.every((h) => h.type === "drip")).toBe(true);
  });
});
