import { useEffect, useRef, useState } from 'react';
import {
  Droplets, MapPin, Trash2, DollarSign, Leaf, Sun, ShoppingCart, Search, Layers,
  Zap, TreePine, Info, Loader2, CheckCircle2, XCircle, LocateFixed, FileText,
} from 'lucide-react';
import { ProPlanCard } from './components/ProPlanCard';
import { generatePdf } from './lib/pdf';
import { loadPendingPlan, clearPendingPlan } from './lib/planStorage';
import { HEADS, MUNI, ZONE_TYPES, PX_PER_FT } from './lib/data';
import { pipPxInclusive, polyAreaFt, detectHeadArc, arcPath, autoPlace } from './lib/geometry';
import { areaSplit, savings } from './lib/savings';
import { buildRecs } from './lib/recommendations';
import { resolveMuni, parseGeo } from './lib/location';
import { buildAffiliateUrl } from './lib/affiliate';
import { runSelfTests } from './lib/selftest';
import { analytics } from './lib/analytics';
import { initBilling } from './lib/billing';
import type { HeadKey, Pt, Zone, Head, RateProfile, ZoneTypeKey } from './lib/types';
import type { LeafletMap, LeafletMouseEvent } from './lib/leaflet';

type Tool = 'zone' | 'head' | 'erase';

function useLeaflet(): 'loading' | 'ready' | 'failed' {
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>(window.L ? 'ready' : 'loading');
  useEffect(() => {
    if (window.L) return; // already 'ready' from initializer
    let done = false;
    const fail = window.setTimeout(() => { if (!done) setStatus('failed'); }, 8000);
    if (!document.querySelector('link[data-leaflet]')) {
      const l = document.createElement('link');
      l.rel = 'stylesheet';
      l.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
      l.setAttribute('data-leaflet', '1');
      document.head.appendChild(l);
    }
    let s = document.querySelector<HTMLScriptElement>('script[data-leaflet]');
    if (!s) {
      s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
      s.setAttribute('data-leaflet', '1');
      document.body.appendChild(s);
    }
    const onload = () => { done = true; clearTimeout(fail); setStatus('ready'); };
    const onerr = () => { done = true; clearTimeout(fail); setStatus('failed'); };
    s.addEventListener('load', onload);
    s.addEventListener('error', onerr);
    return () => { s?.removeEventListener('load', onload); s?.removeEventListener('error', onerr); clearTimeout(fail); };
  }, []);
  return status;
}

