/** Pure geometry: point-in-polygon, area, spray-arc detection, and head auto-placement. */
import { HEADS, PX_PER_FT, ZONE_TYPES } from './data';
import type { HeadKey, Pt, Head, Zone, ZoneTypeKey } from './types';

/** Ray-casting point-in-polygon test in screen space. */
export function pipPx(pt: Pt, pts: Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i].x, yi = pts[i].y, xj = pts[j].x, yj = pts[j].y;
    const hit = (yi > pt.y) !== (yj > pt.y) && pt.x < ((xj - xi) * (pt.y - yi)) / (yj - yi) + xi;
    if (hit) inside = !inside;
  }
  return inside;
}

/** Shoelace area converted from pixels² to feet² using the current scale. */
export function polyAreaFt(pts: Pt[], scale: number = PX_PER_FT): number {
  if (!pts || pts.length < 3) return 0;
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length;
    a += pts[i].x * pts[j].y - pts[j].x * pts[i].y;
  }
  return Math.abs(a / 2) / (scale * scale);
}

/** Distance from `pt` to segment `ab`, plus the inward unit normal (edge → pt). */
export function segmentDist(pt: Pt, a: Pt, b: Pt): { dist: number; nx: number; ny: number } {
  const dx = b.x - a.x, dy = b.y - a.y, len2 = dx * dx + dy * dy;
  if (len2 === 0) {
    const d = Math.hypot(pt.x - a.x, pt.y - a.y);
    return { dist: d, nx: d > 0 ? (pt.x - a.x) / d : 0, ny: d > 0 ? (pt.y - a.y) / d : 0 };
  }
  const t = Math.max(0, Math.min(1, ((pt.x - a.x) * dx + (pt.y - a.y) * dy) / len2));
  const fx = a.x + t * dx, fy = a.y + t * dy;
  const dist = Math.hypot(pt.x - fx, pt.y - fy);
  return { dist, nx: dist > 0 ? (pt.x - fx) / dist : 0, ny: dist > 0 ? (pt.y - fy) / dist : 0 };
}

/**
 * Zone-membership test for a point that may sit exactly on the polygon boundary —
 * ray-casting (pipPx) is well-known to be unreliable exactly on edges/vertices, but
 * autoPlace() deliberately places heads at corners and along edges (correct
 * head-to-head irrigation coverage practice). Use this, not raw pipPx, whenever
 * testing whether an already-placed head/point belongs to a zone.
 */
export function pipPxInclusive(pt: Pt, pts: Pt[], tolerancePx = 1.5): boolean {
  if (pipPx(pt, pts)) return true;
  for (let i = 0; i < pts.length; i++) {
    if (segmentDist(pt, pts[i], pts[(i + 1) % pts.length]).dist <= tolerancePx) return true;
  }
  return false;
}

/** Detect spray arc (90° corner / 180° edge / 360° interior) from zone-boundary proximity. */
export function detectHeadArc(pt: Pt, zonePts: Pt[], threshPx: number): { arc: number; dir: number } {
  const close: { nx: number; ny: number }[] = [];
  for (let i = 0; i < zonePts.length; i++) {
    const e = segmentDist(pt, zonePts[i], zonePts[(i + 1) % zonePts.length]);
    if (e.dist < threshPx) close.push(e);
  }
  if (close.length === 0) return { arc: 360, dir: 0 };
  const nx = close.reduce((s, e) => s + e.nx, 0) / close.length;
  const ny = close.reduce((s, e) => s + e.ny, 0) / close.length;
  return { arc: close.length >= 2 ? 90 : 180, dir: (Math.atan2(ny, nx) * 180) / Math.PI };
}

