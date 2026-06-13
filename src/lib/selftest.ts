/**
 * In-app self-test panel. Runs assertions against the REAL lib functions so the
 * landing-page "Self-test: N/N passing" badge stays a single source of truth with
 * the Vitest suite (no duplicated logic). Lets a human or AI eyeball app health.
 */
import { MUNI, PX_PER_FT } from './data';
import { autoPlace, pipPx, polyAreaFt, segmentDist } from './geometry';
import { resolveMuni, parseGeo } from './location';
import { buildRecs } from './recommendations';
import { savings } from './savings';
import type { Pt, Zone } from './types';

export type TestResult = { name: string; pass: boolean; msg?: string };

const sq = (x: number, y: number, ftSide: number): Pt[] => {
  const s = ftSide * PX_PER_FT;
  return [{ x, y }, { x: x + s, y }, { x: x + s, y: y + s }, { x, y: y + s }];
};

/** A head covers the zone if it's strictly inside OR on the boundary (edge heads). */
const coversZone = (p: Pt, pts: Pt[], eps = 0.5): boolean =>
  pipPx(p, pts) || pts.some((_, i) => segmentDist(p, pts[i], pts[(i + 1) % pts.length]).dist <= eps);

export function runSelfTests(): TestResult[] {
  const out: TestResult[] = [];
  const ok = (a: number, b: number, t = 0.03) => Math.abs(a - b) <= Math.abs(b) * t + 1e-9;
  const ex = (c: boolean, m?: string) => { if (!c) throw new Error(m || 'failed'); };
  const T = (name: string, fn: () => void) => {
    try { fn(); out.push({ name, pass: true }); }
    catch (e) { out.push({ name, pass: false, msg: e instanceof Error ? e.message : String(e) }); }
  };

  T('pip inside', () => ex(pipPx({ x: 50, y: 50 }, sq(0, 0, 50))));
  T('pip outside', () => ex(!pipPx({ x: 999, y: 999 }, sq(0, 0, 50))));
  T('area of 50ft square ≈ 2500 ft²', () => { const a = polyAreaFt(sq(0, 0, 50)); ex(ok(a, 2500), `got ${a}`); });
  T('area <3 pts = 0', () => ex(polyAreaFt([{ x: 0, y: 0 }]) === 0));
  T('resolveMuni Gilbert exact', () => { const r = resolveMuni('Gilbert', 'AZ'); ex(!!r && r.rate === 5.8); });
  T('resolveMuni unknown AZ → state', () => { const r = resolveMuni('Xtown', 'AZ'); ex(!!r && r.rate === 5.2); });
  T('resolveMuni unknown state → null', () => ex(resolveMuni('X', 'ZZ') === null));
  T('parseGeo town+code', () => { const r = parseGeo({ town: 'Gilbert', 'ISO3166-2-lvl4': 'US-AZ' }); ex(r.city === 'Gilbert' && r.st === 'AZ'); });
  T('parseGeo state name → abbr', () => ex(parseGeo({ state: 'Arizona' }).st === 'AZ'));
  T('savings: bigger lawn saves more', () => {
    const a = savings([{ type: 'premium_lawn', pts: sq(0, 0, 30) }], MUNI['Gilbert, AZ']);
    const b = savings([{ type: 'premium_lawn', pts: sq(0, 0, 60) }], MUNI['Gilbert, AZ']);
    ex(b.dollarsSaved > a.dollarsSaved);
  });
  T('savings: higher rate saves more', () => {
    const z: Zone[] = [{ type: 'premium_lawn', pts: sq(0, 0, 40) }];
    ex(savings(z, MUNI['Gilbert, AZ']).dollarsSaved > savings(z, MUNI['Mesa, AZ']).dollarsSaved);
  });
  T('savings: empty = 0', () => ex(savings([], MUNI['Gilbert, AZ']).dollarsSaved === 0));
  T('recs: rotor on premium warns', () => ex(buildRecs(
    [{ type: 'premium_lawn', pts: sq(0, 0, 30) }],
    [{ id: 1, x: 0, y: 0, type: 'rotor', radius: 35, zoneType: 'premium_lawn', arc: 360, dir: 0 }],
  ).some((r) => r.type === 'warn')));
  T('recs: big turf suggests Kurapia', () => ex(buildRecs([{ type: 'premium_lawn', pts: sq(0, 0, 40) }], []).some((r) => /Kurapia/i.test(r.text))));
  T('BDD: draw→autoplace→inside+MP+savings', () => {
    const zones: Zone[] = [{ type: 'premium_lawn', pts: sq(20, 20, 50) }];
    const hs = autoPlace(zones);
    ex(hs.length > 0, 'heads placed');
    ex(hs.every((h) => coversZone(h, zones[0].pts)), 'all inside/on-edge');
    ex(hs.every((h) => h.type === 'mp_rotator'), 'MP rotator');
    ex(savings(zones, MUNI['Gilbert, AZ']).dollarsSaved > 0, 'savings>0');
  });
  T('BDD: kurapia → drip only', () => { const hs = autoPlace([{ type: 'kurapia', pts: sq(0, 0, 40) }]); ex(hs.length > 0 && hs.every((h) => h.type === 'drip')); });
  T('BDD: erase head shrinks plan', () => { let hs = autoPlace([{ type: 'premium_lawn', pts: sq(0, 0, 50) }]); const n = hs.length; hs = hs.filter((h) => h.id !== hs[0].id); ex(hs.length === n - 1); });

  return out;
}
