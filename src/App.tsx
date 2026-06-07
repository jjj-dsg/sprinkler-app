/* eslint-disable @typescript-eslint/no-explicit-any */
// @ts-nocheck
import { useState, useRef, useEffect } from "react";
import { Droplets, MapPin, Plus, Trash2, DollarSign, Leaf, Sun, ShoppingCart, Download, Search, Layers, Zap, TreePine, Info, Loader2, CheckCircle2, XCircle } from "lucide-react";

declare global {
  interface Window {
    L: any;
  }
}

// ============ DATA ============
const HEADS = {
  mp_rotator: { name: "MP Rotator (water-saving)", brand: "Hunter MP Rotator", radius: 25, saving: true, color: "#0ea5e9", price: 6.5, affiliate: "https://example.com/aff/hunter-mp" },
  popup_spray: { name: "Pop-up Spray + HE nozzle", brand: "Rain Bird 1804 + R-VAN", radius: 15, saving: true, color: "#22c55e", price: 4.0, affiliate: "https://example.com/aff/rainbird-rvan" },
  rotor: { name: "Gear Rotor", brand: "Generic gear rotor", radius: 35, saving: false, color: "#f59e0b", price: 9.0, affiliate: "https://example.com/aff/rotor" },
  drip: { name: "Drip / Inline", brand: "Netafim Inline Drip", radius: 8, saving: true, color: "#a855f7", price: 0.6, affiliate: "https://example.com/aff/netafim" },
};
const MUNI = {
  "Gilbert, AZ": { rate: 5.80, et: 63, style: "premium", note: "Tiered rates rising fast — irrigation hits top brackets.", center: [33.3528, -111.789] },
  "Phoenix, AZ": { rate: 4.95, et: 62, style: "premium", note: "High ET desert — savings huge.", center: [33.4484, -112.074] },
  "Scottsdale, AZ": { rate: 6.10, et: 64, style: "premium", note: "Premium lawns, strict water rules.", center: [33.4942, -111.9261] },
  "Chandler, AZ": { rate: 4.60, et: 63, style: "premium", note: "Lower valley rates, premium lawns.", center: [33.3062, -111.8413] },
  "Mesa, AZ": { rate: 4.40, et: 62, style: "standard", note: "Valley desert, moderate rates.", center: [33.4152, -111.8315] },
  "Las Vegas, NV": { rate: 5.40, et: 66, style: "standard", note: "Rebates for efficient heads.", center: [36.1699, -115.1398] },
  "Los Angeles, CA": { rate: 8.20, et: 50, style: "premium", note: "High rates — efficiency pays fast.", center: [34.0522, -118.2437] },
  "Other / Custom": { rate: 5.00, et: 50, style: "standard", note: "National averages.", center: [33.45, -112.07] },
};
const STATE_DEF = { AZ: { rate: 5.2, et: 62, style: "premium" }, CA: { rate: 7.5, et: 50, style: "premium" }, NV: { rate: 5.4, et: 66, style: "standard" }, TX: { rate: 6.0, et: 52, style: "premium" }, CO: { rate: 4.1, et: 44, style: "standard" } };
const STATE_NAMES = { Arizona: "AZ", California: "CA", Nevada: "NV", Texas: "TX", Colorado: "CO" };
const ZONE_TYPES = {
  premium_lawn: { label: "Premium Lawn", color: "#16a34a", rec: ["mp_rotator", "popup_spray"], avoid: ["rotor"] },
  standard_lawn: { label: "Standard Lawn", color: "#65a30d", rec: ["mp_rotator", "popup_spray"], avoid: [] },
  kurapia: { label: "Kurapia / Low-Water Cover", color: "#0d9488", rec: ["drip", "mp_rotator"], avoid: ["rotor"] },
  shade_bed: { label: "Shade Bed / Trees", color: "#7c3aed", rec: ["drip"], avoid: ["popup_spray", "rotor"] },
};

// ============ TYPES ============
type Pt = { x: number; y: number; lat?: number; lng?: number };
type Zone = { id?: number; type: string; pts: Pt[]; geo?: { lat: number; lng: number }[] };
type Head = { id: number; x: number; y: number; lat?: number; lng?: number; type: string; radius: number; zoneType: string; arc: number; dir: number };

