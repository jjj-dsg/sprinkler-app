# SprinklerSmart — Task Backlog & Traceability

Single tracked source of truth for work + spec→test traceability. Pair with the
DSG Portfolio board Issues (`app:sprinkler`). Status: ✅ done · 🔄 in progress · ⬜ todo.

> Updated 2026-06-14. Specs: [`specs/SPRINKLER_PLANNER.spec.md`](specs/SPRINKLER_PLANNER.spec.md),
> [`docs/specs/`](docs/specs/). Test strategy: [`docs/TESTING.md`](docs/TESTING.md).

## Done this cycle (SPEC 0001 — release readiness)
- ✅ Extract domain logic to `src/lib/*` (ADR 0001); remove `@ts-nocheck`/eslint-disable.
- ✅ Type `App.tsx`; lint 34 → 0 errors, now blocking in CI.
- ✅ Vitest pyramid: unit tests across geometry/savings/location/recommendations/data/selftest/pdf; coverage gate 90/85/90/90.
- ✅ Playwright BDD E2E (offline grid mode) + visual screenshot harness.
- ✅ Fix offline grid-mode drawing (SVG overlay pointer-events bug).
- ✅ Wire analytics events (session_start, plan_designed, pro_plan_initiated, affiliate_clicked).
- ✅ Thread live map scale through area/savings/recs (zoom-correct math).
- ✅ `vercel.json` (SPA rewrites, headers, caching); SEO/iOS `index.html`.
- ✅ Capacitor scaffold + `docs/MOBILE_TESTFLIGHT.md` runbook; `npm run build:mobile`.
- ✅ `navigator.geolocation` "use my location" on landing.

## Done this cycle (SPEC 0002 — Pro Plan PDF + Stripe infrastructure)
- ✅ **PDF export** (`src/lib/pdf.ts`): 3-section blueprint (valve schedule, materials, rebate notice). Dynamic-imported jsPDF — main bundle stays at 77 KB gzipped.
- ✅ **`src/lib/__tests__/pdf.test.ts`**: 13 unit tests covering `buildValveSchedule`, `buildMaterialsRows`, `calcPaybackYears`.
- ✅ **`ProPlanCard.tsx`** rewritten: accepts `PdfPlanData`, generates & downloads PDF on click. Disabled until ≥1 zone drawn. Stripe redirect optional (fires if `VITE_STRIPE_PK` is set).
- ✅ **`api/checkout.ts`** (Vercel serverless): POST → Stripe Checkout session. Guarded — returns 503 if `STRIPE_SECRET_KEY`/`STRIPE_PRICE_ID` env vars are absent.
- ✅ **`api/events.ts`** (Vercel serverless): analytics event sink — forwards to PostHog if `POSTHOG_API_KEY` is set, else accepts silently.
- ✅ **`analytics.flush()`** wired to `/api/events` in production; DEV still logs to console.
- ✅ **`vercel.json`** rewrite updated to exclude `api/` routes from SPA fallback.
- ✅ E2E updated: Pro Plan tests now assert button state (enabled/disabled), no longer depend on the `alert()` placeholder.
- ✅ `.env.example` updated with all new env vars documented.

## Spec → test traceability (`specs/SPRINKLER_PLANNER.spec.md`)
78 unit (9 suites) + 24 E2E (planner + ui). Every spec Feature has a test.
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
| **PDF export / valve schedule** | **`pdf` (valve rows, materials, payback)** | `ui` Export button enabled/disabled |
| Pro Plan card & Stripe | — | `ui` card visible, disabled w/o zone, PDF trigger |
| Analytics events | `analytics` | (fired via planner/ui flows) |
| Data integrity | `data`, `affiliate` | — |
| Responsive / mobile | — | `visual` mobile viewport shot |

## Monetization — highest-probability-to-profit path
See [docs/MONETIZATION.md](docs/MONETIZATION.md).
- ✅ **Affiliate (Path 1) — live.** Real Amazon links, runtime tag from `VITE_AFFILIATE_TAG`.
  **Jeff's only action:** create Amazon Associates account + set `VITE_AFFILIATE_TAG` in Vercel.
- ✅ **Pro Plan $19 (Path 2) — PDF deliverable built.** "Export Pro Plan" downloads a real
  blueprint PDF (valve schedule + materials + rebate section). Stripe infrastructure is ready
  (`api/checkout.ts`). **To go live:** create Stripe product + set `STRIPE_SECRET_KEY` and
  `STRIPE_PRICE_ID` in Vercel env. Then wire `VITE_STRIPE_PK` to gate the PDF behind payment.
- ✅ **Real Stripe test-mode CI gate (2026-07-22).** `api/__tests__/checkout.integration.test.ts`
  hits the real (unmocked) Stripe test API through the actual handlers — currently skips in CI
  pending `STRIPE_SECRET_KEY_TEST`/`STRIPE_PRICE_ID_TEST` repo secrets. See
  `docs/adr/0002-stripe-test-mode-payment-gate.md`.

## Next up (priority order)
1. ⬜ **Gate PDF behind Stripe payment.** Update `ProPlanCard` flow: click → Stripe Checkout
   first → on `?checkout=success` return, auto-generate and download PDF. Requires Jeff to
   create Stripe product + price, set `STRIPE_SECRET_KEY` + `STRIPE_PRICE_ID` + `VITE_STRIPE_PK`.
2. ⬜ **Analytics PostHog.** Set `POSTHOG_API_KEY` in Vercel env to activate the `/api/events`
   → PostHog pipeline. Measure `plan_designed → pro_plan_initiated → pro_plan_purchased`.
3. ⬜ **iOS bootstrap on cloud-Mac** → first TestFlight build (`docs/MOBILE_TESTFLIGHT.md`).
4. ⬜ **Head drag polish** + touch-target audit for store quality.
5. ⬜ **E2E for the online/Leaflet path** (currently grid-mode only) once a stable tile fixture exists.
6. ⬜ **Second affiliate tag** (Home Depot/SiteOne via Impact) for bulk DIY carts.

## Known limitations / debt
- Affiliate earns $0 until `VITE_AFFILIATE_TAG` is set in Vercel (links work, just untagged).
- PDF downloads free (no Stripe gate yet) — intentional until we validate the deliverable earns $19.
- Analytics events route to `/api/events` in prod but `POSTHOG_API_KEY` not set → 200 with silent drop.
- Online-map E2E is intentionally skipped (network nondeterminism); grid mode is the gate.
