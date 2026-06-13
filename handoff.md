# SprinklerSmart — Handoff

**Production:** https://sprinkler-app-psi.vercel.app  
**Repo:** https://github.com/jjj-dsg/sprinkler-app  
**Last deploy:** 5cb655c · feat: Stripe integration + Pro Plan card + water savings sidebar

---

## What's shipped

### Core map & planning
- Leaflet satellite map (ArcGIS tiles) with zoom, pan, and scale bar
- Zone drawing tool — click to place polygon points, Finish to close
- Zone types: Premium Lawn, Kurapia, Shade Bed/Trees, Gravel/Desert
- Sprinkler head placement in unified "Heads" mode — click empty = place, click head = select/edit, drag = reposition
- Spray arc detection: corner heads = 90°, edge heads = 180°, interior = 360°
- AI auto-placement using real map scale (Leaflet `pxPerFt` projection)
- Geo-pinning: zones and heads store lat/lng and reproject on zoom/pan so nothing drifts
- Erase tool

### Water savings & recommendations
- Annual water usage calculation (ET-based, gallons/year)
- Savings in dollars vs conventional rotors
- Payback period estimate
- Smart recommendation cards (suboptimal head warnings, Kurapia suggestions)

### Monetization
- `src/components/ProPlanCard.tsx` — Pro Plan UI card (scaffold; Stripe not yet wired to a live key)
- Affiliate parts list in sidebar with per-unit costs and placeholder "Buy →" links
- Stripe SDK installed (`@stripe/react-stripe-js`, `@stripe/stripe-js`, `stripe`)

### Infrastructure
- Vitest unit tests: `geometry.test.ts` (PIP, area, water savings, payback, auto-place) and `scale.test.ts` (unit conversions, label formats)
- GitHub Actions CI: lint → test → build on every push/PR (`.github/workflows/ci.yml`)
- Vercel production deploy via `vercel --prod` / `npm run deploy:prod`
- Capacitor scaffold in `package.json` (`build:mobile`) for iOS/Android — not yet initialized

---

## What's next (priority order)

### 1. Stripe live integration
`ProPlanCard.tsx` exists but Stripe Checkout is a placeholder. Need:
- Stripe Publishable Key in Vercel env (`VITE_STRIPE_PK`)
- A Cloudflare/Vercel serverless function for the checkout session (never expose secret key client-side)
- Price ID for Pro Plan ($19 one-time or subscription)

### 2. Analytics event firing
Spec defines: `session_start`, `plan_designed`, `pro_plan_initiated`, `affiliate_clicked`. Currently zero tracking wired. PostHog or a simple Cloudflare Analytics Engine call would close this.

### 3. Affiliate link real URLs
Parts list renders head types and costs but `href` values are `#`. Replace with real Amazon/Hunter/Netafim affiliate URLs.

### 4. Capacitor iOS/Android bootstrap
Run `npx cap init` + `npx cap add ios` + `npx cap add android` to scaffold native projects. Geolocation (`navigator.geolocation`) is already called in the address flow — wire it to the "Load My Property" button on mobile.

### 5. Head drag-to-reposition
Selection works; drag does not yet reposition the head. Need Leaflet `mousemove` handler when a head is in "dragging" state.

### 6. PDF export (Pro Plan deliverable)
The Pro Plan promise is a PDF blueprint + valve schedule. Options: `jsPDF` client-side from the SVG overlay, or a Cloudflare Worker that renders a headless Chromium screenshot.

### 7. E2E / smoke tests
Playwright smoke covering: load map, draw zone, auto-place, verify coverage circle renders. Required before App Store submission.

---

## Key files

| Path | Purpose |
|---|---|
| `src/App.tsx` | Entire app — map init, zone/head state, SVG overlay, Leaflet events |
| `src/components/ProPlanCard.tsx` | Pro Plan monetization card |
| `src/__tests__/geometry.test.ts` | PIP, area, water savings, auto-place unit tests |
| `src/__tests__/scale.test.ts` | Scale conversion and label format tests |
| `specs/SPRINKLER_PLANNER.spec.md` | Full BDD feature specs |
| `.github/workflows/ci.yml` | CI gate: lint + test + build |
| `docs/specs/` | ADR scaffold (empty) |

---

## Secrets & env

| Key | Where | Notes |
|---|---|---|
| `VITE_STRIPE_PK` | Vercel env (not yet set) | Publishable key only — safe for client |
| Stripe secret key | Cloudflare/Vercel serverless only | Never in frontend code |

No API keys are currently in use client-side. ArcGIS tile layer is unauthenticated (public tiles).

---

## Commands

```bash
npm run dev          # local dev server
npm run test         # Vitest unit tests
npm run build        # TypeScript + Vite production build
npm run deploy:prod  # vercel --prod
```
