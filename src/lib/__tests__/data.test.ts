import { describe, it, expect } from 'vitest';
import { HEADS, MUNI, ZONE_TYPES, STATE_DEF } from '../data';
import type { HeadKey } from '../types';

/** Data-integrity guards: catch typos and broken references in static config. */
describe('data integrity', () => {
  it('every head has a positive radius, price, and color', () => {
    Object.values(HEADS).forEach((h) => {
      expect(h.radius).toBeGreaterThan(0);
      expect(h.price).toBeGreaterThanOrEqual(0);
      expect(h.color).toMatch(/^#[0-9a-f]{6}$/i);
    });
  });

  it('every municipality has a sane rate, ET, and center coordinate', () => {
    Object.values(MUNI).forEach((m) => {
      expect(m.rate).toBeGreaterThan(0);
      expect(m.et).toBeGreaterThan(0);
      expect(m.center).toHaveLength(2);
    });
  });

  it('zone rec/avoid lists only reference real head keys', () => {
    const keys = Object.keys(HEADS) as HeadKey[];
    Object.values(ZONE_TYPES).forEach((z) => {
      [...z.rec, ...z.avoid].forEach((k) => expect(keys).toContain(k));
    });
    expect(Object.values(ZONE_TYPES).every((z) => z.rec.length > 0)).toBe(true);
  });

  it('state defaults cover the marketed Arizona launch region', () => {
    expect(STATE_DEF.AZ).toBeDefined();
    expect(STATE_DEF.AZ.style).toBe('premium');
  });
});
