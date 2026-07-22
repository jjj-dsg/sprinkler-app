# ADR 0002 — Real Stripe test-mode integration test as the payment release gate

- **Status:** Accepted
- **Date:** 2026-07-22
- **App:** sprinkler

## Context
Workspace-wide "ready-to-test" rule: no app is called ready-to-test until login and payment
are verified end-to-end via CI, not self-attestation. Auditing this app against that rule:

- **Login/accounts:** none. SprinklerSmart is Tier 0 by design (`CLAUDE.md`: "resist backend
  creep") — no auth code exists anywhere in `src/`. There is nothing to gate here.
- **Payment:** the $19 Pro Plan Stripe Checkout flow (`api/checkout.ts`, `api/verify-checkout.ts`)
  exists and is well-built, but `VITE_STRIPE_PK` is unset in production, so `ProPlanCard`'s
  `gated` flag is `false` and the PDF export ships **ungated** today — the live monetization
  path is the zero-backend Amazon affiliate links (`docs/MONETIZATION.md` Path 1). Going live
  on Path 2 is a known owner-blocker (`LOOP_PROTOCOL.md` §3, `TASKS.md`): Jeff needs to supply
  a live `STRIPE_SECRET_KEY` + `VITE_STRIPE_PK`.
- The existing `e2e/checkout-verify.spec.ts` Playwright suite is valuable (it's the regression
  test for the real 2026-07-10 bug where a bare `?checkout=success` URL unlocked the download)
  but it **mocks** `/api/verify-checkout` entirely — it only proves the client reacts correctly
  to a given API response, never that the API's own Stripe integration is correct. That's
  exactly the kind of self-attestation gap the ready-to-test rule exists to close.

## Decision
Add `api/__tests__/checkout.integration.test.ts` (Vitest, `node` environment): a real,
unmocked integration test that imports `api/checkout.ts`/`api/verify-checkout.ts` directly and
calls the real Stripe **test-mode** API (no stub Stripe SDK, no `page.route` interception) to
assert:
1. `POST /api/checkout` returns a real `https://checkout.stripe.com/...` URL.
2. `GET /api/verify-checkout` on a freshly created (never paid) session reports `verified: false`.
3. `GET /api/verify-checkout` on a nonexistent session id reports `verified: false` with an error,
   not a thrown exception.

The suite is `describe.skipIf`-gated on `STRIPE_SECRET_KEY_TEST` + `STRIPE_PRICE_ID_TEST` being
present, and hard-fails if that env var is ever a live key (`sk_live_…`) — this runs on every
push/PR, so it must never be able to touch real money. It rides the existing `npm run coverage`
step in CI; no new job needed.

## Alternatives considered
- **Full Playwright browser flow through Stripe's hosted Checkout page** (fill the real test
  card `4242 4242 4242 4242`, follow the redirect, assert the unlock) — this is the gold-standard
  version of this gate and matches the pattern used for Settle's real magic-link e2e test. Not
  built yet because (a) it requires a locally-running server for `/api/*` during Playwright's
  `vite preview`-only `webServer` — `vite preview` doesn't execute Vercel serverless functions —
  and (b) without a real Stripe test key to actually run and verify the harness against, shipping
  an unverified browser-automation spec (brittle to Stripe's hosted-page markup) would itself be a
  form of self-attestation. Deferred to the next iteration once test credentials exist (see below).
- **Lower the coverage/CI bar to accept the mocked test as sufficient** — rejected; that's the
  exact self-attestation pattern the ready-to-test rule was written to stop.
- **Skip payment testing entirely since Path 2 isn't live in prod** — rejected; the code exists,
  is wired into the UI, and will go live the moment Jeff sets the live keys. It should be proven
  correct before that flag flips, not after.

## Consequences
- **+** The actual Stripe integration (session creation + payment verification) is now provable
  in CI against a real backend, not just the client's handling of a canned response.
- **+** Fixed a pre-existing, unrelated CI break found while wiring this in: branch coverage was
  84.52% (below the 85% gate) on `master` — `src/lib/billing.ts`'s native-purchase error paths
  (RC plugin fails to load, or an individual call rejects) were never exercised. Added
  `billing-native-error.test.ts` and `billing-native-plugin-load-failure.test.ts`, which also
  double as real regression coverage for "billing degrades gracefully, never throws."
- **−** Still short of a full browser-driven purchase flow; the checkout page UI itself
  (redirect correctness, success/cancel URL wiring as Stripe renders them) isn't exercised.
- **−** Depends on Jeff providing Stripe **test-mode** credentials to actually run (currently
  skips visibly, not silently).

## The extensibility seam
The test imports the handler functions directly rather than going through an HTTP layer, so
upgrading to the full browser-driven flow later only requires standing up a thin local server
that mounts these same unmodified handlers (e.g. for Playwright's `webServer`) — no change to
`api/checkout.ts`/`api/verify-checkout.ts` themselves. The `STRIPE_SECRET_KEY_TEST` /
`STRIPE_PRICE_ID_TEST` secret names are deliberately distinct from the live
`STRIPE_SECRET_KEY`/`STRIPE_PRICE_ID` already tracked as an owner-blocker, so test and live
credentials can never be confused in CI vs. Vercel prod env.

## Revisit when
Jeff supplies Stripe test-mode credentials (`STRIPE_SECRET_KEY_TEST`, `STRIPE_PRICE_ID_TEST`) —
at that point, (1) confirm this suite goes green for real in CI, and (2) build the full
Playwright hosted-Checkout-page flow (test card `4242 4242 4242 4242`) as the top-of-pyramid
gate, verified against those same test credentials before Jeff ever sets the live ones.