// ============ PURE LOGIC (testable) ============
const PX_PER_FT = 3;
function pipPx(pt: Pt, pts: Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i].x, yi = pts[i].y, xj = pts[j].x, yj = pts[j].y;
    const hit = (yi > pt.y) !== (yj > pt.y) && pt.x < ((xj - xi) * (pt.y - yi)) / (yj - yi) + xi;
    if (hit) inside = !inside;
  }
  return inside;
}
function polyAreaFt(pts: Pt[]): number {
  if (!pts || pts.length < 3) return 0;
  let a = 0;
  for (let i = 0; i < pts.length; i++) { const j = (i + 1) % pts.length; a += pts[i].x * pts[j].y - pts[j].x * pts[i].y; }
  return Math.abs(a / 2) / (PX_PER_FT * PX_PER_FT);
}
function resolveMuni(city: string | null, st: string | null) {
  const key = city && st ? `${city}, ${st}` : null;
  if (key && key in MUNI) return { name: key, ...MUNI[key as keyof typeof MUNI] };
  if (st && st in STATE_DEF) return { name: city ? `${city}, ${st}` : st, ...STATE_DEF[st as keyof typeof STATE_DEF], note: `${st} regional estimate.` };
  return null;
}
function parseGeo(a: any) {
  if (!a) return { city: null, st: null };
  return { city: a.city || a.town || a.village || a.municipality || a.county || null, st: a["ISO3166-2-lvl4"]?.split("-")[1] || STATE_NAMES[a.state as keyof typeof STATE_NAMES] || null };
}
function areaSplit(zones: Zone[]) {
  const premium = zones.filter((z) => z.type === "premium_lawn" || z.type === "standard_lawn").reduce((s, z) => s + polyAreaFt(z.pts), 0);
  const low = zones.filter((z) => z.type === "kurapia" || z.type === "shade_bed").reduce((s, z) => s + polyAreaFt(z.pts), 0);
  return { premium, low, total: premium + low };
}
function gallons(premium: number, low: number, et: number, eff: boolean) { const e = eff ? 0.8 : 0.55; return (premium * (et / 12) * 7.48) / e + (low * (et / 12) * 0.4 * 7.48) / (eff ? 0.9 : 0.6); }
function savings(zones: Zone[], m: any) {
  const { premium, low } = areaSplit(zones);
  const effGal = gallons(premium, low, m.et, true), baseGal = gallons(premium, low, m.et, false);
  const saved = Math.max(0, baseGal - effGal);
  return { effGal, saved, dollarsSaved: (saved / 1000) * m.rate, effCost: (effGal / 1000) * m.rate };
}
// Returns distance from pt to segment ab, plus the inward normal (from edge toward pt)
function segmentDist(pt: Pt, a: Pt, b: Pt): { dist: number; nx: number; ny: number } {
  const dx = b.x - a.x, dy = b.y - a.y, len2 = dx * dx + dy * dy;
  if (len2 === 0) { const d = Math.hypot(pt.x - a.x, pt.y - a.y); return { dist: d, nx: d > 0 ? (pt.x - a.x) / d : 0, ny: d > 0 ? (pt.y - a.y) / d : 0 }; }
  const t = Math.max(0, Math.min(1, ((pt.x - a.x) * dx + (pt.y - a.y) * dy) / len2));
  const fx = a.x + t * dx, fy = a.y + t * dy;
  const dist = Math.hypot(pt.x - fx, pt.y - fy);
  return { dist, nx: dist > 0 ? (pt.x - fx) / dist : 0, ny: dist > 0 ? (pt.y - fy) / dist : 0 };
}
// Detect spray arc (90°corner / 180°edge / 360°interior) based on zone boundary proximity
function detectHeadArc(pt: Pt, zonePts: Pt[], threshPx: number): { arc: number; dir: number } {
  const close: { nx: number; ny: number }[] = [];
  for (let i = 0; i < zonePts.length; i++) {
    const e = segmentDist(pt, zonePts[i], zonePts[(i + 1) % zonePts.length]);
    if (e.dist < threshPx) close.push(e);
  }
  if (close.length === 0) return { arc: 360, dir: 0 };
  const nx = close.reduce((s, e) => s + e.nx, 0) / close.length;
  const ny = close.reduce((s, e) => s + e.ny, 0) / close.length;
  return { arc: close.length >= 2 ? 90 : 180, dir: Math.atan2(ny, nx) * 180 / Math.PI };
}
// SVG pie-slice path for spray arc (arc<360) or defer to <circle> for full rotation
function arcPath(cx: number, cy: number, r: number, arcDeg: number, dirDeg: number): string {
  const d = dirDeg * Math.PI / 180, half = (arcDeg / 2) * Math.PI / 180;
  const x1 = cx + r * Math.cos(d - half), y1 = cy + r * Math.sin(d - half);
  const x2 = cx + r * Math.cos(d + half), y2 = cy + r * Math.sin(d + half);
  return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${arcDeg > 180 ? 1 : 0} 1 ${x2} ${y2} Z`;
}
function autoPlace(zones: Zone[], scale: number = PX_PER_FT): Head[] {
  const out: Head[] = [];
  zones.forEach((z) => {
    const zt = ZONE_TYPES[z.type as keyof typeof ZONE_TYPES], key = zt.rec[0] as keyof typeof HEADS, h = HEADS[key];
    const sp = h.radius * scale * 0.65;
    const thresh = h.radius * scale * 0.45;
    const xs = z.pts.map((p) => p.x), ys = z.pts.map((p) => p.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    for (let x = minX + sp / 2; x < maxX; x += sp) for (let y = minY + sp / 2; y < maxY; y += sp) {
      if (!pipPx({ x, y }, z.pts)) continue;
      const { arc, dir } = detectHeadArc({ x, y }, z.pts, thresh);
      out.push({ id: Date.now() + Math.random(), x, y, type: key, radius: h.radius, zoneType: z.type, arc, dir });
    }
  });
  return out;
}
function buildRecs(zones: Zone[], heads: Head[]) {
  const recs: { type: string; text: string }[] = [], { premium, low } = areaSplit(zones);
  zones.forEach((z) => {
    const zt = ZONE_TYPES[z.type as keyof typeof ZONE_TYPES];
    heads.filter((h) => h.zoneType === z.type).forEach((h) => {
      if (zt.avoid.includes(h.type)) recs.push({ type: "warn", text: `${HEADS[h.type as keyof typeof HEADS].name} isn't ideal in ${zt.label} — local premium lawns favor ${HEADS[zt.rec[0] as keyof typeof HEADS].name}.` });
    });
  });
  if (premium > 800 && low === 0) recs.push({ type: "tip", text: `Convert a border strip to Kurapia or a shaded bed. Living low-water groundcover cuts irrigation ~60% while keeping a cool microclimate — no fake turf, no gravel.` });
  if (premium > 1500) recs.push({ type: "tip", text: `Right-size the turf: a smaller, well-shaded lawn stays cooler and fights urban heat-island effect.` });
  const seen = new Set();
  return recs.filter((r) => (seen.has(r.text) ? false : seen.add(r.text)));
}

