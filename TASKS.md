# SprinklerSmart — Task Backlog & Traceability

Single tracked source of truth for work + spec→test traceability. Pair with the
DSG Portfolio board Issues (`app:sprinkler`). Status: ✅ done · 🔄 in progress · ⬜ todo.

> Updated 2026-06-12. Specs: [`specs/SPRINKLER_PLANNER.spec.md`](specs/SPRINKLER_PLANNER.spec.md),
> [`docs/specs/`](docs/specs/). Test strategy: [`docs/TESTING.md`](docs/TESTING.md).

## Done this cycle (SPEC 0001 — release readiness)
- ✅ Extract domain logic to `src/lib/*` (ADR 0001); remove `@ts-nocheck`/eslint-disable.
- ✅ Type `App.tsx`; lint 34 → 0 errors, now blocking in CI.
- ✅ Vitest pyramid: 51 tests across geometry/savings/location/recommendations/data/selftest; coverage gate 90/85/90/90 (~99% stmts).
- ✅ Playwright BDD E2E (offline grid mode) + visual screenshot harness.
- ✅ Fix offline grid-mode drawing (SVG overlay pointer-events bug).
- ✅ Wire analytics events (session_start, plan_designed, pro_plan_initiated, affiliate_clicked).
- ✅ Thread live map scale through area/savings/recs (zoom-correct math).
- ✅ `vercel.json` (SPA rewrites, headers, caching); SEO/iOS `index.html`.
- ✅ Capacitor scaffold + `docs/MOBILE_TESTFLIGHT.md` runbook; `npm run build:mobile`.
- ✅ `navigator.geolocation` "use my location" on landing.

## Spec → test traceability (`specs/SPRINKLER_PLANNER.spec.md`)
65 unit (8 suites) + 22 E2E (planner + ui). Every spec Feature has a test.
| Feature | Unit (`src/lib/__tests__`) | E2E (`e2e/`) |
|---|---|---|
| Zone drawing & area | `geometry` (area, PIP) | `planner` draw-gating + area |
| Zone classification / switch type | `data` (zone refs) | `ui` switch zone type before draw |
| Head placement (manual) | `geometry` | `ui` click-in-zone places head |
| Head auto-place | `geometry` (autoPlace) | `planner` AI auto-place |
| Head select + edit panel | — | `ui` select, change type, radius slider, arc + direction |
| Head delete (panel + erase tool) | — | `ui` Remove; erase head; erase zone |
| Water savings | `savings` | `planner` savings > $0; `ui` real-time increase |
| Smart recommendations | `recommendations` | `planner` rotor-on-premium warning |
| Location & water rates | `location` | `ui` quick-select, manual override, regional est. |
| Self-test regression panel | `selftest` | `planner` badge N/N; `ui` panel expansion |
| Affiliate monetization | `affiliate` | `planner` real Amazon links (no placeholder) |
| Pro Plan monetization | — | `ui` card visible + checkout dialog |
| Analytics events | `analytics` | (fired via planner/ui flows) |
| Data integrity | `data`, `affiliate` | — |
| Responsive / mobile | — | `visual` mobile viewport shot |

## Monetization — highest-probability-to-profit path (decided with finance-lead)
See [docs/MONETIZATION.md](docs/MONETIZATION.md).
- ✅ **Affiliate (Path 1) — wired & tested.** Real Amazon links via `src/lib/affiliate.ts`,
  runtime tag from `VITE_AFFILIATE_TAG`, `rel="nofollow sponsored"`, click tracking, E2E guard.
  **Jeff's only action to earn:** create an Amazon Associates account and set
  `VITE_AFFILIATE_TAG` in Vercel env (no code change). ~100% margin, no backend.
- ⬜ **Pro Plan $19 (Path 2)** — build the PDF deliverable first (jsPDF, Tier 0), *then* Stripe.

## Next up (priority order)
1. ⬜ **PDF export** (the Pro Plan deliverable): `jsPDF` from the SVG overlay + valve schedule.
2. ⬜ **Stripe Pro Plan ($19).** Vercel serverless `/api/checkout` (secret key server-side
   only), `VITE_STRIPE_PK` env, price id. Wire `ProPlanCard.handleCheckout`. Spec first.
3. ⬜ **Analytics sink:** pick PostHog or a CF/Vercel function; point `analytics.flush()` at it (to measure conversion).
4. ⬜ **iOS bootstrap on cloud-Mac** → first TestFlight build (`docs/MOBILE_TESTFLIGHT.md`).
5. ⬜ **Head drag polish** + touch-target audit (web-design-guidelines) for store quality.
6. ⬜ **E2E for the online/Leaflet path** (currently grid-mode only) once a stable tile fixture exists.
7. ⬜ **Second affiliate tag** (Home Depot/SiteOne via Impact) for bulk DIY carts.

## Known limitations / debt
- Affiliate earns $0 until `VITE_AFFILIATE_TAG` is set in Vercel (links work, just untagged).
- Stripe checkout is a placeholder `alert()`; Pro Plan PDF deliverable not built yet.
- Analytics events are batched but not yet POSTed anywhere (DEV logs to console).
- Online-map E2E is intentionally skipped (network nondeterminism); grid mode is the gate.
