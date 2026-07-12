# Self-Improving Loop Protocol — Sprinkler App

> Filled in from `../LOOP_PROTOCOL_TEMPLATE.md` per CLAUDE.md §"Loop discipline", using the
> pattern in `../loop_engineering/` and the worked example in `../settle/LOOP_PROTOCOL.md`.

## 1. Task loop

- **Spec source (updated 2026-07-11 per Jeff's `/loop` re-scope):** "the complete and
  monetizable app is in TestFlight and deployed to the web."
- **Exit condition — ALL of, each independently checkable, not narration:**
  1. `npm run verify` exits 0 on `master` (already true).
  2. Production web deploy live and serving 200 at `sprinkler-app-psi.vercel.app`
     (already true) AND the custom domain once DNS resolves.
  3. Live Stripe checkout: a real `checkout.session.completed` webhook-free
     verification — `GET /api/verify-checkout?session_id=<real cs_ id>` returns
     `{"verified":true}` for one real completed payment. Needs live
     `STRIPE_SECRET_KEY`/`VITE_STRIPE_PK` in Vercel (owner-blocker, §3).
  4. A TestFlight build exists with `processing_state: VALID`, visible to an internal
     tester (`gh workflow run ios.yml -f lane=beta`, then verify via
     `GET /v1/builds?filter[app]=...`).
  5. Native purchase verified in TestFlight sandbox: `purchaseNative()` returns
     `true` and the `sprinkler_pro` entitlement shows active in the RevenueCat
     dashboard for a real sandbox transaction. Needs the ASC in-app-purchase key
     connected to RevenueCat (owner-blocker, §3).
- **NOT a valid exit condition:** any agent asserting "this should work now" without
  the check above actually run and its output observed.
- **Verification step:** `npm run lint && npm run coverage && npm run test:e2e` (the existing
  `verify` script) must exit 0.

## 2. Execution loop

- **Environment feedback source:** vitest/Playwright output, `vercel env ls production`
  (read-only) for config state.
- **Known failure pattern to watch for:** conflating "code bug" with "missing production
  config" — this session's initial ask ("get it fixed") turned out to be entirely the latter.

## 3. Product loop

- **Auto-merge threshold:** nothing auto-deploys; `scripts/deploy-prod.sh` already gates CLI
  deploys on `git log -1 --format=%ae` matching the DSG identity — don't bypass or duplicate it.
- **Review-required triggers:** workspace-wide floor from `LOOP_PROTOCOL_TEMPLATE.md` §3 applies.
- **Project-specific owner blockers — stop and hand off:**
  - Live Stripe keys (`STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`) and the Stripe account activation
    (business details + bank account) needed before live payments work.
  - Amazon Associates `VITE_AFFILIATE_TAG` (Amazon account signup).
  - iOS/TestFlight: needs a Mac + Xcode build + upload — flagged, not attempted here.
- **Feedback sources that reopen the loop:** PostHog (already configured in Vercel prod) once
  real traffic exists.

## 4. System loop

Not in scope — no CLAUDE.md/skill/hook edits this run.

## 5. Oversight loop

- **Goal right now:** finish the code-level wiring with test-mode keys and leave live cutover
  as a documented, explicit handoff step (per Jeff's 2026-07-09 answer: "wire it, use test
  keys for now").
- **Budget:** session already over the $21/60% guardrail; agy-only-mode active.
- **Kill/pause criteria:** two consecutive iterations with no judge-accepted change; hitting an
  owner-blocker above; Jeff saying stop.
