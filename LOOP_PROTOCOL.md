# Self-Improving Loop Protocol — Sprinkler App

> Filled in from `../LOOP_PROTOCOL_TEMPLATE.md` per CLAUDE.md §"Loop discipline", using the
> pattern in `../loop_engineering/` and the worked example in `../settle/LOOP_PROTOCOL.md`.

## 1. Task loop

- **Spec source:** this session's finding — code (85 unit + 24 e2e tests, lint, build) is
  already green; the app is unmonetized in production, not broken.
- **Exit condition:** `analytics.ts`'s TODO endpoint wired (or confirmed already wired) and
  covered by a test; Stripe Pro Plan checkout verified end-to-end against test-mode keys
  (real request/response, not just component render); `npm run verify` exits 0.
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
