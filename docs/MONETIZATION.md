# SprinklerSmart — Monetization

**Strategy: highest probability to profitability.** Decided with `finance-lead`.
Pursue the path with the best odds of *first real profit fastest*, not the highest ceiling.

## Path 1 (LIVE in code) — Affiliate "Shop This Plan"
Every completed plan already itemizes the exact heads the user placed with prices
and "Buy →" links. We monetize purchase intent the user already has, at the moment
they have it, with **zero backend and ~100% margin**.

- **Status:** Fully wired. Links point at real Amazon product searches; the
  associate tag is appended at runtime from `VITE_AFFILIATE_TAG`
  (`src/lib/affiliate.ts`). Clicks fire `analytics.trackAffiliateClick`. Links use
  `rel="nofollow sponsored"` per Amazon/FTC policy, with an on-card disclosure.
- **To turn on revenue — Jeff's only action:**
  1. Create an **Amazon Associates** account (DSG identity + tax info).
  2. Put the tag in Vercel → Project → Settings → Environment Variables as
     `VITE_AFFILIATE_TAG` (e.g. `desertservices-20`). Redeploy. Done — no code change.
- **Rough economics (assumptions, tune with real data):** ~300 plan-completers/mo
  × ~8% buy-through × ~$200 attributed cart × 3% commission ≈ **$144/mo** at ~100%
  margin (bear ~$54, bull ~$525). Not a business — but it's first profit on
  near-zero cost, which is the point.
- **Caveat:** Amazon Associates can revoke if you don't make ~3 qualifying sales in
  180 days (low risk given buyer intent). A second tag via Home Depot/SiteOne
  (Impact) suits bulk DIY irrigation carts and can be added later.

## Path 2 (NEXT) — Pro Plan $19 one-off
Higher $/conversion, but only worth doing **after the deliverable exists**.
- Build first (Tier 0, no credentials): a client-side **PDF blueprint + valve
  schedule** (jsPDF from the SVG overlay). Until that PDF is genuinely worth $19,
  a paywall just generates refunds and bad reviews.
- Then wire **Stripe Checkout**: a Vercel serverless `/api/checkout` (secret key
  server-side only / vault), `VITE_STRIPE_PK` client-side, a price id.
- Gate the go-live on real funnel data from the affiliate telemetry we ship now
  (`plan_designed → pro_plan_initiated`).

## Path 3 (LATER) — Local installer lead-gen
Highest $/lead ($50–200) but a relationship sale needing a backend/CRM. Lowest
near-term probability — revisit once there's organic installer interest.

## Telemetry that informs the next call
`session_start`, `plan_designed`, `pro_plan_initiated`, `affiliate_clicked`
(`src/lib/analytics.ts`). Events are batched; wiring `flush()` to a real sink
(PostHog or a tiny CF/Vercel function, with `sre`) is the one remaining piece to
*measure* conversion — until then DEV logs to console.
