# SprinklerSmart 💧

A smart lawn-irrigation planner: draw your lawn on a satellite map, place
water-saving sprinkler heads (manually or with AI auto-placement), and see your
estimated **annual water savings in dollars** — plus a shop-this-plan parts list.

A DSG proof-of-capability app. **Live:** https://sprinkler-app-psi.vercel.app

## Stack
React 19 · TypeScript · Vite · Tailwind v4 · Leaflet (satellite, CDN-loaded) ·
Vitest · Playwright · Capacitor (iOS/Android wrappers). Tier 0 — client-only, no backend.

## Architecture
- `src/lib/` — all pure domain logic, the single tested source of truth:
  `geometry` (PIP, area, spray-arc detection, auto-place), `savings` (ET water
  model), `recommendations`, `location` (geocode → water rate), `data` (heads,
  munis, zone types), `types`, `analytics`, `selftest`, `leaflet` (CDN type surface).
- `src/App.tsx` — typed view layer that composes the lib. No business logic.
- The map loads Leaflet from CDN; with no network it falls back to a to-scale
  **grid mode** that still supports drawing and planning.

See [ADR 0001](docs/adr/0001-lib-refactor-and-test-pyramid.md) for the why.

## Develop
```bash
npm install
npm run dev          # local dev server
npm run verify       # lint → coverage gate → E2E  (run before pushing)
```

## Test
| | |
|---|---|
| `npm run test` | Vitest unit/regression (51 tests, 6 lib suites) |
| `npm run coverage` | + v8 coverage gate (90/85/90/90 on `src/lib`) |
| `npm run test:e2e` | Playwright BDD E2E (built app, offline grid mode) |
| `npm run screenshots` | Visual harness → labeled PNGs in `screenshots/` for human/AI review |

Full strategy: [docs/TESTING.md](docs/TESTING.md). Specs: [specs/](specs/SPRINKLER_PLANNER.spec.md), [docs/specs/](docs/specs/).
Backlog & traceability: [TASKS.md](TASKS.md).

## Deploy
- **Web (Vercel):** CI deploys on merge to `main`/`master` (`vercel.json` = SPA
  rewrites + security headers + asset caching). Manual: `npm run deploy:prod`.
- **iOS/TestFlight:** `npm run build:mobile` then build in Xcode on a Mac —
  full runbook in [docs/MOBILE_TESTFLIGHT.md](docs/MOBILE_TESTFLIGHT.md).

## Status / known gaps
Stripe Pro Plan, PDF export, real affiliate URLs, and the analytics backend sink
are scaffolded but not yet live — tracked in [TASKS.md](TASKS.md).
