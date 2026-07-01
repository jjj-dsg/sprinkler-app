import { describe, it, expect, beforeEach } from 'vitest';
import { savePendingPlan, loadPendingPlan, clearPendingPlan } from '../planStorage';
import type { PdfPlanData } from '../pdf';

function mockPlan(address = 'Test Plan'): PdfPlanData {
  return {
    address,
    muni: { name: 'Gilbert, AZ', rate: 3.5, et: 55, note: 'test', style: 'premium', center: [33.35, -111.79] },
    zones: [],
    heads: [],
    savings: { dollarsSaved: 200, saved: 12000, effCost: 180 },
    partsTotal: 400,
    pxPerFt: 3,
    generatedAt: 'July 1, 2026',
    recommendations: [],
  };
}

describe('planStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns null when nothing is stored', () => {
    expect(loadPendingPlan()).toBeNull();
  });

  it('round-trips a plan through localStorage', () => {
    const plan = mockPlan('123 Main St');
    savePendingPlan(plan);
    const loaded = loadPendingPlan();
    expect(loaded).not.toBeNull();
    expect(loaded?.address).toBe('123 Main St');
    expect(loaded?.partsTotal).toBe(400);
    expect(loaded?.savings.dollarsSaved).toBe(200);
  });

  it('preserves muni fields', () => {
    const plan = mockPlan();
    savePendingPlan(plan);
    const loaded = loadPendingPlan();
    expect(loaded?.muni.name).toBe('Gilbert, AZ');
    expect(loaded?.muni.rate).toBe(3.5);
  });

  it('clearPendingPlan removes the stored plan', () => {
    savePendingPlan(mockPlan());
    clearPendingPlan();
    expect(loadPendingPlan()).toBeNull();
  });

  it('overwrite: last save wins', () => {
    savePendingPlan(mockPlan('First'));
    savePendingPlan(mockPlan('Second'));
    expect(loadPendingPlan()?.address).toBe('Second');
  });

  it('returns null if localStorage contains corrupted JSON', () => {
    localStorage.setItem('sprinklersmart_pending_plan', 'not-json{{{');
    expect(loadPendingPlan()).toBeNull();
  });

  it('clearPendingPlan is idempotent when nothing is stored', () => {
    expect(() => clearPendingPlan()).not.toThrow();
    expect(loadPendingPlan()).toBeNull();
  });
});