/** SVG pie-slice path for a partial spray arc. Full circles use a <circle> instead. */
export function arcPath(cx: number, cy: number, r: number, arcDeg: number, dirDeg: number): string {
  const d = (dirDeg * Math.PI) / 180, half = ((arcDeg / 2) * Math.PI) / 180;
  const x1 = cx + r * Math.cos(d - half), y1 = cy + r * Math.sin(d - half);
  const x2 = cx + r * Math.cos(d + half), y2 = cy + r * Math.sin(d + half);
  return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${arcDeg > 180 ? 1 : 0} 1 ${x2} ${y2} Z`;
}

let headSeq = 0;
/** Monotonic head id — deterministic (no Date.now/Math.random) so output is testable. */
function nextHeadId(): number {
  headSeq += 1;
  return headSeq;
}

/**
 * Choose the recommended head whose throw suits the zone: the largest-radius
 * recommended head that still fits ~2+ heads across the zone's smaller dimension,
 * else the smallest recommended head. Prevents dropping a 25 ft rotor on a small
 * lawn, where the throw would blanket the street/beds instead of the grass.
 */
export function pickHeadForZone(z: Zone, scale: number = PX_PER_FT): HeadKey {
  const rec = ZONE_TYPES[z.type as ZoneTypeKey].rec as HeadKey[];
  const xs = z.pts.map((p) => p.x), ys = z.pts.map((p) => p.y);
  const minDimFt = Math.min(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) / scale;
  const fits = rec.filter((k) => HEADS[k].radius <= minDimFt / 2);
  if (fits.length) return fits.reduce((a, k) => (HEADS[k].radius > HEADS[a].radius ? k : a));
  return rec.reduce((a, k) => (HEADS[k].radius < HEADS[a].radius ? k : a));
}

/**
 * Place heads for each zone: perimeter-first (corners → edges) then a triangular
 * interior fill at ~100% head-to-head spacing. Head type is right-sized per zone.
 */
export function autoPlace(zones: Zone[], scale: number = PX_PER_FT): Head[] {
  const out: Head[] = [];
  zones.forEach((z) => {
    const key = pickHeadForZone(z, scale);
    const h = HEADS[key];
    const rPx = h.radius * scale;
    const thresh = rPx * 0.45;

    // 1. Corners
    z.pts.forEach((pt) => {
      const { arc, dir } = detectHeadArc(pt, z.pts, thresh);
      out.push({ id: nextHeadId(), x: pt.x, y: pt.y, type: key, radius: h.radius, zoneType: z.type, arc, dir });
    });

    // 2. Edges
    for (let i = 0; i < z.pts.length; i++) {
      const p1 = z.pts[i], p2 = z.pts[(i + 1) % z.pts.length];
      const dx = p2.x - p1.x, dy = p2.y - p1.y;
      const len = Math.hypot(dx, dy);
      if (len > rPx) {
        const count = Math.floor(len / rPx);
        const step = len / (count + 1);
        for (let j = 1; j <= count; j++) {
          const x = p1.x + (dx / len) * step * j;
          const y = p1.y + (dy / len) * step * j;
          const { arc, dir } = detectHeadArc({ x, y }, z.pts, thresh);
          out.push({ id: nextHeadId(), x, y, type: key, radius: h.radius, zoneType: z.type, arc, dir });
        }
      }
    }

    // 3. Triangular interior fill
    const xs = z.pts.map((p) => p.x), ys = z.pts.map((p) => p.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    let row = 0;
    for (let y = minY + rPx; y < maxY; y += rPx * 0.866) {
      const offsetX = (row % 2) * (rPx / 2);
      for (let x = minX + rPx / 2 + offsetX; x < maxX; x += rPx) {
        if (!pipPx({ x, y }, z.pts)) continue;
        const tooClose = out.some((placed) => Math.hypot(placed.x - x, placed.y - y) < rPx * 0.6);
        if (tooClose) continue;
        const { arc, dir } = detectHeadArc({ x, y }, z.pts, thresh);
        out.push({ id: nextHeadId(), x, y, type: key, radius: h.radius, zoneType: z.type, arc, dir });
      }
      row++;
    }
  });
  return out;
}
