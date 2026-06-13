# SPEC 0001 — Test pyramid, lib refactor & release readiness

- **Status:** Shipped
- **App:** sprinkler
- **Author:** engineering-lead + qa-lead · **Date:** 2026-06-12 · **Tracking issue:** TBD

## Problem & user
The team (and CI) couldn't trust SprinklerSmart's health. The whole app was one
untyped 631-line file with a duplicated test harness, tautological "tests," no
end-to-end coverage, and no way for a human or AI to see a given UI state without
running it by hand. Releasing to Vercel/TestFlight on that footing was risky.

## Goal
Make app health verifiable and the release gate real: lib-level unit/regression
tests, BDD end-to-end coverage of the core loop, a visual-inspection harness, and
green Vercel + Capacitor readiness — all enforced in CI. Proof-of-capability for DSG.

## Scope
- In: lib refactor (see [ADR 0001](../adr/0001-lib-refactor-and-test-pyramid.md));
  Vitest suites + coverage gate; Playwright E2E + screenshots; CI gating;
  `vercel.json`; Capacitor scaffold + TestFlight runbook; analytics event wiring.

## Non-goals (anti-scope)
- Live Stripe checkout (still a placeholder), PDF export, real affiliate URLs,
  a backend/accounts (stays Tier 0), and the actual iOS build (Mac-only — runbook only).

## Acceptance criteria (each must be testable)
1. `npm run lint` → 0 errors; `App.tsx` has no `@ts-nocheck`/`eslint-disable`. ✅
2. `npm run coverage` passes the 90/85/90/90 gate on `src/lib`. ✅ (≈99% stmts)
3. The in-app self-test badge is driven by the same lib code as the suite, and a
   test fails if any in-app check regresses. ✅ (`selftest.test.ts`)
4. E2E proves the core loop in offline grid mode: landing → load → draw (gated at
   3 pts) → AI auto-place → heads render → savings > $0 → rec warning fires. ✅
5. `npm run screenshots` produces labeled PNGs of every key state. ✅
6. CI runs lint → coverage → build → E2E and blocks on any failure. ✅
7. `vercel.json` provides SPA rewrites + security headers + asset caching. ✅
8. Capacitor config + TestFlight runbook exist; `npm run build:mobile` is valid. ✅

## Telemetry to add
- `session_start`, `plan_designed`, `pro_plan_initiated`, `affiliate_clicked`
  wired through `src/lib/analytics.ts` (batched; backend endpoint still TODO).

## Support & refund impact
Fewer "it doesn't work" tickets: offline drawing now actually works, and the
self-test badge gives users/support a one-glance health signal.

## Cost impact
None new. Tests run in CI minutes; no added runtime cost. Analytics backend
deferred (no spend until an endpoint is chosen with `finance-lead`).

## Security & privacy
No secrets added. Device location stays client-side (used to center the map, not
stored). Headers harden the static deploy. App Store privacy label noted in the runbook.

## Open questions / decisions for Jeff
- Analytics sink: PostHog vs. a Cloudflare/Vercel function? (funnel events are ready to send)
- Stripe: one-off $19 unlock vs. subscription — needs `finance-lead` + a checkout function.
- Affiliate program sign-ups (Hunter/Rain Bird/Amazon) to replace placeholder URLs.