function runTests() {
  // @ts-ignore - test harness uses loose typing for simplicity
  const out: { name: string; pass: boolean; msg?: string }[] = [];
  const ok = (a: number, b: number, t = 0.03) => Math.abs(a - b) <= Math.abs(b) * t + 1e-9;
  const sq = (x: number, y: number, ftSide: number) => { const s = ftSide * PX_PER_FT; return [{ x, y }, { x: x + s, y }, { x: x + s, y: y + s }, { x, y: y + s }]; };
  const T = (name: string, fn: () => void) => { try { fn(); out.push({ name, pass: true }); } catch (e: any) { out.push({ name, pass: false, msg: e.message }); } };
  const ex = (c: boolean, m?: string) => { if (!c) throw new Error(m || "failed"); };

  T("pip inside", () => ex(pipPx({ x: 50, y: 50 }, sq(0, 0, 50))));
  T("pip outside", () => ex(!pipPx({ x: 999, y: 999 }, sq(0, 0, 50))));
  T("area of 50ft square ≈ 2500 ft²", () => { const a = polyAreaFt(sq(0, 0, 50)); ex(ok(a, 2500), `got ${a}`); });
  T("area <3 pts = 0", () => ex(polyAreaFt([{ x: 0, y: 0 }]) === 0));
  T("resolveMuni Gilbert exact", () => { const r = resolveMuni("Gilbert", "AZ"); ex(r && r.rate === 5.8); });
  T("resolveMuni unknown AZ → state", () => { const r = resolveMuni("Xtown", "AZ"); ex(r && r.rate === STATE_DEF.AZ.rate); });
  T("resolveMuni unknown state → null", () => ex(resolveMuni("X", "ZZ") === null));
  T("parseGeo town+code", () => { const r = parseGeo({ town: "Gilbert", "ISO3166-2-lvl4": "US-AZ" }); ex(r.city === "Gilbert" && r.st === "AZ"); });
  T("parseGeo state name → abbr", () => ex(parseGeo({ state: "Arizona" }).st === "AZ"));
  T("savings: bigger lawn saves more", () => { const a = savings([{ type: "premium_lawn", pts: sq(0, 0, 30) }], MUNI["Gilbert, AZ"]); const b = savings([{ type: "premium_lawn", pts: sq(0, 0, 60) }], MUNI["Gilbert, AZ"]); ex(b.dollarsSaved > a.dollarsSaved); });
  T("savings: higher rate saves more", () => { const z = [{ type: "premium_lawn", pts: sq(0, 0, 40) }]; ex(savings(z, MUNI["Gilbert, AZ"]).dollarsSaved > savings(z, MUNI["Mesa, AZ"]).dollarsSaved); });
  T("savings: empty = 0", () => ex(savings([], MUNI["Gilbert, AZ"]).dollarsSaved === 0));
  T("recs: rotor on premium warns", () => ex(buildRecs([{ type: "premium_lawn", pts: sq(0, 0, 30) }], [{ id: 1, x: 0, y: 0, type: "rotor", radius: 35, zoneType: "premium_lawn", arc: 360, dir: 0 }]).some((r) => r.type === "warn")));
  T("recs: big turf suggests Kurapia", () => ex(buildRecs([{ type: "premium_lawn", pts: sq(0, 0, 40) }], []).some((r) => /Kurapia/i.test(r.text))));
  T("BDD: draw→autoplace→inside+MP+savings", () => {
    const zones = [{ type: "premium_lawn", pts: sq(20, 20, 50) }];
    const hs = autoPlace(zones);
    ex(hs.length > 0, "heads placed"); ex(hs.every((h) => pipPx(h, zones[0].pts)), "all inside"); ex(hs.every((h) => h.type === "mp_rotator"), "MP rotator"); ex(savings(zones, MUNI["Gilbert, AZ"]).dollarsSaved > 0, "savings>0");
  });
  T("BDD: kurapia → drip only", () => { const hs = autoPlace([{ type: "kurapia", pts: sq(0, 0, 40) }]); ex(hs.length > 0 && hs.every((h) => h.type === "drip")); });
  T("BDD: erase head shrinks plan", () => { let hs = autoPlace([{ type: "premium_lawn", pts: sq(0, 0, 50) }]); const n = hs.length; hs = hs.filter((h) => h.id !== hs[0].id); ex(hs.length === n - 1); });
  return out;
}

