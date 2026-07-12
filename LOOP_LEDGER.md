# Loop Ledger — Sprinkler App

> Append-only. One entry per loop iteration.

## 2026-07-09 — Session start (pre-loop manual pass)

- **Change:** none yet — diagnosis only. 85 unit tests, 24 e2e tests, lint, and build are all
  green already. Vercel prod only has `POSTHOG_API_KEY` set; `VITE_STRIPE_PK`,
  `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `VITE_AFFILIATE_TAG` are all empty.
- **Lesson:** "get the app fixed" turned out to mean "get it monetized" — verify what's
  actually broken (tests/build) vs. what's just unconfigured before assuming code bugs exist.

## 2026-07-10 — Iteration 1: analytics wiring already done, checkout code verified

- **Change:** `analytics.ts`'s `flush()` already POSTs to `/api/events`, which already forwards
  to PostHog when `POSTHOG_API_KEY` is set (it is, in prod) — only the file's top comment was
  stale ("TODO: wire URL"), fixed to describe the real, working flow. `api/checkout.ts` reviewed
  line-by-line: correctly creates a Stripe Checkout session server-side, never exposes the
  secret key, degrades to a clear 503 when unconfigured. No code changes needed there.
- **verify_pass:** true (existing 85 unit + 24 e2e tests, including 3 Pro-Plan-monetization
  e2e specs, all still green).
- **Owner blocker hit — stopping here, not spinning further:** verifying the *real* Stripe
  round-trip (an actual test-mode checkout session created against Stripe's API, not just the
  UI rendering correctly) needs `STRIPE_SECRET_KEY`/`STRIPE_PRICE_ID`/`VITE_STRIPE_PK` test-mode
  values, which don't exist anywhere in the vault or this repo. Test-mode keys don't need
  business/bank verification (unlike live keys) — this is a quick one-time Stripe dashboard
  action for Jeff, not a fixable-by-agent gap.
- **Lesson:** code review + existing test coverage can confirm a payment flow is *correctly
  wired*, but only a real API round-trip with real (even test-mode) credentials confirms it
  *actually works end-to-end*. Don't conflate the two when reporting "verified."

## 2026-07-12 — Iteration 3: real TestFlight build, loop stopped at owner-blockers

- **Change:** Triggered `ios.yml` 3x. #1 failed (2-cert quota, CERTS_GIT pointed at this
  app's own repo). #2 failed (shared certs repo needed MATCH_GIT_PAT/MATCH_PASSWORD —
  wrongly self-generated the password before finding the real shared vault value at
  `appstore-connect/match-password`, same convention as `match-git-pat`). #3 failed
  (stale revoked cert `QSNSA743R2` still referenced in the shared repo — verified via
  `GET /v1/certificates` that only `S9TN4HYJJ2` is real, removed the stale files).
  #4 succeeded: build `a734d740...` version 3, `processingState: VALID`, confirmed via API.
- **verify_pass:** true (build VALID, confirmed via direct ASC API read, not narration).
- **Owner blockers — stopping, not spinning:** Stripe live secret/publishable keys, and
  connecting the ASC in-app-purchase key to RevenueCat's dashboard (no API for this step).
  Both asked for twice this session. Full exit condition (§1 of LOOP_PROTOCOL.md) needs
  both before it's genuinely "complete and monetizable," not just "in TestFlight."
- **Lesson:** when migrating to shared infrastructure (certs repo), extend the SAME
  reasoning to every credential the migration touches, not just the one that errored —
  I fixed CERTS_GIT/MATCH_GIT_PAT together but left MATCH_PASSWORD stale, costing a
  second failed run.
- **Lesson:** a stale/revoked shared credential can silently break every consumer of
  shared infra, not just the one that happens to surface the error first (road-trivia,
  neon-merge, settle were all likely affected by the same dead cert).

## 2026-07-10 — Iteration 2: real vulnerability found and fixed, iOS CI pipeline built

- **Change:** Found the Pro Plan unlock was 100% client-trusted — `?checkout=success` in the
  URL alone triggered the paid PDF, no server-side payment confirmation. Anyone could
  `savePendingPlan()` then navigate straight to `/?checkout=success` and get the $19 export
  free. A concurrent session found and fixed the same bug independently (checkout.ts now
  appends Stripe's `{CHECKOUT_SESSION_ID}` placeholder to success_url; new
  `api/verify-checkout.ts` confirms `payment_status === 'paid'` server-side; App.tsx's return
  effect only unlocks on `verified === true`) — I verified it rather than duplicating, then
  added regression coverage (`e2e/checkout-verify.spec.ts`, 3 tests: verified/unverified/
  missing-session_id) since none existed, wired into `test:e2e` and `verify` scripts.
- **Change:** Built the full cloud-CI iOS pipeline (`fastlane/`, `Gemfile`,
  `.github/workflows/ios.yml`) copied from neon-merge's proven pattern, simplified (no ads/
  RevenueCat) — builds and uploads to TestFlight on a GitHub Actions macOS runner, no physical
  Mac needed. Also wrote `docs/PRIVACY_POLICY.md` + servable `public/privacy.html` (ships to
  `dist/privacy.html`), ASC nutrition-label answers, export-compliance answer, and regenerated
  store screenshots. `docs/MOBILE_TESTFLIGHT.md` rewritten with both the CI path and the
  original manual-Xcode fallback.
- **verify_pass:** true — `npm run verify` (lint + coverage 98.76% stmts + 27/27 e2e) all
  green after every change this iteration.
- **Owner blockers — stopping here, not spinning further:** (1) GitHub repo secrets
  (`APPSTORE_API_KEY_ID/ISSUER_ID/KEY_P8_B64`, `MATCH_PASSWORD`) needed before the CI pipeline
  can actually run — values are ready to paste (ASC key already in vault), just needs Jeff to
  add them at github.com/jjj-dsg/sprinkler-app → Settings → Secrets. (2) The App Store Connect
  app record itself doesn't exist yet — needs creating before any TestFlight upload has
  somewhere to land. (3) Real Stripe test-mode keys still needed for an actual API round-trip
  test (the client-side verification logic is now fully tested via mocks, but that's not the
  same as hitting Stripe's real test API).
- **Lesson:** when multiple sessions work the same repo concurrently, always re-check current
  file state before implementing a fix you've already planned — the other session had already
  shipped the identical vulnerability fix by the time I finished planning it.