export default function SprinklerSmart() {
  const [phase, setPhase] = useState<'landing' | 'app'>('landing');
  const [address, setAddress] = useState('');
  const [muniName, setMuniName] = useState('Gilbert, AZ');
  const [resolved, setResolved] = useState<RateProfile | null>(null);
  const [geoStatus, setGeoStatus] = useState('');
  const [tool, setTool] = useState<Tool>('zone');
  const [zoneType, setZoneType] = useState<ZoneTypeKey>('premium_lawn');
  const [headType, setHeadType] = useState<HeadKey>('mp_rotator');
  const [zones, setZones] = useState<Zone[]>([]);
  const [heads, setHeads] = useState<Head[]>([]);
  const [draft, setDraft] = useState<Pt[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [drag, setDrag] = useState<number | null>(null);
  const [showTests, setShowTests] = useState(false);
  const [checkoutToast, setCheckoutToast] = useState<'success' | 'cancel' | null>(() => {
    const p = new URLSearchParams(window.location.search).get('checkout');
    return p === 'success' ? 'success' : p === 'cancel' ? 'cancel' : null;
  });
  const [testResults] = useState(() => {
    try { return runSelfTests(); } catch (e) { return [{ name: 'harness', pass: false, msg: String(e) }]; }
  });
  // Self-test results are real, but a raw test-pass-count reads as dev debug residue on a
  // paid app's marketing screen — only surface it in dev, or opt-in via ?debug=1 (used by
  // e2e coverage of the panel itself and by anyone doing support/QA on a live build).
  const debugMode = import.meta.env.DEV || new URLSearchParams(window.location.search).get('debug') === '1';

  const leaflet = useLeaflet();
  const mapDiv = useRef<HTMLDivElement | null>(null);
  const mapObj = useRef<LeafletMap | null>(null);
  const center = useRef<[number, number]>([33.3528, -111.789]);
  const dragged = useRef(false);

  const m: RateProfile = resolved
    ? resolved
    : MUNI[muniName]
      ? { name: muniName, ...MUNI[muniName] }
      : { name: 'Other / Custom', ...MUNI['Other / Custom'] };

  const testsPassed = testResults.filter((t) => t.pass).length;
  const testsTotal = testResults.length;
  const allPass = testsPassed === testsTotal;

  const [pxPerFt, setPxPerFt] = useState(PX_PER_FT);

  // Session-start analytics
  useEffect(() => { analytics.track('session_start', { muni: muniName }); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Configure RevenueCat once on launch — no-op on web (see lib/billing.ts).
  useEffect(() => { initBilling(); }, []);

  // Stripe return side-effects: clean the URL, trigger PDF download, analytics, auto-dismiss
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkout = params.get('checkout');
    if (!checkout) return;
    const sessionId = params.get('session_id');
    history.replaceState(null, '', window.location.pathname);
    if (checkout === 'success') {
      (async () => {
        if (!sessionId) {
          setCheckoutToast('cancel');
          window.setTimeout(() => setCheckoutToast(null), 4000);
          return;
        }
        try {
          const res = await fetch('/api/verify-checkout?session_id=' + encodeURIComponent(sessionId));
          const data = await res.json();
          if (data && data.verified === true) {
            const plan = loadPendingPlan();
            clearPendingPlan();
            if (plan) {
              analytics.trackProPlanPurchased(1900, { plan_zones: plan.zones.length, plan_heads: plan.heads.length });
              generatePdf(plan).catch(() => {});
            }
            window.setTimeout(() => setCheckoutToast(null), 6000);
          } else {
            setCheckoutToast('cancel');
            window.setTimeout(() => setCheckoutToast(null), 4000);
          }
        } catch {
          setCheckoutToast('cancel');
          window.setTimeout(() => setCheckoutToast(null), 4000);
        }
      })();
    } else if (checkout === 'cancel') {
      window.setTimeout(() => setCheckoutToast(null), 4000);
    }
  }, []);

  // Latest-closure refs so Leaflet's native listeners always see current state.
  const reprojectRef = useRef<() => void>(() => {});
  useEffect(() => {
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
        const pts = z.geo.map((g) => {
          const pt = map.latLngToContainerPoint([g.lat, g.lng]);
          return { x: pt.x, y: pt.y, lat: g.lat, lng: g.lng };
        });
        return { ...z, pts };
      }));
      const c = map.getCenter();
      const p1 = map.latLngToContainerPoint(c);
      const p2 = map.latLngToContainerPoint([c.lat + 0.3048 / 111320, c.lng]);
      const px = Math.abs(p1.y - p2.y);
      if (px > 0) setPxPerFt(px);
    };
  });

  const clickRef = useRef<(e: LeafletMouseEvent) => void>(() => {});
  useEffect(() => {
    clickRef.current = (e) => {
      const pt: Pt = { x: e.containerPoint.x, y: e.containerPoint.y };
      const geo = { lat: e.latlng.lat, lng: e.latlng.lng };
      if (tool === 'zone') {
        setDraft((d) => [...d, { ...pt, ...geo }]);
      } else if (tool === 'head') {
        placeHead(pt, geo);
      } else if (tool === 'erase') {
        eraseAt(pt);
      }
    };
  });

  useEffect(() => {
    if (phase !== 'app' || leaflet !== 'ready' || !mapDiv.current) return;
    if (mapObj.current) { mapObj.current.invalidateSize(); return; }
    const L = window.L;
    if (!L) return;
    try {
      const map = L.map(mapDiv.current, { zoomControl: true }).setView(center.current, 20);
      L.tileLayer('https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', { maxZoom: 22, maxNativeZoom: 21, attribution: 'Google' }).addTo(map);
      L.control.scale({ metric: true, imperial: true }).addTo(map);
      map.on('zoomend moveend', () => reprojectRef.current());
      map.on('click', (ev) => clickRef.current(ev));
      mapObj.current = map;
      window.setTimeout(() => { map.invalidateSize(); reprojectRef.current(); }, 150);
    } catch {
      /* map fails → grid fallback uses PX_PER_FT */
    }
  }, [phase, leaflet]);

  // Map container height/width both track the viewport (clamp() + flex) now, not a fixed
  // px box — Leaflet caches its own size, so it needs an explicit nudge whenever the
  // container's actual rendered size changes, or the tile layer stays clipped to whatever
  // size it had at mount. A ResizeObserver on the map div itself (rather than `window`'s
  // resize event) catches every real cause — window resize, sidebar/toolbar reflow, and
  // mobile Safari's address-bar show/hide, which changes the visible viewport (and thus a
  // dvh-based height) without always firing `window`'s resize event.
  useEffect(() => {
    if (phase !== 'app' || !mapDiv.current) return;
    let raf = 0;
    const onResize = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => { mapObj.current?.invalidateSize(); reprojectRef.current(); });
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(mapDiv.current);
    return () => { ro.disconnect(); cancelAnimationFrame(raf); };
  }, [phase]);

  function geoAt(pt: Pt): { lat: number; lng: number } | undefined {
    if (!mapObj.current) return undefined;
    const ll = mapObj.current.containerPointToLatLng([pt.x, pt.y]);
    return { lat: ll.lat, lng: ll.lng };
  }

  function placeHead(pt: Pt, geo?: { lat: number; lng: number }) {
    const zone = zones.find((z) => pipPxInclusive(pt, z.pts));
    const hd = HEADS[headType];
    const { arc, dir } = zone ? detectHeadArc(pt, zone.pts, hd.radius * pxPerFt * 0.45) : { arc: 360, dir: 0 };
    setHeads((hs) => [...hs, { id: Date.now() + Math.random(), x: pt.x, y: pt.y, ...geo, type: headType, radius: hd.radius, zoneType: zone?.type || 'standard_lawn', arc, dir }]);
  }

  function eraseAt(pt: Pt) {
    const hit = heads.find((h) => Math.hypot(h.x - pt.x, h.y - pt.y) < 14);
    if (hit) { setHeads((hs) => hs.filter((h) => h.id !== hit.id)); return; }
    const z = zones.find((zz) => pipPxInclusive(pt, zz.pts));
    if (z) setZones((zs) => zs.filter((x) => x.id !== z.id));
  }

  // Fallback click handler for offline/grid mode (no Leaflet map).
  function onSvgClick(e: React.MouseEvent<SVGSVGElement>) {
    if (mapObj.current || !mapDiv.current) return;
    const r = mapDiv.current.getBoundingClientRect();
    const pt: Pt = { x: e.clientX - r.left, y: e.clientY - r.top };
    if (tool === 'zone') setDraft((d) => [...d, pt]);
    else if (tool === 'head') placeHead(pt);
    else if (tool === 'erase') eraseAt(pt);
  }

  function finishZone() {
    if (draft.length >= 3) {
      const geo = draft.every((p) => p.lat != null) ? draft.map((p) => ({ lat: p.lat!, lng: p.lng! })) : undefined;
      setZones((zs) => [...zs, { id: Date.now(), type: zoneType, pts: draft.map((p) => ({ x: p.x, y: p.y })), geo }]);
    }
    setDraft([]);
    setTool('head');
  }

  function doAuto() {
    if (!zones.length) return;
    const placed = autoPlace(zones, pxPerFt);
    setHeads(placed.map((h) => ({ ...h, ...geoAt(h) })));
  }

  // Head drag-to-reposition (mouse + touch).
  useEffect(() => {
    function getXY(e: MouseEvent | TouchEvent): Pt {
      const host = mapObj.current?.getContainer() || mapDiv.current;
      if (!host) return { x: 0, y: 0 };
      const r = host.getBoundingClientRect();
      const src = 'touches' in e ? e.touches[0] : e;
      return {
        x: Math.max(0, Math.min(r.width, src.clientX - r.left)),
        y: Math.max(0, Math.min(r.height, src.clientY - r.top)),
      };
    }
    function move(e: MouseEvent | TouchEvent) {
      if (drag == null) return;
      dragged.current = true;
      const pt = getXY(e);
      const geo = geoAt(pt) || {};
      setHeads((hs) => hs.map((h) => (h.id === drag ? { ...h, x: pt.x, y: pt.y, ...geo } : h)));
    }
    function up() { setDrag(null); }
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    window.addEventListener('touchmove', move);
    window.addEventListener('touchend', up);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      window.removeEventListener('touchmove', move);
      window.removeEventListener('touchend', up);
    };
  }, [drag]);

  async function geocode(query: string): Promise<{ center: [number, number]; detected: RateProfile | null } | null> {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=1&q=${encodeURIComponent(query)}`, { headers: { 'Accept-Language': 'en' } });
      const data = await res.json();
      if (data?.length) {
        const { city, st } = parseGeo(data[0].address);
        return { center: [parseFloat(data[0].lat), parseFloat(data[0].lon)], detected: resolveMuni(city, st) };
      }
    } catch {
      /* offline → caller falls back to chosen city */
    }
    return null;
  }

  async function loadProperty() {
    setGeoStatus('locating');
    let c: [number, number] = (MUNI[muniName] || MUNI['Other / Custom']).center;
    let detected: RateProfile | null = null;
    if (address.trim()) {
      const g = await geocode(address);
      if (g) { c = g.center; detected = g.detected; }
    }
    const fm = detected || (MUNI[muniName] ? { name: muniName, ...MUNI[muniName] } : null);
    setResolved(fm);
    setZoneType((fm || m).style === 'premium' ? 'premium_lawn' : 'standard_lawn');
    setHeadType('mp_rotator');
    center.current = c;
    setGeoStatus('');
    setPhase('app');
  }

  /** Use the device GPS (Capacitor/web Geolocation) to pre-fill the address. */
  function useMyLocation() {
    if (!navigator.geolocation) return;
    setGeoStatus('locating');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const g = await geocode(`${latitude},${longitude}`);
        if (g) {
          center.current = g.center;
          if (g.detected) { setResolved(g.detected); setMuniName(g.detected.name); }
        } else {
          center.current = [latitude, longitude];
        }
        setGeoStatus('');
      },
      () => setGeoStatus(''),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  function leavePlanner() {
    if (zones.length && heads.length) {
      analytics.trackPlanDesigned(zones, heads, s, total);
    }
    setPhase('landing');
    setZones([]);
    setHeads([]);
    setDraft([]);
  }

  const { premium, low, total } = areaSplit(zones, pxPerFt);
  const s = savings(zones, heads, m, pxPerFt);
  const parts = heads.reduce<Record<string, number>>((a, h) => { a[h.type] = (a[h.type] || 0) + 1; return a; }, {});
  const partsTotal = Object.entries(parts).reduce((x, [k, n]) => x + HEADS[k as HeadKey].price * n, 0);
  const recs = buildRecs(zones, heads, pxPerFt);
  const sel = heads.find((h) => h.id === selected);
  const dollar = (n: number) => '$' + Math.round(n).toLocaleString();

  if (phase === 'landing') {
    return (
      <>
        {checkoutToast && (
          <div role="alert" className={`fixed top-4 left-1/2 -translate-x-1/2 z-[2000] px-5 py-3 rounded-xl shadow-xl text-sm font-semibold flex items-center gap-2 ${checkoutToast === 'success' ? 'bg-emerald-500' : 'bg-slate-700'} text-white`}>
            {checkoutToast === 'success' ? <><CheckCircle2 size={16} /> Payment complete — your blueprint is downloading!</> : <><XCircle size={16} /> Checkout cancelled.</>}
          </div>
        )}
        <div className="min-h-screen bg-gradient-to-br from-sky-50 via-emerald-50 to-teal-100 flex items-center justify-center p-6">
        <div className="w-full max-w-5xl flex items-center justify-center xl:justify-between xl:flex-row-reverse gap-12">
        <div className="max-w-lg w-full bg-white rounded-3xl shadow-2xl p-8 border border-emerald-100">
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-gradient-to-br from-sky-500 to-emerald-500 p-2 rounded-xl"><Droplets aria-hidden="true" className="text-white" size={28} /></div>
            <h1 className="text-2xl font-extrabold text-slate-800">SprinklerSmart</h1>
          </div>
          <p className="text-slate-500 mb-6 text-sm">Plan perfect coverage. Slash your water bill. Build a cooler, greener yard.</p>
          <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide" htmlFor="addr">Property Address</label>
          <div className="flex gap-2 mt-1 mb-4">
            <div className="flex-1 flex items-center gap-2 border border-slate-200 rounded-xl px-3 bg-slate-50">
              <MapPin size={18} className="text-emerald-500" />
              <input id="addr" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Main St, Gilbert, AZ" className="flex-1 py-3 bg-transparent outline-none text-slate-700 text-sm" />
            </div>
            <button onClick={useMyLocation} aria-label="Use my location" title="Use my location" className="px-3 rounded-xl border border-slate-200 bg-slate-50 text-emerald-600 hover:bg-emerald-50"><LocateFixed size={18} /></button>
          </div>
          <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide" htmlFor="city">Your City <span className="font-normal text-slate-400 normal-case">(auto-detected, or type)</span></label>
          <input id="city" value={muniName} onChange={(e) => setMuniName(e.target.value)} list="ml" className="w-full mt-1 mb-1.5 border border-slate-200 rounded-xl px-3 py-3 bg-slate-50 text-slate-700 text-sm outline-none" />
          <datalist id="ml">{Object.keys(MUNI).map((k) => <option key={k} value={k} />)}</datalist>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {['Gilbert, AZ', 'Phoenix, AZ', 'Chandler, AZ', 'Mesa, AZ', 'Scottsdale, AZ'].map((c) => (
              <button key={c} onClick={() => setMuniName(c)} className={`text-[11px] px-2 py-1 rounded-full border transition ${muniName === c ? 'bg-emerald-500 text-white border-emerald-500' : 'border-slate-200 text-slate-500'}`}>{c.split(',')[0]}</button>
            ))}
          </div>
          <p className="text-xs text-emerald-600 mb-6">💧 {m.note} ${m.rate.toFixed(2)}/1,000 gal{MUNI[muniName] ? '' : ' (regional est.)'}.</p>
          <button onClick={loadProperty} disabled={geoStatus === 'locating'} className="w-full bg-gradient-to-r from-sky-500 to-emerald-500 hover:from-sky-600 hover:to-emerald-600 disabled:opacity-60 text-white font-bold py-3.5 rounded-xl shadow-lg flex items-center justify-center gap-2">
            {geoStatus === 'locating' ? <><Loader2 size={18} className="animate-spin" /> Finding…</> : <><Search size={18} /> Load My Property</>}
          </button>
          {debugMode && (
          <button onClick={() => setShowTests((v) => !v)} className="w-full mt-3 text-[11px] flex items-center justify-center gap-1.5 text-slate-400 hover:text-slate-600">
            {allPass ? <CheckCircle2 size={12} className="text-emerald-500" /> : <XCircle size={12} className="text-red-500" />}
            Self-test: {testsPassed}/{testsTotal} passing · {showTests ? 'hide' : 'view'}
          </button>
          )}
          {debugMode && showTests && (
            <div className="mt-2 bg-slate-50 rounded-xl border border-slate-200 max-h-48 overflow-auto text-[11px] divide-y divide-slate-100">
              {testResults.map((t, i) => (
                <div key={i} className="flex items-start gap-1.5 px-2.5 py-1.5">
                  {t.pass ? <CheckCircle2 size={12} className="text-emerald-500 shrink-0 mt-0.5" /> : <XCircle size={12} className="text-red-500 shrink-0 mt-0.5" />}
                  <div><span className={t.pass ? 'text-slate-600' : 'text-red-600 font-semibold'}>{t.name}</span>{!t.pass && <div className="text-red-500 font-mono">{t.msg}</div>}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="hidden xl:block max-w-sm shrink-0">
          <h2 className="text-3xl font-extrabold text-slate-800 leading-tight mb-6">Why homeowners switch to SprinklerSmart</h2>
          <div className="space-y-5">
            <div className="flex items-start gap-3">
              <div className="bg-white p-2 rounded-xl shadow-sm border border-emerald-100 shrink-0"><MapPin aria-hidden="true" className="text-emerald-500" size={20} /></div>
              <p className="text-sm text-slate-600 pt-1.5">Draw your yard right on real satellite imagery — every zone and head placed true to scale.</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-white p-2 rounded-xl shadow-sm border border-emerald-100 shrink-0"><Zap aria-hidden="true" className="text-violet-500" size={20} /></div>
              <p className="text-sm text-slate-600 pt-1.5">AI auto-places every sprinkler head for full, efficient coverage — no guesswork required.</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-white p-2 rounded-xl shadow-sm border border-emerald-100 shrink-0"><DollarSign aria-hidden="true" className="text-emerald-500" size={20} /></div>
              <p className="text-sm text-slate-600 pt-1.5">See your real water-savings estimate before you buy a single part.</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-white p-2 rounded-xl shadow-sm border border-emerald-100 shrink-0"><FileText aria-hidden="true" className="text-sky-500" size={20} /></div>
              <p className="text-sm text-slate-600 pt-1.5">$19, one time — a full PDF blueprint with valve schedule, materials list, and rebate paperwork. No subscription.</p>
            </div>
          </div>
        </div>
        </div>
      </div>
      </>
    );
  }

  return (
    <>
      {checkoutToast && (
        <div role="alert" className={`fixed top-4 left-1/2 -translate-x-1/2 z-[2000] px-5 py-3 rounded-xl shadow-xl text-sm font-semibold flex items-center gap-2 ${checkoutToast === 'success' ? 'bg-emerald-500' : 'bg-slate-700'} text-white`}>
          {checkoutToast === 'success' ? <><CheckCircle2 size={16} /> Payment complete — your blueprint is downloading!</> : <><XCircle size={16} /> Checkout cancelled.</>}
        </div>
      )}
      <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col">
      <div className="bg-white border-b border-slate-200 px-5 py-3 flex items-center justify-between sticky top-0 z-[1000] shrink-0">
        <div className="flex items-center gap-2">
          <div className="bg-gradient-to-br from-sky-500 to-emerald-500 p-1.5 rounded-lg"><Droplets className="text-white" size={20} /></div>
          <div><div className="font-bold text-sm leading-tight">SprinklerSmart</div><div className="text-[11px] text-slate-400 leading-tight flex items-center gap-1"><MapPin size={10} />{address || m.name} · {m.name}</div></div>
        </div>
        <button onClick={leavePlanner} className="text-xs text-slate-500 hover:text-slate-700">Change</button>
      </div>

      {/* lg:flex-1 + lg:min-h-0 lets this row grow to fill the viewport below the header on
          tablet/desktop, so the map card (below) can flex-fill the column instead of leaving
          a stranded white gap beneath a fixed-height map — see the auto-placement bug session. */}
      <div className="flex flex-col lg:flex-row gap-4 p-4 max-w-[1600px] mx-auto w-full lg:flex-1 lg:min-h-0">
        <div className="flex-1 flex flex-col lg:min-h-0">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-3 mb-3 shrink-0">
            <div className="flex flex-wrap gap-2 items-center">
              {([{ k: 'zone', label: 'Draw Zone', icon: Layers }, { k: 'head', label: 'Heads', icon: Droplets }, { k: 'erase', label: 'Erase', icon: Trash2 }] as const).map(({ k, label, icon: Icon }) => (
                <button key={k} onClick={() => { setTool(k); setDraft([]); setSelected(null); }} className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg ${tool === k ? 'bg-emerald-500 text-white shadow' : 'bg-slate-100 text-slate-600'}`}><Icon size={14} />{label}</button>
              ))}
              <div className="h-6 w-px bg-slate-200 mx-1" />
              <button onClick={doAuto} className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg bg-gradient-to-r from-violet-500 to-sky-500 text-white shadow"><Zap size={14} /> AI Auto-Place</button>
              <span className="text-[10px] text-slate-400 hidden sm:block">Heads mode: click=place/select · drag=move</span>
            </div>
            {tool === 'zone' && (
              <div className="mt-3 flex flex-wrap gap-2 items-center">
                <span className="text-xs text-slate-500">Zone:</span>
                {Object.entries(ZONE_TYPES).map(([k, z]) => (
                  <button key={k} onClick={() => setZoneType(k as ZoneTypeKey)} className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border ${zoneType === k ? 'border-slate-800 font-bold' : 'border-slate-200'}`}><span className="w-3 h-3 rounded-sm" style={{ background: z.color }} />{z.label}</button>
                ))}
                {draft.length >= 3 && <button onClick={finishZone} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-emerald-500 text-white ml-auto">✓ Finish ({draft.length})</button>}
                {draft.length > 0 && draft.length < 3 && <span className="text-xs text-slate-400 ml-auto">{3 - draft.length} more…</span>}
              </div>
            )}
            {tool === 'head' && (
              <div className="mt-3 flex flex-wrap gap-2 items-center">
                <span className="text-xs text-slate-500">Head:</span>
                {Object.entries(HEADS).map(([k, h]) => (
                  <button key={k} onClick={() => setHeadType(k as HeadKey)} className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border ${headType === k ? 'border-slate-800 font-bold' : 'border-slate-200'}`}><span className="w-3 h-3 rounded-full" style={{ background: h.color }} />{h.name}{h.saving && <Leaf size={11} className="text-emerald-500" />}</button>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-2 flex flex-col lg:flex-1 lg:min-h-0">
            <div className="relative w-full rounded-xl overflow-hidden h-[65dvh] min-h-[420px] max-h-[880px] lg:h-auto lg:flex-1 lg:max-h-none">
              <div ref={mapDiv} className="absolute inset-0" style={{ background: leaflet === 'ready' ? '#cbd5e1' : 'repeating-linear-gradient(0deg,#e2e8f0 0 1px,transparent 1px 18px),repeating-linear-gradient(90deg,#e2e8f0 0 1px,transparent 1px 18px),linear-gradient(135deg,#d1fae5,#cffafe)', cursor: tool === 'zone' || tool === 'head' ? 'crosshair' : tool === 'erase' ? 'pointer' : 'grab' }} />
              <div className="absolute top-2 left-2 z-[500] text-[10px] px-2 py-1 rounded-full bg-white/90 shadow text-slate-500 flex items-center gap-1">
                {leaflet === 'loading' && <><Loader2 size={10} className="animate-spin" /> loading satellite…</>}
                {leaflet === 'ready' && <><CheckCircle2 size={10} className="text-emerald-500" /> satellite</>}
                {leaflet === 'failed' && <><Info size={10} className="text-amber-500" /> grid mode (offline) · 6 ft squares</>}
              </div>
              {/* When Leaflet owns the map it handles clicks (svg stays click-through so
                  the map can pan). In grid/offline mode there is no map, so the svg must
                  capture clicks for onSvgClick to drive drawing. */}
              <svg className="absolute inset-0 w-full h-full z-[400]" style={{ pointerEvents: leaflet === 'ready' ? 'none' : 'auto' }} onClick={onSvgClick} data-testid="overlay">
                {heads.map((h) => {
                  const hd = HEADS[h.type];
                  const r = h.radius * pxPerFt;
                  const isSelected = selected === h.id;
                  return (
                    <g key={`cov-${h.id}`}>
                      {h.arc >= 360
                        ? <circle cx={h.x} cy={h.y} r={r} fill={hd.color} fillOpacity={isSelected ? 0.25 : 0.13} stroke={hd.color} strokeWidth={isSelected ? 2 : 1.5} strokeDasharray="6 3" />
                        : <path d={arcPath(h.x, h.y, r, h.arc, h.dir)} fill={hd.color} fillOpacity={isSelected ? 0.25 : 0.13} stroke={hd.color} strokeWidth={isSelected ? 2 : 1.5} strokeDasharray="6 3" />}
                      <text x={h.x} y={h.y - r - 4} textAnchor="middle" fontSize="9" fontWeight="600" fill={hd.color} stroke="#000" strokeWidth="0.3" paintOrder="stroke">{h.radius} ft</text>
                    </g>
                  );
                })}
                {zones.map((z) => {
                  const zt = ZONE_TYPES[z.type as ZoneTypeKey];
                  return (
                    <g key={z.id}>
                      <polygon points={z.pts.map((p) => `${p.x},${p.y}`).join(' ')} fill={zt.color} fillOpacity="0.25" stroke={zt.color} strokeWidth="2" />
                      <text x={z.pts[0].x + 4} y={z.pts[0].y - 6} fontSize="11" fontWeight="700" fill="#fff" stroke="#000" strokeWidth="0.4" paintOrder="stroke">{zt.label} · {Math.round(polyAreaFt(z.pts, pxPerFt))} ft²</text>
                    </g>
                  );
                })}
                {draft.length > 0 && <polyline points={draft.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke="#0f172a" strokeWidth="2" strokeDasharray="4 4" />}
                {draft.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="4" fill="#0f172a" />)}
                {heads.map((h) => {
                  const hd = HEADS[h.type];
                  const isSelected = selected === h.id;
                  return (
                    <circle
                      key={`dot-${h.id}`} cx={h.x} cy={h.y} r={isSelected ? 8 : 6}
                      fill={hd.color} stroke="white" strokeWidth={isSelected ? 3 : 2}
                      // Only interactive in Heads mode (select/drag). In Erase mode the dot
                      // is click-through so every erase click flows through the single
                      // eraseAt() path (head-first, then zone) — no handler race.
                      style={{ cursor: tool === 'head' ? 'grab' : 'default', pointerEvents: tool === 'head' ? 'auto' : 'none' }}
                      onClick={(e) => {
                        if (tool !== 'head') return;
                        e.stopPropagation();
                        e.nativeEvent.stopPropagation();
                        if (!dragged.current) setSelected((sId) => (sId === h.id ? null : h.id));
                      }}
                      onMouseDown={(e) => { if (tool !== 'head') return; e.stopPropagation(); e.nativeEvent.stopPropagation(); setDrag(h.id); dragged.current = false; }}
                      onTouchStart={(e) => { if (tool !== 'head') return; e.stopPropagation(); e.nativeEvent.stopPropagation(); setDrag(h.id); dragged.current = false; }}
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
            <p className="text-[11px] text-slate-400 px-2 pt-1.5">{leaflet === 'ready' ? 'Real satellite imagery. Draw zones over your lawn; rings are to scale.' : 'Grid = 6 ft squares, to scale. Satellite loads when online.'}</p>
          </div>

          {sel && (
            <div data-testid="edit-head" className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 mt-3">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-sm">Edit Head — {HEADS[sel.type].name}</span>
                <button onClick={() => { setHeads((hs) => hs.filter((h) => h.id !== sel.id)); setSelected(null); }} className="text-red-500 text-xs flex items-center gap-1"><Trash2 size={12} />Remove</button>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="text-xs text-slate-500">Spray Radius: {sel.radius} ft</label>
                  <input data-testid="radius-slider" type="range" min="6" max="40" value={sel.radius} onChange={(e) => setHeads((hs) => hs.map((h) => (h.id === selected ? { ...h, radius: +e.target.value } : h)))} className="w-full accent-emerald-500" />
                </div>
                <div>
                  <label className="text-xs text-slate-500">Arc: {sel.arc}°</label>
                  <select data-testid="arc-select" value={sel.arc} onChange={(e) => setHeads((hs) => hs.map((h) => (h.id === selected ? { ...h, arc: +e.target.value } : h)))} className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm mt-1">
                    <option value={90}>90° Corner</option>
                    <option value={180}>180° Edge</option>
                    <option value={270}>270° Large arc</option>
                    <option value={360}>360° Full circle</option>
                  </select>
                </div>
                {sel.arc < 360 && (
                  <div className="col-span-2">
                    <label className="text-xs text-slate-500">Spray Direction: {Math.round(sel.dir)}°</label>
                    <input type="range" min="0" max="360" value={sel.dir} onChange={(e) => setHeads((hs) => hs.map((h) => (h.id === selected ? { ...h, dir: +e.target.value } : h)))} className="w-full accent-emerald-500" />
                  </div>
                )}
              </div>
              <label className="text-xs text-slate-500">Head type</label>
              <select data-testid="head-type-select" value={sel.type} onChange={(e) => setHeads((hs) => hs.map((h) => (h.id === selected ? { ...h, type: e.target.value as HeadKey } : h)))} className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm mt-1">{Object.entries(HEADS).map(([k, h]) => <option key={k} value={k}>{h.name}</option>)}</select>
            </div>
          )}
        </div>

        <div className="w-full lg:w-80 space-y-3">
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-2xl shadow-lg p-5">
            <div className="flex items-center gap-1.5 text-emerald-100 text-xs font-semibold uppercase tracking-wide"><DollarSign size={14} />Save Up To</div>
            <div className="text-4xl font-extrabold mt-1" data-testid="annual-savings">{dollar(s.dollarsSaved)}/yr</div>
            <div className="text-emerald-100 text-xs mt-1">by choosing water-saving heads — MP Rotators, HE nozzles &amp; drip — over conventional rotors · {m.name}</div>
            <div className="grid grid-cols-2 gap-2 mt-4 text-center">
              <div className="bg-white/15 rounded-xl py-2"><div className="text-lg font-bold">{Math.round(s.saved).toLocaleString()}</div><div className="text-[10px] text-emerald-100">gal saved/yr</div></div>
              <div className="bg-white/15 rounded-xl py-2"><div className="text-lg font-bold">{dollar(s.effCost)}</div><div className="text-[10px] text-emerald-100">water cost/yr</div></div>
            </div>
            <div className="text-emerald-100 text-[10px] mt-3 opacity-90">{heads.length === 0 ? 'Place or AI auto-place your heads below to see your savings.' : 'Based on your placed heads’ actual coverage — add more heads to sharpen it.'}</div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
            <div className="font-bold text-sm mb-2 flex items-center gap-1.5"><Layers size={15} className="text-emerald-500" />Property Breakdown</div>
            <Row label="Total irrigated" val={`${Math.round(total).toLocaleString()} ft²`} /><Row label="Turf lawn" val={`${Math.round(premium).toLocaleString()} ft²`} /><Row label="Low-water cover/beds" val={`${Math.round(low).toLocaleString()} ft²`} /><Row label="Sprinkler heads" val={`${heads.length}`} /><Row label="Water-saving heads" val={`${heads.filter((h) => HEADS[h.type].saving).length}/${heads.length}`} />
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
            <div className="font-bold text-sm mb-2 flex items-center gap-1.5"><TreePine size={15} className="text-teal-600" />Smart Recommendations</div>
            {recs.length === 0 && <p className="text-xs text-slate-400">Draw zones and place heads for tailored advice.</p>}
            <div className="space-y-2">{recs.map((r, i) => (<div key={i} className={`text-xs rounded-lg p-2.5 flex gap-2 ${r.type === 'warn' ? 'bg-amber-50 text-amber-800' : 'bg-teal-50 text-teal-800'}`}>{r.type === 'warn' ? <Info size={14} className="shrink-0 mt-0.5" /> : <Leaf size={14} className="shrink-0 mt-0.5" />}<span>{r.text}</span></div>))}</div>
            <div className="mt-3 text-[11px] text-slate-500 bg-slate-50 rounded-lg p-2.5 flex gap-2"><Sun size={14} className="shrink-0 mt-0.5 text-amber-500" />Right-sized, shaded lawns + living groundcover create cooler microclimates and cut the urban heat-island effect. Never artificial turf or gravel xeriscape.</div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
            <div className="font-bold text-sm mb-2 flex items-center gap-1.5"><ShoppingCart size={15} className="text-sky-500" />Shop This Plan</div>
            {Object.keys(parts).length === 0 && <p className="text-xs text-slate-400">Place heads to build your buy list.</p>}
            <div className="space-y-2">{Object.entries(parts).map(([k, n]) => {
              const key = k as HeadKey;
              return (
                <a key={k} href={buildAffiliateUrl(HEADS[key].affiliate)} target="_blank" rel="noopener noreferrer nofollow sponsored" onClick={() => analytics.trackAffiliateClick(HEADS[key].brand, n, HEADS[key].price * n)} className="flex items-center justify-between gap-2 border border-slate-100 hover:border-sky-300 hover:bg-sky-50 rounded-lg p-2.5 group">
                  <div><div className="text-xs font-semibold">{HEADS[key].brand}</div><div className="text-[11px] text-slate-400">{n} × {dollar(HEADS[key].price)} {HEADS[key].saving && <span className="text-emerald-500">· saving</span>}</div></div>
                  <div className="text-right"><div className="text-xs font-bold">{dollar(HEADS[key].price * n)}</div><div className="text-[10px] text-sky-500 group-hover:underline">Buy →</div></div>
                </a>
              );
            })}</div>
            {partsTotal > 0 && <><div className="flex justify-between items-center mt-3 pt-2 border-t border-slate-100"><span className="text-xs font-semibold">Subtotal</span><span className="text-sm font-extrabold">{dollar(partsTotal)}</span></div><p className="text-[10px] text-slate-400 mt-1">Affiliate links — we may earn a commission. Pays back in ~{s.dollarsSaved > 0 ? Math.max(1, Math.round((partsTotal / s.dollarsSaved) * 10) / 10) : '—'} yrs of savings.</p></>}
          </div>
          <ProPlanCard
            planData={{
              address,
              muni: m,
              zones,
              heads,
              savings: s,
              partsTotal,
              pxPerFt,
              generatedAt: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
              recommendations: recs,
            }}
            onInitiate={() => analytics.trackProPlanInitiated(zones, heads, s)}
          />
        </div>
      </div>
    </div>
    </>
  );
}

function Row({ label, val }: { label: string; val: string }) {
  return (
    <div className="flex justify-between items-center py-1 text-xs">
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold text-slate-800">{val}</span>
    </div>
  );
}
