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
| Feature | Unit (`src/lib/__tests__`) | E2E (`e2e/`) |
|---|---|---|
| Zone drawing & area | `geometry.test` (area, PIP) | `planner` zone-draw gating + area |
| Head placement & auto-place | `geometry.test` (autoPlace) | `planner` AI auto-place |
| Water savings | `savings.test` | `planner` savings > $0 |
| Smart recommendations | `recommendations.test` | `planner` rotor-on-premium warning |
| Location & water rates | `location.test` | (covered via load flow) |
| Self-test regression panel | `selftest.test` | `planner` badge N/N |
| Data integrity | `data.test` | — |
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