function useLeaflet() {
  const [status, setStatus] = useState(window.L ? "ready" : "loading");
  useEffect(() => {
    if (window.L) { setStatus("ready"); return; }
    let done = false;
    const fail = setTimeout(() => { if (!done) setStatus("failed"); }, 8000);
    if (!document.querySelector("link[data-leaflet]")) {
      const l = document.createElement("link"); l.rel = "stylesheet"; l.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css"; l.setAttribute("data-leaflet", "1"); document.head.appendChild(l);
    }
    let s = document.querySelector("script[data-leaflet]");
    if (!s) { s = document.createElement("script"); s.src = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"; s.setAttribute("data-leaflet", "1"); document.body.appendChild(s); }
    const onload = () => { done = true; clearTimeout(fail); setStatus("ready"); };
    const onerr = () => { done = true; clearTimeout(fail); setStatus("failed"); };
    s.addEventListener("load", onload); s.addEventListener("error", onerr);
    return () => { s.removeEventListener("load", onload); s.removeEventListener("error", onerr); clearTimeout(fail); };
  }, []);
  return status;
}

export default function SprinklerSmart() {
  const [phase, setPhase] = useState<string>("landing");
  const [address, setAddress] = useState<string>("");
  const [muniName, setMuniName] = useState<string>("Gilbert, AZ");
  const [resolved, setResolved] = useState<any>(null);
  const [geo, setGeo] = useState<string>("");
  const [tool, setTool] = useState<string>("zone");
  const [zoneType, setZoneType] = useState<string>("premium_lawn");
  const [headType, setHeadType] = useState<string>("mp_rotator");
  const [zones, setZones] = useState<Zone[]>([]);
  const [heads, setHeads] = useState<Head[]>([]);
  const [draft, setDraft] = useState<Pt[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [drag, setDrag] = useState<number | null>(null);
  const [showTests, setShowTests] = useState<boolean>(false);
  const [testResults] = useState(() => { try { return runTests(); } catch (e) { return [{ name: "harness", pass: false, msg: String(e) }]; } });

  const leaflet = useLeaflet();
  const mapDiv = useRef(null);
  const mapObj = useRef(null);
  const layer = useRef(null);
  const center = useRef([33.3528, -111.789]);

  const m = resolved || MUNI[muniName] || MUNI["Other / Custom"];
  const testsPassed = testResults.filter((t) => t.pass).length;
  const testsTotal = testResults.length;
  const allPass = testsPassed === testsTotal;

  const [pxPerFt, setPxPerFt] = useState(PX_PER_FT);
  // Stable ref to reproject fn so the Leaflet event listener always calls the latest closure
  const reprojectRef = useRef<(() => void) | null>(null);
  reprojectRef.current = () => {
    const map = mapObj.current;
    if (!map) return;
    setHeads((hs) => hs.map((h) => {
      if (h.lat == null || h.lng == null) return h;
      const pt = map.latLngToContainerPoint([h.lat, h.lng]);
      return { ...h, x: pt.x, y: pt.y };
    }));
    setZones((zs) => zs.map((z) => {
      if (!z.geo || z.geo.length !== z.pts.length) return z;
      const pts = z.geo.map((g) => { const pt = map.latLngToContainerPoint([g.lat, g.lng]); return { x: pt.x, y: pt.y, lat: g.lat, lng: g.lng }; });
      return { ...z, pts };
    }));
    const c = map.getCenter();
    const p1 = map.latLngToContainerPoint(c);
    const p2 = map.latLngToContainerPoint([c.lat + 0.3048 / 111320, c.lng]);
    const px = Math.abs(p1.y - p2.y);
    if (px > 0) setPxPerFt(px);
  };

  useEffect(() => {
    if (phase !== "app" || leaflet !== "ready" || !mapDiv.current) return;
    if (mapObj.current) { mapObj.current.invalidateSize(); return; }
    try {
      const L = window.L;
      const map = L.map(mapDiv.current, { zoomControl: true }).setView(center.current, 20);
      L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", { maxZoom: 22, maxNativeZoom: 19, attribution: "Esri" }).addTo(map);
      L.control.scale({ metric: true, imperial: true }).addTo(map);
      map.on("zoomend moveend", () => reprojectRef.current?.());
      map.on("click", (e) => clickRef.current?.(e));
      mapObj.current = map;
      setTimeout(() => { map.invalidateSize(); reprojectRef.current?.(); }, 150);
    } catch (e) { /* map fails → grid fallback uses PX_PER_FT = 3 */ }
  }, [phase, leaflet]);

  function getXY(e) {
    const host = (mapObj.current && mapObj.current.getContainer()) || mapDiv.current;
    const r = host.getBoundingClientRect();
    const cx = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
    const cy = (e.touches ? e.touches[0].clientY : e.clientY) - r.top;
    return { x: Math.max(0, Math.min(r.width, cx)), y: Math.max(0, Math.min(r.height, cy)) };
  }
  const dragged = useRef(false);
  function geoAt(pt: Pt): { lat: number; lng: number } | undefined {
    if (!mapObj.current) return undefined;
    const ll = mapObj.current.containerPointToLatLng([pt.x, pt.y]);
    return { lat: ll.lat, lng: ll.lng };
  }
  // Stable ref so Leaflet's click listener always sees current state/tool
  const clickRef = useRef<((e: any) => void) | null>(null);
  clickRef.current = (e) => {
    // e is a Leaflet event with .containerPoint and .latlng
    const pt = { x: e.containerPoint.x, y: e.containerPoint.y };
    const geo = { lat: e.latlng.lat, lng: e.latlng.lng };
    if (tool === "zone") {
      setDraft((d) => [...d, { ...pt, ...geo }]);
    } else if (tool === "head") {
      const zone = zones.find((z) => pipPx(pt, z.pts));
      const hd = HEADS[headType as keyof typeof HEADS];
      const { arc, dir } = zone ? detectHeadArc(pt, zone.pts, hd.radius * pxPerFt * 0.45) : { arc: 360, dir: 0 };
      setHeads((hs) => [...hs, { id: Date.now() + Math.random(), x: pt.x, y: pt.y, ...geo, type: headType, radius: hd.radius, zoneType: zone?.type || "standard_lawn", arc, dir }]);
    } else if (tool === "erase") {
      const hit = heads.find((h) => Math.hypot(h.x - pt.x, h.y - pt.y) < 14);
      if (hit) { setHeads((hs) => hs.filter((h) => h.id !== hit.id)); return; }
      const z = zones.find((z) => pipPx(pt, z.pts));
      if (z) setZones((zs) => zs.filter((x) => x.id !== z.id));
    }
  };
  // Fallback click handler for offline/grid mode (no Leaflet map)
  function onSvgClick(e) {
    if (mapObj.current) return; // Leaflet handles it
    const r = (mapDiv.current as HTMLElement).getBoundingClientRect();
    const pt = { x: e.clientX - r.left, y: e.clientY - r.top };
    if (tool === "zone") setDraft((d) => [...d, pt]);
    else if (tool === "head") {
      const zone = zones.find((z) => pipPx(pt, z.pts));
      const hd = HEADS[headType as keyof typeof HEADS];
      const { arc, dir } = zone ? detectHeadArc(pt, zone.pts, hd.radius * pxPerFt * 0.45) : { arc: 360, dir: 0 };
      setHeads((hs) => [...hs, { id: Date.now() + Math.random(), x: pt.x, y: pt.y, type: headType, radius: hd.radius, zoneType: zone?.type || "standard_lawn", arc, dir }]);
    } else if (tool === "erase") {
      const hit = heads.find((h) => Math.hypot(h.x - pt.x, h.y - pt.y) < 14);
      if (hit) { setHeads((hs) => hs.filter((h) => h.id !== hit.id)); return; }
      const z = zones.find((z) => pipPx(pt, z.pts));
      if (z) setZones((zs) => zs.filter((x) => x.id !== z.id));
    }
  }
  function finishZone() {
    if (draft.length >= 3) {
      const geo = draft.every((p) => p.lat != null) ? draft.map((p) => ({ lat: p.lat!, lng: p.lng! })) : undefined;
      setZones((zs) => [...zs, { id: Date.now(), type: zoneType, pts: draft.map((p) => ({ x: p.x, y: p.y })), geo }]);
    }
    setDraft([]);
    setTool("head");
  }
  function doAuto() {
    if (!zones.length) return;
    const placed = autoPlace(zones, pxPerFt);
    setHeads(placed.map((h) => {
      const geo = geoAt(h);
      return { ...h, id: Date.now() + Math.random(), ...geo };
    }));
  }

  useEffect(() => {
    function move(e) {
      if (drag == null) return;
      dragged.current = true;
      const pt = getXY(e);
      const geo = mapObj.current ? (() => { const ll = mapObj.current.containerPointToLatLng([pt.x, pt.y]); return { lat: ll.lat, lng: ll.lng }; })() : {};
      setHeads((hs) => hs.map((h) => (h.id === drag ? { ...h, x: pt.x, y: pt.y, ...geo } : h)));
    }
    function up() { setDrag(null); }
    window.addEventListener("mousemove", move); window.addEventListener("mouseup", up); window.addEventListener("touchmove", move); window.addEventListener("touchend", up);
    return () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); window.removeEventListener("touchmove", move); window.removeEventListener("touchend", up); };
  }, [drag]);

  async function loadProperty() {
    setGeo("locating");
    let c = (MUNI[muniName] || MUNI["Other / Custom"]).center, detected = null;
    if (address.trim()) {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=1&q=${encodeURIComponent(address)}`, { headers: { "Accept-Language": "en" } });
        const data = await res.json();
        if (data && data.length) { c = [parseFloat(data[0].lat), parseFloat(data[0].lon)]; const { city, st } = parseGeo(data[0].address); detected = resolveMuni(city, st); }
      } catch (e) { /* offline → fall back to chosen city */ }
    }
    const fm = detected || (MUNI[muniName] ? { name: muniName, ...MUNI[muniName] } : null);
    setResolved(fm); setZoneType((fm || m).style === "premium" ? "premium_lawn" : "standard_lawn"); setHeadType("mp_rotator");
    center.current = c; setGeo(""); setPhase("app");
  }

  const { premium, low, total } = areaSplit(zones);
  const s = savings(zones, m);
  const parts = heads.reduce((a: Record<string, number>, h) => { a[h.type] = (a[h.type] || 0) + 1; return a; }, {});
  const partsTotal = Object.entries(parts).reduce((x, [k, n]) => x + HEADS[k as keyof typeof HEADS].price * (n as number), 0);
  const recs = buildRecs(zones, heads);
  const sel = heads.find((h) => h.id === selected);
  const dollar = (n: number) => "$" + Math.round(n).toLocaleString();

  if (phase === "landing") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-emerald-50 to-teal-100 flex items-center justify-center p-6">
        <div className="max-w-lg w-full bg-white rounded-3xl shadow-2xl p-8 border border-emerald-100">
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-gradient-to-br from-sky-500 to-emerald-500 p-2 rounded-xl"><Droplets className="text-white" size={28} /></div>
            <h1 className="text-2xl font-extrabold text-slate-800">SprinklerSmart</h1>
          </div>
          <p className="text-slate-500 mb-6 text-sm">Plan perfect coverage. Slash your water bill. Build a cooler, greener yard.</p>
          <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Property Address</label>
          <div className="flex gap-2 mt-1 mb-4">
            <div className="flex-1 flex items-center gap-2 border border-slate-200 rounded-xl px-3 bg-slate-50">
              <MapPin size={18} className="text-emerald-500" />
              <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Main St, Gilbert, AZ" className="flex-1 py-3 bg-transparent outline-none text-slate-700 text-sm" />
            </div>
          </div>
          <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Your City <span className="font-normal text-slate-400 normal-case">(auto-detected, or type)</span></label>
          <input value={muniName} onChange={(e) => setMuniName(e.target.value)} list="ml" className="w-full mt-1 mb-1.5 border border-slate-200 rounded-xl px-3 py-3 bg-slate-50 text-slate-700 text-sm outline-none" />
          <datalist id="ml">{Object.keys(MUNI).map((k) => <option key={k} value={k} />)}</datalist>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {["Gilbert, AZ", "Phoenix, AZ", "Chandler, AZ", "Mesa, AZ", "Scottsdale, AZ"].map((c) => (
              <button key={c} onClick={() => setMuniName(c)} className={`text-[11px] px-2 py-1 rounded-full border transition ${muniName === c ? "bg-emerald-500 text-white border-emerald-500" : "border-slate-200 text-slate-500"}`}>{c.split(",")[0]}</button>
            ))}
          </div>
          <p className="text-xs text-emerald-600 mb-6">💧 {m.note} ${m.rate.toFixed(2)}/1,000 gal{MUNI[muniName] ? "" : " (regional est.)"}.</p>
          <button onClick={loadProperty} disabled={geo === "locating"} className="w-full bg-gradient-to-r from-sky-500 to-emerald-500 hover:from-sky-600 hover:to-emerald-600 disabled:opacity-60 text-white font-bold py-3.5 rounded-xl shadow-lg flex items-center justify-center gap-2">
            {geo === "locating" ? <><Loader2 size={18} className="animate-spin" /> Finding…</> : <><Search size={18} /> Load My Property</>}
          </button>
          <button onClick={() => setShowTests((v) => !v)} className="w-full mt-3 text-[11px] flex items-center justify-center gap-1.5 text-slate-400 hover:text-slate-600">
            {allPass ? <CheckCircle2 size={12} className="text-emerald-500" /> : <XCircle size={12} className="text-red-500" />}
            Self-test: {testsPassed}/{testsTotal} passing · {showTests ? "hide" : "view"}
          </button>
          {showTests && (
            <div className="mt-2 bg-slate-50 rounded-xl border border-slate-200 max-h-48 overflow-auto text-[11px] divide-y divide-slate-100">
              {testResults.map((t, i) => (
                <div key={i} className="flex items-start gap-1.5 px-2.5 py-1.5">
                  {t.pass ? <CheckCircle2 size={12} className="text-emerald-500 shrink-0 mt-0.5" /> : <XCircle size={12} className="text-red-500 shrink-0 mt-0.5" />}
                  <div><span className={t.pass ? "text-slate-600" : "text-red-600 font-semibold"}>{t.name}</span>{!t.pass && <div className="text-red-500 font-mono">{t.msg}</div>}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      <div className="bg-white border-b border-slate-200 px-5 py-3 flex items-center justify-between sticky top-0 z-[1000]">
        <div className="flex items-center gap-2">
          <div className="bg-gradient-to-br from-sky-500 to-emerald-500 p-1.5 rounded-lg"><Droplets className="text-white" size={20} /></div>
          <div><div className="font-bold text-sm leading-tight">SprinklerSmart</div><div className="text-[11px] text-slate-400 leading-tight flex items-center gap-1"><MapPin size={10} />{address || m.name || muniName} · {m.name || muniName}</div></div>
        </div>
        <button onClick={() => { setPhase("landing"); setZones([]); setHeads([]); setDraft([]); }} className="text-xs text-slate-500 hover:text-slate-700">Change</button>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 p-4 max-w-7xl mx-auto">
        <div className="flex-1">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-3 mb-3">
            <div className="flex flex-wrap gap-2 items-center">
              {[{ k: "zone", label: "Draw Zone", icon: Layers }, { k: "head", label: "Heads", icon: Droplets }, { k: "erase", label: "Erase", icon: Trash2 }].map(({ k, label, icon: Icon }) => (
                <button key={k} onClick={() => { setTool(k); setDraft([]); setSelected(null); }} className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg ${tool === k ? "bg-emerald-500 text-white shadow" : "bg-slate-100 text-slate-600"}`}><Icon size={14} />{label}</button>
              ))}
              <div className="h-6 w-px bg-slate-200 mx-1" />
              <button onClick={doAuto} className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg bg-gradient-to-r from-violet-500 to-sky-500 text-white shadow"><Zap size={14} /> AI Auto-Place</button>
              <span className="text-[10px] text-slate-400 hidden sm:block">Heads mode: click=place/select · drag=move</span>
            </div>
            {tool === "zone" && (
              <div className="mt-3 flex flex-wrap gap-2 items-center">
                <span className="text-xs text-slate-500">Zone:</span>
                {Object.entries(ZONE_TYPES).map(([k, z]) => (
                  <button key={k} onClick={() => setZoneType(k)} className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border ${zoneType === k ? "border-slate-800 font-bold" : "border-slate-200"}`}><span className="w-3 h-3 rounded-sm" style={{ background: z.color }} />{z.label}</button>
                ))}
                {draft.length >= 3 && <button onClick={finishZone} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-emerald-500 text-white ml-auto">✓ Finish ({draft.length})</button>}
                {draft.length > 0 && draft.length < 3 && <span className="text-xs text-slate-400 ml-auto">{3 - draft.length} more…</span>}
              </div>
            )}
            {tool === "head" && (
              <div className="mt-3 flex flex-wrap gap-2 items-center">
                <span className="text-xs text-slate-500">Head:</span>
                {Object.entries(HEADS).map(([k, h]) => (
                  <button key={k} onClick={() => setHeadType(k)} className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border ${headType === k ? "border-slate-800 font-bold" : "border-slate-200"}`}><span className="w-3 h-3 rounded-full" style={{ background: h.color }} />{h.name}{h.saving && <Leaf size={11} className="text-emerald-500" />}</button>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-2">
            <div className="relative w-full rounded-xl overflow-hidden" style={{ height: 460 }}>
              <div ref={mapDiv} className="absolute inset-0" style={{ background: leaflet === "ready" ? "#cbd5e1" : "repeating-linear-gradient(0deg,#e2e8f0 0 1px,transparent 1px 18px),repeating-linear-gradient(90deg,#e2e8f0 0 1px,transparent 1px 18px),linear-gradient(135deg,#d1fae5,#cffafe)", cursor: tool === "zone" || tool === "head" ? "crosshair" : tool === "erase" ? "pointer" : "grab" }} />
              <div className="absolute top-2 left-2 z-[500] text-[10px] px-2 py-1 rounded-full bg-white/90 shadow text-slate-500 flex items-center gap-1">
                {leaflet === "loading" && <><Loader2 size={10} className="animate-spin" /> loading satellite…</>}
                {leaflet === "ready" && <><CheckCircle2 size={10} className="text-emerald-500" /> satellite</>}
                {leaflet === "failed" && <><Info size={10} className="text-amber-500" /> grid mode (offline) · 6 ft squares</>}
              </div>
              <svg className="absolute inset-0 w-full h-full z-[400]" style={{ pointerEvents: "none" }} onClick={onSvgClick}>
                {/* coverage arcs — drawn beneath zones so zones are readable */}
                {heads.map((h) => {
                  const hd = HEADS[h.type as keyof typeof HEADS];
                  const r = h.radius * pxPerFt;
                  const isSelected = selected === h.id;
                  return (
                    <g key={`cov-${h.id}`}>
                      {h.arc >= 360
                        ? <circle cx={h.x} cy={h.y} r={r} fill={hd.color} fillOpacity={isSelected ? 0.25 : 0.13} stroke={hd.color} strokeWidth={isSelected ? 2 : 1.5} strokeDasharray="6 3" />
                        : <path d={arcPath(h.x, h.y, r, h.arc, h.dir)} fill={hd.color} fillOpacity={isSelected ? 0.25 : 0.13} stroke={hd.color} strokeWidth={isSelected ? 2 : 1.5} strokeDasharray="6 3" />
                      }
                      <text x={h.x} y={h.y - r - 4} textAnchor="middle" fontSize="9" fontWeight="600" fill={hd.color} stroke="#000" strokeWidth="0.3" paintOrder="stroke">{h.radius} ft</text>
                    </g>
                  );
                })}
                {zones.map((z) => {
                  const zt = ZONE_TYPES[z.type as keyof typeof ZONE_TYPES];
                  return (<g key={z.id}>
                    <polygon points={z.pts.map((p) => `${p.x},${p.y}`).join(" ")} fill={zt.color} fillOpacity="0.25" stroke={zt.color} strokeWidth="2" />
                    <text x={z.pts[0].x + 4} y={z.pts[0].y - 6} fontSize="11" fontWeight="700" fill="#fff" stroke="#000" strokeWidth="0.4" paintOrder="stroke">{zt.label} · {Math.round(polyAreaFt(z.pts))} ft²</text>
                  </g>);
                })}
                {draft.length > 0 && <polyline points={draft.map((p) => `${p.x},${p.y}`).join(" ")} fill="none" stroke="#0f172a" strokeWidth="2" strokeDasharray="4 4" />}
                {draft.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="4" fill="#0f172a" />)}
                {/* head dots — always interactive in heads/erase mode */}
                {heads.map((h) => {
                  const hd = HEADS[h.type as keyof typeof HEADS];
                  const isSelected = selected === h.id;
                  return (
                    <circle key={`dot-${h.id}`} cx={h.x} cy={h.y} r={isSelected ? 8 : 6}
                      fill={hd.color} stroke="white" strokeWidth={isSelected ? 3 : 2}
                      style={{ cursor: tool === "head" ? "grab" : tool === "erase" ? "pointer" : "default", pointerEvents: (tool === "head" || tool === "erase") ? "auto" : "none" }}
                      onClick={(e) => {
                        e.stopPropagation();
                        e.nativeEvent.stopPropagation();
                        if (tool === "head") setSelected((s) => s === h.id ? null : h.id);
                        else if (tool === "erase") { setHeads((hs) => hs.filter((x) => x.id !== h.id)); setSelected(null); }
                      }}
                      onMouseDown={(e) => {
                        if (tool !== "head") return;
                        e.stopPropagation();
                        e.nativeEvent.stopPropagation();
                        setSelected(h.id);
                        setDrag(h.id);
                      }}
                      onTouchStart={(e) => {
                        if (tool !== "head") return;
                        e.stopPropagation();
                        e.nativeEvent.stopPropagation();
                        setSelected(h.id);
                        setDrag(h.id);
                      }}
                    />
                  );
                })}
              </svg>
              {zones.length === 0 && draft.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center z-[460] pointer-events-none">
                  <div className="text-center bg-white/80 px-5 py-3 rounded-xl"><Layers className="mx-auto mb-1 text-emerald-500" /><p className="text-sm font-semibold text-slate-700">Draw your lawn</p><p className="text-xs text-slate-500">Tap "Draw Zone", click points, then Finish.</p></div>
                </div>
              )}
            </div>
            <p className="text-[11px] text-slate-400 px-2 pt-1.5">{leaflet === "ready" ? "Real satellite imagery. Draw zones over your lawn; rings are to scale." : "Grid = 6 ft squares, to scale. Satellite loads when online."}</p>
          </div>

          {sel && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 mt-3">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-sm">Edit Head — {HEADS[sel.type as keyof typeof HEADS].name}</span>
                <button onClick={() => { setHeads((hs) => hs.filter((h) => h.id !== sel.id)); setSelected(null); }} className="text-red-500 text-xs flex items-center gap-1"><Trash2 size={12} />Remove</button>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="text-xs text-slate-500">Spray Radius: {sel.radius} ft</label>
                  <input type="range" min="6" max="40" value={sel.radius} onChange={(e) => setHeads((hs) => hs.map((h) => (h.id === selected ? { ...h, radius: +e.target.value } : h)))} className="w-full accent-emerald-500" />
                </div>
                <div>
                  <label className="text-xs text-slate-500">Arc: {sel.arc}°</label>
                  <select value={sel.arc} onChange={(e) => setHeads((hs) => hs.map((h) => (h.id === selected ? { ...h, arc: +e.target.value } : h)))} className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm mt-1">
                    <option value={90}>90° Corner</option>
                    <option value={180}>180° Edge</option>
                    <option value={270}>270° Large arc</option>
                    <option value={360}>360° Full circle</option>
                  </select>
                </div>
              </div>
              <label className="text-xs text-slate-500">Head type</label>
              <select value={sel.type} onChange={(e) => setHeads((hs) => hs.map((h) => (h.id === selected ? { ...h, type: e.target.value } : h)))} className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm mt-1">{Object.entries(HEADS).map(([k, h]) => <option key={k} value={k}>{h.name}</option>)}</select>
            </div>
          )}
        </div>

        <div className="w-full lg:w-80 space-y-3">
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-2xl shadow-lg p-5">
            <div className="flex items-center gap-1.5 text-emerald-100 text-xs font-semibold uppercase tracking-wide"><DollarSign size={14} />Estimated Annual Savings</div>
            <div className="text-4xl font-extrabold mt-1">{dollar(s.dollarsSaved)}/yr</div>
            <div className="text-emerald-100 text-xs mt-1">vs. conventional rotors · {m.name || muniName}</div>
            <div className="grid grid-cols-2 gap-2 mt-4 text-center">
              <div className="bg-white/15 rounded-xl py-2"><div className="text-lg font-bold">{Math.round(s.saved).toLocaleString()}</div><div className="text-[10px] text-emerald-100">gal saved/yr</div></div>
              <div className="bg-white/15 rounded-xl py-2"><div className="text-lg font-bold">{dollar(s.effCost)}</div><div className="text-[10px] text-emerald-100">water cost/yr</div></div>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
            <div className="font-bold text-sm mb-2 flex items-center gap-1.5"><Layers size={15} className="text-emerald-500" />Property Breakdown</div>
            <Row label="Total irrigated" val={`${Math.round(total).toLocaleString()} ft²`} /><Row label="Turf lawn" val={`${Math.round(premium).toLocaleString()} ft²`} /><Row label="Low-water cover/beds" val={`${Math.round(low).toLocaleString()} ft²`} /><Row label="Sprinkler heads" val={`${heads.length}`} /><Row label="Water-saving heads" val={`${heads.filter((h) => HEADS[h.type].saving).length}/${heads.length}`} />
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
            <div className="font-bold text-sm mb-2 flex items-center gap-1.5"><TreePine size={15} className="text-teal-600" />Smart Recommendations</div>
            {recs.length === 0 && <p className="text-xs text-slate-400">Draw zones and place heads for tailored advice.</p>}
            <div className="space-y-2">{recs.map((r, i) => (<div key={i} className={`text-xs rounded-lg p-2.5 flex gap-2 ${r.type === "warn" ? "bg-amber-50 text-amber-800" : "bg-teal-50 text-teal-800"}`}>{r.type === "warn" ? <Info size={14} className="shrink-0 mt-0.5" /> : <Leaf size={14} className="shrink-0 mt-0.5" />}<span>{r.text}</span></div>))}</div>
            <div className="mt-3 text-[11px] text-slate-500 bg-slate-50 rounded-lg p-2.5 flex gap-2"><Sun size={14} className="shrink-0 mt-0.5 text-amber-500" />Right-sized, shaded lawns + living groundcover create cooler microclimates and cut the urban heat-island effect. Never artificial turf or gravel xeriscape.</div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
            <div className="font-bold text-sm mb-2 flex items-center gap-1.5"><ShoppingCart size={15} className="text-sky-500" />Shop This Plan</div>
            {Object.keys(parts).length === 0 && <p className="text-xs text-slate-400">Place heads to build your buy list.</p>}
            <div className="space-y-2">{Object.entries(parts).map(([k, n]) => { const key = k as keyof typeof HEADS; return (<a key={k} href={HEADS[key].affiliate} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between gap-2 border border-slate-100 hover:border-sky-300 hover:bg-sky-50 rounded-lg p-2.5 group"><div><div className="text-xs font-semibold">{HEADS[key].brand}</div><div className="text-[11px] text-slate-400">{n} × {dollar(HEADS[key].price)} {HEADS[key].saving && <span className="text-emerald-500">· saving</span>}</div></div><div className="text-right"><div className="text-xs font-bold">{dollar(HEADS[key].price * (n as number))}</div><div className="text-[10px] text-sky-500 group-hover:underline">Buy →</div></div></a>); })}</div>
            {partsTotal > 0 && <><div className="flex justify-between items-center mt-3 pt-2 border-t border-slate-100"><span className="text-xs font-semibold">Subtotal</span><span className="text-sm font-extrabold">{dollar(partsTotal)}</span></div><p className="text-[10px] text-slate-400 mt-1">Affiliate links — we may earn a commission. Pays back in ~{s.dollarsSaved > 0 ? Math.max(1, Math.round(partsTotal / s.dollarsSaved * 10) / 10) : "—"} yrs of savings.</p></>}
          </div>
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 text-white rounded-2xl shadow-lg p-4">
            <div className="font-bold text-sm flex items-center gap-1.5"><Download size={15} />Pro Plan — $19</div>
            <p className="text-xs text-slate-300 mt-1">PDF blueprint, valve schedule, contractor handoff & {m.name || muniName} rebate paperwork.</p>
            <button className="w-full mt-3 bg-white text-slate-900 font-bold text-sm py-2.5 rounded-xl hover:bg-slate-100">Export Pro Plan</button>
          </div>
          <div className="border-2 border-dashed border-slate-300 rounded-2xl p-4 text-center"><div className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">Featured Partner</div><div className="text-sm font-bold text-slate-600 mt-1">Hunter · Rain Bird · Kurapia.com</div><p className="text-[11px] text-slate-400">Brand placement slot</p></div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, val }: { label: string; val: string }) { return (<div className="flex justify-between items-center py-1 text-xs"><span className="text-slate-500">{label}</span><span className="font-semibold text-slate-800">{val}</span></div>); }
