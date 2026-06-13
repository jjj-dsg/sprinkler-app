import { describe, it, expect } from 'vitest';
import { resolveMuni, parseGeo } from '../location';
import { MUNI, STATE_DEF } from '../data';

describe('resolveMuni', () => {
  it('resolves an exact municipality', () => {
    const r = resolveMuni('Gilbert', 'AZ');
    expect(r?.name).toBe('Gilbert, AZ');
    expect(r?.rate).toBe(MUNI['Gilbert, AZ'].rate);
  });
  it('falls back to the state default for an unknown city', () => {
    const r = resolveMuni('Nowheresville', 'AZ');
    expect(r?.rate).toBe(STATE_DEF.AZ.rate);
    expect(r?.note).toMatch(/regional estimate/);
  });
  it('returns null for an unknown state', () => {
    expect(resolveMuni('X', 'ZZ')).toBeNull();
  });
  it('returns null when both city and state are missing', () => {
    expect(resolveMuni(null, null)).toBeNull();
  });
});

describe('parseGeo', () => {
  it('reads city from town + ISO state code', () => {
    expect(parseGeo({ town: 'Gilbert', 'ISO3166-2-lvl4': 'US-AZ' })).toEqual({ city: 'Gilbert', st: 'AZ' });
  });
  it('maps a full state name to its abbreviation', () => {
    expect(parseGeo({ state: 'Arizona' }).st).toBe('AZ');
  });
  it('prefers city, then town, then village, then municipality, then county', () => {
    expect(parseGeo({ county: 'Maricopa' }).city).toBe('Maricopa');
    expect(parseGeo({ village: 'Villaged', county: 'Maricopa' }).city).toBe('Villaged');
  });
  it('returns nulls for empty input', () => {
    expect(parseGeo(null)).toEqual({ city: null, st: null });
    expect(parseGeo({})).toEqual({ city: null, st: null });
  });
});
